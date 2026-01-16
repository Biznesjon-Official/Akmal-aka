const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Wood = require('../models/Wood');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const { createAuditLog } = require('../middleware/auditLog');

const router = express.Router();

// Lot uchun foydani hisoblash funksiyasi
async function calculateLotProfit(woodLotId, session = null) {
  try {
    const options = session ? { session } : {};
    
    // Xarid summasi
    const purchase = await Purchase.findOne({ woodLot: woodLotId }).session(session);
    const jami_xarid = purchase ? purchase.jamiUZS : 0;
    
    // Sotuv summasi
    const sale = await Sale.findOne({ woodLot: woodLotId }).session(session);
    const jami_sotuv = sale ? sale.jamiUZS : 0;
    
    // Xarajatlar summasi
    const expenses = await Expense.find({ woodLot: woodLotId }).session(session);
    const jami_xarajat = expenses.reduce((sum, exp) => sum + exp.summaUZS, 0);
    
    // Sof foyda
    const sof_foyda = jami_sotuv - jami_xarid - jami_xarajat;
    
    // Foyda foizi
    const foyda_foizi = jami_xarid > 0 ? (sof_foyda / jami_xarid) * 100 : 0;
    
    // Wood lot'ni yangilash
    const updateData = {
      jami_xarid,
      jami_sotuv,
      jami_xarajat,
      sof_foyda,
      foyda_foizi
    };
    
    if (session) {
      await Wood.findByIdAndUpdate(woodLotId, updateData, { session });
    } else {
      await Wood.findByIdAndUpdate(woodLotId, updateData);
    }
    
    return { jami_xarid, jami_sotuv, jami_xarajat, sof_foyda, foyda_foizi };
  } catch (error) {
    console.error('Foyda hisoblashda xato:', error);
    throw error;
  }
}

// Barcha yog'och lotlarini olish
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    
    const woods = await Wood.find(filter)
      .populate('yaratuvchi', 'username')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Wood.countDocuments(filter);
    
    res.json({
      woods,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Wood GET error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Sotilgan lotlar tarixi (to'liq ma'lumot bilan)
router.get('/sold-history', auth, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = { status: 'sotildi' };
    
    // Sana filtri
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const woods = await Wood.find(filter)
      .populate({
        path: 'yaratuvchi',
        select: 'username'
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    // Har bir lot uchun xarid, sotuv va xarajatlarni olish
    const woodsWithDetails = await Promise.all(
      woods.map(async (wood) => {
        const purchase = await Purchase.findOne({ woodLot: wood._id })
          .select('birlikNarxi valyuta jamiSumma jamiUZS sotuvchi xaridJoyi xaridSanasi valyutaKursi');
        
        const sale = await Sale.findOne({ woodLot: wood._id })
          .select('birlikNarxi valyuta jamiSumma jamiUZS xaridor sotuvJoyi sotuvSanasi valyutaKursi');
        
        const expenses = await Expense.find({ woodLot: wood._id })
          .select('xarajatTuri summa valyuta summaUZS tavsif sana');
        
        return {
          ...wood.toObject(),
          purchase,
          sale,
          expenses
        };
      })
    );
    
    const total = await Wood.countDocuments(filter);
    
    // Jami statistika
    const stats = {
      totalLots: total,
      totalProfit: woodsWithDetails.reduce((sum, w) => sum + (w.sof_foyda || 0), 0),
      totalRevenue: woodsWithDetails.reduce((sum, w) => sum + (w.jami_sotuv || 0), 0),
      totalCost: woodsWithDetails.reduce((sum, w) => sum + (w.jami_xarid || 0), 0),
      totalExpenses: woodsWithDetails.reduce((sum, w) => sum + (w.jami_xarajat || 0), 0)
    };
    
    res.json({
      woods: woodsWithDetails,
      stats,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Sold history error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi yog'och lot qo'shish
router.post('/', [auth, [
  body('lotCode').notEmpty().withMessage('Lot kodi kiritilishi shart'),
  body('qalinlik').isNumeric().withMessage('Qalinlik raqam bo\'lishi kerak'),
  body('eni').isNumeric().withMessage('Eni raqam bo\'lishi kerak'),
  body('uzunlik').isNumeric().withMessage('Uzunlik raqam bo\'lishi kerak'),
  body('kubHajmi').isNumeric().withMessage('Kub hajmi raqam bo\'lishi kerak'),
  body('soni').isNumeric().withMessage('Soni raqam bo\'lishi kerak'),
  body('tonna').isNumeric().withMessage('Tonna raqam bo\'lishi kerak')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Lot kodi mavjudligini tekshirish
    const existingWood = await Wood.findOne({ lotCode: req.body.lotCode });
    if (existingWood) {
      return res.status(400).json({ message: 'Bu lot kodi allaqachon mavjud' });
    }

    const wood = new Wood(req.body);
    await wood.save();
    
    res.status(201).json(wood);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yog'och lot ma'lumotlarini yangilash - TRANSACTION bilan
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const wood = await Wood.findById(req.params.id).session(session);
    if (!wood) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Yog\'och lot topilmadi' });
    }
    
    const oldData = wood.toObject();
    
    Object.assign(wood, req.body);
    await wood.save({ session });
    
    // Audit log
    await createAuditLog(
      'update',
      'Wood',
      wood._id,
      { before: oldData, after: wood.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    res.json(wood);
  } catch (error) {
    await session.abortTransaction();
    console.error('Wood yangilashda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Yog'och lotni o'chirish (SOFT DELETE) - TRANSACTION bilan
router.delete('/:id', [auth, auth.adminOnly], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const wood = await Wood.findById(req.params.id).session(session);
    if (!wood) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Yog\'och lot topilmadi' });
    }
    
    // Soft delete
    wood.isDeleted = true;
    wood.deletedAt = new Date();
    wood.deletedBy = req.user.userId;
    wood.deleteReason = req.body.reason || 'Admin tomonidan o\'chirildi';
    await wood.save({ session });
    
    // Audit log
    await createAuditLog(
      'delete',
      'Wood',
      wood._id,
      { before: wood.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    res.json({ message: 'Yog\'och lot arxivlandi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Wood o\'chirishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Bitta yog'och lot ma'lumotlarini olish
router.get('/:id', auth, async (req, res) => {
  try {
    const wood = await Wood.findById(req.params.id)
      .populate('yaratuvchi', 'ism familiya');
    
    if (!wood) {
      return res.status(404).json({ message: 'Yog\'och lot topilmadi' });
    }
    
    // Bog'langan ma'lumotlarni olish
    const purchase = await Purchase.findOne({ woodLot: wood._id })
      .populate('yaratuvchi', 'ism familiya');
    const sale = await Sale.findOne({ woodLot: wood._id })
      .populate('yaratuvchi', 'ism familiya');
    const expenses = await Expense.find({ woodLot: wood._id })
      .populate('yaratuvchi', 'ism familiya')
      .sort({ sana: -1 });
    
    res.json({
      ...wood.toObject(),
      purchase,
      sale,
      expenses
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Lot statusini yangilash
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = [
      'xarid_qilindi',
      'transport_kelish',
      'omborda',
      'qayta_ishlash',
      'transport_ketish',
      'sotildi',
      'bekor_qilindi'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Noto\'g\'ri status' });
    }
    
    const wood = await Wood.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!wood) {
      return res.status(404).json({ message: 'Yog\'och lot topilmadi' });
    }
    
    res.json(wood);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Lot uchun foydani qayta hisoblash
router.post('/:id/calculate-profit', auth, async (req, res) => {
  try {
    const profit = await calculateLotProfit(req.params.id);
    res.json(profit);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
module.exports.calculateLotProfit = calculateLotProfit;