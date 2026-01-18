const Vagon = require('../models/Vagon');

/**
 * Vagon jami ma'lumotlarini lotlardan hisoblash va yangilash
 * @param {String} vagonId - Vagon ID
 * @param {Object} session - Mongoose session (transaction uchun)
 */
async function updateVagonTotals(vagonId, session = null) {
  try {
    const VagonLot = require('../models/VagonLot');
    
    // Vagon bo'yicha barcha lotlarni olish
    const query = VagonLot.find({ 
      vagon: vagonId, 
      isDeleted: false 
    });
    
    if (session) {
      query.session(session);
    }
    
    const lots = await query;
    
    if (lots.length === 0) {
      console.log(`⚠️ Vagon ${vagonId} uchun lotlar topilmadi`);
      return;
    }
    
    // Jami ma'lumotlarni hisoblash
    let totals = {
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
    
    lots.forEach(lot => {
      // Hajm ma'lumotlari (xavfsiz hisoblash)
      totals.total_volume_m3 += lot.volume_m3 || 0;
      totals.total_loss_m3 += lot.loss_volume_m3 || 0;
      totals.available_volume_m3 += lot.warehouse_available_volume_m3 || lot.available_volume_m3 || 0;
      totals.sold_volume_m3 += lot.warehouse_dispatched_volume_m3 || lot.sold_volume_m3 || 0;
      totals.remaining_volume_m3 += lot.warehouse_remaining_volume_m3 || lot.remaining_volume_m3 || 0;
      
      // Moliyaviy ma'lumotlar (valyuta bo'yicha, yangi terminologiya bilan)
      if (lot.purchase_currency === 'USD') {
        totals.usd_total_cost += lot.total_investment || lot.purchase_amount || 0;
        totals.usd_total_revenue += lot.total_revenue || 0;
        totals.usd_profit += lot.realized_profit || 0;
      } else if (lot.purchase_currency === 'RUB') {
        totals.rub_total_cost += lot.total_investment || lot.purchase_amount || 0;
        totals.rub_total_revenue += lot.total_revenue || 0;
        totals.rub_profit += lot.realized_profit || 0;
      }
    });
    
    // Vagonni yangilash - session bilan to'g'ri ishlash
    const vagon = await Vagon.findById(vagonId).session(session);
    if (vagon) {
      Object.assign(vagon, totals);
      await vagon.save({ session });
      
      console.log(`✅ Vagon ${vagonId} jami ma'lumotlari yangilandi:`, {
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
    console.error(`❌ Vagon ${vagonId} ma'lumotlarini yangilashda xatolik:`, error);
    throw error;
  }
}

module.exports = {
  updateVagonTotals
};
