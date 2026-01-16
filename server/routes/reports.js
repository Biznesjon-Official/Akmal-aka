const express = require('express');
const Kassa = require('../models/Kassa');
const Wood = require('../models/Wood');
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

module.exports = router;