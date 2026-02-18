const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * KRITIK MUAMMO #1 NI HAL QILISH: Qarz sinxronizatsiyasi
 * 
 * Bu helper Cash, Client va Debt modellarini sinxronlashtirishni ta'minlaydi
 * Transaction ichida ishlaydi - agar biror xato bo'lsa, hamma o'zgarishlar bekor qilinadi
 */

/**
 * Mijoz qarzini Cash jadvalidan qayta hisoblash va yangilash
 * @param {ObjectId} clientId - Mijoz ID
 * @param {ClientSession} session - MongoDB session (transaction uchun)
 * @returns {Object} - Yangilangan qarz ma'lumotlari
 */
async function syncClientDebtFromCash(clientId, session = null) {
  try {
    const Cash = require('../models/Cash');
    const Client = require('../models/Client');
    
    logger.info(`🔄 Mijoz qarzi sinxronizatsiyasi: ${clientId}`);
    
    // Cash jadvalidan barcha qarz va to'lovlarni olish
    const query = {
      client: clientId,
      isDeleted: false
    };
    
    const options = session ? { session } : {};
    
    // Qarzga sotuvlar
    const debtSales = await Cash.find({
      ...query,
      type: 'debt_sale'
    }, null, options);
    
    // To'lovlar
    const payments = await Cash.find({
      ...query,
      type: { $in: ['client_payment', 'debt_payment'] }
    }, null, options);
    
    // Valyuta bo'yicha hisoblash
    let usdDebt = 0, rubDebt = 0;
    let usdPaid = 0, rubPaid = 0;
    
    debtSales.forEach(record => {
      if (record.currency === 'USD') {
        usdDebt += record.amount || 0;
      } else if (record.currency === 'RUB') {
        rubDebt += record.amount || 0;
      }
    });
    
    payments.forEach(record => {
      if (record.currency === 'USD') {
        usdPaid += record.amount || 0;
      } else if (record.currency === 'RUB') {
        rubPaid += record.amount || 0;
      }
    });
    
    // Mijozni yangilash
    const client = session 
      ? await Client.findById(clientId).session(session)
      : await Client.findById(clientId);
    
    if (!client) {
      throw new Error(`Mijoz topilmadi: ${clientId}`);
    }
    
    const oldData = {
      usd_debt: client.usd_total_debt,
      usd_paid: client.usd_total_paid,
      rub_debt: client.rub_total_debt,
      rub_paid: client.rub_total_paid
    };
    
    client.usd_total_debt = usdDebt;
    client.usd_total_paid = usdPaid;
    client.rub_total_debt = rubDebt;
    client.rub_total_paid = rubPaid;
    
    await client.save(session ? { session } : {});
    
    logger.info(`✅ Mijoz qarzi yangilandi: ${client.name}`);
    logger.info(`   USD: ${oldData.usd_debt} → ${usdDebt} (qarz), ${oldData.usd_paid} → ${usdPaid} (to'langan)`);
    logger.info(`   RUB: ${oldData.rub_debt} → ${rubDebt} (qarz), ${oldData.rub_paid} → ${rubPaid} (to'langan)`);
    
    return {
      success: true,
      client: client.name,
      changes: {
        usd: { debt: usdDebt, paid: usdPaid, balance: usdDebt - usdPaid },
        rub: { debt: rubDebt, paid: rubPaid, balance: rubDebt - rubPaid }
      }
    };
    
  } catch (error) {
    logger.error(`❌ Mijoz qarzi sinxronizatsiyasida xatolik:`, error);
    throw error;
  }
}

/**
 * VagonSale uchun Cash va Debt yozuvlarini yaratish
 * @param {Object} sale - VagonSale dokumenti
 * @param {ClientSession} session - MongoDB session
 * @returns {Object} - Yaratilgan yozuvlar
 */
async function createSaleFinancialRecords(sale, session) {
  try {
    const Cash = require('../models/Cash');
    const Debt = require('../models/Debt');
    const Client = require('../models/Client');
    const VagonLot = require('../models/VagonLot');
    
    logger.info(`📝 Sotuv uchun moliyaviy yozuvlar yaratilmoqda: ${sale._id}`);
    
    const client = await Client.findById(sale.client).session(session);
    if (!client) {
      throw new Error(`Mijoz topilmadi: ${sale.client}`);
    }
    
    const createdRecords = {
      cashRecords: [],
      debtRecord: null
    };
    
    // 1. Qarzga sotuv yozuvi (Cash)
    const [debtSaleRecord] = await Cash.create([{
      type: 'debt_sale',
      client: sale.client,
      vagon: sale.vagon,
      vagonSale: sale._id,
      currency: sale.sale_currency,
      amount: sale.total_price,
      description: `Qarzga sotuv: ${client.name} - ${sale.total_price} ${sale.sale_currency}`,
      transaction_date: sale.sale_date || new Date()
    }], { session });
    
    createdRecords.cashRecords.push(debtSaleRecord);
    logger.info(`✅ Cash (debt_sale) yaratildi: ${sale.total_price} ${sale.sale_currency}`);
    
    // 2. To'lov yozuvi (agar to'lov bo'lsa)
    if (sale.paid_amount && sale.paid_amount > 0) {
      const [paymentRecord] = await Cash.create([{
        type: 'client_payment',
        client: sale.client,
        vagon: sale.vagon,
        vagonSale: sale._id,
        currency: sale.sale_currency,
        amount: sale.paid_amount,
        description: `${client.name} tomonidan to'lov - ${sale.paid_amount} ${sale.sale_currency}`,
        transaction_date: sale.sale_date || new Date()
      }], { session });
      
      createdRecords.cashRecords.push(paymentRecord);
      logger.info(`✅ Cash (payment) yaratildi: ${sale.paid_amount} ${sale.sale_currency}`);
    }
    
    // 3. Debt yozuvi (agar qarz bo'lsa)
    if (sale.debt && sale.debt > 0) {
      const lot = await VagonLot.findById(sale.lot).session(session);
      
      const [debtRecord] = await Debt.create([{
        client: sale.client,
        vagon: sale.vagon,
        yogoch: sale.lot,
        total_amount: sale.total_price,
        paid_amount: sale.paid_amount || 0,
        currency: sale.sale_currency,
        sold_quantity: sale.sent_quantity || Math.floor(sale.warehouse_dispatched_volume_m3 || 0),
        sale_date: sale.sale_date || new Date(),
        notes: `VagonSale: ${sale._id} - ${lot ? lot.dimensions : 'N/A'}`
      }], { session });
      
      createdRecords.debtRecord = debtRecord;
      logger.info(`✅ Debt yaratildi: ${sale.debt} ${sale.sale_currency}`);
    }
    
    // 4. Mijoz qarzini darhol yangilash (transaction ichida)
    await syncClientDebtFromCash(sale.client, session);
    
    return createdRecords;
    
  } catch (error) {
    logger.error(`❌ Moliyaviy yozuvlar yaratishda xatolik:`, error);
    throw error;
  }
}

/**
 * VagonSale o'chirilganda moliyaviy yozuvlarni o'chirish
 * @param {ObjectId} saleId - VagonSale ID
 * @param {ObjectId} clientId - Mijoz ID
 * @param {ClientSession} session - MongoDB session
 */
async function deleteSaleFinancialRecords(saleId, clientId, session) {
  try {
    const Cash = require('../models/Cash');
    const Debt = require('../models/Debt');
    
    logger.info(`🗑️ Sotuv moliyaviy yozuvlari o'chirilmoqda: ${saleId}`);
    
    // Cash yozuvlarini soft delete
    const cashResult = await Cash.updateMany(
      { vagonSale: saleId, isDeleted: false },
      { 
        $set: { 
          isDeleted: true,
          deletedAt: new Date()
        }
      },
      { session }
    );
    
    logger.info(`✅ ${cashResult.modifiedCount} ta Cash yozuv o'chirildi`);
    
    // Debt yozuvlarini soft delete
    const debtResult = await Debt.updateMany(
      { notes: { $regex: `VagonSale: ${saleId}` }, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      },
      { session }
    );
    
    logger.info(`✅ ${debtResult.modifiedCount} ta Debt yozuv o'chirildi`);
    
    // Mijoz qarzini yangilash
    await syncClientDebtFromCash(clientId, session);
    
    return {
      cashDeleted: cashResult.modifiedCount,
      debtDeleted: debtResult.modifiedCount
    };
    
  } catch (error) {
    logger.error(`❌ Moliyaviy yozuvlarni o'chirishda xatolik:`, error);
    throw error;
  }
}

/**
 * Barcha mijozlar uchun qarzni qayta hisoblash (maintenance uchun)
 */
async function recalculateAllClientDebts() {
  try {
    const Client = require('../models/Client');
    
    logger.info('🔄 Barcha mijozlar qarzi qayta hisoblanmoqda...');
    
    const clients = await Client.find({ isDeleted: false });
    const results = [];
    
    for (const client of clients) {
      try {
        const result = await syncClientDebtFromCash(client._id);
        results.push(result);
      } catch (error) {
        logger.error(`❌ Mijoz ${client.name} qarzi yangilashda xatolik:`, error);
        results.push({
          success: false,
          client: client.name,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    logger.info(`✅ ${successCount}/${clients.length} mijoz qarzi yangilandi`);
    
    return results;
    
  } catch (error) {
    logger.error('❌ Barcha mijozlar qarzini yangilashda xatolik:', error);
    throw error;
  }
}

module.exports = {
  syncClientDebtFromCash,
  createSaleFinancialRecords,
  deleteSaleFinancialRecords,
  recalculateAllClientDebts
};
