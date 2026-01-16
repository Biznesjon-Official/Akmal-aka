const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Wood = require('../models/Wood');
const Kassa = require('../models/Kassa');
const auth = require('../middleware/auth');
const { createAuditLog } = require('../middleware/auditLog');

const router = express.Router();

// Foyda hisoblash funksiyasini import qilish
let calculateLotProfit;
setTimeout(() => {
  calculateLotProfit = require('./wood').calculateLotProfit;
}, 0);

// Barcha xarajatlarni olish
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, woodLot, xarajatTuri } = req.query;
    const filter = {};
    
    if (woodLot) filter.woodLot = woodLot;
    if (xarajatTuri) filter.xarajatTuri = xarajatTuri;
    
    const expenses = await Expense.find(filter)
      .populate('woodLot', 'lotCode')
      .populate('yaratuvchi', 'username')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ sana: -1 });
    
    const total = await Expense.countDocuments(filter);
    
    res.json({
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Lot bo'yicha xarajatlar statistikasi
router.get('/stats/:woodLotId', auth, async (req, res) => {
  try {
    const stats = await Expense.aggregate([
      { $match: { woodLot: req.params.woodLotId } },
      {
        $group: {
          _id: '$xarajatTuri',
          jami: { $sum: '$summaUZS' },
          soni: { $sum: 1 }
        }
      }
    ]);
    
    const jamiXarajat = await Expense.aggregate([
      { $match: { woodLot: req.params.woodLotId } },
      {
        $group: {
          _id: null,
          jami: { $sum: '$summaUZS' }
        }
      }
    ]);
    
    res.json({
      stats,
      jamiXarajat: jamiXarajat[0]?.jami || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi xarajat qo'shish - TRANSACTION bilan
router.post('/', [auth, [
  body('woodLot').notEmpty().withMessage('Lot tanlanishi shart'),
  body('xarajatTuri').isIn([
    'transport_kelish',
    'transport_ketish',
    'bojxona_kelish',
    'bojxona_ketish',
    'yuklash_tushirish',
    'saqlanish',
    'ishchilar',
    'qayta_ishlash',
    'boshqa'
  ]).withMessage('Noto\'g\'ri xarajat turi'),
  body('summa').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB', 'UZS']).withMessage('Noto\'g\'ri valyuta'),
  body('tavsif').notEmpty().withMessage('Tavsif kiritilishi shart')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return res.status(400).json({ errors: errors.array() });
    }

    // Lotni tekshirish
    const wood = await Wood.findById(req.body.woodLot).session(session);
    if (!wood) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Lot topilmadi' });
    }

    // UZS da qiymatini hisoblash
    let summaUZS = req.body.summa;
    if (req.body.valyuta !== 'UZS') {
      // Agar valyuta UZS bo'lmasa, valyutaKursi kerak
      if (!req.body.valyutaKursi || req.body.valyutaKursi <= 0) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Valyuta kursi kiritilishi shart' });
      }
      summaUZS = req.body.summa * req.body.valyutaKursi;
    }

    const expenseData = {
      ...req.body,
      summaUZS, // UZS da qiymatini qo'shish
      yaratuvchi: req.user.userId
    };

    const expense = await Expense.create([expenseData], { session });
    
    // Kassa yozuvi yaratish (avtomatik - chiqim)
    await Kassa.create([{
      turi: 'rasxod',
      xarajatTuri: req.body.xarajatTuri,
      summa: req.body.summa,
      valyuta: req.body.valyuta,
      summaUZS: summaUZS,
      tavsif: req.body.tavsif,
      woodLot: req.body.woodLot,
      expense: expense[0]._id,
      sana: req.body.sana || new Date(),
      yaratuvchi: req.user.userId
    }], { session });
    
    // Foydani hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(req.body.woodLot, session);
    }
    
    // Audit log
    await createAuditLog(
      'create',
      'Expense',
      expense[0]._id,
      { after: expense[0].toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    session.endSession();
    
    await expense[0].populate([
      { path: 'woodLot', select: 'lotCode' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.status(201).json(expense[0]);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('Expense yaratishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Xarajatni yangilash - TRANSACTION bilan
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const expense = await Expense.findById(req.params.id).session(session);
    if (!expense) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    const oldData = expense.toObject();
    
    Object.assign(expense, req.body);
    await expense.save({ session });
    
    // Foydani hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(expense.woodLot, session);
    }
    
    // Audit log
    await createAuditLog(
      'update',
      'Expense',
      expense._id,
      { before: oldData, after: expense.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    await expense.populate([
      { path: 'woodLot', select: 'lotCode' },
      { path: 'transport', select: 'nomerVagon' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.json(expense);
  } catch (error) {
    await session.abortTransaction();
    console.error('Expense yangilashda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Xarajatni o'chirish (SOFT DELETE) - TRANSACTION bilan
router.delete('/:id', [auth, auth.adminOnly], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const expense = await Expense.findById(req.params.id).session(session);
    if (!expense) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }

    const woodLotId = expense.woodLot;
    
    // Soft delete
    expense.isDeleted = true;
    expense.deletedAt = new Date();
    expense.deletedBy = req.user.userId;
    expense.deleteReason = req.body.reason || 'Admin tomonidan o\'chirildi';
    await expense.save({ session });
    
    // Foydani hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(woodLotId, session);
    }
    
    // Audit log
    await createAuditLog(
      'delete',
      'Expense',
      expense._id,
      { before: expense.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    res.json({ message: 'Xarajat arxivlandi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Expense o\'chirishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
