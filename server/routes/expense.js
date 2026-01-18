const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Wood = require('../models/Wood');
const Kassa = require('../models/Kassa');
const auth = require('../middleware/auth');
const { createAuditLog } = require('../middleware/auditLog');

const router = express.Router();

// Barcha xarajatlar ro'yxati
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      turi, 
      valyuta, 
      tolovHolati,
      startDate, 
      endDate,
      woodLot,
      vagon
    } = req.query;
    
    const filter = { isDeleted: false };
    
    if (turi) filter.turi = turi;
    if (valyuta) filter.valyuta = valyuta;
    if (tolovHolati) filter.tolovHolati = tolovHolati;
    if (woodLot) filter.woodLot = woodLot;
    if (vagon) filter.vagon = vagon;
    
    if (startDate || endDate) {
      filter.xarajatSanasi = {};
      if (startDate) filter.xarajatSanasi.$gte = new Date(startDate);
      if (endDate) filter.xarajatSanasi.$lte = new Date(endDate);
    }
    
    const expenses = await Expense.find(filter)
      .select('-__v')
      .populate('woodLot', 'lotCode kubHajmi qalinlik eni uzunlik')
      .populate('vagon', 'vagonCode')
      .populate('yaratuvchi', 'username')
      .populate('tasdiqlovchi', 'username')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ xarajatSanasi: -1 })
      .lean(); // OPTIMIZATSIYA
    
    const total = await Expense.countDocuments(filter);
    
    res.json({
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Expense list error:', error);
    res.status(500).json({ message: 'Xarajatlar ro\'yxatini olishda xatolik' });
  }
});

// Bitta xarajat ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('woodLot')
      .populate('vagon')
      .populate('yaratuvchi', 'username')
      .populate('tasdiqlovchi', 'username');
    
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Xarajat ma\'lumotlarini olishda xatolik' });
  }
});

// Yangi xarajat qo'shish
router.post('/', [auth, [
  body('turi').isIn(['transport', 'bojxona', 'ishchilar', 'ombor', 'yoqilgi', 'tamir', 'qadoqlash', 'boshqa'])
    .withMessage('Noto\'g\'ri xarajat turi'),
  body('summa').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('tavsif').notEmpty().withMessage('Tavsif kiritilishi shart'),
  body('javobgarShaxs').notEmpty().withMessage('Javobgar shaxs kiritilishi shart'),
  body('xarajatSanasi').isISO8601().withMessage('Noto\'g\'ri sana formati')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      turi,
      transportTuri,
      bojxonaTuri,
      ishchilarTuri,
      omborTuri,
      summa,
      valyuta,
      summaRUB,
      summaUSD,
      xarajatSanasi,
      tolovSanasi,
      tavsif,
      qoshimchaMalumot,
      woodLot,
      vagon,
      tolovHolati = 'kutilmoqda',
      hujjatRaqami,
      hujjatSanasi,
      javobgarShaxs
    } = req.body;
    
    // Yangi xarajat yaratish
    const expense = new Expense({
      turi,
      transportTuri,
      bojxonaTuri,
      ishchilarTuri,
      omborTuri,
      summa,
      valyuta,
      summaRUB: summaRUB || summa, // Agar RUB kursi berilmagan bo'lsa
      summaUSD: summaUSD || 0,
      xarajatSanasi: new Date(xarajatSanasi),
      tolovSanasi: tolovSanasi ? new Date(tolovSanasi) : null,
      tavsif,
      qoshimchaMalumot,
      woodLot,
      vagon,
      tolovHolati,
      hujjatRaqami,
      hujjatSanasi: hujjatSanasi ? new Date(hujjatSanasi) : null,
      javobgarShaxs,
      yaratuvchi: req.user.userId
    });
    
    await expense.save({ session });
    
    // Agar to'langan bo'lsa, kassaga yozuv qo'shish
    if (tolovHolati === 'tolangan' && tolovSanasi) {
      const kassaEntry = new Kassa({
        turi: 'rasxod',
        xarajatTuri: getKassaExpenseType(turi, transportTuri, bojxonaTuri, ishchilarTuri, omborTuri),
        summa,
        valyuta,
        summaRUB,
        summaUSD,
        tavsif: `${getExpenseTypeLabel(turi)} - ${tavsif}`,
        expense: expense._id,
        woodLot,
        sana: new Date(tolovSanasi),
        yaratuvchi: req.user.userId
      });
      
      await kassaEntry.save({ session });
    }
    
    // Audit log
    await createAuditLog(req.user.userId, 'CREATE', 'Expense', expense._id, {
      turi,
      summa,
      valyuta,
      tavsif
    }, session);
    
    await session.commitTransaction();
    
    const populatedExpense = await Expense.findById(expense._id)
      .populate('woodLot', 'lotCode')
      .populate('vagon', 'vagonCode')
      .populate('yaratuvchi', 'username');
    
    res.status(201).json(populatedExpense);
  } catch (error) {
    await session.abortTransaction();
    console.error('Expense create error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Xarajatni yangilash
router.put('/:id', [auth, [
  body('summa').optional().isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').optional().isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('tavsif').optional().notEmpty().withMessage('Tavsif bo\'sh bo\'lmasligi kerak')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    // Faqat admin yoki yaratuvchi o'zgartira oladi
    if (req.user.role !== 'admin' && expense.yaratuvchi.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }
    
    const oldData = { ...expense.toObject() };
    
    // Yangilash
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        expense[key] = req.body[key];
      }
    });
    
    await expense.save({ session });
    
    // Audit log
    await createAuditLog(req.user.userId, 'UPDATE', 'Expense', expense._id, {
      oldData,
      newData: expense.toObject()
    }, session);
    
    await session.commitTransaction();
    
    const populatedExpense = await Expense.findById(expense._id)
      .populate('woodLot', 'lotCode')
      .populate('vagon', 'vagonCode')
      .populate('yaratuvchi', 'username');
    
    res.json(populatedExpense);
  } catch (error) {
    await session.abortTransaction();
    console.error('Expense update error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Xarajatni o'chirish
router.delete('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    // Faqat admin o'chira oladi
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Faqat admin o\'chira oladi' });
    }
    
    expense.isDeleted = true;
    expense.deletedAt = new Date();
    expense.deletedBy = req.user.userId;
    expense.deleteReason = req.body.reason || 'Admin tomonidan o\'chirildi';
    
    await expense.save({ session });
    
    // Bog'langan kassa yozuvini ham o'chirish
    await Kassa.updateMany(
      { expense: expense._id },
      { 
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.userId
      },
      { session }
    );
    
    // Audit log
    await createAuditLog(req.user.userId, 'DELETE', 'Expense', expense._id, {
      reason: expense.deleteReason
    }, session);
    
    await session.commitTransaction();
    
    res.json({ message: 'Xarajat o\'chirildi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Expense delete error:', error);
    res.status(500).json({ message: 'Xarajatni o\'chirishda xatolik' });
  } finally {
    session.endSession();
  }
});

// Xarajat statistikasi
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate, valyuta } = req.query;
    
    const matchFilter = { isDeleted: false };
    if (startDate || endDate) {
      matchFilter.xarajatSanasi = {};
      if (startDate) matchFilter.xarajatSanasi.$gte = new Date(startDate);
      if (endDate) matchFilter.xarajatSanasi.$lte = new Date(endDate);
    }
    if (valyuta) matchFilter.valyuta = valyuta;
    
    // Turi bo'yicha statistika
    const byType = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$turi',
          totalSumma: { $sum: '$summa' },
          totalSummaRUB: { $sum: '$summaRUB' },
          count: { $sum: 1 },
          avgSumma: { $avg: '$summa' }
        }
      },
      { $sort: { totalSumma: -1 } }
    ]);
    
    // Valyuta bo'yicha statistika
    const byCurrency = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$valyuta',
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // To'lov holati bo'yicha
    const byPaymentStatus = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$tolovHolati',
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Oylik trend
    const monthlyTrend = await Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$xarajatSanasi' },
            month: { $month: '$xarajatSanasi' },
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      byType,
      byCurrency,
      byPaymentStatus,
      monthlyTrend
    });
  } catch (error) {
    console.error('Expense stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

// To'lov qilish
router.patch('/:id/pay', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { tolovSanasi = new Date() } = req.body;
    
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    if (expense.tolovHolati === 'tolangan') {
      return res.status(400).json({ message: 'Bu xarajat allaqachon to\'langan' });
    }
    
    // To'lov qilish
    await expense.tolovQilish(new Date(tolovSanasi));
    
    // Kassaga yozuv qo'shish
    const kassaEntry = new Kassa({
      turi: 'rasxod',
      xarajatTuri: getKassaExpenseType(expense.turi, expense.transportTuri, expense.bojxonaTuri, expense.ishchilarTuri, expense.omborTuri),
      summa: expense.summa,
      valyuta: expense.valyuta,
      summaRUB: expense.summaRUB,
      summaUSD: expense.summaUSD,
      tavsif: `${getExpenseTypeLabel(expense.turi)} - ${expense.tavsif}`,
      expense: expense._id,
      woodLot: expense.woodLot,
      sana: new Date(tolovSanasi),
      yaratuvchi: req.user.userId
    });
    
    await kassaEntry.save({ session });
    
    await session.commitTransaction();
    
    res.json({ message: 'To\'lov muvaffaqiyatli amalga oshirildi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Payment error:', error);
    res.status(500).json({ message: 'To\'lovni amalga oshirishda xatolik' });
  } finally {
    session.endSession();
  }
});

// Helper functions
function getKassaExpenseType(turi, transportTuri, bojxonaTuri, ishchilarTuri, omborTuri) {
  switch (turi) {
    case 'transport':
      return transportTuri === 'yuk_tashish' ? 'transport_kelish' : 'transport_ketish';
    case 'bojxona':
      return bojxonaTuri === 'import_bojxona' ? 'bojxona_kelish' : 'bojxona_ketish';
    case 'ishchilar':
      return 'ishchilar';
    case 'ombor':
      return 'saqlanish';
    default:
      return 'boshqa';
  }
}

function getExpenseTypeLabel(turi) {
  const labels = {
    'transport': 'Transport',
    'bojxona': 'Bojxona',
    'ishchilar': 'Ishchilar',
    'ombor': 'Ombor',
    'yoqilgi': 'Yoqilg\'i',
    'tamir': 'Ta\'mir',
    'qadoqlash': 'Qadoqlash',
    'boshqa': 'Boshqa'
  };
  return labels[turi] || turi;
}

module.exports = router;