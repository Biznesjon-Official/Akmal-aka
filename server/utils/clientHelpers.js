const Client = require('../models/Client');
const VagonSale = require('../models/VagonSale');
const Delivery = require('../models/Delivery');
const Cash = require('../models/Cash');

/**
 * Mijozning barcha qarzlarini qayta hisoblash (AGGREGATION PIPELINE bilan optimizatsiya)
 */
async function updateClientTotalDebts(clientId, session = null) {
  console.log(`🔄 Mijoz ${clientId} ning barcha qarzlari qayta hisoblanmoqda (AGGREGATION)...`);
  
  try {
    // Mijozni topish
    const client = session 
      ? await Client.findById(clientId).session(session)
      : await Client.findById(clientId);
    
    if (!client) {
      throw new Error(`Mijoz topilmadi: ${clientId}`);
    }
    
    // 1. VAGON SALE QARZLARI (Aggregation Pipeline)
    const vagonSaleAggregation = [
      {
        $match: { 
          client: clientId, 
          isDeleted: false 
        }
      },
      {
        $group: {
          _id: '$sale_currency',
          totalDebt: { $sum: '$total_price' },
          totalVolume: { 
            $sum: { 
              $ifNull: ['$client_received_volume_m3', '$warehouse_dispatched_volume_m3'] 
            } 
          }
        }
      }
    ];
    
    const vagonSaleResults = session
      ? await VagonSale.aggregate(vagonSaleAggregation).session(session)
      : await VagonSale.aggregate(vagonSaleAggregation);
    
    let usdVagonDebt = 0;
    let rubVagonDebt = 0;
    let usdVagonVolume = 0;
    let rubVagonVolume = 0;
    
    vagonSaleResults.forEach(result => {
      if (result._id === 'USD') {
        usdVagonDebt = result.totalDebt || 0;
        usdVagonVolume = result.totalVolume || 0;
      } else if (result._id === 'RUB') {
        rubVagonDebt = result.totalDebt || 0;
        rubVagonVolume = result.totalVolume || 0;
      }
    });
    
    // 2. DELIVERY QARZLARI (Aggregation Pipeline)
    const deliveryAggregation = [
      {
        $match: { 
          client: clientId, 
          isDeleted: false 
        }
      },
      {
        $group: {
          _id: null,
          totalDebt: { $sum: '$totalTariff' }
        }
      }
    ];
    
    const deliveryResults = session
      ? await Delivery.aggregate(deliveryAggregation).session(session)
      : await Delivery.aggregate(deliveryAggregation);
    
    const deliveryDebt = deliveryResults.length > 0 ? (deliveryResults[0].totalDebt || 0) : 0;
    
    // 3. TO'LOVLAR (Aggregation Pipeline)
    const paymentAggregation = [
      {
        $match: {
          client: clientId,
          type: { $in: ['client_payment', 'debt_payment', 'delivery_payment'] },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            currency: '$currency'
          },
          totalPaid: { $sum: '$amount' }
        }
      }
    ];
    
    const paymentResults = session
      ? await Cash.aggregate(paymentAggregation).session(session)
      : await Cash.aggregate(paymentAggregation);
    
    let usdVagonPaid = 0;
    let rubVagonPaid = 0;
    let deliveryPaid = 0;
    
    paymentResults.forEach(result => {
      if (result._id.type === 'delivery_payment') {
        deliveryPaid += result.totalPaid || 0;
      } else if (result._id.currency === 'USD') {
        usdVagonPaid += result.totalPaid || 0;
      } else if (result._id.currency === 'RUB') {
        rubVagonPaid += result.totalPaid || 0;
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