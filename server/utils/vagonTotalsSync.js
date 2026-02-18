/**
 * KRITIK MUAMMO #6 NI HAL QILISH: Vagon totals avtomatik yangilanmaydi
 * 
 * Bu helper Vagon jami ma'lumotlarini VagonLot va VagonSale'dan qayta hisoblaydi
 */

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Vagon jami ma'lumotlarini qayta hisoblash
 * @param {ObjectId} vagonId - Vagon ID
 * @param {ClientSession} session - MongoDB session (transaction uchun)
 * @returns {Object} - Yangilangan ma'lumotlar
 */
async function recalculateVagonTotals(vagonId, session = null) {
  try {
    const Vagon = require('../models/Vagon');
    const VagonLot = require('../models/VagonLot');
    const VagonSale = require('../models/VagonSale');
    const VagonExpense = require('../models/VagonExpense');
    const { getActiveExchangeRate } = require('./exchangeRateHelper');
    
    logger.info(`🔄 Vagon totals qayta hisoblanmoqda: ${vagonId}`);
    
    const options = session ? { session } : {};
    
    // Vagonni olish
    const vagon = session 
      ? await Vagon.findById(vagonId).session(session)
      : await Vagon.findById(vagonId);
    
    if (!vagon) {
      throw new Error(`Vagon topilmadi: ${vagonId}`);
    }
    
    // Eng so'nggi valyuta kursini olish
    let usdToRubRate = 90; // Default: 1 USD = 90 RUB
    try {
      usdToRubRate = await getActiveExchangeRate('USD', 'RUB');
    } catch (error) {
      logger.warn(`⚠️ Valyuta kursi topilmadi, default ishlatiladi: ${usdToRubRate}`);
    }
    
    logger.info(`💱 Valyuta kursi: 1 USD = ${usdToRubRate} RUB`);
    
    // Barcha lotlarni olish
    const lots = await VagonLot.find({
      vagon: vagonId,
      isDeleted: false
    }, null, options);
    
    // Barcha sotuvlarni olish
    const sales = await VagonSale.find({
      vagon: vagonId,
      isDeleted: false
    }, null, options);
    
    // Barcha xarajatlarni olish
    const expenses = await VagonExpense.find({
      vagon: vagonId,
      isDeleted: false
    }, null, options);
    
    // Hajm ma'lumotlarini hisoblash
    let totalVolume = 0;
    let totalLoss = 0;
    let dispatchedVolume = 0;
    
    lots.forEach(lot => {
      totalVolume += lot.volume_m3 || 0;
      totalLoss += lot.loss_volume_m3 || 0;
      dispatchedVolume += lot.warehouse_dispatched_volume_m3 || 0;
    });
    
    const availableVolume = totalVolume - totalLoss;
    const remainingVolume = availableVolume - dispatchedVolume;
    
    // Moliyaviy ma'lumotlarni hisoblash (valyuta bo'yicha)
    let usdCost = 0, rubCost = 0;
    let usdRevenue = 0, rubRevenue = 0;
    let usdExpenses = 0, rubExpenses = 0;
    
    // Xarid xarajatlari (lotlardan)
    // MUHIM: Yog'och har doim RUB da sotib olinadi
    lots.forEach(lot => {
      if (lot.purchase_currency === 'RUB') {
        rubCost += lot.purchase_amount || 0;
      }
      // USD da yog'och sotib olish qo'llab-quvvatlanmaydi
    });
    
    // Daromad (sotuvlardan)
    sales.forEach(sale => {
      if (sale.sale_currency === 'USD') {
        usdRevenue += sale.total_price || 0;
      } else if (sale.sale_currency === 'RUB') {
        rubRevenue += sale.total_price || 0;
      }
    });
    
    // Qo'shimcha xarajatlar
    // MUHIM: USD xarajatlar va RUB yo'g'och xaridi
    expenses.forEach(expense => {
      if (expense.currency === 'USD') {
        usdExpenses += expense.amount || 0;
      } else if (expense.currency === 'RUB') {
        // Yo'g'och xaridi RUB da kiritilgan bo'lsa
        rubExpenses += expense.amount || 0;
      }
    });
    
    // Jami xarajat
    // usdCost = 0 (chunki yog'och har doim RUB da)
    const usdTotalCost = usdCost + usdExpenses; // = 0 + usdExpenses = usdExpenses
    const rubTotalCost = rubCost + rubExpenses; // = rubCost + 0 = rubCost
    
    // RUB ni USD ga konvertatsiya qilish
    const rubTotalCostInUsd = rubTotalCost / usdToRubRate;
    
    // Jami xarajat USD da = USD xarajatlar + RUB yog'och (USD ga o'tkazilgan)
    const totalCostInUsd = usdTotalCost + rubTotalCostInUsd;
    
    logger.info(`💰 Xarajatlar:`);
    logger.info(`   Yog'och (RUB): ${rubTotalCost.toFixed(2)} RUB / ${usdToRubRate} = ${rubTotalCostInUsd.toFixed(2)} USD`);
    logger.info(`   Qo'shimcha (USD): ${usdTotalCost.toFixed(2)} USD`);
    logger.info(`   Jami: ${totalCostInUsd.toFixed(2)} USD`);
    
    // Foyda = Daromad - Jami xarajat
    const usdProfit = usdRevenue - usdTotalCost;
    const rubProfit = rubRevenue - rubTotalCost;
    
    // YANGI: Tannarx hisoblash (faqat USD da, m³ uchun)
    const costPerM3Usd = totalVolume > 0 ? totalCostInUsd / totalVolume : 0;
    
    logger.info(`📊 Tannarx: ${costPerM3Usd.toFixed(2)} USD/m³ (${totalCostInUsd.toFixed(2)} USD / ${totalVolume.toFixed(2)} m³)`);
    
    // Vagonni yangilash
    const oldData = {
      total_volume_m3: vagon.total_volume_m3,
      sold_volume_m3: vagon.sold_volume_m3,
      usd_profit: vagon.usd_profit,
      rub_profit: vagon.rub_profit
    };
    
    vagon.total_volume_m3 = totalVolume;
    vagon.total_loss_m3 = totalLoss;
    vagon.available_volume_m3 = availableVolume;
    vagon.sold_volume_m3 = dispatchedVolume;
    vagon.remaining_volume_m3 = remainingVolume;
    
    vagon.usd_total_cost = usdTotalCost;
    vagon.usd_total_revenue = usdRevenue;
    vagon.usd_profit = usdProfit;
    
    vagon.rub_total_cost = rubTotalCost;
    vagon.rub_total_revenue = rubRevenue;
    vagon.rub_profit = rubProfit;
    
    // YANGI: Tannarxni saqlash (faqat USD da)
    vagon.usd_cost_per_m3 = costPerM3Usd;
    vagon.rub_cost_per_m3 = 0; // Endi ishlatilmaydi, hammasi USD da
    
    await vagon.save(session ? { session } : {});
    
    logger.info(`✅ Vagon totals yangilandi: ${vagon.vagonCode}`);
    logger.info(`   Hajm: ${oldData.total_volume_m3} → ${totalVolume} m³`);
    logger.info(`   Sotilgan: ${oldData.sold_volume_m3} → ${dispatchedVolume} m³`);
    logger.info(`   USD foyda: ${oldData.usd_profit} → ${usdProfit}`);
    logger.info(`   RUB foyda: ${oldData.rub_profit} → ${rubProfit}`);
    logger.info(`   Tannarx: ${costPerM3Usd.toFixed(2)} USD/m³`);
    
    return {
      success: true,
      vagonCode: vagon.vagonCode,
      changes: {
        volume: { old: oldData.total_volume_m3, new: totalVolume },
        sold: { old: oldData.sold_volume_m3, new: dispatchedVolume },
        usd_profit: { old: oldData.usd_profit, new: usdProfit },
        rub_profit: { old: oldData.rub_profit, new: rubProfit }
      },
      totals: {
        volume: totalVolume,
        loss: totalLoss,
        available: availableVolume,
        dispatched: dispatchedVolume,
        remaining: remainingVolume,
        usd: {
          cost: usdTotalCost,
          revenue: usdRevenue,
          profit: usdProfit
        },
        rub: {
          cost: rubTotalCost,
          revenue: rubRevenue,
          profit: rubProfit
        }
      }
    };
    
  } catch (error) {
    logger.error(`❌ Vagon totals qayta hisoblashda xatolik:`, error);
    throw error;
  }
}

/**
 * Barcha vagonlar uchun totals'ni qayta hisoblash (maintenance uchun)
 */
async function recalculateAllVagonTotals() {
  try {
    const Vagon = require('../models/Vagon');
    
    logger.info('🔄 Barcha vagonlar totals qayta hisoblanmoqda...');
    
    const vagons = await Vagon.find({ isDeleted: false });
    const results = [];
    
    for (const vagon of vagons) {
      try {
        const result = await recalculateVagonTotals(vagon._id);
        results.push(result);
      } catch (error) {
        logger.error(`❌ Vagon ${vagon.vagonCode} totals yangilashda xatolik:`, error);
        results.push({
          success: false,
          vagonCode: vagon.vagonCode,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    logger.info(`✅ ${successCount}/${vagons.length} vagon totals yangilandi`);
    
    return results;
    
  } catch (error) {
    logger.error('❌ Barcha vagonlar totals yangilashda xatolik:', error);
    throw error;
  }
}

/**
 * VagonLot o'zgarganda Vagon totals'ni yangilash
 * Post-save hook'dan chaqiriladi
 */
async function onLotChange(lotDoc) {
  try {
    if (lotDoc.vagon) {
      await recalculateVagonTotals(lotDoc.vagon);
    }
  } catch (error) {
    logger.error('❌ Lot o\'zgarishida Vagon yangilashda xatolik:', error);
    // Xatolik asosiy jarayonni to'xtatmasligi kerak
  }
}

/**
 * VagonSale o'zgarganda Vagon totals'ni yangilash
 * Post-save hook'dan chaqiriladi
 */
async function onSaleChange(saleDoc) {
  try {
    if (saleDoc.vagon) {
      await recalculateVagonTotals(saleDoc.vagon);
    }
  } catch (error) {
    logger.error('❌ Sotuv o\'zgarishida Vagon yangilashda xatolik:', error);
    // Xatolik asosiy jarayonni to'xtatmasligi kerak
  }
}

module.exports = {
  recalculateVagonTotals,
  recalculateAllVagonTotals,
  onLotChange,
  onSaleChange
};
