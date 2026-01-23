const Client = require('../models/Client');
const VagonSale = require('../models/VagonSale');
const Delivery = require('../models/Delivery');
const Cash = require('../models/Cash');

/**
 * Mijozning barcha qarzlarini qayta hisoblash (VagonSale + Delivery)
 */
async function updateClientTotalDebts(clientId, session = null) {
  console.log(`🔄 Mijoz ${clientId} ning barcha qarzlari qayta hisoblanmoqda...`);
  
  try {
    // Mijozni topish
    const client = session 
      ? await Client.findById(clientId).session(session)
      : await Client.findById(clientId);
    
    if (!client) {
      throw new Error(`Mijoz topilmadi: ${clientId}`);
    }
    
    // 1. VAGON SALE QARZLARI
    const vagonSales = session
      ? await VagonSale.find({ client: clientId, isDeleted: false }).session(session)
      : await VagonSale.find({ client: clientId, isDeleted: false });
    
    let usdVagonDebt = 0;
    let rubVagonDebt = 0;
    let usdVagonVolume = 0;
    let rubVagonVolume = 0;
    
    vagonSales.forEach(sale => {
      if (sale.sale_currency === 'USD') {
        usdVagonDebt += sale.total_price || 0;
        usdVagonVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
      } else if (sale.sale_currency === 'RUB') {
        rubVagonDebt += sale.total_price || 0;
        rubVagonVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
      }
    });
    
    // 2. DELIVERY QARZLARI
    const deliveries = session
      ? await Delivery.find({ client: clientId, isDeleted: false }).session(session)
      : await Delivery.find({ client: clientId, isDeleted: false });
    
    let deliveryDebt = 0;
    
    deliveries.forEach(delivery => {
      deliveryDebt += delivery.totalTariff || 0;
    });
    
    // 3. TO'LOVLAR
    const payments = session
      ? await Cash.find({
          client: clientId,
          type: { $in: ['client_payment', 'debt_payment', 'delivery_payment'] },
          isDeleted: false
        }).session(session)
      : await Cash.find({
          client: clientId,
          type: { $in: ['client_payment', 'debt_payment', 'delivery_payment'] },
          isDeleted: false
        });
    
    let usdVagonPaid = 0;
    let rubVagonPaid = 0;
    let deliveryPaid = 0;
    
    payments.forEach(payment => {
      if (payment.type === 'delivery_payment') {
        deliveryPaid += payment.amount || 0;
      } else if (payment.currency === 'USD') {
        usdVagonPaid += payment.amount || 0;
      } else if (payment.currency === 'RUB') {
        rubVagonPaid += payment.amount || 0;
      }
    });
    
    // 4. MIJOZNI YANGILASH
    const oldData = {
      usd_total_debt: client.usd_total_debt,
      usd_total_paid: client.usd_total_paid,
      rub_total_debt: client.rub_total_debt,
      rub_total_paid: client.rub_total_paid,
      delivery_total_debt: client.delivery_total_debt,
      delivery_total_paid: client.delivery_total_paid
    };
    
    client.usd_total_debt = usdVagonDebt;
    client.usd_total_paid = usdVagonPaid;
    client.usd_total_received_volume = usdVagonVolume;
    
    client.rub_total_debt = rubVagonDebt;
    client.rub_total_paid = rubVagonPaid;
    client.rub_total_received_volume = rubVagonVolume;
    
    client.delivery_total_debt = deliveryDebt;
    client.delivery_total_paid = deliveryPaid;
    
    if (session) {
      await client.save({ session });
    } else {
      await client.save();
    }
    
    console.log(`✅ Mijoz ${client.name} qarzlari yangilandi:`);
    console.log(`   USD Vagon: qarz ${usdVagonDebt}, to'langan ${usdVagonPaid}`);
    console.log(`   RUB Vagon: qarz ${rubVagonDebt}, to'langan ${rubVagonPaid}`);
    console.log(`   Olib kelib berish: qarz ${deliveryDebt}, to'langan ${deliveryPaid}`);
    
    return {
      updated: true,
      oldData,
      newData: {
        usd_total_debt: client.usd_total_debt,
        usd_total_paid: client.usd_total_paid,
        rub_total_debt: client.rub_total_debt,
        rub_total_paid: client.rub_total_paid,
        delivery_total_debt: client.delivery_total_debt,
        delivery_total_paid: client.delivery_total_paid
      }
    };
    
  } catch (error) {
    console.error(`❌ Mijoz ${clientId} qarzlarini yangilashda xatolik:`, error);
    throw error;
  }
}

/**
 * Mijozning delivery qarzini yangilash
 */
async function updateClientDeliveryDebt(clientId, session = null) {
  console.log(`🚚 Mijoz ${clientId} ning olib kelib berish qarzi yangilanmoqda...`);
  
  try {
    const client = session 
      ? await Client.findById(clientId).session(session)
      : await Client.findById(clientId);
    
    if (!client) {
      throw new Error(`Mijoz topilmadi: ${clientId}`);
    }
    
    console.log(`   Mijoz topildi: ${client.name}`);
    
    // Delivery qarzlari
    const deliveries = session
      ? await Delivery.find({ client: clientId, isDeleted: false }).session(session)
      : await Delivery.find({ client: clientId, isDeleted: false });
    
    console.log(`   Topilgan olib kelib berish: ${deliveries.length} ta`);
    
    const deliveryDebt = deliveries.reduce((sum, d) => {
      console.log(`     Olib kelib berish #${d.orderNumber}: ${d.totalTariff} USD`);
      return sum + (d.totalTariff || 0);
    }, 0);
    
    // Delivery to'lovlari
    const deliveryPayments = session
      ? await Cash.find({
          client: clientId,
          type: 'delivery_payment',
          isDeleted: false
        }).session(session)
      : await Cash.find({
          client: clientId,
          type: 'delivery_payment',
          isDeleted: false
        });
    
    console.log(`   Topilgan to'lovlar: ${deliveryPayments.length} ta`);
    
    const deliveryPaid = deliveryPayments.reduce((sum, p) => {
      console.log(`     To'lov: ${p.amount} USD`);
      return sum + (p.amount || 0);
    }, 0);
    
    console.log(`   Eski qarzlar: debt=${client.delivery_total_debt}, paid=${client.delivery_total_paid}`);
    
    // Yangilash
    client.delivery_total_debt = deliveryDebt;
    client.delivery_total_paid = deliveryPaid;
    
    if (session) {
      await client.save({ session });
    } else {
      await client.save();
    }
    
    console.log(`✅ Mijoz ${client.name} olib kelib berish qarzi yangilandi: qarz ${deliveryDebt}, to'langan ${deliveryPaid}, joriy qarz ${deliveryDebt - deliveryPaid}`);
    
    return {
      updated: true,
      deliveryDebt,
      deliveryPaid,
      currentDebt: deliveryDebt - deliveryPaid
    };
    
  } catch (error) {
    console.error(`❌ Mijoz ${clientId} delivery qarzini yangilashda xatolik:`, error);
    throw error;
  }
}

module.exports = {
  updateClientTotalDebts,
  updateClientDeliveryDebt
};