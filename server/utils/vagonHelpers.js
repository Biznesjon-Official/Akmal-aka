const Vagon = require('../models/Vagon');

/**
 * Vagon jami ma'lumotlarini lotlardan hisoblash va yangilash (AGGREGATION PIPELINE bilan optimizatsiya)
 * @param {String} vagonId - Vagon ID
 * @param {Object} session - Mongoose session (transaction uchun)
 */
async function updateVagonTotals(vagonId, session = null) {
  try {
    const VagonLot = require('../models/VagonLot');
    
    console.log(`🔄 Vagon ${vagonId} jami ma'lumotlari yangilanmoqda (AGGREGATION)...`);
    
    // Aggregation pipeline bilan lotlar ma'lumotlarini hisoblash
    const aggregationPipeline = [
      {
        $match: { 
          vagon: vagonId, 
          isDeleted: false 
        }
      },
      {
        $group: {
          _id: null,
          // Hajm ma'lumotlari
          total_volume_m3: { $sum: { $ifNull: ['$volume_m3', 0] } },
          total_loss_m3: { $sum: { $ifNull: ['$loss_volume_m3', 0] } },
          available_volume_m3: { $sum: { $ifNull: ['$warehouse_available_volume_m3', 0] } },
          sold_volume_m3: { $sum: { $ifNull: ['$warehouse_dispatched_volume_m3', 0] } },
          remaining_volume_m3: { $sum: { $ifNull: ['$warehouse_remaining_volume_m3', 0] } },
          
          // USD moliyaviy ma'lumotlar
          usd_lots: {
            $push: {
              $cond: [
                { $eq: ['$purchase_currency', 'USD'] },
                {
                  cost: { $ifNull: ['$total_investment', { $ifNull: ['$purchase_amount', 0] }] },
                  revenue: { $ifNull: ['$total_revenue', 0] },
                  profit: { $ifNull: ['$realized_profit', 0] }
                },
                null
              ]
            }
          },
          
          // RUB moliyaviy ma'lumotlar
          rub_lots: {
            $push: {
              $cond: [
                { $eq: ['$purchase_currency', 'RUB'] },
                {
                  cost: { $ifNull: ['$total_investment', { $ifNull: ['$purchase_amount', 0] }] },
                  revenue: { $ifNull: ['$total_revenue', 0] },
                  profit: { $ifNull: ['$realized_profit', 0] }
                },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total_volume_m3: 1,
          total_loss_m3: 1,
          available_volume_m3: 1,
          sold_volume_m3: 1,
          remaining_volume_m3: 1,
          
          // USD jami ma'lumotlar
          usd_total_cost: {
            $sum: {
              $map: {
                input: { $filter: { input: '$usd_lots', cond: { $ne: ['$$this', null] } } },
                as: 'lot',
                in: '$$lot.cost'
              }
            }
          },
          usd_total_revenue: {
            $sum: {
              $map: {
                input: { $filter: { input: '$usd_lots', cond: { $ne: ['$$this', null] } } },
                as: 'lot',
                in: '$$lot.revenue'
              }
            }
          },
          usd_profit: {
            $sum: {
              $map: {
                input: { $filter: { input: '$usd_lots', cond: { $ne: ['$$this', null] } } },
                as: 'lot',
                in: '$$lot.profit'
              }
            }
          },
          
          // RUB jami ma'lumotlar
          rub_total_cost: {
            $sum: {
              $map: {
                input: { $filter: { input: '$rub_lots', cond: { $ne: ['$$this', null] } } },
                as: 'lot',
                in: '$$lot.cost'
              }
            }
          },
          rub_total_revenue: {
            $sum: {
              $map: {
                input: { $filter: { input: '$rub_lots', cond: { $ne: ['$$this', null] } } },
                as: 'lot',
                in: '$$lot.revenue'
              }
            }
          },
          rub_profit: {
            $sum: {
              $map: {
                input: { $filter: { input: '$rub_lots', cond: { $ne: ['$$this', null] } } },
                as: 'lot',
                in: '$$lot.profit'
              }
            }
          }
        }
      }
    ];
    
    // Aggregation'ni ishga tushirish
    const aggregationQuery = VagonLot.aggregate(aggregationPipeline);
    if (session) {
      aggregationQuery.session(session).read('primary');
    }
    
    const results = await aggregationQuery;
    
    // Default qiymatlar
    const totals = {
      total_volume_m3: 0,
      total_loss_m3: 0,
      available_volume_m3: 0,
      sold_volume_m3: 0,
      remaining_volume_m3: 0,
      usd_total_cost: 0,
      usd_total_revenue: 0,
      usd_profit: 0,
      rub_total_cost: 0,
      rub_total_revenue: 0,
      rub_profit: 0
    };
    
    // Aggregation natijasini olish
    if (results.length > 0) {
      Object.assign(totals, results[0]);
    }
    
    // Vagonni yangilash - session bilan to'g'ri ishlash
    const updateQuery = session 
      ? Vagon.findById(vagonId).session(session).read('primary')
      : Vagon.findById(vagonId);
      
    const vagon = await updateQuery;
    if (vagon) {
      Object.assign(vagon, totals);
      await vagon.save({ session });
      
      console.log(`✅ Vagon ${vagonId} jami ma'lumotlari yangilandi (AGGREGATION):`, {
        total_volume: totals.total_volume_m3.toFixed(2),
        sold_volume: totals.sold_volume_m3.toFixed(2),
        remaining_volume: totals.remaining_volume_m3.toFixed(2),
        usd_cost: totals.usd_total_cost.toFixed(2),
        usd_revenue: totals.usd_total_revenue.toFixed(2),
        usd_profit: totals.usd_profit.toFixed(2),
        rub_cost: totals.rub_total_cost.toFixed(2),
        rub_revenue: totals.rub_total_revenue.toFixed(2),
        rub_profit: totals.rub_profit.toFixed(2)
      });
    }
    
    return totals;
  } catch (error) {
    console.error(`❌ Vagon ${vagonId} ma'lumotlarini yangilashda xatolik (AGGREGATION):`, error);
    throw error;
  }
}

module.exports = {
  updateVagonTotals
};