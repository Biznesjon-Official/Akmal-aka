const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
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

// Barcha sotuvlarni olish
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, woodLot } = req.query;
    const filter = { isDeleted: false }; // Soft delete filter
    
    if (woodLot) filter.woodLot = woodLot;
    
    const sales = await Sale.find(filter)
      .populate({
        path: 'woodLot',
        select: 'lotCode kubHajmi jami_xarid jami_sotuv jami_xarajat'
      })
      .populate('yaratuvchi', 'username')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ sotuvSanasi: -1 });
    
    const total = await Sale.countDocuments(filter);
    
    res.json({
      sales,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Sale GET error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Bitta sotuvni olish
router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('woodLot')
      .populate('yaratuvchi', 'username');
    
    if (!sale) {
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi sotuv qo'shish - TRANSACTION bilan
router.post('/', [auth, [
  body('woodLot').notEmpty().withMessage('Lot tanlanishi shart'),
  body('birlikNarxi').isNumeric().withMessage('Birlik narxi raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('xaridor').notEmpty().withMessage('Xaridor kiritilishi shart'),
  body('sotuvJoyi').notEmpty().withMessage('Sotuv joyi kiritilishi shart'),
  body('sotuvSanasi').isISO8601().withMessage('Noto\'g\'ri sana formati'),
  body('valyutaKursi').isNumeric().withMessage('Valyuta kursi raqam bo\'lishi kerak')
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

    // Lot allaqachon sotilgan bo'lsa
    if (wood.status === 'sotildi') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Bu lot allaqachon sotilgan!' });
    }

    // Jami summani hisoblash
    console.log('📦 Sale ma\'lumotlari:', {
      birlikNarxi: req.body.birlikNarxi,
      valyutaKursi: req.body.valyutaKursi,
      kubHajmi: wood.kubHajmi
    });
    
    const jamiSumma = req.body.birlikNarxi * wood.kubHajmi;
    const jamiUZS = jamiSumma * req.body.valyutaKursi; // UZS da qiymati
    
    console.log('💰 Hisoblangan:', { jamiSumma, jamiUZS });

    const saleData = {
      ...req.body,
      jamiSumma,
      jamiUZS, // UZS da qiymatini qo'shish
      yaratuvchi: req.user.userId
    };

    const sale = await Sale.create([saleData], { session });
    
    // Wood modelini yangilash
    wood.sotuv_kursi = sale[0].valyutaKursi;
    wood.status = 'sotildi';
    await wood.save({ session });
    
    // Kassa yozuvi yaratish (avtomatik - kirim)
    await Kassa.create([{
      turi: 'prixod',
      summa: jamiSumma,
      valyuta: req.body.valyuta,
      summaUZS: jamiUZS,
      tavsif: `Sotuv: ${wood.lotCode} - ${req.body.xaridor}`,
      woodLot: wood._id,
      sale: sale[0]._id,
      sana: req.body.sotuvSanasi,
      yaratuvchi: req.user.userId
    }], { session });
    
    // Foydani hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(req.body.woodLot, session);
    }
    
    // Audit log
    await createAuditLog(
      'create',
      'Sale',
      sale[0]._id,
      { after: sale[0].toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    await sale[0].populate([
      { path: 'woodLot', select: 'lotCode kubHajmi' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.status(201).json(sale[0]);
  } catch (error) {
    await session.abortTransaction();
    console.error('Sale yaratishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Sotuvni yangilash - TRANSACTION bilan
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }

    const oldData = sale.toObject();

    // Agar birlikNarxi o'zgarsa, jamiSumma ni qayta hisoblash
    if (req.body.birlikNarxi) {
      const wood = await Wood.findById(sale.woodLot).session(session);
      req.body.jamiSumma = req.body.birlikNarxi * wood.kubHajmi;
    }

    Object.assign(sale, req.body);
    await sale.save({ session });
    
    // Wood modelini yangilash
    const wood = await Wood.findById(sale.woodLot).session(session);
    wood.sotuv_kursi = sale.valyutaKursi;
    await wood.save({ session });
    
    // Foydani hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(sale.woodLot, session);
    }
    
    // Audit log
    await createAuditLog(
      'update',
      'Sale',
      sale._id,
      { before: oldData, after: sale.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    await sale.populate([
      { path: 'woodLot', select: 'lotCode kubHajmi' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.json(sale);
  } catch (error) {
    await session.abortTransaction();
    console.error('Sale yangilashda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Sotuvni o'chirish (SOFT DELETE) - TRANSACTION bilan
router.delete('/:id', [auth, auth.adminOnly], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }

    const woodLotId = sale.woodLot;
    
    // Soft delete
    sale.isDeleted = true;
    sale.deletedAt = new Date();
    sale.deletedBy = req.user.userId;
    sale.deleteReason = req.body.reason || 'Admin tomonidan o\'chirildi';
    await sale.save({ session });
    
    // Wood modelini yangilash
    const wood = await Wood.findById(woodLotId).session(session);
    wood.sotuv_kursi = null;
    wood.status = 'omborda';
    await wood.save({ session });
    
    // Foydani hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(woodLotId, session);
    }
    
    // Audit log
    await createAuditLog(
      'delete',
      'Sale',
      sale._id,
      { before: sale.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    res.json({ message: 'Sotuv arxivlandi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Sale o\'chirishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
