const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Kassa = require('../models/Kassa');
const auth = require('../middleware/auth');
const { cacheMiddleware, SmartInvalidation } = require('../utils/cacheManager');
const { EXPENSE_TYPES, EXPENSE_TYPE_LABELS, EXPENSE_TYPE_DETAILS } = require('../constants/expenseTypes');

const router = express.Router();

// Kengaytirilgan xarajatlar ro'yxati
router.get('/', auth, cacheMiddleware(180), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      xarajatTuri, 
      valyuta, 
      startDate, 
      endDate,
      search,
      vagon
    } = req.query;
    
    const filter = { 
      turi: 'rasxod',
      isDeleted: false 
    };
    
    if (xarajatTuri) filter.xarajatTuri = xarajatTuri;
    if (valyuta) filter.valyuta = valyuta;
    if (vagon) filter.vagon = vagon;
    
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
      .populate('client', 'name phone usd_current_debt rub_current_debt')
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
  body('xarajatTuri').isIn(EXPENSE_TYPES).withMessage('Noto\'g\'ri xarajat turi'),
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
      client,
      javobgarShaxs,
      xarajatSanasi,
      tolovSanasi,
      hujjatRaqami
    } = req.body;
    
    // User ID ni tekshirish
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Foydalanuvchi autentifikatsiya qilinmagan' });
    }

    // Qarzdorlik xarajatlari uchun client majburiy
    if (xarajatTuri === 'qarzdorlik' && !client) {
      return res.status(400).json({ message: 'Qarzdorlik xarajatlari uchun mijoz tanlanishi shart' });
    }

    // Chiqim kategoriyasidagi xarajatlar uchun vagon majburiy
    const chiqimSubTypes = ['transport_kz', 'transport_uz', 'transport_kelish', 'bojxona_nds', 'yuklash_tushirish', 'saqlanish', 'ishchilar'];
    if (chiqimSubTypes.includes(xarajatTuri) && !vagon) {
      return res.status(400).json({ message: 'Chiqim xarajatlari uchun vagon tanlanishi shart' });
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
      client: client || null,
      sana: xarajatSanasi ? new Date(xarajatSanasi) : new Date(),
      yaratuvchi: req.user.userId,
      qoshimchaMalumot: JSON.stringify({
        javobgarShaxs,
        tolovSanasi: tolovSanasi ? new Date(tolovSanasi) : null,
        hujjatRaqami,
        qoshimchaMalumot
      })
    });
    
    await kassaEntry.save({ session });
    
    // ✅ Vagon uchun xarajatni hisoblash va saqlash
    if (vagon && chiqimSubTypes.includes(xarajatTuri)) {
      const Vagon = require('../models/Vagon');
      const vagonDoc = await Vagon.findById(vagon).session(session);
      
      if (vagonDoc) {
        // Vagon modelida xarajatlar maydonini yaratish (agar yo'q bo'lsa)
        if (!vagonDoc.expenses) {
          vagonDoc.expenses = {
            USD: 0,
            RUB: 0,
            details: []
          };
        }
        
        // Xarajatni qo'shish
        if (valyuta === 'USD') {
          vagonDoc.expenses.USD = (vagonDoc.expenses.USD || 0) + summa;
        } else if (valyuta === 'RUB') {
          vagonDoc.expenses.RUB = (vagonDoc.expenses.RUB || 0) + summa;
        }
        
        // Xarajat tafsilotlarini saqlash
        if (!vagonDoc.expenses.details) {
          vagonDoc.expenses.details = [];
        }
        
        vagonDoc.expenses.details.push({
          expenseId: kassaEntry._id,
          xarajatTuri,
          summa,
          valyuta,
          tavsif,
          sana: kassaEntry.sana,
          javobgarShaxs
        });
        
        await vagonDoc.save({ session });
        
        console.log(`🚛 VAGON XARAJAT: ${vagonDoc.vagonCode} - ${summa} ${valyuta} (${xarajatTuri})`);
      }
    }
    
    // ✅ Qarzdorlik xarajatlari uchun mijozning qarziga qo'shish
    if (xarajatTuri === 'qarzdorlik' && client) {
      const Client = require('../models/Client');
      const clientDoc = await Client.findById(client).session(session);
      
      if (clientDoc) {
        if (valyuta === 'USD') {
          clientDoc.usd_total_debt += summa;
        } else if (valyuta === 'RUB') {
          clientDoc.rub_total_debt += summa;
        }
        
        await clientDoc.save({ session });
        
        console.log(`💳 QARZDORLIK: ${clientDoc.name} ga ${summa} ${valyuta} qarz berildi`);
      }
    }
    
    SmartInvalidation.onCashChange();
    
    await session.commitTransaction();
    
    const populatedExpense = await Kassa.findById(kassaEntry._id)
      .populate('vagon', 'vagonCode sending_place receiving_place')
      .populate('client', 'name phone usd_current_debt rub_current_debt')
      .populate('yaratuvchi', 'username');
    
    console.log(`💰 XARAJAT → KASSA: ${xarajatTuri} - ${summa} ${valyuta} (ID: ${kassaEntry._id})`);
    
    res.status(201).json({
      ...populatedExpense.toObject(),
      message: '✅ Xarajat muvaffaqiyatli qo\'shildi va vagon xarajatlariga qo\'shildi'
    });
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
      .populate('client', 'name phone usd_current_debt rub_current_debt')
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
    res.json(EXPENSE_TYPE_DETAILS);
  } catch (error) {
    console.error('Expense types error:', error);
    res.status(500).json({ message: 'Xarajat turlarini olishda xatolik' });
  }
});

// Helper functions
function getExpenseTypeLabel(xarajatTuri) {
  return EXPENSE_TYPE_LABELS[xarajatTuri] || xarajatTuri;
}

// Umumiy biznes hisoboti (modal uchun)
router.get('/summary/business', auth, async (req, res) => {
  try {
    // Jami sotuvlar (VagonSale dan)
    const VagonSale = require('../models/VagonSale');
    const totalSalesResult = await VagonSale.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$sale_currency',
          totalRevenue: { $sum: '$total_price' },
          totalVolume: { $sum: '$warehouse_dispatched_volume_m3' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Jami xarajatlar (Kassa dan)
    const totalExpensesResult = await Kassa.aggregate([
      { $match: { turi: 'rasxod', isDeleted: false } },
      {
        $group: {
          _id: '$valyuta',
          totalExpenses: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Jami to'lovlar (Kassa dan)
    const totalPaymentsResult = await Kassa.aggregate([
      { $match: { turi: 'kirim', isDeleted: false } },
      {
        $group: {
          _id: '$valyuta',
          totalPayments: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Ma'lumotlarni formatlash
    const formatCurrencyData = (data) => {
      const result = { USD: 0, RUB: 0 };
      data.forEach(item => {
        if (item._id === 'USD' || item._id === 'RUB') {
          result[item._id] = item.totalRevenue || item.totalExpenses || item.totalPayments || 0;
        }
      });
      return result;
    };

    const sales = formatCurrencyData(totalSalesResult);
    const expenses = formatCurrencyData(totalExpensesResult);
    const payments = formatCurrencyData(totalPaymentsResult);

    // Foyda hisoblash
    const profit = {
      USD: sales.USD - expenses.USD,
      RUB: sales.RUB - expenses.RUB
    };

    // Qarz hisoblash (sotuvlar - to'lovlar)
    const debt = {
      USD: sales.USD - payments.USD,
      RUB: sales.RUB - payments.RUB
    };

    // Jami hajm
    const totalVolumeResult = await VagonSale.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: '$warehouse_dispatched_volume_m3' },
          totalSales: { $sum: 1 }
        }
      }
    ]);

    const volumeData = totalVolumeResult[0] || { totalVolume: 0, totalSales: 0 };

    res.json({
      sales: {
        USD: sales.USD,
        RUB: sales.RUB,
        totalVolume: volumeData.totalVolume,
        totalSales: volumeData.totalSales
      },
      expenses: {
        USD: expenses.USD,
        RUB: expenses.RUB,
        totalExpenses: totalExpensesResult.reduce((sum, item) => sum + item.count, 0)
      },
      payments: {
        USD: payments.USD,
        RUB: payments.RUB
      },
      profit: {
        USD: profit.USD,
        RUB: profit.RUB
      },
      debt: {
        USD: debt.USD,
        RUB: debt.RUB
      },
      summary: {
        totalBusinessValue: sales.USD + (sales.RUB * 0.0105), // RUB ni USD ga
        totalExpenseValue: expenses.USD + (expenses.RUB * 0.0105),
        netProfit: profit.USD + (profit.RUB * 0.0105),
        totalDebt: debt.USD + (debt.RUB * 0.0105)
      }
    });
  } catch (error) {
    console.error('Business summary error:', error);
    res.status(500).json({ message: 'Biznes hisobotini olishda xatolik' });
  }
});

// Vagon bo'yicha xarajatlarni olish
router.get('/vagon/:vagonId/expenses', auth, async (req, res) => {
  try {
    const { vagonId } = req.params;
    
    const Vagon = require('../models/Vagon');
    const vagon = await Vagon.findById(vagonId);
    
    if (!vagon) {
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    // Vagon xarajatlarini olish
    const expenses = await Kassa.find({
      vagon: vagonId,
      turi: 'rasxod',
      isDeleted: false
    })
      .populate('yaratuvchi', 'username')
      .sort({ sana: -1 });
    
    // Jami xarajatlarni hisoblash
    const totalExpenses = {
      USD: vagon.expenses?.USD || 0,
      RUB: vagon.expenses?.RUB || 0
    };
    
    res.json({
      vagon: {
        _id: vagon._id,
        vagonCode: vagon.vagonCode,
        sending_place: vagon.sending_place,
        receiving_place: vagon.receiving_place
      },
      totalExpenses,
      expenses,
      expenseDetails: vagon.expenses?.details || []
    });
  } catch (error) {
    console.error('Vagon expenses error:', error);
    res.status(500).json({ message: 'Vagon xarajatlarini olishda xatolik' });
  }
});

module.exports = router;