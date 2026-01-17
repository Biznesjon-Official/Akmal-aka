const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Kassa = require('../models/Kassa');
const auth = require('../middleware/auth');

const router = express.Router();

// Kengaytirilgan xarajatlar ro'yxati
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      xarajatTuri, 
      valyuta, 
      startDate, 
      endDate,
      search
    } = req.query;
    
    const filter = { 
      turi: 'rasxod',
      isDeleted: false 
    };
    
    if (xarajatTuri) filter.xarajatTuri = xarajatTuri;
    if (valyuta) filter.valyuta = valyuta;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.tavsif = { $regex: search, $options: 'i' };
    }
    
    const expenses = await Kassa.find(filter)
      .populate('yaratuvchi', 'username')
      .populate('vagon', 'vagonCode sending_place receiving_place')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Kassa.countDocuments(filter);
    
    res.json({
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Advanced expense list error:', error);
    res.status(500).json({ message: 'Xarajatlar ro\'yxatini olishda xatolik' });
  }
});

// Yangi xarajat qo'shish (kengaytirilgan)
router.post('/', [auth, [
  body('xarajatTuri').isIn([
    'transport_kelish', 'transport_ketish', 'bojxona_kelish', 'bojxona_ketish',
    'yuklash_tushirish', 'saqlanish', 'ishchilar', 'qayta_ishlash', 'boshqa'
  ]).withMessage('Noto\'g\'ri xarajat turi'),
  body('summa').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('tavsif').notEmpty().withMessage('Tavsif kiritilishi shart'),
  body('javobgarShaxs').notEmpty().withMessage('Javobgar shaxs kiritilishi shart')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      xarajatTuri,
      summa,
      valyuta,
      summaRUB,
      summaUSD,
      tavsif,
      qoshimchaMalumot,
      vagon,
      javobgarShaxs,
      xarajatSanasi,
      tolovSanasi,
      hujjatRaqami
    } = req.body;
    
    // User ID ni tekshirish
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Foydalanuvchi autentifikatsiya qilinmagan' });
    }

    // Kassa yozuvi yaratish
    const kassaEntry = new Kassa({
      turi: 'rasxod',
      xarajatTuri,
      summa,
      valyuta,
      summaRUB: summaRUB || summa,
      summaUSD: summaUSD || 0,
      tavsif: `${getExpenseTypeLabel(xarajatTuri)} - ${tavsif}`,
      vagon: vagon || null,
      sana: xarajatSanasi ? new Date(xarajatSanasi) : new Date(),
      yaratuvchi: req.user.userId, // userId ni ishlatamiz
      // Qo'shimcha ma'lumotlar
      qoshimchaMalumot: JSON.stringify({
        javobgarShaxs,
        tolovSanasi: tolovSanasi ? new Date(tolovSanasi) : null,
        hujjatRaqami,
        qoshimchaMalumot
      })
    });
    
    await kassaEntry.save({ session });
    
    await session.commitTransaction();
    
    const populatedExpense = await Kassa.findById(kassaEntry._id)
      .populate('vagon', 'vagonCode sending_place receiving_place')
      .populate('yaratuvchi', 'username');
    
    res.status(201).json(populatedExpense);
  } catch (error) {
    await session.abortTransaction();
    console.error('Advanced expense create error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Xarajat statistikasi (kengaytirilgan)
router.get('/stats/advanced', auth, async (req, res) => {
  try {
    const { startDate, endDate, valyuta } = req.query;
    
    const matchFilter = { 
      turi: 'rasxod',
      isDeleted: false 
    };
    
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }
    if (valyuta) matchFilter.valyuta = valyuta;
    
    // Xarajat turi bo'yicha statistika
    const byExpenseType = await Kassa.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$xarajatTuri',
          totalSumma: { $sum: '$summa' },
          totalSummaRUB: { $sum: '$summaRUB' },
          count: { $sum: 1 },
          avgSumma: { $avg: '$summa' }
        }
      },
      { $sort: { totalSumma: -1 } }
    ]);
    
    // Valyuta bo'yicha statistika
    const byCurrency = await Kassa.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$valyuta',
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Oylik trend
    const monthlyTrend = await Kassa.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            valyuta: '$valyuta',
            xarajatTuri: '$xarajatTuri'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Kunlik trend (oxirgi 30 kun)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyTrend = await Kassa.aggregate([
      { 
        $match: { 
          ...matchFilter,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Top xarajatlar
    const topExpenses = await Kassa.find(matchFilter)
      .sort({ summa: -1 })
      .limit(10)
      .populate('vagon', 'vagonCode sending_place receiving_place')
      .populate('yaratuvchi', 'username');
    
    res.json({
      byExpenseType,
      byCurrency,
      monthlyTrend,
      dailyTrend,
      topExpenses,
      summary: {
        totalExpenses: byExpenseType.reduce((sum, item) => sum + item.count, 0),
        totalAmount: byCurrency.reduce((sum, item) => sum + item.totalSumma, 0),
        avgExpense: byExpenseType.reduce((sum, item) => sum + item.avgSumma, 0) / (byExpenseType.length || 1)
      }
    });
  } catch (error) {
    console.error('Advanced expense stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

// Xarajat tafsilotlari
router.get('/:id/details', auth, async (req, res) => {
  try {
    const expense = await Kassa.findById(req.params.id)
      .populate('vagon', 'vagonCode sending_place receiving_place')
      .populate('yaratuvchi', 'username');
    
    if (!expense) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    // Qo'shimcha ma'lumotlarni parse qilish
    let additionalInfo = {};
    try {
      if (expense.qoshimchaMalumot) {
        additionalInfo = JSON.parse(expense.qoshimchaMalumot);
      }
    } catch (e) {
      console.log('Additional info parse error:', e);
    }
    
    res.json({
      ...expense.toObject(),
      additionalInfo
    });
  } catch (error) {
    console.error('Expense details error:', error);
    res.status(500).json({ message: 'Xarajat tafsilotlarini olishda xatolik' });
  }
});

// Xarajat turlarini olish
router.get('/types/list', auth, async (req, res) => {
  try {
    const expenseTypes = [
      {
        id: 'transport_kelish',
        name: 'Transport (Kelish)',
        description: 'Rossiya → O\'zbekiston transport xarajatlari',
        icon: '🚛➡️',
        category: 'transport',
        subTypes: ['yuk_tashish', 'yoqilgi', 'yol_haqi', 'haydovchi_maoshi']
      },
      {
        id: 'transport_ketish',
        name: 'Transport (Ketish)',
        description: 'O\'zbekiston → Rossiya transport xarajatlari',
        icon: '🚛⬅️',
        category: 'transport',
        subTypes: ['yuk_tashish', 'yoqilgi', 'yol_haqi', 'haydovchi_maoshi']
      },
      {
        id: 'bojxona_kelish',
        name: 'Bojxona (Import)',
        description: 'Import bojxona to\'lovlari va rasmiylashtirish',
        icon: '🛃📥',
        category: 'bojxona',
        subTypes: ['bojxona_tolovi', 'rasmiylashtirish', 'ekspertiza', 'sertifikat']
      },
      {
        id: 'bojxona_ketish',
        name: 'Bojxona (Export)',
        description: 'Export bojxona to\'lovlari va rasmiylashtirish',
        icon: '🛃📤',
        category: 'bojxona',
        subTypes: ['bojxona_tolovi', 'rasmiylashtirish', 'ekspertiza', 'sertifikat']
      },
      {
        id: 'yuklash_tushirish',
        name: 'Yuklash/Tushirish',
        description: 'Yog\'ochni yuklash va tushirish xizmatlari',
        icon: '📦⬆️⬇️',
        category: 'ishchilar',
        subTypes: ['yuklash', 'tushirish', 'saralash', 'qadoqlash']
      },
      {
        id: 'saqlanish',
        name: 'Ombor/Saqlanish',
        description: 'Omborda saqlash va boshqa xarajatlar',
        icon: '🏢📦',
        category: 'ombor',
        subTypes: ['ijara', 'qoriqlash', 'kommunal', 'tamir', 'jihozlar']
      },
      {
        id: 'ishchilar',
        name: 'Ishchilar maoshi',
        description: 'Ishchilar maoshi va mehnat haqqi',
        icon: '👷💰',
        category: 'ishchilar',
        subTypes: ['maosh', 'ustama', 'bonus', 'ijtimoiy']
      },
      {
        id: 'qayta_ishlash',
        name: 'Qayta ishlash',
        description: 'Yog\'ochni qayta ishlash, kesish va tayyorlash',
        icon: '⚙️🪚',
        category: 'ishlov',
        subTypes: ['kesish', 'silliqlash', 'qadoqlash', 'belgilash']
      },
      {
        id: 'boshqa',
        name: 'Boshqa xarajatlar',
        description: 'Boshqa turli xil xarajatlar',
        icon: '📝💸',
        category: 'boshqa',
        subTypes: ['tamir', 'aloqa', 'ofis', 'boshqaruv']
      }
    ];
    
    res.json(expenseTypes);
  } catch (error) {
    console.error('Expense types error:', error);
    res.status(500).json({ message: 'Xarajat turlarini olishda xatolik' });
  }
});

// Helper functions
function getExpenseTypeLabel(xarajatTuri) {
  const labels = {
    'transport_kelish': 'Transport (Kelish)',
    'transport_ketish': 'Transport (Ketish)',
    'bojxona_kelish': 'Bojxona (Import)',
    'bojxona_ketish': 'Bojxona (Export)',
    'yuklash_tushirish': 'Yuklash/Tushirish',
    'saqlanish': 'Ombor/Saqlanish',
    'ishchilar': 'Ishchilar',
    'qayta_ishlash': 'Qayta ishlash',
    'boshqa': 'Boshqa'
  };
  return labels[xarajatTuri] || xarajatTuri;
}

module.exports = router;