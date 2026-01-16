const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
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

// Barcha xaridlarni olish
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, woodLot } = req.query;
    const filter = { isDeleted: false }; // Soft delete filter
    
    if (woodLot) filter.woodLot = woodLot;
    
    const purchases = await Purchase.find(filter)
      .populate({
        path: 'woodLot',
        select: 'lotCode kubHajmi qalinlik eni uzunlik soni yogochZichligi jami_xarid jami_sotuv jami_xarajat'
      })
      .populate('yaratuvchi', 'username')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ xaridSanasi: -1 });
    
    const total = await Purchase.countDocuments(filter);
    
    res.json({
      purchases,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Purchase GET error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Bitta xaridni olish
router.get('/:id', auth, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('woodLot')
      .populate('yaratuvchi', 'username');
    
    if (!purchase) {
      return res.status(404).json({ message: 'Xarid topilmadi' });
    }
    
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi xarid qo'shish - AVTOMATIK LOT YARATISH bilan
router.post('/', [auth, [
  // Lot ma'lumotlari
  body('lotCode').notEmpty().withMessage('Lot kodi kiritilishi shart'),
  body('qalinlik').isNumeric().withMessage('Qalinlik raqam bo\'lishi kerak'),
  body('eni').isNumeric().withMessage('Eni raqam bo\'lishi kerak'),
  body('uzunlik').isNumeric().withMessage('Uzunlik raqam bo\'lishi kerak'),
  body('soni').isNumeric().withMessage('Soni raqam bo\'lishi kerak'),
  body('yogochZichligi').isNumeric().withMessage('Zichlik raqam bo\'lishi kerak'),
  // Xarid ma'lumotlari
  body('birlikNarxi').isNumeric().withMessage('Birlik narxi raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('sotuvchi').notEmpty().withMessage('Sotuvchi kiritilishi shart'),
  body('xaridJoyi').notEmpty().withMessage('Xarid joyi kiritilishi shart'),
  body('xaridSanasi').isISO8601().withMessage('Noto\'g\'ri sana formati'),
  body('valyutaKursi').isNumeric().withMessage('Valyuta kursi raqam bo\'lishi kerak')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log('📦 Xarid ma\'lumotlari:', req.body); // Debug log
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      console.log('❌ Validation xatolari:', errors.array()); // Debug log
      return res.status(400).json({ errors: errors.array() });
    }

    // 1. AVVAL LOT YARATISH
    const { lotCode, qalinlik, eni, uzunlik, soni, yogochZichligi, izoh } = req.body;
    
    // Kub hajmi va tonnani hisoblash
    const kubHajmi = (qalinlik * eni * uzunlik * soni) / 1000000;
    const tonna = kubHajmi * yogochZichligi;
    
    const woodData = {
      lotCode,
      qalinlik,
      eni,
      uzunlik,
      kubHajmi,
      soni,
      tonna,
      yogochZichligi,
      status: 'xarid_qilindi',
      yaratuvchi: req.user.userId, // Yaratuvchini qo'shish
      izoh
    };
    
    const wood = await Wood.create([woodData], { session });
    
    // 2. KEYIN XARID YARATISH
    const jamiSumma = req.body.birlikNarxi * kubHajmi;
    const jamiUZS = jamiSumma * req.body.valyutaKursi; // UZS da qiymati
    
    const purchaseData = {
      woodLot: wood[0]._id,
      birlikNarxi: req.body.birlikNarxi,
      valyuta: req.body.valyuta,
      jamiSumma,
      jamiUZS, // UZS da qiymatini qo'shish
      sotuvchi: req.body.sotuvchi,
      sotuvchiTelefon: req.body.sotuvchiTelefon,
      xaridJoyi: req.body.xaridJoyi,
      xaridSanasi: req.body.xaridSanasi,
      valyutaKursi: req.body.valyutaKursi,
      shartnoma: req.body.shartnoma,
      tolovHolati: req.body.tolovHolati || 'to\'langan',
      yaratuvchi: req.user.userId
    };
    
    const purchase = await Purchase.create([purchaseData], { session });
    
    // 3. Wood modelini yangilash
    wood[0].xarid_kursi = purchase[0].valyutaKursi;
    wood[0].jami_xarid = jamiUZS; // Xarid summasini qo'shish
    await wood[0].save({ session });
    
    // 4. Kassa yozuvi yaratish (avtomatik)
    await Kassa.create([{
      turi: 'rasxod',
      summa: jamiSumma,
      valyuta: req.body.valyuta,
      summaUZS: jamiUZS,
      tavsif: `Xarid: ${wood[0].lotCode} - ${req.body.sotuvchi}`,
      woodLot: wood[0]._id,
      purchase: purchase[0]._id,
      sana: req.body.xaridSanasi,
      yaratuvchi: req.user.userId
    }], { session });
    
    // 5. Foydani hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(wood[0]._id, session);
    }
    
    // 6. Audit log
    await createAuditLog(
      'create',
      'Purchase',
      purchase[0]._id,
      { after: purchase[0].toObject() },
      req.user.userId,
      req
    );
    
    await createAuditLog(
      'create',
      'Wood',
      wood[0]._id,
      { after: wood[0].toObject() },
      req.user.userId,
      req
    );
    
    // Transaction commit
    await session.commitTransaction();
    
    // Populate qilish
    await purchase[0].populate([
      { path: 'woodLot', select: 'lotCode kubHajmi' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.status(201).json({
      purchase: purchase[0],
      wood: wood[0],
      message: 'Xarid muvaffaqiyatli qo\'shildi va lot yaratildi'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Purchase yaratishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Xaridni yangilash - TRANSACTION bilan
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Xarid topilmadi' });
    }

    // Eski holatni saqlash (audit uchun)
    const oldData = purchase.toObject();

    // Agar birlikNarxi o'zgarsa, jamiSumma ni qayta hisoblash
    if (req.body.birlikNarxi) {
      const wood = await Wood.findById(purchase.woodLot).session(session);
      req.body.jamiSumma = req.body.birlikNarxi * wood.kubHajmi;
    }

    Object.assign(purchase, req.body);
    await purchase.save({ session });
    
    // Wood modelini yangilash
    const wood = await Wood.findById(purchase.woodLot).session(session);
    wood.xarid_kursi = purchase.valyutaKursi;
    await wood.save({ session });
    
    // Foydani hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(purchase.woodLot, session);
    }
    
    // Audit log
    await createAuditLog(
      'update',
      'Purchase',
      purchase._id,
      { before: oldData, after: purchase.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    await purchase.populate([
      { path: 'woodLot', select: 'lotCode kubHajmi' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.json(purchase);
  } catch (error) {
    await session.abortTransaction();
    console.error('Purchase yangilashda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Xaridni o'chirish (SOFT DELETE)
router.delete('/:id', [auth, auth.adminOnly], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Xarid topilmadi' });
    }

    // Soft delete
    purchase.isDeleted = true;
    purchase.deletedAt = new Date();
    purchase.deletedBy = req.user.userId;
    purchase.deleteReason = req.body.reason || 'Admin tomonidan o\'chirildi';
    await purchase.save({ session });
    
    // Audit log
    await createAuditLog(
      'delete',
      'Purchase',
      purchase._id,
      { before: purchase.toObject() },
      req.user.userId,
      req
    );
    
    // Foydani qayta hisoblash
    if (calculateLotProfit) {
      await calculateLotProfit(purchase.woodLot, session);
    }
    
    await session.commitTransaction();
    res.json({ message: 'Xarid arxivlandi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Purchase o\'chirishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
