// Dashboard uchun business logic
const Cash = require('../models/Cash');
const Vagon = require('../models/Vagon');
const VagonSale = require('../models/VagonSale');
const Client = require('../models/Client');

/**
 * Kassa balansini hisoblash
 */
async function getCashBalance() {
  return await Cash.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$currency',
        income: {
          $sum: {
            $cond: [
              { $in: ['$type', ['client_payment', 'debt_payment', 'delivery_payment']] },
              '$amount',
              0
            ]
          }
        },
        expense: {
          $sum: {
            $cond: [
              { $in: ['$type', ['expense', 'purchase', 'vagon_expense']] },
              '$amount',
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        currency: '$_id',
        balance: { $subtract: ['$income', '$expense'] },
        income: 1,
        expense: 1
      }
    }
  ]);
}

/**
 * Bugungi statistikani olish
 */
async function getTodayStats(startOfDay, endOfDay) {
  const [sales, payments, expenses] = await Promise.all([
    VagonSale.aggregate([
      { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
      {
        $group: {
          _id: '$sale_currency',
          totalSales: { $sum: '$total_price' },
          count: { $sum: 1 }
        }
      }
    ]),
    Cash.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          type: { $in: ['client_payment', 'debt_payment', 'delivery_payment'] }
        }
      },
      {
        $group: {
          _id: '$currency',
          totalPayments: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),
    Cash.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          type: { $in: ['expense', 'vagon_expense'] }
        }
      },
      {
        $group: {
          _id: '$currency',
          totalExpenses: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return { sales, payments, expenses };
}

/**
 * Oylik statistikani olish
 */
async function getMonthlyStats(startOfMonth) {
  const [sales, payments, expenses] = await Promise.all([
    VagonSale.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      {
        $group: {
          _id: '$sale_currency',
          totalSales: { $sum: '$total_price' },
          count: { $sum: 1 }
        }
      }
    ]),
    Cash.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          type: { $in: ['client_payment', 'debt_payment', 'delivery_payment'] }
        }
      },
      {
        $group: {
          _id: '$currency',
          totalPayments: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),
    Cash.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          type: { $in: ['expense', 'vagon_expense'] }
        }
      },
      {
        $group: {
          _id: '$currency',
          totalExpenses: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return { sales, payments, expenses };
}

/**
 * Vagon statistikasini olish
 */
async function getVagonStats() {
  return await Vagon.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
}

/**
 * Mijoz statistikasini olish
 */
async function getClientStats() {
  const [totalClients, clientsWithDebt] = await Promise.all([
    Client.countDocuments(),
    Client.countDocuments({
      $or: [
        { usd_current_debt: { $gt: 0 } },
        { rub_current_debt: { $gt: 0 } },
        { delivery_current_debt: { $gt: 0 } }
      ]
    })
  ]);

  const totalDebt = await Client.aggregate([
    {
      $group: {
        _id: null,
        totalUSD: { $sum: { $max: ['$usd_current_debt', 0] } },
        totalRUB: { $sum: { $max: ['$rub_current_debt', 0] } },
        totalDelivery: { $sum: { $max: ['$delivery_current_debt', 0] } }
      }
    }
  ]);

  return {
    totalClients,
    clientsWithDebt,
    totalDebt: totalDebt[0] || { totalUSD: 0, totalRUB: 0, totalDelivery: 0 }
  };
}

/**
 * Eng ko'p qarzdor mijozlarni olish
 */
async function getTopDebtors(limit = 5) {
  return await Client.find({
    $or: [
      { usd_current_debt: { $gt: 0 } },
      { rub_current_debt: { $gt: 0 } },
      { delivery_current_debt: { $gt: 0 } }
    ]
  })
    .select('name phone usd_current_debt rub_current_debt delivery_current_debt')
    .sort({ usd_current_debt: -1 })
    .limit(limit);
}

module.exports = {
  getCashBalance,
  getTodayStats,
  getMonthlyStats,
  getVagonStats,
  getClientStats,
  getTopDebtors
};
