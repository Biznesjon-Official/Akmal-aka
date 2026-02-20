const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Cash = require('../models/Cash');
const auth = require('../middleware/auth');
const { cacheMiddleware, SmartInvalidation } = require('../utils/cacheManager');
const { EXPENSE_TYPES, EXPENSE_TYPE_LABELS, EXPENSE_TYPE_DETAILS } = require('../constants/expenseTypes');
const { safeTransaction } = require('../utils/safeTransaction');
const logger = require('../utils/logger');

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
      type: 'expense',
      isDeleted: false 
    };
    
    // Cash model'da xarajatTuri field yo'q, shuning uchun description orqali filter qilamiz
    if (xarajatTuri) {
      filter.description = { $regex: xarajatTuri, $options: 'i' };
    }
    if (valyuta) filter.currency = valyuta;
    if (vagon) filter.vagon = vagon;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }
    
    const expenses = await Cash.find(filter)
      .populate('createdBy', 'username')
      .populate('vagon', 'vagonCode sending_place receiving_place')
      .populate('client', 'name phone usd_current_debt rub_current_debt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Cash.countDocuments(filter);
    
    res.json({
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Advanced expense list error:', error);
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

    // Chiqim kategoriyasidagi xarajatlar uchun vagon ixtiyoriy (majburiy emas)
    const chiqimSubTypes = ['transport_kz', 'transport_uz', 'transport_kelish', 'bojxona_nds', 'yuklash_tushirish', 'saqlanish', 'ishchilar'];
    
    // Firma xarajatlari uchun vagon va client majburiy emas
    
    // Safe transaction with automatic retry
    const result = await safeTransaction(async (session) => {

      // Chiqim kategoriyasidagi xarajatlar uchun vagon majburiy
      const chiqimSubTypes = ['transport_kz', 'transport_uz', 'transport_kelish', 'bojxona_nds', 'yuklash_tushirish', 'saqlanish', 'ishchilar'];
      
      // Cash yozuvi yaratish
      const cashEntry = new Cash({
        type: 'expense',
        amount: summa,
        currency: 'USD', // TUZATILDI: Barcha chiqimlar USD da
        description: `${getExpenseTypeLabel(xarajatTuri)} - ${tavsif}`,
        vagon: vagon || null,
        client: client || null,
        transaction_date: xarajatSanasi ? new Date(xarajatSanasi) : new Date(),
        createdBy: req.user.userId
      });
      
      await cashEntry.save({ session });
      
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
            expenseId: cashEntry._id,
            xarajatTuri,
            summa,
            valyuta,
            tavsif,
            sana: cashEntry.transaction_date,
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
      
      // ✅ Ombor/Saqlanish xarajatlari uchun StorageExpense yaratish
      if (xarajatTuri === 'saqlanish' && vagon) {
        const StorageExpense = require('../models/StorageExpense');
        const Vagon = require('../models/Vagon');
        
        const vagonDoc = await Vagon.findById(vagon).session(session);
        
        if (vagonDoc) {
          // Vagonning jami hajmini hisoblash
          const totalVolume = (vagonDoc.lots && Array.isArray(vagonDoc.lots)) 
            ? vagonDoc.lots.reduce((sum, lot) => sum + (lot.volume_m3 || 0), 0)
            : 0;
          
          // StorageExpense yaratish
          const storageExpense = new StorageExpense({
            vagon: vagon,
            expense: cashEntry._id,
            total_storage_cost: summa,
            currency: valyuta,
            total_vagon_volume_m3: totalVolume,
            remaining_volume_m3: totalVolume,
            remaining_cost: summa,
            description: tavsif,
            created_by: req.user.userId
          });
          
          await storageExpense.save({ session });
          
          console.log(`📦 OMBOR XARAJAT: ${vagonDoc.vagonCode} - ${summa} ${valyuta} (${totalVolume.toFixed(2)} m³)`);
        }
      }
      
      SmartInvalidation.onCashChange();
      
      const populatedExpense = await Cash.findById(cashEntry._id)
        .session(session)
        .populate('vagon', 'vagonCode sending_place receiving_place')
        .populate('client', 'name phone usd_current_debt rub_current_debt')
        .populate('createdBy', 'username');
      
      console.log(`💰 XARAJAT → KASSA: ${xarajatTuri} - ${summa} ${valyuta} (ID: ${cashEntry._id})`);
      
      return {
        ...populatedExpense.toObject(),
        message: '✅ Xarajat muvaffaqiyatli qo\'shildi'
      };
  }, {
    maxRetries: 5,
    onRetry: (attempt) => {
      console.log(`🔄 Xarajat qo'shish qayta urinilmoqda (${attempt}-marta)...`);
    }
  });
  
  res.status(201).json(result);
    
  } catch (error) {
    logger.error('Advanced expense create error:', error);
    
    // Write conflict xatoligini tekshirish
    const isWriteConflict = 
      error.code === 112 || 
      error.codeName === 'WriteConflict' ||
      (error.message && error.message.includes('Write conflict'));
    
    if (isWriteConflict) {
      return res.status(409).json({ 
        message: 'Tizim band, iltimos bir oz kuting va qayta urinib ko\'ring.',
        code: 'WRITE_CONFLICT'
      });
    }
    
    res.status(400).json({ message: error.message });
  }
});

// Xarajat statistikasi (kengaytirilgan)
router.get('/stats/advanced', auth, async (req, res) => {
  try {
    const { startDate, endDate, valyuta } = req.query;
    
    const matchFilter = { 
      type: 'expense',
      isDeleted: false 
    };
    
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }
    if (valyuta) matchFilter.currency = valyuta;
    
    // Xarajat turi bo'yicha statistika (description orqali)
    const byExpenseType = await Cash.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$description',
          totalSumma: { $sum: '$amount' },
          count: { $sum: 1 },
          avgSumma: { $avg: '$amount' }
        }
      },
      { $sort: { totalSumma: -1 } }
    ]);
    
    // Valyuta bo'yicha statistika
    const byCurrency = await Cash.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$currency',
          totalSumma: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Oylik trend
    const monthlyTrend = await Cash.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            currency: '$currency'
          },
          totalSumma: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Kunlik trend (oxirgi 30 kun)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyTrend = await Cash.aggregate([
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
            currency: '$currency'
          },
          totalSumma: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Top xarajatlar
    const topExpenses = await Cash.find(matchFilter)
      .sort({ amount: -1 })
      .limit(10)
      .populate('vagon', 'vagonCode sending_place receiving_place')
      .populate('createdBy', 'username');
    
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
    logger.error('Advanced expense stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

// Xarajat tafsilotlari
router.get('/:id/details', auth, async (req, res) => {
  try {
    const expense = await Cash.findById(req.params.id)
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
    logger.error('Expense details error:', error);
    res.status(500).json({ message: 'Xarajat tafsilotlarini olishda xatolik' });
  }
});

// Xarajat turlarini olish
router.get('/types/list', auth, async (req, res) => {
  try {
    // Tarjima kerak emas, chunki nomlar to'g'ridan-to'g'ri kiritilgan
    res.json(EXPENSE_TYPE_DETAILS);
  } catch (error) {
    logger.error('Expense types error:', error);
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

    // Jami xarajatlar (Cash dan)
    const totalExpensesResult = await Cash.aggregate([
      { $match: { type: 'expense', isDeleted: false } },
      {
        $group: {
          _id: '$currency',
          totalExpenses: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Jami to'lovlar (Cash dan)
    const totalPaymentsResult = await Cash.aggregate([
      { $match: { type: { $in: ['client_payment', 'debt_payment', 'vagon_sale'] }, isDeleted: false } },
      {
        $group: {
          _id: '$currency',
          totalPayments: { $sum: '$amount' },
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
    logger.error('Business summary error:', error);
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
    const expenses = await Cash.find({
      vagon: vagonId,
      type: 'expense',
      isDeleted: false
    })
      .populate('createdBy', 'username')
      .sort({ transaction_date: -1 });
    
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
    logger.error('Vagon expenses error:', error);
    res.status(500).json({ message: 'Vagon xarajatlarini olishda xatolik' });
  }
});

module.exports = router;