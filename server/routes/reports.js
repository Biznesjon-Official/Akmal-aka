const express = require('express');
const mongoose = require('mongoose');
const Cash = require('../models/Cash');
// const Wood = require('../models/Wood'); // DEPRECATED - using Vagon system
// const Sale = require('../models/Sale'); // DEPRECATED - using VagonSale
const Client = require('../models/Client');
const SystemSettings = require('../models/SystemSettings');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Import new models
const Vagon = require('../models/Vagon');
const VagonSale = require('../models/VagonSale');
// const Expense = require('../models/Expense'); // DEPRECATED - using VagonExpense

const router = express.Router();

// Simple dashboard endpoint (COMPREHENSIVE BUSINESS DASHBOARD)
router.get('/simple-dashboard', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    // Bu oyning boshi
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Parallel aggregation queries for maximum performance
    const [
      cashBalance,
      todayStats,
      monthlyStats,
      vagonStats,
      clientStats,
      deliveryStats,
      topDebtors
    ] = await Promise.all([
      // 1. KASSA BALANSI (valyuta bo'yicha)
      Cash.aggregate([
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
            expenses: {
              $sum: {
                $cond: [
                  { $in: ['$type', ['expense', 'delivery_expense', 'vagon_expense']] },
                  '$amount',
                  0
                ]
              }
            },
            balance: { $sum: '$amount' }
          }
        }
      ]),

      // 2. BUGUNGI STATISTIKA
      Cash.aggregate([
        {
          $match: {
            isDeleted: false,
            transaction_date: { $gte: startOfDay, $lt: endOfDay }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 3. OYLIK STATISTIKA
      Cash.aggregate([
        {
          $match: {
            isDeleted: false,
            transaction_date: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 4. VAGON STATISTIKASI
      Vagon.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total_volume: { $sum: '$total_volume_m3' },
            sold_volume: { $sum: '$sold_volume_m3' },
            remaining_volume: { $sum: '$remaining_volume_m3' },
            usd_revenue: { $sum: '$usd_total_revenue' },
            rub_revenue: { $sum: '$rub_total_revenue' }
          }
        }
      ]),

      // 5. MIJOZ STATISTIKASI - FIXED: Delivery qarzini ham hisobga olish
      Client.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            total_clients: { $sum: 1 },
            // USD lot qarzi bor mijozlar
            clients_with_usd_debt: {
              $sum: {
                $cond: [{ $gt: [{ $subtract: ['$usd_total_debt', '$usd_total_paid'] }, 0] }, 1, 0]
              }
            },
            // RUB lot qarzi bor mijozlar
            clients_with_rub_debt: {
              $sum: {
                $cond: [{ $gt: [{ $subtract: ['$rub_total_debt', '$rub_total_paid'] }, 0] }, 1, 0]
              }
            },
            // Delivery qarzi bor mijozlar
            clients_with_delivery_debt: {
              $sum: {
                $cond: [{ $gt: [{ $subtract: ['$delivery_total_debt', '$delivery_total_paid'] }, 0] }, 1, 0]
              }
            },
            // JAMI QARZLAR (to'langan pulni hisobga olgan holda)
            total_usd_debt: { $sum: { $subtract: ['$usd_total_debt', '$usd_total_paid'] } },
            total_rub_debt: { $sum: { $subtract: ['$rub_total_debt', '$rub_total_paid'] } },
            total_delivery_debt: { $sum: { $subtract: ['$delivery_total_debt', '$delivery_total_paid'] } },
            // Jami qabul qilingan hajm
            total_volume_received: { $sum: { $add: ['$usd_total_received_volume', '$rub_total_received_volume'] } }
          }
        }
      ]),

      // 6. DELIVERY STATISTIKASI
      mongoose.model('Delivery').aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            total_tariff: { $sum: '$totalTariff' },
            total_payment: { $sum: '$payment' },
            total_debt: { $sum: '$debt' }
          }
        }
      ]).catch(() => []), // Agar Delivery model bo'lmasa

      // 7. ENG KATTA QARZDARLAR (TOP 5) - FIXED: Delivery qarzini ham qo'shish
      Client.aggregate([
        { $match: { isDeleted: false } },
        {
          $project: {
            name: 1,
            phone: 1,
            // USD qarzi (lot sotuvlaridan)
            usd_debt: { $subtract: ['$usd_total_debt', '$usd_total_paid'] },
            // RUB qarzi (lot sotuvlaridan) - USD ga o'tkazish
            rub_debt_usd: { 
              $multiply: [
                { $subtract: ['$rub_total_debt', '$rub_total_paid'] }, 
                0.011
              ] 
            },
            // Delivery qarzi (olib kelib berish)
            delivery_debt: { $subtract: ['$delivery_total_debt', '$delivery_total_paid'] },
            // JAMI QARZ (barcha qarzlar yig'indisi)
            total_debt: {
              $add: [
                { $subtract: ['$usd_total_debt', '$usd_total_paid'] }, // USD lot qarzi
                { 
                  $multiply: [
                    { $subtract: ['$rub_total_debt', '$rub_total_paid'] }, 
                    0.011
                  ] 
                }, // RUB lot qarzi (USD da)
                { $subtract: ['$delivery_total_debt', '$delivery_total_paid'] } // Delivery qarzi
              ]
            }
          }
        },
        { $match: { total_debt: { $gt: 0 } } },
        { $sort: { total_debt: -1 } },
        { $limit: 5 }
      ])
    ]);

    // KASSA BALANSI
    const cash_balance = { USD: 0, RUB: 0 };
    const cash_details = { USD: { income: 0, expenses: 0 }, RUB: { income: 0, expenses: 0 } };
    
    cashBalance.forEach(item => {
      if (item._id === 'USD') {
        cash_balance.USD = item.balance;
        cash_details.USD = { income: item.income, expenses: item.expenses };
      }
      if (item._id === 'RUB') {
        cash_balance.RUB = item.balance;
        cash_details.RUB = { income: item.income, expenses: item.expenses };
      }
    });

    // BUGUNGI STATISTIKA
    let todayRevenue = 0;
    let todayExpenses = 0;
    let todayTransactions = 0;
    
    todayStats.forEach(item => {
      if (['client_payment', 'debt_payment', 'delivery_payment'].includes(item._id)) {
        todayRevenue += item.total;
      }
      if (['expense', 'delivery_expense', 'vagon_expense'].includes(item._id)) {
        todayExpenses += item.total;
      }
      todayTransactions += item.count;
    });

    // OYLIK STATISTIKA
    let monthlyRevenue = 0;
    let monthlyExpenses = 0;
    
    monthlyStats.forEach(item => {
      if (['client_payment', 'debt_payment', 'delivery_payment'].includes(item._id)) {
        monthlyRevenue += item.total;
      }
      if (['expense', 'delivery_expense', 'vagon_expense'].includes(item._id)) {
        monthlyExpenses += item.total;
      }
    });

    // VAGON STATISTIKASI
    const vagon_summary = {
      active: 0,
      closed: 0,
      total_volume: 0,
      sold_volume: 0,
      remaining_volume: 0,
      total_revenue_usd: 0,
      total_revenue_rub: 0
    };
    
    vagonStats.forEach(item => {
      if (item._id === 'active') vagon_summary.active = item.count;
      if (item._id === 'closed') vagon_summary.closed = item.count;
      
      vagon_summary.total_volume += item.total_volume || 0;
      vagon_summary.sold_volume += item.sold_volume || 0;
      vagon_summary.remaining_volume += item.remaining_volume || 0;
      vagon_summary.total_revenue_usd += item.usd_revenue || 0;
      vagon_summary.total_revenue_rub += item.rub_revenue || 0;
    });

    // MIJOZ STATISTIKASI
    const client_summary = clientStats[0] || {
      total_clients: 0,
      clients_with_usd_debt: 0,
      clients_with_rub_debt: 0,
      clients_with_delivery_debt: 0,
      total_usd_debt: 0,
      total_rub_debt: 0,
      total_delivery_debt: 0,
      total_volume_received: 0
    };

    // DELIVERY STATISTIKASI
    const delivery_summary = {
      pending: 0,
      partial: 0,
      paid: 0,
      total_tariff: 0,
      total_payment: 0,
      total_debt: 0
    };
    
    deliveryStats.forEach(item => {
      if (item._id === 'unpaid') delivery_summary.pending = item.count;
      if (item._id === 'partial') delivery_summary.partial = item.count;
      if (item._id === 'paid') delivery_summary.paid = item.count;
      
      delivery_summary.total_tariff += item.total_tariff || 0;
      delivery_summary.total_payment += item.total_payment || 0;
      delivery_summary.total_debt += item.total_debt || 0;
    });

    res.json({
      // MOLIYAVIY HOLAT
      cash_balance,
      cash_details,
      today_stats: {
        revenue: todayRevenue,
        expenses: todayExpenses,
        profit: todayRevenue - todayExpenses,
        transactions: todayTransactions
      },
      monthly_stats: {
        revenue: monthlyRevenue,
        expenses: monthlyExpenses,
        profit: monthlyRevenue - monthlyExpenses
      },
      
      // VAGON HOLATI
      vagon_summary,
      
      // MIJOZLAR
      client_summary,
      top_debtors: topDebtors,
      
      // OLIB KELIB BERISH
      delivery_summary,
      
      // META
      lastUpdated: new Date().toISOString(),
      period: {
        today: startOfDay.toISOString(),
        month_start: startOfMonth.toISOString()
      }
    });

  } catch (error) {
    logger.error('Simple dashboard error:', error);
    res.status(500).json({ message: 'Dashboard ma\'lumotlarini olishda xatolik', error: error.message });
  }
});

// Umumiy hisobot (faqat admin)
router.get('/general', [auth, auth.adminOnly], async (req, res) => {
  try {
    console.log('📊 Hisobot so\'rovi:', req.query);
    
    const { startDate, endDate, valyuta } = req.query;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    console.log('🔍 Date filter:', dateFilter);

    // Yog'och statistikasi
    const woodCount = await Wood.countDocuments(dateFilter);
    console.log('📦 Wood count:', woodCount);
    
    const woodStats = await Wood.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalKub: { $sum: '$kubHajmi' },
          totalTonna: { $sum: '$tonna' }
        }
      }
    ]);
    
    console.log('📊 Wood stats:', woodStats);

    // Yog'och status bo'yicha statistika
    const woodStatusStats = await Wood.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalKub: { $sum: '$kubHajmi' }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
          totalKub: 1
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📈 Wood status stats:', woodStatusStats);

    // Kassa statistikasi
    const kassaFilter = { ...dateFilter };
    if (valyuta) kassaFilter.valyuta = valyuta;
    
    const kassaStats = await Kassa.aggregate([
      { $match: kassaFilter },
      {
        $group: {
          _id: {
            turi: '$turi',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('💰 Kassa stats:', kassaStats);

    const response = {
      woodStats: woodStats.length > 0 ? woodStats[0] : { count: 0, totalKub: 0, totalTonna: 0 },
      woodStatusStats,
      kassaStats
    };
    
    console.log('✅ Response:', response);

    res.json(response);
  } catch (error) {
    console.error('❌ Hisobot xatosi:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Oylik hisobot
router.get('/monthly', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { year = new Date().getFullYear(), valyuta } = req.query;
    
    const kassaFilter = {
      sana: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      }
    };
    
    if (valyuta) kassaFilter.valyuta = valyuta;

    const monthlyData = await Kassa.aggregate([
      { $match: kassaFilter },
      {
        $group: {
          _id: {
            month: { $month: '$sana' },
            turi: '$turi',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' }
        }
      },
      {
        $group: {
          _id: {
            month: '$_id.month',
            valyuta: '$_id.valyuta'
          },
          otpr: {
            $sum: {
              $cond: [{ $eq: ['$_id.turi', 'otpr'] }, '$totalSumma', 0]
            }
          },
          prixod: {
            $sum: {
              $cond: [{ $eq: ['$_id.turi', 'prixod'] }, '$totalSumma', 0]
            }
          },
          rasxod: {
            $sum: {
              $cond: [{ $eq: ['$_id.turi', 'rasxod'] }, '$totalSumma', 0]
            }
          },
          klentPrixod: {
            $sum: {
              $cond: [{ $eq: ['$_id.turi', 'klent_prixod'] }, '$totalSumma', 0]
            }
          }
        }
      },
      {
        $addFields: {
          chistiyFoyda: {
            $subtract: [
              { $add: ['$otpr', '$prixod', '$klentPrixod'] },
              '$rasxod'
            ]
          }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    res.json(monthlyData);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Foyda/zarar hisoboti
router.get('/profit-loss', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { startDate, endDate, valyuta } = req.query;
    const filter = {};
    
    if (startDate || endDate) {
      filter.sana = {};
      if (startDate) filter.sana.$gte = new Date(startDate);
      if (endDate) filter.sana.$lte = new Date(endDate);
    }
    
    if (valyuta) filter.valyuta = valyuta;

    const profitLoss = await Kassa.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$valyuta',
          daromad: {
            $sum: {
              $cond: [
                { $in: ['$turi', ['otpr', 'prixod', 'klent_prixod']] },
                '$summa',
                0
              ]
            }
          },
          xarajat: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'rasxod'] }, '$summa', 0]
            }
          }
        }
      },
      {
        $addFields: {
          sof_foyda: { $subtract: ['$daromad', '$xarajat'] }
        }
      }
    ]);

    res.json(profitLoss);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ===== PROFESSIONAL HISOBOTLAR TIZIMI =====

// Kengaytirilgan foyda/zarar tahlili
router.get('/profit-loss-advanced', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { startDate, endDate, valyuta, period = 'month' } = req.query;
    
    const matchFilter = { isDeleted: false };
    
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }
    if (valyuta) matchFilter.valyuta = valyuta;
    
    // Umumiy foyda/zarar
    const profitLoss = await Kassa.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$valyuta',
          kirim: {
            $sum: {
              $cond: [
                { $in: ['$turi', ['prixod', 'klent_prixod']] },
                '$summa',
                0
              ]
            }
          },
          chiqim: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'rasxod'] }, '$summa', 0]
            }
          },
          otpr: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'otpr'] }, '$summa', 0]
            }
          }
        }
      },
      {
        $addFields: {
          sof_foyda: { $subtract: [{ $add: ['$kirim', '$otpr'] }, '$chiqim'] },
          rentabellik: {
            $cond: [
              { $gt: ['$chiqim', 0] },
              { $multiply: [{ $divide: [{ $subtract: [{ $add: ['$kirim', '$otpr'] }, '$chiqim'] }, '$chiqim'] }, 100] },
              0
            ]
          }
        }
      }
    ]);
    
    // Xarajat kategoriyalari bo'yicha tahlil
    const expenseByCategory = await Kassa.aggregate([
      { 
        $match: { 
          ...matchFilter,
          turi: 'rasxod'
        }
      },
      {
        $group: {
          _id: {
            xarajatTuri: '$xarajatTuri',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 },
          avgSumma: { $avg: '$summa' }
        }
      },
      { $sort: { totalSumma: -1 } }
    ]);
    
    // Daromad manbalari tahlili
    const incomeBySource = await Kassa.aggregate([
      { 
        $match: { 
          ...matchFilter,
          turi: { $in: ['prixod', 'klent_prixod'] }
        }
      },
      {
        $group: {
          _id: {
            turi: '$turi',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Trend tahlili
    const trendGroupBy = period === 'day' 
      ? { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        }
      : { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
    
    const profitTrend = await Kassa.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            ...trendGroupBy,
            valyuta: '$valyuta'
          },
          kirim: {
            $sum: {
              $cond: [
                { $in: ['$turi', ['prixod', 'klent_prixod']] },
                '$summa',
                0
              ]
            }
          },
          chiqim: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'rasxod'] }, '$summa', 0]
            }
          }
        }
      },
      {
        $addFields: {
          foyda: { $subtract: ['$kirim', '$chiqim'] }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    res.json({
      profitLoss,
      expenseByCategory,
      incomeBySource,
      profitTrend,
      period,
      dateRange: {
        startDate: startDate || 'Boshlanish yo\'q',
        endDate: endDate || 'Tugash yo\'q'
      }
    });
  } catch (error) {
    console.error('Advanced profit-loss error:', error);
    res.status(500).json({ message: 'Kengaytirilgan foyda/zarar hisobotida xatolik' });
  }
});

// Vagon hisobotlari
router.get('/vagon-reports', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { startDate, endDate, status, valyuta } = req.query;
    
    const matchFilter = { isDeleted: false };
    
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }
    if (status) matchFilter.status = status;
    
    // Kelgan vagonlar statistikasi
    const incomingVagons = await Vagon.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            status: '$status',
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 },
          totalVolume: { $sum: '$total_volume_m3' },
          totalWeight: { $sum: '$total_weight_kg' },
          avgCostPrice: { $avg: '$usd_cost_price' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Sotilgan hajm statistikasi
    const salesFilter = { isDeleted: false };
    if (startDate || endDate) {
      salesFilter.sale_date = {};
      if (startDate) salesFilter.sale_date.$gte = new Date(startDate);
      if (endDate) salesFilter.sale_date.$lte = new Date(endDate);
    }
    if (valyuta) salesFilter.sale_currency = valyuta; // FIXED: currency -> sale_currency
    
    const soldVolume = await VagonSale.aggregate([
      { $match: salesFilter },
      {
        $lookup: {
          from: 'vagonlots',
          localField: 'lot',
          foreignField: '_id',
          as: 'lotInfo'
        }
      },
      { $unwind: { path: '$lotInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            valyuta: '$sale_currency', // FIXED: currency -> sale_currency
            month: { $month: '$sale_date' },
            year: { $year: '$sale_date' }
          },
          totalSold: { $sum: '$client_received_volume_m3' }, // FIXED: volume_m3 -> client_received_volume_m3
          totalValue: { $sum: '$total_price' },
          avgPrice: { $avg: '$price_per_m3' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Qolgan hajm (status bo'yicha)
    const remainingStock = await Vagon.aggregate([
      { 
        $match: { 
          status: 'active',
          isDeleted: false
        }
      },
      {
        $group: {
          _id: 'active',
          count: { $sum: 1 },
          totalVolume: { $sum: '$remaining_volume_m3' },
          totalWeight: { $sum: '$total_weight_kg' },
          avgCostPrice: { $avg: '$usd_cost_price' }
        }
      }
    ]);
    
    // Vagon bo'yicha tannarx tahlili - Skip for now as it's complex
    const costAnalysis = [];
    
    // Vagon aylanma tezligi
    const turnoverAnalysis = await VagonSale.aggregate([
      { $match: salesFilter },
      {
        $lookup: {
          from: 'vagons',
          localField: 'vagon', // FIXED: vagon_id -> vagon
          foreignField: '_id',
          as: 'vagonInfo'
        }
      },
      { $unwind: { path: '$vagonInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$vagon', // FIXED: vagon_id -> vagon
          vagonNumber: { $first: '$vagonInfo.vagon_number' },
          totalSold: { $sum: '$client_received_volume_m3' }, // FIXED: volume_m3 -> client_received_volume_m3
          salesCount: { $sum: 1 },
          firstSale: { $min: '$sale_date' },
          lastSale: { $max: '$sale_date' },
          avgPrice: { $avg: '$price_per_m3' },
          totalRevenue: { $sum: '$total_price' }
        }
      },
      {
        $addFields: {
          daysBetweenSales: {
            $divide: [
              { $subtract: ['$lastSale', '$firstSale'] },
              86400000 // milliseconds in a day
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    res.json({
      incomingVagons,
      soldVolume,
      remainingStock,
      costAnalysis,
      turnoverAnalysis,
      summary: {
        totalVagons: incomingVagons.reduce((sum, item) => sum + item.count, 0),
        totalVolume: incomingVagons.reduce((sum, item) => sum + item.totalVolume, 0),
        soldVolume: soldVolume.reduce((sum, item) => sum + item.totalSold, 0),
        remainingVolume: remainingStock.reduce((sum, item) => sum + item.totalVolume, 0)
      }
    });
  } catch (error) {
    console.error('Vagon reports error:', error);
    res.status(500).json({ message: 'Vagon hisobotlarida xatolik', error: error.message });
  }
});

// Mijoz hisobotlari
router.get('/client-reports', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { startDate, endDate, debtOnly, paymentDiscipline } = req.query;
    
    // Qarzlar ro'yxati
    const debtList = await Client.aggregate([
      { 
        $match: { 
          isDeleted: false,
          ...(debtOnly === 'true' ? { total_debt: { $gt: 0 } } : {})
        }
      },
      {
        $lookup: {
          from: 'sales',
          localField: '_id',
          foreignField: 'client',
          as: 'sales'
        }
      },
      {
        $addFields: {
          salesCount: { $size: '$sales' },
          lastSaleDate: { $max: '$sales.sotuvSanasi' },
          avgOrderValue: { 
            $cond: [
              { $gt: [{ $size: '$sales' }, 0] },
              { $avg: '$sales.jamiSumma' },
              0
            ]
          }
        }
      },
      {
        $project: {
          name: 1,
          phone: 1,
          address: 1,
          total_debt: 1,
          total_paid: 1,
          total_received_volume: 1,
          salesCount: 1,
          lastSaleDate: 1,
          avgOrderValue: 1,
          debtRatio: {
            $cond: [
              { $gt: ['$total_paid', 0] },
              { $divide: ['$total_debt', { $add: ['$total_debt', '$total_paid'] }] },
              1
            ]
          }
        }
      },
      { $sort: { total_debt: -1 } }
    ]);
    
    // To'lov intizomi tahlili
    const paymentDisciplineAnalysis = await Sale.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(startDate || endDate ? {
            sotuvSanasi: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {})
            }
          } : {})
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      { $unwind: '$clientInfo' },
      {
        $group: {
          _id: '$client',
          clientName: { $first: '$clientInfo.name' },
          totalSales: { $sum: '$jamiSumma' },
          totalPaid: { $sum: '$tolangan' },
          salesCount: { $sum: 1 },
          avgPaymentDelay: {
            $avg: {
              $cond: [
                { $gt: ['$tolangan', 0] },
                { $divide: [
                  { $subtract: [new Date(), '$sotuvSanasi'] },
                  86400000
                ]},
                null
              ]
            }
          }
        }
      },
      {
        $addFields: {
          paymentRate: { 
            $cond: [
              { $gt: ['$totalSales', 0] },
              { $divide: ['$totalPaid', '$totalSales'] },
              0
            ]
          },
          remainingDebt: { $subtract: ['$totalSales', '$totalPaid'] }
        }
      },
      { $sort: { paymentRate: 1 } }
    ]);
    
    // Mijozlar bo'yicha daromad tahlili
    const clientRevenue = await Sale.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(startDate || endDate ? {
            sotuvSanasi: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {})
            }
          } : {})
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      { $unwind: '$clientInfo' },
      {
        $group: {
          _id: {
            client: '$client',
            valyuta: '$valyuta'
          },
          clientName: { $first: '$clientInfo.name' },
          totalRevenue: { $sum: '$jamiSumma' },
          totalVolume: { $sum: { $multiply: ['$kubHajmi', '$soni'] } },
          salesCount: { $sum: 1 },
          avgPrice: { $avg: '$birlikNarxi' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    // Top mijozlar (daromad bo'yicha)
    const topClients = await Sale.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(startDate || endDate ? {
            sotuvSanasi: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {})
            }
          } : {})
        }
      },
      {
        $group: {
          _id: '$client',
          totalRevenue: { $sum: '$jamiSumma' },
          totalVolume: { $sum: { $multiply: ['$kubHajmi', '$soni'] } },
          salesCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      { $unwind: '$clientInfo' },
      {
        $project: {
          name: '$clientInfo.name',
          phone: '$clientInfo.phone',
          totalRevenue: 1,
          totalVolume: 1,
          salesCount: 1,
          avgOrderValue: { $divide: ['$totalRevenue', '$salesCount'] }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 }
    ]);
    
    res.json({
      debtList,
      paymentDisciplineAnalysis,
      clientRevenue,
      topClients,
      summary: {
        totalClients: debtList.length,
        clientsWithDebt: debtList.filter(c => c.total_debt > 0).length,
        totalDebt: debtList.reduce((sum, c) => sum + c.total_debt, 0),
        avgPaymentRate: paymentDisciplineAnalysis.reduce((sum, c) => sum + c.paymentRate, 0) / (paymentDisciplineAnalysis.length || 1)
      }
    });
  } catch (error) {
    console.error('Client reports error:', error);
    res.status(500).json({ message: 'Mijoz hisobotlarida xatolik' });
  }
});

// Xarajat hisobotlari
router.get('/expense-reports', [auth, auth.adminOnly], async (req, res) => {
  try {
    console.log('📊 Expense Reports Request:', req.query);
    
    const { startDate, endDate, valyuta, xarajatTuri } = req.query;
    
    // Kassa modelidan xarajatlarni olish (turi: 'rasxod')
    const expenseMatchFilter = { 
      turi: 'rasxod',
      isDeleted: false 
    };
    
    if (startDate || endDate) {
      expenseMatchFilter.createdAt = {};
      if (startDate) expenseMatchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) expenseMatchFilter.createdAt.$lte = new Date(endDate);
    }
    if (valyuta) expenseMatchFilter.valyuta = valyuta;
    if (xarajatTuri) expenseMatchFilter.xarajatTuri = xarajatTuri;
    
    console.log('🔍 Expense Match Filter:', expenseMatchFilter);
    
    // Kategoriya bo'yicha xarajatlar (Kassa modelidan)
    const expenseByCategory = await Kassa.aggregate([
      { $match: expenseMatchFilter },
      {
        $group: {
          _id: {
            xarajatTuri: '$xarajatTuri',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 },
          avgSumma: { $avg: '$summa' },
          minSumma: { $min: '$summa' },
          maxSumma: { $max: '$summa' }
        }
      },
      { $sort: { totalSumma: -1 } }
    ]);
    
    console.log('📈 Expense By Category:', expenseByCategory);
    
    // Oylik dinamika
    const monthlyDynamics = await Kassa.aggregate([
      { $match: expenseMatchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            xarajatTuri: '$xarajatTuri',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Vagon bo'yicha xarajatlar
    const expenseByVagon = await Kassa.aggregate([
      { 
        $match: { 
          ...expenseMatchFilter,
          vagon: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'vagons',
          localField: 'vagon',
          foreignField: '_id',
          as: 'vagonInfo'
        }
      },
      { $unwind: { path: '$vagonInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            vagon: '$vagon',
            valyuta: '$valyuta'
          },
          vagonNumber: { $first: '$vagonInfo.vagon_number' },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 },
          avgSumma: { $avg: '$summa' }
        }
      },
      { $sort: { totalSumma: -1 } },
      { $limit: 20 }
    ]);
    
    // Eng katta xarajatlar
    const topExpenses = await Kassa
      .find(expenseMatchFilter)
      .populate('vagon', 'vagon_number')
      .populate('yaratuvchi', 'username')
      .sort({ summa: -1 })
      .limit(20);
    
    const result = {
      expenseByCategory,
      expenseByVagon,
      monthlyDynamics,
      topExpenses,
      summary: {
        totalExpenses: expenseByCategory.reduce((sum, item) => sum + item.count, 0),
        totalAmount: expenseByCategory.reduce((sum, item) => sum + item.totalSumma, 0),
        avgExpense: expenseByCategory.length > 0 
          ? expenseByCategory.reduce((sum, item) => sum + item.avgSumma, 0) / expenseByCategory.length 
          : 0,
        categoriesCount: expenseByCategory.length
      }
    };
    
    console.log('✅ Expense Reports Result:', result.summary);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Expense reports error:', error);
    res.status(500).json({ message: 'Xarajat hisobotlarida xatolik', error: error.message });
  }
});

// Tannarx va rentabellik tahlili
// Tannarx va rentabellik tahlili
router.get('/cost-profitability', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { startDate, endDate, valyuta } = req.query;
    
    // Vagon bo'yicha tannarx va rentabellik
    const vagonMatchFilter = { isDeleted: false };
    if (startDate || endDate) {
      vagonMatchFilter.createdAt = {};
      if (startDate) vagonMatchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) vagonMatchFilter.createdAt.$lte = new Date(endDate);
    }
    
    const vagonProfitability = await Vagon.aggregate([
      { $match: vagonMatchFilter },
      {
        $lookup: {
          from: 'expenses',
          let: { vagonId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$vagon', '$$vagonId'] },
                isDeleted: false
              }
            }
          ],
          as: 'expenses'
        }
      },
      {
        $lookup: {
          from: 'vagonsales',
          let: { vagonId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$vagon', '$$vagonId'] }, // FIXED: vagon_id -> vagon
                isDeleted: false
              }
            }
          ],
          as: 'sales'
        }
      },
      {
        $addFields: {
          usdExpenses: {
            $sum: {
              $map: {
                input: '$expenses',
                as: 'exp',
                in: { $cond: [{ $eq: ['$$exp.valyuta', 'USD'] }, '$$exp.summa', 0] }
              }
            }
          },
          rubExpenses: {
            $sum: {
              $map: {
                input: '$expenses',
                as: 'exp',
                in: { $cond: [{ $eq: ['$$exp.valyuta', 'RUB'] }, '$$exp.summa', 0] }
              }
            }
          },
          usdRevenue: {
            $sum: {
              $map: {
                input: '$sales',
                as: 'sale',
                in: { $cond: [{ $eq: ['$$sale.sale_currency', 'USD'] }, '$$sale.total_price', 0] } // FIXED: currency -> sale_currency
              }
            }
          },
          rubRevenue: {
            $sum: {
              $map: {
                input: '$sales',
                as: 'sale',
                in: { $cond: [{ $eq: ['$$sale.sale_currency', 'RUB'] }, '$$sale.total_price', 0] } // FIXED: currency -> sale_currency
              }
            }
          }
        }
      },
      {
        $addFields: {
          usdTotalCost: { $add: ['$usd_cost_price', '$usdExpenses'] },
          rubTotalCost: { $add: ['$rub_cost_price', '$rubExpenses'] },
          usdGrossProfit: { $subtract: ['$usdRevenue', { $add: ['$usd_cost_price', '$usdExpenses'] }] },
          rubGrossProfit: { $subtract: ['$rubRevenue', { $add: ['$rub_cost_price', '$rubExpenses'] }] }
        }
      },
      {
        $addFields: {
          usdProfitMargin: {
            $cond: [{ $gt: ['$usdRevenue', 0] }, { $multiply: [{ $divide: ['$usdGrossProfit', '$usdRevenue'] }, 100] }, 0]
          },
          rubProfitMargin: {
            $cond: [{ $gt: ['$rubRevenue', 0] }, { $multiply: [{ $divide: ['$rubGrossProfit', '$rubRevenue'] }, 100] }, 0]
          },
          usdROI: {
            $cond: [{ $gt: ['$usdTotalCost', 0] }, { $multiply: [{ $divide: ['$usdGrossProfit', '$usdTotalCost'] }, 100] }, 0]
          },
          rubROI: {
            $cond: [{ $gt: ['$rubTotalCost', 0] }, { $multiply: [{ $divide: ['$rubGrossProfit', '$rubTotalCost'] }, 100] }, 0]
          }
        }
      },
      {
        $project: {
          vagon_number: 1, // FIXED: vagonCode -> vagon_number
          status: 1,
          total_volume_m3: 1,
          sold_volume_m3: 1,
          remaining_volume_m3: 1,
          usdTotalCost: 1,
          rubTotalCost: 1,
          usdRevenue: 1,
          rubRevenue: 1,
          usdGrossProfit: 1,
          rubGrossProfit: 1,
          usdProfitMargin: 1,
          rubProfitMargin: 1,
          usdROI: 1,
          rubROI: 1,
          usdExpenses: 1,
          rubExpenses: 1
        }
      },
      { $sort: { usdGrossProfit: -1 } }
    ]);
    
    // Valyuta bo'yicha umumiy rentabellik
    console.log('🔍 Starting currencyProfitability aggregation...');
    
    const currencyProfitability = await VagonSale.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(startDate || endDate ? {
            sale_date: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {})
            }
          } : {}),
          ...(valyuta ? { sale_currency: valyuta } : {}) // FIXED: currency -> sale_currency
        }
      },
      {
        $lookup: {
          from: 'vagonlots',
          localField: 'lot', // FIXED: lot_id -> lot
          foreignField: '_id',
          as: 'lotInfo'
        }
      },
      { $unwind: { path: '$lotInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'vagons',
          localField: 'vagon', // FIXED: vagon_id -> vagon
          foreignField: '_id',
          as: 'vagonInfo'
        }
      },
      { $unwind: { path: '$vagonInfo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          // Agar lot'da cost_price bo'lsa, uni ishlatamiz, aks holda vagondan olamiz
          costPerM3: {
            $cond: [
              { $and: [{ $ne: ['$lotInfo', null] }, { $ne: ['$lotInfo.cost_price_per_m3', null] }] },
              '$lotInfo.cost_price_per_m3',
              {
                $cond: [
                  { $eq: ['$sale_currency', 'USD'] }, // FIXED: currency -> sale_currency
                  { $divide: ['$vagonInfo.usd_cost_price', { $ifNull: ['$vagonInfo.total_volume_m3', 1] }] },
                  { $divide: ['$vagonInfo.rub_cost_price', { $ifNull: ['$vagonInfo.total_volume_m3', 1] }] }
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$sale_currency', // FIXED: currency -> sale_currency
          totalRevenue: { $sum: '$total_price' },
          totalCost: { $sum: { $multiply: ['$client_received_volume_m3', { $ifNull: ['$costPerM3', 0] }] } }, // FIXED: volume_m3 -> client_received_volume_m3
          totalVolume: { $sum: '$client_received_volume_m3' }, // FIXED: volume_m3 -> client_received_volume_m3
          salesCount: { $sum: 1 },
          avgPrice: { $avg: '$price_per_m3' }
        }
      },
      {
        $addFields: {
          grossProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
          profitMargin: {
            $cond: [
              { $gt: ['$totalRevenue', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] }, 100] },
              0
            ]
          },
          roi: {
            $cond: [
              { $gt: ['$totalCost', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalCost'] }, 100] },
              0
            ]
          }
        }
      }
    ]);
    
    console.log('💰 Currency Profitability Result:', JSON.stringify(currencyProfitability, null, 2));
    
    res.json({
      vagonProfitability,
      currencyProfitability,
      summary: {
        totalVagons: vagonProfitability.length,
        profitableVagons: vagonProfitability.filter(v => (v.usdGrossProfit + v.rubGrossProfit) > 0).length,
        avgUsdProfitMargin: vagonProfitability.length > 0 
          ? vagonProfitability.reduce((sum, v) => sum + v.usdProfitMargin, 0) / vagonProfitability.length 
          : 0,
        avgRubProfitMargin: vagonProfitability.length > 0 
          ? vagonProfitability.reduce((sum, v) => sum + v.rubProfitMargin, 0) / vagonProfitability.length 
          : 0,
        totalUsdProfit: vagonProfitability.reduce((sum, v) => sum + v.usdGrossProfit, 0),
        totalRubProfit: vagonProfitability.reduce((sum, v) => sum + v.rubGrossProfit, 0)
      }
    });
  } catch (error) {
    console.error('Cost profitability error:', error);
    res.status(500).json({ message: 'Tannarx va rentabellik tahlilida xatolik', error: error.message });
  }
});


// Vagon bo'yicha moliyaviy hisobot (Kassa uchun)
router.get('/vagon-financial', auth, async (req, res) => {
  try {
    console.log('📊 Vagon financial report request from user:', req.user?.username);
    const reportService = require('../services/reportService');
    const result = await reportService.getVagonFinancialReport(req.query);
    console.log('✅ Vagon financial report generated:', {
      totalVagons: result.summary.totalVagons,
      totalExpenses: result.summary.totalExpenses,
      totalRevenue: result.summary.totalRevenue
    });
    res.json(result);
  } catch (error) {
    console.error('❌ Vagon financial report error:', error);
    res.status(500).json({ message: 'Vagon moliyaviy hisobotida xatolik', error: error.message });
  }
});

router.get('/dashboard-realtime', auth, async (req, res) => {
  try {
    // Cache tekshirish
    const now = Date.now();
    if (dashboardCache && (now - cacheTimestamp) < CACHE_DURATION) {
      res.set({
        'Cache-Control': 'public, max-age=30',
        'X-Cache': 'HIT'
      });
      return res.json(dashboardCache);
    }

    // Cache headers
    res.set({
      'Cache-Control': 'public, max-age=60',
      'ETag': `dashboard-${Math.floor(now / 60000)}`,
      'X-Cache': 'MISS'
    });

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // FAQAT ENG MUHIM MA'LUMOTLAR - Parallel execution
    const [todayStats, totalBalance, activeVagonsCount] = await Promise.all([
      // Bugungi asosiy statistika (bitta aggregation)
      Kassa.aggregate([
        {
          $facet: {
            // Bugungi ma'lumotlar
            today: [
              {
                $match: {
                  createdAt: { $gte: startOfDay },
                  isDeleted: false
                }
              },
              {
                $group: {
                  _id: null,
                  revenue: {
                    $sum: {
                      $cond: [
                        { $in: ['$turi', ['prixod', 'klent_prixod']] },
                        '$summa',
                        0
                      ]
                    }
                  },
                  expenses: {
                    $sum: {
                      $cond: [{ $eq: ['$turi', 'rasxod'] }, '$summa', 0]
                    }
                  }
                }
              },
              {
                $addFields: {
                  profit: { $subtract: ['$revenue', '$expenses'] }
                }
              }
            ],
            // Jami balans
            balance: [
              {
                $match: { isDeleted: false }
              },
              {
                $group: {
                  _id: '$valyuta',
                  total: { $sum: '$summa' }
                }
              }
            ]
          }
        }
      ]),
      
      // Jami balans (sodda)
      Kassa.aggregate([
        {
          $match: { isDeleted: false }
        },
        {
          $group: {
            _id: null,
            usd_balance: {
              $sum: {
                $cond: [{ $eq: ['$valyuta', 'USD'] }, '$summa', 0]
              }
            },
            rub_balance: {
              $sum: {
                $cond: [{ $eq: ['$valyuta', 'RUB'] }, '$summa', 0]
              }
            }
          }
        }
      ]),
      
      // Faol vagonlar (faqat count)
      mongoose.connection.db.collection('vagons').countDocuments({
        status: 'active',
        isDeleted: false
      })
    ]);

    // Ma'lumotlarni formatlash
    const todayData = todayStats[0]?.today?.[0] || { revenue: 0, expenses: 0, profit: 0 };
    const balanceData = totalBalance[0] || { usd_balance: 0, rub_balance: 0 };

    // MINIMAL response
    const response = {
      actual: {
        today_revenue_base: todayData.revenue || 0,
        today_expenses_base: todayData.expenses || 0,
        today_profit_base: todayData.profit || 0,
        cash_balance_base: balanceData.usd_balance + (balanceData.rub_balance / 12000), // Taxminiy kurs
        active_vagons: activeVagonsCount || 0,
        total_realized_profit_base: todayData.profit || 0,
        today_revenue_breakdown: [],
        cash_balance_breakdown: [
          { currency: 'USD', amount: balanceData.usd_balance },
          { currency: 'RUB', amount: balanceData.rub_balance }
        ]
      },
      projected: {
        expected_revenue_from_remaining_base: 0,
        break_even_analysis: {
          total_investment_base: 0,
          min_price_needed_base: 0,
          current_avg_price_base: 0
        },
        roi_forecast: 0,
        completion_timeline: 'N/A'
      },
      combined: {
        total_investment_base: 0,
        potential_total_revenue_base: 0,
        potential_total_profit_base: 0
      },
      alerts: [],
      system_info: {
        base_currency: 'USD',
        exchange_rates: {
          RUB_USD: 0.000083,
          USD_RUB: 12000
        }
      },
      lastUpdated: new Date().toISOString(),
      // Backward compatibility
      todayKassa: [],
      dailySales: [],
      monthlyProfit: [],
      debtClients: [],
      lowStockLots: [],
      activeTransports: []
    };

    // Cache'ga saqlash
    dashboardCache = response;
    cacheTimestamp = now;

    res.json(response);
  } catch (error) {
    console.error('❌ Dashboard xatosi:', error);
    res.status(500).json({ 
      message: 'Dashboard ma\'lumotlarini olishda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

module.exports = router;