// Hisobot uchun business logic
const VagonSale = require('../models/VagonSale');
const Cash = require('../models/Cash');
const VagonExpense = require('../models/VagonExpense');
const Client = require('../models/Client');

/**
 * Umumiy hisobot
 */
async function getGeneralReport(filters) {
  const { startDate, endDate, valyuta } = filters;
  
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const matchStage = {};
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }
  if (valyuta) {
    matchStage.valyuta = valyuta;
  }

  const [kirim, chiqim, sotuv] = await Promise.all([
    Cash.aggregate([
      { $match: { ...matchStage, transaction_type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount_rub' } } }
    ]),
    Cash.aggregate([
      { $match: { ...matchStage, transaction_type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount_rub' } } }
    ]),
    VagonSale.aggregate([
      { $match: matchStage },
      { $group: { _id: null, total: { $sum: '$total_price' } } }
    ])
  ]);

  return {
    kirim: kirim[0]?.total || 0,
    chiqim: chiqim[0]?.total || 0,
    sotuv: sotuv[0]?.total || 0,
    foyda: (kirim[0]?.total || 0) - (chiqim[0]?.total || 0)
  };
}

/**
 * Oylik hisobot
 */
async function getMonthlyReport(year, valyuta) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const matchStage = {
    createdAt: { $gte: startDate, $lte: endDate }
  };
  if (valyuta) {
    matchStage.valyuta = valyuta;
  }

  const monthlyData = await Cash.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          month: { $month: '$createdAt' },
          transaction_type: '$transaction_type'
        },
        total: { $sum: '$amount_rub' }
      }
    },
    { $sort: { '_id.month': 1 } }
  ]);

  // Oylar bo'yicha formatlash
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    kirim: 0,
    chiqim: 0,
    foyda: 0
  }));

  monthlyData.forEach(item => {
    const monthIndex = item._id.month - 1;
    if (item._id.transaction_type === 'income') {
      months[monthIndex].kirim = item.total;
    } else if (item._id.transaction_type === 'expense') {
      months[monthIndex].chiqim = item.total;
    }
  });

  months.forEach(month => {
    month.foyda = month.kirim - month.chiqim;
  });

  return months;
}

/**
 * Foyda/zarar hisoboti
 */
async function getProfitLossReport(filters) {
  const { startDate, endDate, valyuta } = filters;

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const matchStage = {};
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  // Daromadlar
  const income = await VagonSale.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$sale_currency',
        totalSales: { $sum: '$total_price' },
        totalPaid: { $sum: '$paid_amount' },
        totalDebt: { $sum: '$debt' }
      }
    }
  ]);

  // Xarajatlar
  const expenses = await Cash.aggregate([
    {
      $match: {
        ...matchStage,
        type: { $in: ['expense', 'vagon_expense'] }
      }
    },
    {
      $group: {
        _id: '$currency',
        totalExpenses: { $sum: '$amount' }
      }
    }
  ]);

  return { income, expenses };
}

/**
 * Vagon hisobotlari
 */
async function getVagonReports(filters) {
  const { startDate, endDate, status } = filters;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  if (status) {
    matchStage.status = status;
  }

  const vagonStats = await VagonSale.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$sale_currency',
        totalSales: { $sum: '$total_price' },
        totalVolume: { $sum: '$sent_volume_m3' },
        count: { $sum: 1 }
      }
    }
  ]);

  return vagonStats;
}

/**
 * Mijoz hisobotlari
 */
async function getClientReports(filters) {
  const { startDate, endDate, debtOnly } = filters;

  const matchStage = {};
  if (debtOnly === 'true') {
    matchStage.$or = [
      { usd_current_debt: { $gt: 0 } },
      { rub_current_debt: { $gt: 0 } },
      { delivery_current_debt: { $gt: 0 } }
    ];
  }

  const clients = await Client.find(matchStage)
    .select('name phone usd_current_debt rub_current_debt delivery_current_debt usd_total_received_volume rub_total_received_volume')
    .sort({ usd_current_debt: -1 });

  return clients;
}

/**
 * Xarajat hisobotlari
 */
async function getExpenseReports(filters) {
  const { startDate, endDate, xarajatTuri, valyuta } = filters;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  if (xarajatTuri) {
    matchStage.xarajatTuri = xarajatTuri;
  }
  if (valyuta) {
    matchStage.valyuta = valyuta;
  }

  const expenses = await VagonExpense.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          expense_type: '$expense_type',
          currency: '$currency'
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  return expenses;
}


/**
 * Vagon bo'yicha xarajat va daromad tahlili
 * Har bir vagon uchun:
 * - Jami xarajatlar (Expense modelidan)
 * - Jami daromad (VagonSale modelidan)
 * - Foyda/Zarar
 */
async function getVagonFinancialReport(filters = {}) {
  try {
    console.log('📊 Starting getVagonFinancialReport with filters:', filters);
    
    const { startDate, endDate, valyuta } = filters;
    
    // Modellarni import qilish
    const Vagon = require('../models/Vagon');
    const VagonLot = require('../models/VagonLot');
    const VagonSale = require('../models/VagonSale');
    // const Expense = require('../models/Expense'); // DEPRECATED - using VagonExpense
    
    // Vagonlarni olish
    const vagons = await Vagon.find({ 
      status: { $in: ['active', 'closed'] },
      isDeleted: false 
    })
      .select('vagonCode month sending_place receiving_place status')
      .lean();

    console.log(`✅ Found ${vagons.length} vagons`);

    const vagonReports = await Promise.all(vagons.map(async (vagon) => {
      // Vagon uchun xarajatlarni hisoblash
      const expenseMatch = { 
        vagon: vagon._id,
        isDeleted: false 
      };
      if (startDate) expenseMatch.expense_date = { $gte: new Date(startDate) };
      if (endDate) expenseMatch.expense_date = { ...expenseMatch.expense_date, $lte: new Date(endDate) };
      if (valyuta) expenseMatch.currency = valyuta;

      const expenses = await VagonExpense.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: '$currency',
            totalSumma: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Vagon lotlari uchun sotuvlarni hisoblash
      const lots = await VagonLot.find({ 
        vagon: vagon._id,
        isDeleted: false 
      }).select('_id').lean();
      
      const lotIds = lots.map(lot => lot._id);

      const salesMatch = { 
        lot: { $in: lotIds },
        isDeleted: false 
      };
      if (startDate) salesMatch.sale_date = { $gte: new Date(startDate) };
      if (endDate) salesMatch.sale_date = { ...salesMatch.sale_date, $lte: new Date(endDate) };
      if (valyuta) salesMatch.sale_currency = valyuta;

      const sales = await VagonSale.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: '$sale_currency',
            totalRevenue: { $sum: '$total_price' },
            totalVolume: { $sum: '$client_received_volume_m3' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Valyuta bo'yicha guruhlash
      const usdExpense = expenses.find(e => e._id === 'USD')?.totalSumma || 0;
      const rubExpense = expenses.find(e => e._id === 'RUB')?.totalSumma || 0;
      const usdRevenue = sales.find(s => s._id === 'USD')?.totalRevenue || 0;
      const rubRevenue = sales.find(s => s._id === 'RUB')?.totalRevenue || 0;

      // RUB ni USD ga konvertatsiya (taxminiy kurs: 1 USD = 95 RUB)
      const rubToUsdRate = 0.0105; // 1 RUB = 0.0105 USD

      return {
        vagon: {
          _id: vagon._id,
          vagonCode: vagon.vagonCode,
          month: vagon.month,
          sendingPlace: vagon.sending_place,
          receivingPlace: vagon.receiving_place,
          status: vagon.status
        },
        expenses: {
          USD: usdExpense,
          RUB: rubExpense,
          total: usdExpense + (rubExpense * rubToUsdRate)
        },
        revenue: {
          USD: usdRevenue,
          RUB: rubRevenue,
          total: usdRevenue + (rubRevenue * rubToUsdRate)
        },
        profit: {
          USD: usdRevenue - usdExpense,
          RUB: rubRevenue - rubExpense,
          total: (usdRevenue + rubRevenue * rubToUsdRate) - (usdExpense + rubExpense * rubToUsdRate)
        },
        salesCount: sales.reduce((sum, s) => sum + s.count, 0),
        expensesCount: expenses.reduce((sum, e) => sum + e.count, 0)
      };
    }));

    // Foyda bo'yicha saralash (eng ko'p foydali birinchi)
    vagonReports.sort((a, b) => b.profit.total - a.profit.total);

    // Umumiy statistika
    const summary = {
      totalVagons: vagonReports.length,
      totalExpenses: vagonReports.reduce((sum, v) => sum + v.expenses.total, 0),
      totalRevenue: vagonReports.reduce((sum, v) => sum + v.revenue.total, 0),
      totalProfit: vagonReports.reduce((sum, v) => sum + v.profit.total, 0),
      profitableVagons: vagonReports.filter(v => v.profit.total > 0).length,
      lossVagons: vagonReports.filter(v => v.profit.total < 0).length
    };

    console.log('✅ Vagon financial report summary:', summary);

    return {
      vagons: vagonReports,
      summary
    };
  } catch (error) {
    console.error('❌ Error in getVagonFinancialReport:', error);
    throw error;
  }
}

module.exports = {
  getGeneralReport,
  getMonthlyReport,
  getVagonFinancialReport
};
