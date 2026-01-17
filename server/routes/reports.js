const express = require('express');
const mongoose = require('mongoose');
const Kassa = require('../models/Kassa');
const Wood = require('../models/Wood');
const Sale = require('../models/Sale');
const Client = require('../models/Client');
const SystemSettings = require('../models/SystemSettings');
const auth = require('../middleware/auth');

const router = express.Router();

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
    const incomingVagons = await Wood.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            status: '$status',
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 },
          totalVolume: { $sum: '$kubHajmi' },
          totalWeight: { $sum: '$tonna' },
          avgCostPrice: { $avg: '$tannarx' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Sotilgan hajm statistikasi
    const salesFilter = { isDeleted: false };
    if (startDate || endDate) {
      salesFilter.sotuvSanasi = {};
      if (startDate) salesFilter.sotuvSanasi.$gte = new Date(startDate);
      if (endDate) salesFilter.sotuvSanasi.$lte = new Date(endDate);
    }
    if (valyuta) salesFilter.valyuta = valyuta;
    
    const soldVolume = await Sale.aggregate([
      { $match: salesFilter },
      {
        $lookup: {
          from: 'woods',
          localField: 'woodLot',
          foreignField: '_id',
          as: 'woodInfo'
        }
      },
      { $unwind: '$woodInfo' },
      {
        $group: {
          _id: {
            valyuta: '$valyuta',
            month: { $month: '$sotuvSanasi' },
            year: { $year: '$sotuvSanasi' }
          },
          totalSold: { $sum: { $multiply: ['$kubHajmi', '$soni'] } },
          totalValue: { $sum: '$jamiSumma' },
          avgPrice: { $avg: '$birlikNarxi' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Qolgan hajm (status bo'yicha)
    const remainingStock = await Wood.aggregate([
      { 
        $match: { 
          status: { $in: ['omborda', 'qayta_ishlash', 'tayyor'] },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalVolume: { $sum: '$kubHajmi' },
          totalWeight: { $sum: '$tonna' },
          avgCostPrice: { $avg: '$tannarx' }
        }
      }
    ]);
    
    // Vagon bo'yicha tannarx tahlili
    const costAnalysis = await Wood.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: {
            qalinlik: '$qalinlik',
            eni: '$eni',
            uzunlik: '$uzunlik'
          },
          count: { $sum: 1 },
          totalVolume: { $sum: '$kubHajmi' },
          avgCostPrice: { $avg: '$tannarx' },
          minCostPrice: { $min: '$tannarx' },
          maxCostPrice: { $max: '$tannarx' }
        }
      },
      { $sort: { totalVolume: -1 } }
    ]);
    
    // Vagon aylanma tezligi
    const turnoverAnalysis = await Sale.aggregate([
      { $match: salesFilter },
      {
        $lookup: {
          from: 'woods',
          localField: 'woodLot',
          foreignField: '_id',
          as: 'woodInfo'
        }
      },
      { $unwind: '$woodInfo' },
      {
        $group: {
          _id: '$woodLot',
          lotCode: { $first: '$woodInfo.lotCode' },
          totalSold: { $sum: { $multiply: ['$kubHajmi', '$soni'] } },
          salesCount: { $sum: 1 },
          firstSale: { $min: '$sotuvSanasi' },
          lastSale: { $max: '$sotuvSanasi' },
          avgPrice: { $avg: '$birlikNarxi' },
          totalRevenue: { $sum: '$jamiSumma' }
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
    res.status(500).json({ message: 'Vagon hisobotlarida xatolik' });
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
    const { startDate, endDate, valyuta, xarajatTuri } = req.query;
    
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
    if (xarajatTuri) matchFilter.xarajatTuri = xarajatTuri;
    
    // Kategoriya bo'yicha xarajatlar
    const expenseByCategory = await Kassa.aggregate([
      { $match: matchFilter },
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
    
    // Vagon bo'yicha xarajatlar
    const expenseByVagon = await Kassa.aggregate([
      { 
        $match: { 
          ...matchFilter,
          woodLot: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'woods',
          localField: 'woodLot',
          foreignField: '_id',
          as: 'woodInfo'
        }
      },
      { $unwind: '$woodInfo' },
      {
        $group: {
          _id: {
            woodLot: '$woodLot',
            xarajatTuri: '$xarajatTuri',
            valyuta: '$valyuta'
          },
          lotCode: { $first: '$woodInfo.lotCode' },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.woodLot',
          lotCode: { $first: '$lotCode' },
          expenses: {
            $push: {
              xarajatTuri: '$_id.xarajatTuri',
              valyuta: '$_id.valyuta',
              totalSumma: '$totalSumma',
              count: '$count'
            }
          },
          totalExpense: { $sum: '$totalSumma' }
        }
      },
      { $sort: { totalExpense: -1 } }
    ]);
    
    // Oylik dinamika
    const monthlyDynamics = await Kassa.aggregate([
      { $match: matchFilter },
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
    
    // Xarajat samaradorligi (ROI tahlili)
    const expenseEfficiency = await Kassa.aggregate([
      { 
        $match: { 
          ...matchFilter,
          woodLot: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'woods',
          localField: 'woodLot',
          foreignField: '_id',
          as: 'woodInfo'
        }
      },
      { $unwind: '$woodInfo' },
      {
        $lookup: {
          from: 'sales',
          localField: 'woodLot',
          foreignField: 'woodLot',
          as: 'sales'
        }
      },
      {
        $group: {
          _id: '$woodLot',
          lotCode: { $first: '$woodInfo.lotCode' },
          totalExpense: { $sum: '$summa' },
          totalRevenue: { $sum: { $sum: '$sales.jamiSumma' } },
          expenseCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          roi: {
            $cond: [
              { $gt: ['$totalExpense', 0] },
              { $multiply: [
                { $divide: [
                  { $subtract: ['$totalRevenue', '$totalExpense'] },
                  '$totalExpense'
                ]},
                100
              ]},
              0
            ]
          },
          profitMargin: {
            $cond: [
              { $gt: ['$totalRevenue', 0] },
              { $multiply: [
                { $divide: [
                  { $subtract: ['$totalRevenue', '$totalExpense'] },
                  '$totalRevenue'
                ]},
                100
              ]},
              0
            ]
          }
        }
      },
      { $sort: { roi: -1 } }
    ]);
    
    // Eng katta xarajatlar
    const topExpenses = await Kassa.find(matchFilter)
      .populate('woodLot', 'lotCode')
      .populate('yaratuvchi', 'username')
      .sort({ summa: -1 })
      .limit(20);
    
    res.json({
      expenseByCategory,
      expenseByVagon,
      monthlyDynamics,
      expenseEfficiency,
      topExpenses,
      summary: {
        totalExpenses: expenseByCategory.reduce((sum, item) => sum + item.count, 0),
        totalAmount: expenseByCategory.reduce((sum, item) => sum + item.totalSumma, 0),
        avgExpense: expenseByCategory.reduce((sum, item) => sum + item.avgSumma, 0) / (expenseByCategory.length || 1),
        categoriesCount: expenseByCategory.length
      }
    });
  } catch (error) {
    console.error('Expense reports error:', error);
    res.status(500).json({ message: 'Xarajat hisobotlarida xatolik' });
  }
});

// Tannarx va rentabellik tahlili
router.get('/cost-profitability', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { startDate, endDate, valyuta } = req.query;
    
    // Lot bo'yicha tannarx va rentabellik
    const lotProfitability = await Wood.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: 'kassas',
          let: { lotId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$woodLot', '$$lotId'] },
                turi: 'rasxod',
                isDeleted: false
              }
            }
          ],
          as: 'expenses'
        }
      },
      {
        $lookup: {
          from: 'sales',
          let: { lotId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$woodLot', '$$lotId'] },
                isDeleted: false,
                ...(startDate || endDate ? {
                  sotuvSanasi: {
                    ...(startDate ? { $gte: new Date(startDate) } : {}),
                    ...(endDate ? { $lte: new Date(endDate) } : {})
                  }
                } : {}),
                ...(valyuta ? { valyuta } : {})
              }
            }
          ],
          as: 'sales'
        }
      },
      {
        $addFields: {
          totalExpenses: { $sum: '$expenses.summa' },
          totalRevenue: { $sum: '$sales.jamiSumma' },
          totalCost: { $add: ['$tannarx', { $sum: '$expenses.summa' }] }
        }
      },
      {
        $addFields: {
          grossProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
          profitMargin: {
            $cond: [
              { $gt: ['$totalRevenue', 0] },
              { $multiply: [
                { $divide: [
                  { $subtract: ['$totalRevenue', '$totalCost'] },
                  '$totalRevenue'
                ]},
                100
              ]},
              0
            ]
          },
          roi: {
            $cond: [
              { $gt: ['$totalCost', 0] },
              { $multiply: [
                { $divide: [
                  { $subtract: ['$totalRevenue', '$totalCost'] },
                  '$totalCost'
                ]},
                100
              ]},
              0
            ]
          }
        }
      },
      { $sort: { profitMargin: -1 } }
    ]);
    
    // O'lchov bo'yicha rentabellik
    const dimensionProfitability = await Wood.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: 'sales',
          localField: '_id',
          foreignField: 'woodLot',
          as: 'sales'
        }
      },
      {
        $group: {
          _id: {
            qalinlik: '$qalinlik',
            eni: '$eni',
            uzunlik: '$uzunlik'
          },
          count: { $sum: 1 },
          avgCostPrice: { $avg: '$tannarx' },
          totalVolume: { $sum: '$kubHajmi' },
          totalRevenue: { $sum: { $sum: '$sales.jamiSumma' } },
          avgSalePrice: { $avg: { $avg: '$sales.birlikNarxi' } }
        }
      },
      {
        $addFields: {
          profitPerUnit: { $subtract: ['$avgSalePrice', '$avgCostPrice'] },
          profitMargin: {
            $cond: [
              { $gt: ['$avgSalePrice', 0] },
              { $multiply: [
                { $divide: [
                  { $subtract: ['$avgSalePrice', '$avgCostPrice'] },
                  '$avgSalePrice'
                ]},
                100
              ]},
              0
            ]
          }
        }
      },
      { $sort: { profitMargin: -1 } }
    ]);
    
    // Valyuta bo'yicha rentabellik
    const currencyProfitability = await Sale.aggregate([
      {
        $match: {
          isDeleted: false,
          ...(startDate || endDate ? {
            sotuvSanasi: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {})
            }
          } : {}),
          ...(valyuta ? { valyuta } : {})
        }
      },
      {
        $lookup: {
          from: 'woods',
          localField: 'woodLot',
          foreignField: '_id',
          as: 'woodInfo'
        }
      },
      { $unwind: '$woodInfo' },
      {
        $group: {
          _id: '$valyuta',
          totalRevenue: { $sum: '$jamiSumma' },
          totalCost: { $sum: '$woodInfo.tannarx' },
          totalVolume: { $sum: { $multiply: ['$kubHajmi', '$soni'] } },
          salesCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          grossProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
          profitMargin: {
            $cond: [
              { $gt: ['$totalRevenue', 0] },
              { $multiply: [
                { $divide: [
                  { $subtract: ['$totalRevenue', '$totalCost'] },
                  '$totalRevenue'
                ]},
                100
              ]},
              0
            ]
          }
        }
      }
    ]);
    
    res.json({
      lotProfitability,
      dimensionProfitability,
      currencyProfitability,
      summary: {
        totalLots: lotProfitability.length,
        profitableLots: lotProfitability.filter(lot => lot.grossProfit > 0).length,
        avgProfitMargin: lotProfitability.reduce((sum, lot) => sum + lot.profitMargin, 0) / (lotProfitability.length || 1),
        totalGrossProfit: lotProfitability.reduce((sum, lot) => sum + lot.grossProfit, 0)
      }
    });
  } catch (error) {
    console.error('Cost profitability error:', error);
    res.status(500).json({ message: 'Tannarx va rentabellik tahlilida xatolik' });
  }
});

module.exports = router;

// Real-time dashboard ma'lumotlari (YANGI ARXITEKTURA)
router.get('/dashboard-realtime', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    // REAL MA'LUMOTLAR (Haqiqiy) - Bugun sodir bo'lgan
    const todayKassa = await Kassa.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$valyuta',
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
    ]);

    // Bugungi kassa balansi
    const cashBalance = await Kassa.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $group: {
          _id: '$valyuta',
          balance: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$turi', 'prixod'] }, then: '$summa' },
                  { case: { $eq: ['$turi', 'klent_prixod'] }, then: '$summa' },
                  { case: { $eq: ['$turi', 'rasxod'] }, then: { $multiply: ['$summa', -1] } },
                  { case: { $eq: ['$turi', 'otpr'] }, then: { $multiply: ['$summa', -1] } }
                ],
                default: 0
              }
            }
          }
        }
      }
    ]);

    // Faol vagonlar soni (haqiqiy)
    const VagonLot = require('../models/VagonLot');
    const activeVagons = await VagonLot.countDocuments({
      warehouse_remaining_volume_m3: { $gt: 0 },
      isDeleted: false
    });

    // Bugungi haqiqiy foyda (faqat to'langan sotuvlar)
    const VagonSale = require('../models/VagonSale');
    const todayRealizedProfit = await VagonSale.aggregate([
      {
        $match: {
          sale_date: { $gte: startOfDay, $lt: endOfDay },
          paid_amount: { $gt: 0 },
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: 'vagonlots',
          localField: 'lot',
          foreignField: '_id',
          as: 'lotInfo'
        }
      },
      { $unwind: '$lotInfo' },
      {
        $group: {
          _id: '$sale_currency',
          realized_profit: {
            $sum: {
              $subtract: [
                '$paid_amount',
                { $multiply: ['$client_received_volume_m3', '$lotInfo.cost_per_m3'] }
              ]
            }
          }
        }
      }
    ]);

    // PROGNOZ MA'LUMOTLAR (Kutilayotgan)
    
    // Qolgan lotlardan kutilayotgan daromad
    const expectedRevenue = await VagonLot.aggregate([
      {
        $match: {
          warehouse_remaining_volume_m3: { $gt: 0 },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$purchase_currency',
          remaining_investment: { $sum: '$unrealized_value' },
          remaining_volume: { $sum: '$warehouse_remaining_volume_m3' },
          avg_cost_per_m3: { $avg: '$cost_per_m3' }
        }
      }
    ]);

    // Break-even tahlil
    const breakEvenAnalysis = await VagonLot.aggregate([
      {
        $match: {
          warehouse_remaining_volume_m3: { $gt: 0 },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          total_investment: { $sum: '$total_investment' },
          total_revenue: { $sum: '$total_revenue' },
          remaining_volume: { $sum: '$warehouse_remaining_volume_m3' },
          avg_break_even_price: { $avg: '$break_even_price_per_m3' }
        }
      }
    ]);

    // O'rtacha sotuv narxi (oxirgi 30 kun)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const avgSalePrice = await VagonSale.aggregate([
      {
        $match: {
          sale_date: { $gte: thirtyDaysAgo },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$sale_currency',
          avg_price: { $avg: '$price_per_m3' },
          total_volume: { $sum: '$client_received_volume_m3' }
        }
      }
    ]);

    // ROI prognozi
    const roiForecast = breakEvenAnalysis.length > 0 && avgSalePrice.length > 0 ? 
      ((avgSalePrice[0].avg_price - breakEvenAnalysis[0].avg_break_even_price) / breakEvenAnalysis[0].avg_break_even_price * 100) : 0;

    // ARALASH MA'LUMOTLAR (Real + Prognoz)
    const totalInvestment = await VagonLot.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $group: {
          _id: '$purchase_currency',
          total: { $sum: '$total_investment' }
        }
      }
    ]);

    const potentialRevenue = await VagonLot.aggregate([
      {
        $match: { isDeleted: false }
      },
      {
        $group: {
          _id: '$purchase_currency',
          realized: { $sum: '$total_revenue' },
          potential_from_remaining: {
            $sum: {
              $multiply: [
                '$warehouse_remaining_volume_m3',
                { $ifNull: [{ $avg: '$price_per_m3' }, '$break_even_price_per_m3'] }
              ]
            }
          }
        }
      },
      {
        $addFields: {
          total_potential: { $add: ['$realized', '$potential_from_remaining'] }
        }
      }
    ]);

    // OGOHLANTIRISHLAR
    const alerts = [];

    // Qarz bo'lgan mijozlar
    const Client = require('../models/Client');
    const debtClients = await Client.find({
      $or: [
        { usd_current_debt: { $gt: 1000 } },
        { rub_current_debt: { $gt: 90000 } } // ~1000 USD ekvivalenti
      ],
      isDeleted: false
    }).select('name usd_current_debt rub_current_debt').sort({ 
      usd_current_debt: -1, 
      rub_current_debt: -1 
    }).limit(5);

    debtClients.forEach(client => {
      const usdDebt = client.usd_current_debt || 0;
      const rubDebt = client.rub_current_debt || 0;
      let debtMessage = '';
      
      if (usdDebt > 0 && rubDebt > 0) {
        debtMessage = `$${usdDebt.toLocaleString()} USD + ${rubDebt.toLocaleString()} ₽ RUB qarz`;
      } else if (usdDebt > 0) {
        debtMessage = `$${usdDebt.toLocaleString()} USD qarz`;
      } else if (rubDebt > 0) {
        debtMessage = `${rubDebt.toLocaleString()} ₽ RUB qarz`;
      }
      
      if (debtMessage) {
        alerts.push({
          type: 'warning',
          message: `${client.name}: ${debtMessage}`,
          action_needed: usdDebt > 5000 || rubDebt > 450000 // 5000 USD yoki ekvivalenti
        });
      }
    });

    // Kam qolgan lotlar
    const lowStockLots = await VagonLot.find({
      warehouse_remaining_volume_m3: { $lt: 5, $gt: 0 },
      isDeleted: false
    }).select('vagon warehouse_remaining_volume_m3').populate('vagon', 'vagon_number').limit(5);

    lowStockLots.forEach(lot => {
      alerts.push({
        type: 'info',
        message: `Vagon ${lot.vagon?.vagon_number}: ${lot.warehouse_remaining_volume_m3.toFixed(2)} m³ qoldi`,
        action_needed: lot.warehouse_remaining_volume_m3 < 2
      });
    });

    // Transport kechikishlari
    const Vagon = require('../models/Vagon');
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const delayedTransports = await Vagon.find({
      status: { $in: ['transport', 'loading'] },
      updatedAt: { $lt: sevenDaysAgo },
      isDeleted: false
    }).select('vagon_number status updatedAt').limit(3);

    delayedTransports.forEach(vagon => {
      const daysDelayed = Math.floor((today - vagon.updatedAt) / (24 * 60 * 60 * 1000));
      alerts.push({
        type: 'error',
        message: `Vagon ${vagon.vagon_number}: ${daysDelayed} kun ${vagon.status} holatida`,
        action_needed: true
      });
    });

    // BACKWARD COMPATIBILITY (eski format)
    const dailySales = await VagonSale.aggregate([
      {
        $match: {
          sale_date: { $gte: thirtyDaysAgo },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$sale_date' } },
            valyuta: '$sale_currency'
          },
          totalSales: { $sum: '$total_price' },
          count: { $sum: 1 },
          totalVolume: { $sum: '$client_received_volume_m3' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    const monthlyProfit = await Kassa.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(today.getFullYear() - 1, today.getMonth(), 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            valyuta: '$valyuta'
          },
          prixod: {
            $sum: {
              $cond: [
                { $in: ['$turi', ['prixod', 'klent_prixod']] },
                '$summa',
                0
              ]
            }
          },
          rasxod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'rasxod'] }, '$summa', 0]
            }
          }
        }
      },
      {
        $addFields: {
          profit: { $subtract: ['$prixod', '$rasxod'] }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // YANGI FORMAT RESPONSE (UNIFIED CURRENCY)
    res.json({
      // REAL MA'LUMOTLAR (Haqiqiy) - Asosiy valyutada
      actual: {
        today_revenue_base: await convertCurrencyArray(todayKassa, 'revenue'),
        today_expenses_base: await convertCurrencyArray(todayKassa, 'expenses'),
        today_profit_base: await convertCurrencyArray(todayKassa, 'profit'),
        cash_balance_base: await convertCurrencyArray(cashBalance, 'balance'),
        active_vagons: activeVagons,
        total_realized_profit_base: await convertCurrencyArray(todayRealizedProfit, 'realized_profit'),
        
        // Original currency breakdown
        today_revenue_breakdown: todayKassa,
        cash_balance_breakdown: cashBalance
      },
      
      // PROGNOZ MA'LUMOTLAR (Kutilayotgan) - Asosiy valyutada
      projected: {
        expected_revenue_from_remaining_base: await convertToBaseCurrency(expectedRevenue.reduce((sum, item) => sum + (item.remaining_volume * item.avg_cost_per_m3 * 1.2), 0)),
        break_even_analysis: {
          total_investment_base: await convertToBaseCurrency(breakEvenAnalysis[0]?.total_investment || 0),
          min_price_needed_base: await convertToBaseCurrency(breakEvenAnalysis[0]?.avg_break_even_price || 0),
          current_avg_price_base: await convertToBaseCurrency(avgSalePrice[0]?.avg_price || 0)
        },
        roi_forecast: roiForecast,
        completion_timeline: `${Math.ceil((expectedRevenue.reduce((sum, item) => sum + item.remaining_volume, 0) / 50))} oy`
      },
      
      // ARALASH MA'LUMOTLAR (Real + Prognoz) - Asosiy valyutada
      combined: {
        total_investment_base: await convertToBaseCurrency(totalInvestment.reduce((sum, item) => sum + item.total, 0)),
        potential_total_revenue_base: await convertToBaseCurrency(potentialRevenue.reduce((sum, item) => sum + item.total_potential, 0)),
        potential_total_profit_base: await convertToBaseCurrency(potentialRevenue.reduce((sum, item) => sum + item.total_potential, 0) - totalInvestment.reduce((sum, item) => sum + item.total, 0))
      },
      
      // OGOHLANTIRISHLAR
      alerts: alerts.slice(0, 10),
      
      // ESKI FORMAT (Backward compatibility)
      todayKassa: todayKassa,
      dailySales: dailySales,
      monthlyProfit: monthlyProfit,
      debtClients: debtClients,
      lowStockLots: lowStockLots,
      activeTransports: delayedTransports,
      lastUpdated: new Date(),
      
      // TIZIM MA'LUMOTLARI
      system_info: {
        base_currency: await SystemSettings.getBaseCurrency(),
        exchange_rates: {
          RUB_USD: await SystemSettings.getCurrentExchangeRate('RUB', 'USD'),
          USD_RUB: await SystemSettings.getCurrentExchangeRate('USD', 'RUB')
        }
      }
    });
    
    // Helper function: Valyutani asosiy valyutaga konvertatsiya
    async function convertToBaseCurrency(amount, currency = 'USD') {
      try {
        const SystemSettings = require('../models/SystemSettings');
        const result = await SystemSettings.convertToBaseCurrency(amount, currency);
        return result.amount;
      } catch (error) {
        console.error('Currency conversion error:', error);
        return amount;
      }
    }
    
    // Helper function: Array elementlarini konvertatsiya qilish
    async function convertCurrencyArray(array, field) {
      let total = 0;
      for (const item of array) {
        const amount = item[field] || 0;
        const currency = item._id || 'USD';
        const converted = await convertToBaseCurrency(amount, currency);
        total += converted;
      }
      return total;
    }
  } catch (error) {
    console.error('Dashboard realtime error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kunlik sotuv statistikasi
router.get('/daily-sales', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const dailyStats = await Sale.aggregate([
      {
        $match: {
          sotuvSanasi: { $gte: daysAgo },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$sotuvSanasi' } },
            valyuta: '$valyuta'
          },
          totalSales: { $sum: '$jamiSumma' },
          count: { $sum: 1 },
          avgPrice: { $avg: '$birlikNarxi' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json(dailyStats);
  } catch (error) {
    console.error('Daily sales error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa balans real-time
router.get('/balance-realtime', auth, async (req, res) => {
  try {
    const balance = await Kassa.aggregate([
      {
        $group: {
          _id: '$valyuta',
          otpr: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'otpr'] }, { $multiply: ['$summa', -1] }, 0]
            }
          },
          prixod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'prixod'] }, '$summa', 0]
            }
          },
          rasxod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'rasxod'] }, { $multiply: ['$summa', -1] }, 0]
            }
          },
          klentPrixod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'klent_prixod'] }, '$summa', 0]
            }
          }
        }
      },
      {
        $addFields: {
          chistiyPrixod: {
            $add: ['$otpr', '$prixod', '$rasxod', '$klentPrixod']
          }
        }
      }
    ]);

    res.json(balance);
  } catch (error) {
    console.error('Balance realtime error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Ogohlantirishlar
router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = [];

    // Qarz bo'lgan mijozlar
    const debtClients = await Client.find({
      total_debt: { $gt: 1000 }, // 1000$ dan ko'p qarz
      isDeleted: false
    }).select('name total_debt').sort({ total_debt: -1 });

    debtClients.forEach(client => {
      alerts.push({
        type: 'debt',
        priority: client.total_debt > 5000 ? 'high' : 'medium',
        title: `Qarz: ${client.name}`,
        message: `${client.total_debt.toLocaleString()} USD qarz`,
        data: client
      });
    });

    // Tugagan lotlar
    const lowStock = await Wood.find({
      status: { $in: ['omborda', 'qayta_ishlash'] },
      kubHajmi: { $lt: 3 }
    }).select('lotCode kubHajmi');

    lowStock.forEach(lot => {
      alerts.push({
        type: 'low_stock',
        priority: lot.kubHajmi < 1 ? 'high' : 'medium',
        title: `Kam qoldi: ${lot.lotCode}`,
        message: `${lot.kubHajmi.toFixed(2)} m³ qoldi`,
        data: lot
      });
    });

    // Uzoq vaqt transport holatida bo'lgan lotlar
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stuckTransports = await Wood.find({
      status: { $in: ['transport_kelish', 'transport_ketish'] },
      updatedAt: { $lt: sevenDaysAgo }
    }).select('lotCode status updatedAt');

    stuckTransports.forEach(lot => {
      const daysStuck = Math.floor((Date.now() - lot.updatedAt) / (24 * 60 * 60 * 1000));
      alerts.push({
        type: 'transport_delay',
        priority: daysStuck > 14 ? 'high' : 'medium',
        title: `Transport kechikmoqda: ${lot.lotCode}`,
        message: `${daysStuck} kun ${lot.status} holatida`,
        data: lot
      });
    });

    // Prioritet bo'yicha saralash
    alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    res.json(alerts.slice(0, 20)); // Faqat 20 ta eng muhim ogohlantirish
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;