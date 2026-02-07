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
      const oldStatus = vagon.status;
      Object.assign(vagon, totals);
      
      // MUHIM: Status avtomatik boshqarish
      // Vagon faqat quyidagi shartlarda avtomatik yopiladi:
      // 1. Jami hajm mavjud (lotlar qo'shilgan)
      // 2. Qolgan hajm 0 ga teng yoki kamroq (0.001 m³ toleransiya bilan)
      // 3. Sotilgan hajm mavjud (hech bo'lmaganda biror narsa sotilgan)
      const hasVolume = totals.total_volume_m3 > 0;
      const hasSales = totals.sold_volume_m3 > 0;
      
      // Floating point xatolari uchun toleransiya
      const CLOSE_THRESHOLD = 0.001; // 0.001 m³ (1 litr) dan kam bo'lsa 0 deb hisoblanadi
      
      if (hasVolume) {
        // Agar qolgan hajm 0 ga teng VA sotuvlar bo'lgan bo'lsa → closed
        // Bu yangi vagonlar (lotlar qo'shilgan lekin hali sotilmagan) yopilishini oldini oladi
        if (totals.remaining_volume_m3 <= CLOSE_THRESHOLD && hasSales && vagon.status === 'active') {
          vagon.status = 'closed';
          vagon.closure_date = new Date();
          vagon.closure_reason = 'fully_sold';
          console.log(`🔒 Vagon ${vagonId} statusini o'zgartirish: ${oldStatus} → closed (qolgan hajm: ${totals.remaining_volume_m3}, sotilgan: ${totals.sold_volume_m3})`);
        } else if (totals.remaining_volume_m3 > CLOSE_THRESHOLD && vagon.status === 'closed') {
          // Agar qolgan hajm bor bo'lsa, vagonni qayta ochish
          vagon.status = 'active';
          vagon.closure_date = null;
          vagon.closure_reason = null;
          console.log(`🔓 Vagon ${vagonId} statusini o'zgartirish: ${oldStatus} → active (qolgan hajm: ${totals.remaining_volume_m3})`);
        }
      } else {
        // Agar vagon yangi va lotlar yo'q bo'lsa, statusni active qoldirish
        if (vagon.status === 'closed') {
          vagon.status = 'active';
          vagon.closure_date = null;
          vagon.closure_reason = null;
          console.log(`🔓 Vagon ${vagonId} statusini active ga qaytarish (lotlar yo'q)`);
        }
      }
      
      await vagon.save({ session });
      
      console.log(`✅ Vagon ${vagonId} jami ma'lumotlari yangilandi (AGGREGATION):`, {
        status: vagon.status,
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