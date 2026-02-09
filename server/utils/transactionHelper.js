const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Transaction wrapper - barcha operatsiyalarni bir transaction ichida bajaradi
 * Agar biror xato bo'lsa, hamma o'zgarishlar bekor qilinadi
 */
async function withTransaction(operations, options = {}) {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      readPreference: 'primary',
      ...options
    });
    
    logger.info('🔄 Transaction boshlandi');
    
    // Operatsiyalarni bajarish
    const result = await operations(session);
    
    // Transaction'ni commit qilish
    await session.commitTransaction();
    logger.info('✅ Transaction muvaffaqiyatli yakunlandi');
    
    return { success: true, data: result };
    
  } catch (error) {
    // Xato bo'lsa, transaction'ni bekor qilish
    await session.abortTransaction();
    logger.error('❌ Transaction bekor qilindi:', error);
    
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'TRANSACTION_ERROR'
    };
    
  } finally {
    // Session'ni yopish
    session.endSession();
  }
}

/**
 * VagonSale yaratish uchun maxsus transaction
 * VagonSale + Cash + Debt + Client + VagonLot + Vagon - barchasi bir vaqtda yangilanadi
 */
async function createVagonSaleTransaction(saleData, userId) {
  return withTransaction(async (session) => {
    const VagonSale = require('../models/VagonSale');
    const Cash = require('../models/Cash');
    const Debt = require('../models/Debt');
    const Client = require('../models/Client');
    const VagonLot = require('../models/VagonLot');
    const Vagon = require('../models/Vagon');
    
    logger.info('📝 VagonSale transaction boshlandi');
    
    // 1. VagonSale yaratish
    const [sale] = await VagonSale.create([saleData], { session });
    logger.info(`✅ VagonSale yaratildi: ${sale._id}`);
    
    // 2. Cash yozuvlarini yaratish
    const cashRecords = [];
    
    // 2a. Qarzga sotuv yozuvi
    const [debtSaleRecord] = await Cash.create([{
      type: 'debt_sale',
      client: sale.client,
      vagon: sale.vagon,
      vagonSale: sale._id,
      currency: sale.sale_currency,
      amount: sale.total_price,
      description: `Qarzga sotuv - ${sale.total_price} ${sale.sale_currency}`,
      transaction_date: sale.sale_date || new Date(),
      createdBy: userId
    }], { session });
    cashRecords.push(debtSaleRecord);
    logger.info(`✅ Cash (debt_sale) yaratildi: ${debtSaleRecord._id}`);
    
    // 2b. Agar to'lov bo'lsa
    if (sale.paid_amount && sale.paid_amount > 0) {
      const [paymentRecord] = await Cash.create([{
        type: 'client_payment',
        client: sale.client,
        vagon: sale.vagon,
        vagonSale: sale._id,
        currency: sale.sale_currency,
        amount: sale.paid_amount,
        description: `Mijoz to'lovi - ${sale.paid_amount} ${sale.sale_currency}`,
        transaction_date: sale.sale_date || new Date(),
        createdBy: userId
      }], { session });
      cashRecords.push(paymentRecord);
      logger.info(`✅ Cash (payment) yaratildi: ${paymentRecord._id}`);
    }
    
    // 3. Agar qarz bo'lsa, Debt yaratish
    if (sale.debt && sale.debt > 0) {
      const [debtRecord] = await Debt.create([{
        client: sale.client,
        vagon: sale.vagon,
        yogoch: sale.lot,
        total_amount: sale.total_price,
        paid_amount: sale.paid_amount || 0,
        currency: sale.sale_currency,
        sold_quantity: sale.sent_quantity || 0,
        sale_date: sale.sale_date || new Date(),
        notes: `VagonSale: ${sale._id}`,
        createdBy: userId
      }], { session });
      logger.info(`✅ Debt yaratildi: ${debtRecord._id}`);
    }
    
    // 4. VagonLot yangilash
    const lot = await VagonLot.findById(sale.lot).session(session);
    if (lot) {
      lot.warehouse_dispatched_volume_m3 += sale.warehouse_dispatched_volume_m3 || 0;
      lot.warehouse_remaining_volume_m3 = lot.warehouse_available_volume_m3 - lot.warehouse_dispatched_volume_m3;
      await lot.save({ session });
      logger.info(`✅ VagonLot yangilandi: ${lot._id}`);
    }
    
    // 5. Client yangilash
    const client = await Client.findById(sale.client).session(session);
    if (client) {
      // Cash jadvalidan hisoblash
      const allDebtSales = await Cash.find({
        client: sale.client,
        type: 'debt_sale',
        isDeleted: false
      }).session(session);
      
      const allPayments = await Cash.find({
        client: sale.client,
        type: { $in: ['client_payment', 'debt_payment'] },
        isDeleted: false
      }).session(session);
      
      let usdDebt = 0, rubDebt = 0, usdPaid = 0, rubPaid = 0;
      
      allDebtSales.forEach(d => {
        if (d.currency === 'USD') usdDebt += d.amount;
        else if (d.currency === 'RUB') rubDebt += d.amount;
      });
      
      allPayments.forEach(p => {
        if (p.currency === 'USD') usdPaid += p.amount;
        else if (p.currency === 'RUB') rubPaid += p.amount;
      });
      
      client.usd_total_debt = usdDebt;
      client.rub_total_debt = rubDebt;
      client.usd_total_paid = usdPaid;
      client.rub_total_paid = rubPaid;
      
      await client.save({ session });
      logger.info(`✅ Client yangilandi: ${client.name}`);
    }
    
    // 6. Vagon totals yangilash
    const vagon = await Vagon.findById(sale.vagon).session(session);
    if (vagon) {
      // Vagon totals'ni qayta hisoblash
      const allLots = await VagonLot.find({ 
        vagon: vagon._id, 
        isDeleted: false 
      }).session(session);
      
      let totalVolume = 0, totalLoss = 0, soldVolume = 0;
      let usdCost = 0, usdRevenue = 0, rubCost = 0, rubRevenue = 0;
      
      allLots.forEach(lot => {
        totalVolume += lot.volume_m3 || 0;
        totalLoss += lot.loss_volume_m3 || 0;
        soldVolume += lot.warehouse_dispatched_volume_m3 || 0;
        
        if (lot.purchase_currency === 'USD') {
          usdCost += lot.purchase_amount || 0;
        } else if (lot.purchase_currency === 'RUB') {
          rubCost += lot.purchase_amount || 0;
        }
      });
      
      // Revenue hisoblash
      const allSales = await VagonSale.find({
        vagon: vagon._id,
        isDeleted: false
      }).session(session);
      
      allSales.forEach(s => {
        if (s.sale_currency === 'USD') {
          usdRevenue += s.total_price || 0;
        } else if (s.sale_currency === 'RUB') {
          rubRevenue += s.total_price || 0;
        }
      });
      
      vagon.total_volume_m3 = totalVolume;
      vagon.total_loss_m3 = totalLoss;
      vagon.available_volume_m3 = totalVolume - totalLoss;
      vagon.sold_volume_m3 = soldVolume;
      vagon.remaining_volume_m3 = vagon.available_volume_m3 - soldVolume;
      
      vagon.usd_total_cost = usdCost;
      vagon.usd_total_revenue = usdRevenue;
      vagon.usd_profit = usdRevenue - usdCost;
      
      vagon.rub_total_cost = rubCost;
      vagon.rub_total_revenue = rubRevenue;
      vagon.rub_profit = rubRevenue - rubCost;
      
      await vagon.save({ session });
      logger.info(`✅ Vagon yangilandi: ${vagon.vagonCode}`);
    }
    
    // 7. Yo'qotish liability'larini yaratish
    const { createAllLiabilities } = require('./lossLiabilityHelper');
    const liabilities = await createAllLiabilities(sale, session);
    logger.info(`✅ ${liabilities.length} ta liability yaratildi`);
    
    return {
      sale,
      cashRecords,
      client,
      lot,
      vagon,
      liabilities
    };
  });
}

/**
 * VagonSale o'chirish transaction
 */
async function deleteVagonSaleTransaction(saleId, userId) {
  return withTransaction(async (session) => {
    const VagonSale = require('../models/VagonSale');
    const Cash = require('../models/Cash');
    const Debt = require('../models/Debt');
    
    logger.info(`🗑️ VagonSale o'chirish transaction: ${saleId}`);
    
    // 1. VagonSale topish
    const sale = await VagonSale.findById(saleId).session(session);
    if (!sale) {
      throw new Error('Sotuv topilmadi');
    }
    
    // 2. Soft delete
    sale.isDeleted = true;
    sale.deletedAt = new Date();
    sale.deletedBy = userId;
    await sale.save({ session });
    
    // 3. Cash yozuvlarini o'chirish
    await Cash.updateMany(
      { vagonSale: saleId },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: userId
        } 
      },
      { session }
    );
    
    // 4. Debt yozuvlarini o'chirish
    await Debt.updateMany(
      { notes: { $regex: `VagonSale: ${saleId}` } },
      { 
        $set: { 
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId
        } 
      },
      { session }
    );
    
    // 5. VagonLot, Client, Vagon yangilash
    // (createVagonSaleTransaction'dagi kabi)
    
    logger.info(`✅ VagonSale va bog'liq yozuvlar o'chirildi`);
    
    return { deleted: true, saleId };
  });
}

module.exports = {
  withTransaction,
  createVagonSaleTransaction,
  deleteVagonSaleTransaction
};
