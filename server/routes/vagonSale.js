const express = require('express');
const router = express.Router();
const VagonSale = require('../models/VagonSale');
const Vagon = require('../models/Vagon');
const Client = require('../models/Client');
const Cash = require('../models/Cash');
const auth = require('../middleware/auth');
const { logUserAction } = require('../middleware/auditLog');
const { updateVagonTotals } = require('../utils/vagonHelpers');
const { SmartInvalidation } = require('../utils/cacheManager');
const logger = require('../utils/logger');
const { 
  ClientNotFoundError, 
  VagonNotFoundError, 
  VagonLotNotFoundError,
  InsufficientVolumeError,
  handleCustomError 
} = require('../utils/customErrors');

// ✅ BACKGROUND HELPER FUNCTIONS (session'siz)
async function updateClientDebtBackground(clientId) {
  try {
    console.log(`🔄 Background: Mijoz qarzi yangilanmoqda: ${clientId}`);
    
    // MUHIM: Cash jadvalidan BARCHA qarz va to'lovlarni olish
    const allDebtSales = await Cash.find({
      client: clientId,
      type: 'debt_sale', // Qarzga sotuvlar (VagonSale va qo'lda qo'shilgan)
      isDeleted: false
    });
    
    const allPayments = await Cash.find({
      client: clientId,
      type: { $in: ['client_payment', 'debt_payment'] }, // To'lovlar
      isDeleted: false
    });
    
    console.log(`   📊 Qarzga sotuvlar soni: ${allDebtSales.length}`);
    console.log(`   💰 To'lovlar soni: ${allPayments.length}`);
    
    let usdTotalDebt = 0;
    let rubTotalDebt = 0;
    let usdTotalPaid = 0;
    let rubTotalPaid = 0;
    
    // Qarzlarni hisoblash (Cash jadvalidagi debt_sale yozuvlaridan)
    allDebtSales.forEach(debtSale => {
      if (debtSale.currency === 'USD') {
        usdTotalDebt += debtSale.amount || 0;
      } else if (debtSale.currency === 'RUB') {
        rubTotalDebt += debtSale.amount || 0;
      }
    });
    
    // To'lovlarni hisoblash (Cash jadvalidagi payment yozuvlaridan)
    allPayments.forEach(payment => {
      if (payment.currency === 'USD') {
        usdTotalPaid += payment.amount || 0;
      } else if (payment.currency === 'RUB') {
        rubTotalPaid += payment.amount || 0;
      }
    });
    
    console.log(`   💵 USD: qarz=${usdTotalDebt}, to'langan=${usdTotalPaid}`);
    console.log(`   💶 RUB: qarz=${rubTotalDebt}, to'langan=${rubTotalPaid}`);
    
    // MUHIM: Cash jadvalidagi yozuvlarni log qilish
    if (allDebtSales.length > 0) {
      console.log(`   📋 Qarzlar tafsiloti:`);
      allDebtSales.forEach(debt => {
        console.log(`      - ${debt.type}: ${debt.amount} ${debt.currency} (${new Date(debt.transaction_date).toLocaleDateString()})`);
      });
    }
    
    if (allPayments.length > 0) {
      console.log(`   📋 To'lovlar tafsiloti:`);
      allPayments.forEach(payment => {
        console.log(`      - ${payment.type}: ${payment.amount} ${payment.currency} (${new Date(payment.transaction_date).toLocaleDateString()})`);
      });
    }
    
    // Hajmni VagonSale jadvalidan olish (faqat statistika uchun)
    const allSales = await VagonSale.find({ 
      client: clientId, 
      isDeleted: false 
    });
    
    let usdTotalVolume = 0;
    let rubTotalVolume = 0;
    
    allSales.forEach(sale => {
      if (sale.sale_currency === 'USD') {
        usdTotalVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
      } else if (sale.sale_currency === 'RUB') {
        rubTotalVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
      }
    });
    
    const client = await Client.findById(clientId);
    if (client) {
      const oldUsdDebt = client.usd_total_debt || 0;
      const oldUsdPaid = client.usd_total_paid || 0;
      const oldRubDebt = client.rub_total_debt || 0;
      const oldRubPaid = client.rub_total_paid || 0;
      
      client.usd_total_debt = usdTotalDebt;
      client.rub_total_debt = rubTotalDebt;
      client.usd_total_paid = usdTotalPaid;
      client.rub_total_paid = rubTotalPaid;
      client.usd_total_received_volume = usdTotalVolume;
      client.rub_total_received_volume = rubTotalVolume;
      
      await client.save();
      
      console.log(`✅ Background: Mijoz qarzi yangilandi - ${client.name}`);
      console.log(`   USD qarz: ${oldUsdDebt} → ${usdTotalDebt}`);
      console.log(`   USD to'langan: ${oldUsdPaid} → ${usdTotalPaid}`);
      console.log(`   RUB qarz: ${oldRubDebt} → ${rubTotalDebt}`);
      console.log(`   RUB to'langan: ${oldRubPaid} → ${rubTotalPaid}`);
    } else {
      console.log(`❌ Background: Mijoz topilmadi: ${clientId}`);
    }
  } catch (error) {
    logger.error(`❌ Background: Mijoz qarzi yangilashda xatolik:`, error);
  }
}

async function createCashRecordsBackground(doc) {
  try {
    const client = await Client.findById(doc.client);
    if (!client) {
      throw new ClientNotFoundError(doc.client);
    }
    
    console.log(`📝 Background: Cash yozuvlari yaratilmoqda: ${client.name}`);
    console.log(`   Jami narx: ${doc.total_price} ${doc.sale_currency}`);
    console.log(`   To'langan: ${doc.paid_amount || 0} ${doc.sale_currency}`);
    console.log(`   Qarz: ${doc.debt || 0} ${doc.sale_currency}`);
    
    // 1. Qarzga sotuv yozuvi
    const debtSaleRecord = await Cash.create({
      type: 'debt_sale',
      client: doc.client,
      vagon: doc.vagon,
      vagonSale: doc._id,
      currency: doc.sale_currency,
      amount: doc.total_price,
      description: `Qarzga sotuv: ${client.name} - ${doc.total_price} ${doc.sale_currency}`,
      transaction_date: doc.sale_date || new Date()
    });
    
    console.log(`✅ Kassaga kirim yozildi: ${doc.total_price} ${doc.sale_currency} (ID: ${debtSaleRecord._id})`);
    
    // 2. Agar to'lov kiritilgan bo'lsa
    if (doc.paid_amount && doc.paid_amount > 0) {
      const paymentRecord = await Cash.create({
        type: 'client_payment',
        client: doc.client,
        vagon: doc.vagon,
        vagonSale: doc._id,
        currency: doc.sale_currency,
        amount: doc.paid_amount,
        description: `${client.name} tomonidan to'lov - ${doc.paid_amount} ${doc.sale_currency}`,
        transaction_date: doc.sale_date || new Date()
      });
      
      console.log(`✅ Kassaga to'lov yozildi: ${doc.paid_amount} ${doc.sale_currency} (ID: ${paymentRecord._id})`);
    } else {
      console.log(`ℹ️  To'lov yo'q yoki 0: ${doc.paid_amount || 0} ${doc.sale_currency}`);
    }
    
    // 3. MUHIM: Agar qarz bo'lsa (to'liq to'lanmagan), Debt jadvaliga yozuv qo'shish
    if (doc.debt && doc.debt > 0) {
      const Debt = require('../models/Debt');
      const VagonLot = require('../models/VagonLot');
      
      const lot = await VagonLot.findById(doc.lot);
      
      const debtRecord = await Debt.create({
        client: doc.client,
        vagon: doc.vagon,
        yogoch: doc.lot,
        total_amount: doc.total_price,
        paid_amount: doc.paid_amount || 0,
        currency: doc.sale_currency,
        sold_quantity: doc.sent_quantity || Math.floor(doc.warehouse_dispatched_volume_m3 || 0),
        sale_date: doc.sale_date || new Date(),
        notes: `VagonSale ID: ${doc._id} - ${lot ? lot.dimensions : 'N/A'}`
      });
      
      console.log(`✅ Qarz daftarchaga yozildi: ${doc.debt} ${doc.sale_currency} (ID: ${debtRecord._id})`);
    } else {
      console.log(`ℹ️  Qarz yo'q - to'liq to'langan`);
    }
    
    console.log(`✅ Background: Cash yozuvlari va qarz yaratildi`);
  } catch (error) {
    logger.error(`❌ Background: Cash yozuvlari yaratishda xatolik:`, error);
  }
}

async function createPaymentRecordBackground(sale, paidAmount) {
  try {
    const client = await Client.findById(sale.client);
    if (client) {
      await Cash.create({
        type: 'client_payment',
        client: sale.client,
        vagon: sale.vagon,
        vagonSale: sale._id,
        currency: sale.sale_currency,
        amount: paidAmount,
        description: `${client.name} tomonidan qo'shimcha to'lov - ${paidAmount} ${sale.sale_currency}`,
        transaction_date: new Date()
      });
      
      console.log(`✅ Background: Qo'shimcha to'lov yozildi: ${paidAmount} ${sale.sale_currency}`);
    }
  } catch (error) {
    console.error(`❌ Background: To'lov yozuvida xatolik:`, error);
  }
}

async function updateVagonTotalsBackground(vagonId) {
  try {
    console.log(`🔄 Background: Vagon ${vagonId} jami ma'lumotlari yangilanmoqda...`);
    await updateVagonTotals(vagonId, null); // session'siz
    console.log(`✅ Background: Vagon jami ma'lumotlari yangilandi`);
  } catch (error) {
    console.error(`❌ Background: Vagon yangilashda xatolik:`, error);
  }
}
async function updateClientDebtWithSession(clientId, session) {
  const mongoose = require('mongoose');
  
  console.log(`🔄 Mijoz qarzi yangilanmoqda: ${clientId}`);
  
  // MUHIM: Cash jadvalidan BARCHA qarz va to'lovlarni olish
  const allDebtSales = await Cash.find({
    client: clientId,
    type: 'debt_sale', // Qarzga sotuvlar (VagonSale va qo'lda qo'shilgan)
    isDeleted: false
  }).session(session).read('primary');
  
  const allPayments = await Cash.find({
    client: clientId,
    type: { $in: ['client_payment', 'debt_payment'] }, // To'lovlar
    isDeleted: false
  }).session(session).read('primary');
  
  console.log(`   Qarzga sotuvlar: ${allDebtSales.length} ta`);
  console.log(`   To'lovlar: ${allPayments.length} ta`);
  
  let usdTotalDebt = 0;
  let rubTotalDebt = 0;
  let usdTotalPaid = 0;
  let rubTotalPaid = 0;
  
  // Qarzlarni hisoblash (Cash jadvalidagi debt_sale yozuvlaridan)
  allDebtSales.forEach(debtSale => {
    if (debtSale.currency === 'USD') {
      usdTotalDebt += debtSale.amount || 0;
    } else if (debtSale.currency === 'RUB') {
      rubTotalDebt += debtSale.amount || 0;
    }
  });
  
  // To'lovlarni hisoblash (Cash jadvalidagi payment yozuvlaridan)
  allPayments.forEach(payment => {
    if (payment.currency === 'USD') {
      usdTotalPaid += payment.amount || 0;
    } else if (payment.currency === 'RUB') {
      rubTotalPaid += payment.amount || 0;
    }
  });
  
  console.log(`   USD qarz: ${usdTotalDebt}, to'langan: ${usdTotalPaid}`);
  console.log(`   RUB qarz: ${rubTotalDebt}, to'langan: ${rubTotalPaid}`);
  
  // Hajmni VagonSale jadvalidan olish (faqat statistika uchun)
  const allSales = await VagonSale.find({ 
    client: clientId, 
    isDeleted: false 
  }).session(session).read('primary');
  
  let usdTotalVolume = 0;
  let rubTotalVolume = 0;
  
  allSales.forEach(sale => {
    if (sale.sale_currency === 'USD') {
      usdTotalVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
    } else if (sale.sale_currency === 'RUB') {
      rubTotalVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
    }
  });
  
  // Session bilan mijoz ma'lumotlarini yangilash
  const client = await Client.findById(clientId).session(session).read('primary');
  if (client) {
    const oldUsdDebt = client.usd_total_debt || 0;
    const oldUsdPaid = client.usd_total_paid || 0;
    const oldRubDebt = client.rub_total_debt || 0;
    const oldRubPaid = client.rub_total_paid || 0;
    
    client.usd_total_debt = usdTotalDebt;
    client.rub_total_debt = rubTotalDebt;
    client.usd_total_paid = usdTotalPaid;
    client.rub_total_paid = rubTotalPaid;
    client.usd_total_received_volume = usdTotalVolume;
    client.rub_total_received_volume = rubTotalVolume;
    
    await client.save({ session });
    
    console.log(`✅ Mijoz qarzi yangilandi (transaction ichida): ${client.name}`);
    console.log(`   USD qarz: ${oldUsdDebt} → ${usdTotalDebt}`);
    console.log(`   USD to'langan: ${oldUsdPaid} → ${usdTotalPaid}`);
    console.log(`   RUB qarz: ${oldRubDebt} → ${rubTotalDebt}`);
    console.log(`   RUB to'langan: ${oldRubPaid} → ${rubTotalPaid}`);
    
    return {
      updated: true,
      changes: {
        usd_debt_change: usdTotalDebt - oldUsdDebt,
        usd_paid_change: usdTotalPaid - oldUsdPaid,
        rub_debt_change: rubTotalDebt - oldRubDebt,
        rub_paid_change: rubTotalPaid - oldRubPaid
      }
    };
  } else {
    console.log(`❌ Mijoz topilmadi: ${clientId}`);
    return { updated: false, error: 'Mijoz topilmadi' };
  }
}

async function createCashRecordsWithSession(doc, session) {
  const client = await Client.findById(doc.client).session(session).read('primary');
  if (!client) {
    throw new ClientNotFoundError(doc.client);
  }
  
  console.log(`📝 Cash yozuvlari yaratilmoqda: ${client.name}`);
  console.log(`   Jami narx: ${doc.total_price} ${doc.sale_currency}`);
  console.log(`   To'langan: ${doc.paid_amount || 0} ${doc.sale_currency}`);
  console.log(`   Qarz: ${doc.debt || 0} ${doc.sale_currency}`);
  
  try {
    // 1. Qarzga sotuv yozuvi (session bilan)
    const debtSaleRecord = await Cash.create([{
      type: 'debt_sale',
      client: doc.client,
      vagon: doc.vagon,
      vagonSale: doc._id,
      currency: doc.sale_currency,
      amount: doc.total_price,
      description: `Qarzga sotuv: ${client.name} - ${doc.total_price} ${doc.sale_currency}`,
      transaction_date: doc.sale_date || new Date()
    }], { session });
    
    console.log(`✅ Kassaga kirim yozildi (transaction ichida): ${doc.total_price} ${doc.sale_currency}`);
    
    // 2. Agar to'lov kiritilgan bo'lsa, to'lov yozuvi ham yaratish
    if (doc.paid_amount && doc.paid_amount > 0) {
      const paymentRecord = await Cash.create([{
        type: 'client_payment',
        client: doc.client,
        vagon: doc.vagon,
        vagonSale: doc._id,
        currency: doc.sale_currency,
        amount: doc.paid_amount,
        description: `${client.name} tomonidan to'lov - ${doc.paid_amount} ${doc.sale_currency}`,
        transaction_date: doc.sale_date || new Date()
      }], { session });
      
      console.log(`✅ Kassaga to'lov yozildi (transaction ichida): ${doc.paid_amount} ${doc.sale_currency}`);
    } else {
      console.log(`ℹ️  To'lov yo'q yoki 0: ${doc.paid_amount || 0} ${doc.sale_currency}`);
    }
    
    // 3. MUHIM: Agar qarz bo'lsa (to'liq to'lanmagan), Debt jadvaliga yozuv qo'shish
    if (doc.debt && doc.debt > 0) {
      const Debt = require('../models/Debt');
      const VagonLot = require('../models/VagonLot');
      
      const lot = await VagonLot.findById(doc.lot).session(session).read('primary');
      
      const debtRecord = await Debt.create([{
        client: doc.client,
        vagon: doc.vagon,
        yogoch: doc.lot,
        total_amount: doc.total_price,
        paid_amount: doc.paid_amount || 0,
        currency: doc.sale_currency,
        sold_quantity: doc.sent_quantity || Math.floor(doc.warehouse_dispatched_volume_m3 || 0),
        sale_date: doc.sale_date || new Date(),
        notes: `VagonSale ID: ${doc._id} - ${lot ? lot.dimensions : 'N/A'}`
      }], { session });
      
      console.log(`✅ Qarz daftarchaga yozildi (transaction ichida): ${doc.debt} ${doc.sale_currency} (ID: ${debtRecord[0]._id})`);
    } else {
      console.log(`ℹ️  Qarz yo'q - to'liq to'langan`);
    }
    
    // 4. Yaratilgan yozuvlarni tekshirish
    const createdRecords = await Cash.find({
      vagonSale: doc._id,
      isDeleted: false
    }).session(session).read('primary');
    
    console.log(`✅ Yaratilgan Cash yozuvlari soni: ${createdRecords.length}`);
    
    return createdRecords;
  } catch (error) {
    console.error(`❌ Cash yozuvlari yaratishda xatolik:`, error);
    throw new Error(`Cash yozuvlari yaratishda xatolik: ${error.message}`);
  }
}

// Barcha sotuvlar (OPTIMIZED PAGINATION + AGGREGATION)
router.get('/', auth, async (req, res) => {
  try {
    const { 
      vagon, 
      client, 
      status, 
      page = 1, 
      limit = 20,
      startDate,
      endDate,
      currency,
      search
    } = req.query;
    
    const matchFilter = { isDeleted: false };
    if (vagon) matchFilter.vagon = new mongoose.Types.ObjectId(vagon);
    if (client) matchFilter.client = new mongoose.Types.ObjectId(client);
    if (status) matchFilter.status = status;
    if (currency) matchFilter.sale_currency = currency;
    
    // Sana filtri
    if (startDate || endDate) {
      matchFilter.sale_date = {};
      if (startDate) matchFilter.sale_date.$gte = new Date(startDate);
      if (endDate) matchFilter.sale_date.$lte = new Date(endDate);
    }
    
    // Pagination parametrlari
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;
    
    // Use aggregation for better performance with populated fields
    const pipeline = [
      { $match: matchFilter },
      
      // Lookup vagon info
      {
        $lookup: {
          from: 'vagons',
          localField: 'vagon',
          foreignField: '_id',
          as: 'vagonInfo',
          pipeline: [
            { $project: { vagonCode: 1, month: 1, status: 1 } }
          ]
        }
      },
      { $unwind: { path: '$vagonInfo', preserveNullAndEmptyArrays: true } },
      
      // Lookup client info
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo',
          pipeline: [
            { $project: { name: 1, phone: 1 } }
          ]
        }
      },
      { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
      
      // Lookup lot info (sof foyda hisoblash uchun)
      {
        $lookup: {
          from: 'vagonlots',
          localField: 'lot',
          foreignField: '_id',
          as: 'lotInfo',
          pipeline: [
            { $project: { 
              dimensions: 1, 
              purchase_currency: 1, 
              cost_per_m3: 1,
              purchase_amount: 1,
              volume_m3: 1,
              total_investment: 1
            } }
          ]
        }
      },
      { $unwind: { path: '$lotInfo', preserveNullAndEmptyArrays: true } },
      
      // Search filter (if provided)
      ...(search ? [{
        $match: {
          $or: [
            { 'vagonInfo.vagonCode': { $regex: search, $options: 'i' } },
            { 'clientInfo.name': { $regex: search, $options: 'i' } },
            { 'clientInfo.phone': { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      
      // Project only needed fields (sof foyda bilan)
      {
        $project: {
          vagon: '$vagonInfo',
          lot: '$lotInfo',
          client: '$clientInfo',
          warehouse_dispatched_volume_m3: 1,
          sent_volume_m3: 1,
          client_received_volume_m3: 1,
          accepted_volume_m3: 1,
          sent_quantity: 1,
          accepted_quantity: 1,
          transport_loss_m3: 1,
          sale_currency: 1,
          price_per_m3: 1,
          price_per_piece: 1,
          sale_unit: 1,
          total_price: 1,
          paid_amount: 1,
          debt: 1,
          sale_date: 1,
          status: 1,
          createdAt: 1,
          // Sof foyda hisoblash
          profit_analysis: {
            $cond: {
              if: { $and: [
                { $ne: ['$lotInfo.cost_per_m3', null] },
                { $gt: ['$warehouse_dispatched_volume_m3', 0] }
              ]},
              then: {
                cost_per_m3: '$lotInfo.cost_per_m3',
                sold_volume_m3: '$warehouse_dispatched_volume_m3',
                cost_basis: { $multiply: ['$lotInfo.cost_per_m3', '$warehouse_dispatched_volume_m3'] },
                revenue: '$total_price',
                net_profit: { $subtract: ['$total_price', { $multiply: ['$lotInfo.cost_per_m3', '$warehouse_dispatched_volume_m3'] }] },
                profit_margin_percentage: {
                  $cond: {
                    if: { $gt: ['$total_price', 0] },
                    then: { 
                      $multiply: [
                        { $divide: [
                          { $subtract: ['$total_price', { $multiply: ['$lotInfo.cost_per_m3', '$warehouse_dispatched_volume_m3'] }] },
                          '$total_price'
                        ]}, 
                        100
                      ]
                    },
                    else: 0
                  }
                },
                currency: '$sale_currency'
              },
              else: {
                net_profit: 0,
                cost_basis: 0,
                revenue: '$total_price',
                profit_margin_percentage: 0,
                note: 'Tan narx ma\'lumoti yo\'q'
              }
            }
          }
        }
      },
      
      // Sort by creation date
      { $sort: { createdAt: -1 } }
    ];
    
    // Execute aggregation with pagination
    const [salesResult, totalResult] = await Promise.all([
      VagonSale.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limitNum }
      ]),
      VagonSale.aggregate([
        ...pipeline,
        { $count: 'total' }
      ])
    ]);
    
    const total = totalResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      sales: salesResult,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage,
        startIndex: skip + 1,
        endIndex: Math.min(skip + limitNum, total)
      }
    });
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// ✅ SOTUVLAR TARIXI ENDPOINT
router.get('/history', auth, async (req, res) => {
  try {
    console.log('📊 Sotuvlar tarixi so\'rovi:', req.query);
    
    const {
      startDate,
      endDate,
      clientId,
      vagonId,
      minAmount,
      maxAmount,
      page = 1,
      limit = 100
    } = req.query;
    
    // Filter obyektini yaratish
    const filter = { isDeleted: false };
    
    // Sana filtri (sale_date bo'yicha)
    if (startDate || endDate) {
      filter.sale_date = {};
      if (startDate) {
        filter.sale_date.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999); // Kun oxirigacha
        filter.sale_date.$lte = endDateTime;
      }
    }
    
    // Mijoz filtri
    if (clientId) {
      filter.client = clientId;
    }
    
    // Vagon filtri
    if (vagonId) {
      filter.vagon = vagonId;
    }
    
    // Summa filtri
    if (minAmount || maxAmount) {
      filter.total_price = {};
      if (minAmount) {
        filter.total_price.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filter.total_price.$lte = parseFloat(maxAmount);
      }
    }
    
    console.log('🔍 Filter obyekti:', JSON.stringify(filter, null, 2));
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Ma'lumotlarni olish - populate'siz test qilamiz
    const sales = await VagonSale.find(filter)
      .sort({ sale_date: -1, createdAt: -1 }) // sale_date bo'yicha, keyin createdAt
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    console.log(`✅ ${sales.length} ta tarixiy sotuv topildi (populate'siz)`);
    
    // Agar ma'lumotlar bor bo'lsa, populate qilamiz
    let populatedSales = [];
    if (sales.length > 0) {
      try {
        populatedSales = await VagonSale.find(filter)
          .populate('client', 'name phone')
          .populate('vagon', 'vagonCode status')
          .populate('lot', 'dimensions')
          .sort({ sale_date: -1, createdAt: -1 }) // sale_date bo'yicha, keyin createdAt
          .skip(skip)
          .limit(parseInt(limit))
          .lean();
        console.log(`✅ ${populatedSales.length} ta sotuv populate qilindi`);
      } catch (populateError) {
        console.error('❌ Populate xatoligi:', populateError);
        // Populate xatolik bo'lsa, oddiy ma'lumotlarni qaytaramiz
        populatedSales = sales;
      }
    }
    
    // Jami soni
    const totalCount = await VagonSale.countDocuments(filter);
    
    console.log(`✅ Jami: ${totalCount} ta sotuv`);
    
    res.json({
      success: true,
      sales: populatedSales,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
        hasNextPage: skip + populatedSales.length < totalCount,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        startDate,
        endDate,
        clientId,
        vagonId,
        minAmount,
        maxAmount
      }
    });
    
  } catch (error) {
    console.error('❌ Sotuvlar tarixini olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Sotuvlar tarixini olishda xatolik yuz berdi',
      error: error.message
    });
  }
});

// Bitta sotuv ma'lumotlari (sof foyda bilan)
router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await VagonSale.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
      .populate('vagon')
      .populate('lot') // Lot ma'lumotlarini olish (tan narx uchun)
      .populate('client');
    
    if (!sale) {
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    // Sof foyda hisoblash
    const profitInfo = await sale.calculateNetProfit();
    
    // Javobga sof foyda ma'lumotlarini qo'shish
    const saleWithProfit = {
      ...sale.toObject(),
      profit_analysis: profitInfo
    };
    
    res.json(saleWithProfit);
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Yangi sotuv yaratish yoki mavjudini yangilash (OPTIMIZED!)
router.post('/', auth, async (req, res) => {
  const session = await require('mongoose').startSession();
  
  try {
    session.startTransaction();
    
    const {
      vagon, // Frontend'dan keladi
      lot,
      client,
      warehouse_dispatched_volume_m3,
      transport_loss_m3,
      transport_loss_responsible_person,
      transport_loss_reason,
      // Backward compatibility
      sent_volume_m3,
      client_loss_m3,
      client_loss_responsible_person,
      client_loss_reason,
      // YANGI: Dona bo'yicha sotuv
      sale_unit,
      sent_quantity,
      client_loss_quantity,
      // BRAK JAVOBGARLIK TAQSIMOTI
      brak_liability_distribution,
      sale_currency,
      price_per_m3,
      price_per_piece,
      paid_amount,
      notes,
      sale_date // YANGI: Sotuv sanasi
    } = req.body;
    
    // Validatsiya
    const dispatchedVolume = warehouse_dispatched_volume_m3 || sent_volume_m3;
    const transportLoss = transport_loss_m3 || client_loss_m3 || 0;
    
    if (!lot || !client || !sale_currency) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Lot, mijoz va valyuta kiritilishi shart' 
      });
    }
    
    if (!dispatchedVolume && !sent_quantity) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Sotilgan hajm yoki dona soni kiritilishi shart' 
      });
    }
    
    // Sotuv birligi bo'yicha validatsiya
    if (sale_unit === 'pieces') {
      if (!sent_quantity || !price_per_piece) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: 'Dona bo\'yicha sotishda dona soni va dona narxi kiritilishi shart' 
        });
      }
    } else {
      if (!dispatchedVolume || (!price_per_m3 && !finalPricePerM3)) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: 'Hajm bo\'yicha sotishda hajm va m³ narxi kiritilishi shart' 
        });
      }
    }
    
    // Valyuta tekshiruvi - Vagon sotuvida faqat USD
    if (sale_currency !== 'USD') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Vagon sotuvi faqat USD valyutasida amalga oshiriladi' 
      });
    }
    
    // SIMPLIFIED: Faqat kerakli ma'lumotlarni olish
    const VagonLot = require('../models/VagonLot');
    const lotDoc = await VagonLot.findById(lot).session(session).read('primary');
    
    if (!lotDoc || lotDoc.isDeleted) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Lot topilmadi' });
    }
    
    // Dona bo'yicha sotishda kub narxini avtomatik hisoblash
    let finalPricePerM3 = price_per_m3;
    if (sale_unit === 'pieces' && price_per_piece && !price_per_m3) {
      const volumePerPiece = lotDoc.volume_m3 / lotDoc.quantity;
      finalPricePerM3 = price_per_piece / volumePerPiece;
    }
    
    const vagonDoc = await Vagon.findById(lotDoc.vagon).session(session).read('primary');
    
    if (!vagonDoc || vagonDoc.isDeleted) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Vagon topilmadi' });
    }
    
    // Vagon yopilgan bo'lsa
    if (vagonDoc.status === 'closed') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Bu vagon yopilgan. Sotuv qilish mumkin emas' 
      });
    }
    
    // Vagon arxivlangan bo'lsa
    if (vagonDoc.status === 'archived') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Bu vagon arxivlangan. Sotuv qilish mumkin emas' 
      });
    }
    
    const clientDoc = await Client.findById(client).session(session).read('primary');
    
    if (!clientDoc || clientDoc.isDeleted) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Hajm va dona bo'yicha tekshirish
    let finalDispatchedVolume = dispatchedVolume;
    let finalSentQuantity = sent_quantity;
    
    if (sale_unit === 'pieces') {
      // Dona bo'yicha sotishda hajmni hisoblash
      const volumePerPiece = lotDoc.volume_m3 / lotDoc.quantity;
      finalDispatchedVolume = sent_quantity * volumePerPiece;
      
      // Dona tekshiruvi - Floating-point xatolarini oldini olish uchun toleransiya
      const availableQuantity = lotDoc.remaining_quantity || 0;
      
      if (sent_quantity > availableQuantity) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `Lot da mavjud dona: ${availableQuantity}. Siz ${sent_quantity} dona jo'natmoqchisiz` 
        });
      }
    } else {
      // Hajm bo'yicha sotishda dona sonini hisoblash
      const volumePerPiece = lotDoc.volume_m3 / lotDoc.quantity;
      finalSentQuantity = Math.floor(finalDispatchedVolume / volumePerPiece);
      
      // Hajm tekshiruvi - Floating point xatolari uchun kichik toleransiya
      // Agar farq 0.0001 m³ dan kam bo'lsa, teng deb hisoblaymiz
      const EPSILON = 0.0001; // 0.1 litr toleransiya
      const availableVolume = lotDoc.warehouse_remaining_volume_m3 || 0;
      
      // Agar sotilayotgan hajm mavjud hajmdan sezilarli darajada ko'p bo'lsa
      if (finalDispatchedVolume > availableVolume + EPSILON) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `Lot da mavjud hajm: ${availableVolume.toFixed(4)} m³. Siz ${finalDispatchedVolume.toFixed(4)} m³ jo'natmoqchisiz` 
        });
      }
    }
    
    // Yo'qotish tekshiruvi
    if (transportLoss && transportLoss >= finalDispatchedVolume) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Transport yo\'qotishi jo\'natilgan hajmdan kichik bo\'lishi kerak' 
      });
    }
    
    // SIMPLIFIED: Mavjud sotuvni tekshirish
    const existingSale = await VagonSale.findOne({
      lot,
      client,
      isDeleted: false
    }).session(session).read('primary');
    
    let sale;
    
    if (existingSale) {
      // Mavjud sotuvni yangilash
      existingSale.warehouse_dispatched_volume_m3 = (existingSale.warehouse_dispatched_volume_m3 || existingSale.sent_volume_m3) + finalDispatchedVolume;
      existingSale.sent_quantity = (existingSale.sent_quantity || 0) + finalSentQuantity;
      existingSale.transport_loss_m3 = (existingSale.transport_loss_m3 || existingSale.client_loss_m3) + transportLoss;
      existingSale.transport_loss_responsible_person = transport_loss_responsible_person || client_loss_responsible_person || existingSale.transport_loss_responsible_person;
      existingSale.transport_loss_reason = transport_loss_reason || client_loss_reason || existingSale.transport_loss_reason;
      existingSale.sale_currency = sale_currency;
      existingSale.sale_unit = sale_unit || 'volume';
      existingSale.price_per_m3 = price_per_m3 || existingSale.price_per_m3;
      existingSale.price_per_piece = price_per_piece || existingSale.price_per_piece;
      existingSale.paid_amount += (paid_amount || 0);
      if (notes) {
        existingSale.notes = notes;
      }
      
      await existingSale.save({ session });
      sale = existingSale;
      
      console.log(`✅ Mavjud sotuv yangilandi: ${clientDoc.name} - ${lotDoc.dimensions}`);
      console.log(`   Qo'shimcha hajm: ${finalDispatchedVolume} m³`);
      console.log(`   Qo'shimcha dona: ${finalSentQuantity} ta`);
      
      // MUHIM: Mavjud sotuvga qo'shimcha kirim qilinganda ham lot ma'lumotlarini yangilash
      // Bu qism pastda "Lotni yangilash" qismida bajariladi
    } else {
      // Yangi sotuv yaratish
      sale = new VagonSale({
        vagon: lotDoc.vagon,
        lot,
        client,
        warehouse_dispatched_volume_m3: finalDispatchedVolume,
        sent_quantity: finalSentQuantity,
        sale_unit: sale_unit || 'volume',
        transport_loss_m3: transportLoss,
        transport_loss_responsible_person: transport_loss_responsible_person || client_loss_responsible_person,
        transport_loss_reason: transport_loss_reason || client_loss_reason,
        // BRAK JAVOBGARLIK TAQSIMOTI
        brak_liability_distribution: brak_liability_distribution || null,
        // Backward compatibility
        sent_volume_m3: finalDispatchedVolume,
        client_loss_m3: transportLoss,
        client_loss_responsible_person: transport_loss_responsible_person || client_loss_responsible_person,
        client_loss_reason: transport_loss_reason || client_loss_reason,
        sale_currency: sale_currency,
        price_per_m3: finalPricePerM3,
        price_per_piece: price_per_piece,
        paid_amount: paid_amount || 0,
        sale_date: sale_date ? new Date(sale_date) : new Date(), // YANGI: Sotuv sanasi
        notes
      });
      
      await sale.save({ session });
      
      console.log(`✅ Yangi sotuv yaratildi: ${clientDoc.name} - ${lotDoc.dimensions}`);
    }
    
    // SIMPLIFIED: Lotni yangilash - MUHIM: Lot ma'lumotlarini to'g'ri yangilash
    console.log(`📊 Lot yangilanmoqda: ${lotDoc.dimensions}`);
    console.log(`📊 Oldingi: dispatched=${lotDoc.warehouse_dispatched_volume_m3}, remaining=${lotDoc.warehouse_remaining_volume_m3}`);
    
    // Lot ma'lumotlarini yangilash
    lotDoc.warehouse_dispatched_volume_m3 = (lotDoc.warehouse_dispatched_volume_m3 || 0) + finalDispatchedVolume;
    
    // Qolgan hajmni hisoblash - Floating-point xatolarini oldini olish
    const totalAvailable = lotDoc.warehouse_available_volume_m3 || lotDoc.volume_m3 || 0;
    let calculatedRemaining = totalAvailable - lotDoc.warehouse_dispatched_volume_m3;
    
    // Agar juda kichik farq bo'lsa (< 0.001 m³), 0 deb hisoblash
    if (Math.abs(calculatedRemaining) < 0.001) {
      calculatedRemaining = 0;
    }
    
    lotDoc.warehouse_remaining_volume_m3 = Math.max(0, calculatedRemaining);
    
    // Qolgan dona sonini hisoblash (agar dona bo'yicha sotuv bo'lsa)
    if (sale_unit === 'pieces') {
      lotDoc.remaining_quantity = Math.max(0, (lotDoc.remaining_quantity || lotDoc.quantity) - finalSentQuantity);
    } else {
      // Hajm bo'yicha sotishda dona sonini hisoblash
      const volumePerPiece = lotDoc.volume_m3 / lotDoc.quantity;
      const soldPieces = Math.round(finalDispatchedVolume / volumePerPiece); // Math.floor o'rniga Math.round
      lotDoc.remaining_quantity = Math.max(0, (lotDoc.remaining_quantity || lotDoc.quantity) - soldPieces);
    }
    
    // Daromadni yangilash
    const revenueToAdd = sale.total_price || 0;
    lotDoc.total_revenue = (lotDoc.total_revenue || 0) + revenueToAdd;
    
    // Foyda hisoblash
    const totalCost = lotDoc.total_investment || lotDoc.purchase_amount || 0;
    lotDoc.realized_profit = (lotDoc.total_revenue || 0) - totalCost;
    
    console.log(`📊 Yangi: dispatched=${lotDoc.warehouse_dispatched_volume_m3}, remaining=${lotDoc.warehouse_remaining_volume_m3}, revenue=${lotDoc.total_revenue}`);
    
    await lotDoc.save({ session });
    
    // MUHIM: Vagon ma'lumotlarini transaction ichida yangilash
    console.log(`🔄 Vagon jami ma'lumotlari yangilanmoqda (transaction ichida)...`);
    await updateVagonTotals(lotDoc.vagon, session);
    
    // ✅ Ombor/Saqlanish xarajatlarini yangilash
    console.log(`📦 Ombor xarajatlari yangilanmoqda...`);
    const StorageExpense = require('../models/StorageExpense');
    const storageExpenses = await StorageExpense.find({
      vagon: lotDoc.vagon,
      status: { $in: ['active', 'partially_allocated'] },
      isDeleted: false
    }).session(session);
    
    if (storageExpenses.length > 0) {
      for (const storageExp of storageExpenses) {
        await storageExp.allocateForSale(soldVolume);
        console.log(`📦 Ombor xarajat yangilandi: ${storageExp.allocated_cost.toFixed(2)} ${storageExp.currency} (${storageExp.status})`);
      }
    }
    
    // Cache invalidation
    SmartInvalidation.onVagonSaleChange(lotDoc.vagon, sale.client, sale._id);
    
    // Transaction commit
    await session.commitTransaction();
    console.log('✅ Transaction muvaffaqiyatli yakunlandi');
    
    // DARHOL CASH YOZUVLARINI YARATISH VA MIJOZ QARZINI YANGILASH
    console.log(`💰 Cash yozuvlari va mijoz qarzi yangilanmoqda...`);
    
    try {
      // 1. Cash yozuvlarini yaratish
      if (!existingSale) {
        await createCashRecordsBackground(sale);
        console.log(`✅ Cash yozuvlari yaratildi`);
      } else if (paid_amount && parseFloat(paid_amount) > 0) {
        await createPaymentRecordBackground(sale, parseFloat(paid_amount));
        console.log(`✅ Qo'shimcha to'lov yozildi`);
      }
      
      // 2. Mijoz qarzini darhol yangilash
      await updateClientDebtBackground(sale.client);
      console.log(`✅ Mijoz qarzi darhol yangilandi`);
      
      console.log(`✅ Barcha yangilanishlar tugallandi`);
    } catch (bgError) {
      console.error(`❌ Cash yozuvlari yoki mijoz qarzi yangilashda xatolik:`, bgError);
      // Bu xatolik response'ga ta'sir qilmaydi, chunki transaction allaqachon commit qilingan
    }
    
    // Populate qilib qaytarish
    await sale.populate('vagon', 'vagonCode month');
    await sale.populate('lot', 'dimensions purchase_currency');
    await sale.populate('client', 'name phone');
    
    res.status(201).json(sale);
  } catch (error) {
    logger.error('VagonSale create error:', error);
    
    // Error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validatsiya xatosi',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    // Network timeout errors
    if (error.name === 'MongoNetworkTimeoutError' || error.name === 'MongoTimeoutError') {
      return res.status(408).json({ 
        message: 'Ma\'lumotlar bazasiga ulanishda vaqt tugadi. Iltimos qayta urinib ko\'ring',
        error: 'Database timeout'
      });
    }
    
    // Specific error messages for common issues
    if (error.message.includes('Lot topilmadi')) {
      return res.status(404).json({ message: 'Tanlangan lot topilmadi' });
    }
    
    if (error.message.includes('Vagon topilmadi')) {
      return res.status(404).json({ message: 'Tanlangan vagon topilmadi' });
    }
    
    if (error.message.includes('Mijoz topilmadi')) {
      return res.status(404).json({ message: 'Tanlangan mijoz topilmadi' });
    }
    
    res.status(500).json({ 
      message: 'Vagon sotuvini saqlashda xatolik yuz berdi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});

// Sotuvni yangilash (faqat to'lov va izoh)
router.put('/:id', auth, async (req, res) => {
  try {
    const sale = await VagonSale.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    // Faqat notes ni yangilash mumkin
    // Hajm va narxni o'zgartirish xavfli!
    if (req.body.notes !== undefined) {
      sale.notes = req.body.notes;
    }
    
    await sale.save();
    
    res.json(sale);
  } catch (error) {
    logger.error('VagonSale update error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Sotuvni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  
  try {
    const sale = await VagonSale.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).session(session).read('primary');
    
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    // To'lov qilingan bo'lsa o'chirish mumkin emas
    if (sale.paid_amount > 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Bu sotuv bo\'yicha to\'lov qilingan. O\'chirish mumkin emas' 
      });
    }
    
    // Vagon va mijozni qaytarish
    const VagonLot = require('../models/VagonLot');
    const lotDoc = await VagonLot.findById(sale.lot).session(session).read('primary');
    const clientDoc = await Client.findById(sale.client).session(session).read('primary');
    
    if (lotDoc) {
      lotDoc.sold_volume_m3 -= sale.sent_volume_m3;
      lotDoc.total_revenue -= sale.total_price;
      await lotDoc.save({ session });
      
      // Vagonni yangilash
      await updateVagonTotals(lotDoc.vagon, session);
    }
    
    if (clientDoc) {
      clientDoc.total_received_volume -= sale.accepted_volume_m3;
      clientDoc.total_debt -= sale.total_price;
      await clientDoc.save({ session });
    }
    
    sale.isDeleted = true;
    await sale.save({ session });
    
    await session.commitTransaction();
    
    res.json({ message: 'Sotuv o\'chirildi' });
  } catch (error) {
    await session.abortTransaction();
    return handleCustomError(error, res);
  } finally {
    session.endSession();
  }
});

module.exports = router;
