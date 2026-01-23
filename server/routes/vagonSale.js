const express = require('express');
const router = express.Router();
const VagonSale = require('../models/VagonSale');
const Vagon = require('../models/Vagon');
const Client = require('../models/Client');
const Cash = require('../models/Cash');
const auth = require('../middleware/auth');
const { logUserAction } = require('../middleware/auditLog');
const { updateVagonTotals } = require('../utils/vagonHelpers');

// ✅ HELPER FUNCTIONS - SESSION BILAN ISHLASH UCHUN
async function updateClientDebtWithSession(clientId, session) {
  const mongoose = require('mongoose');
  
  console.log(`🔄 Mijoz qarzi yangilanmoqda: ${clientId}`);
  
  // Session bilan barcha sotuvlarni olish
  const allSales = await VagonSale.find({ 
    client: clientId, 
    isDeleted: false 
  }).session(session);
  
  // Session bilan barcha to'lovlarni olish
  const allPayments = await Cash.find({
    client: clientId,
    type: { $in: ['client_payment', 'debt_payment'] },
    isDeleted: false
  }).session(session);
  
  console.log(`   Sotuvlar: ${allSales.length} ta`);
  console.log(`   To'lovlar: ${allPayments.length} ta`);
  
  let usdTotalDebt = 0;
  let rubTotalDebt = 0;
  let usdTotalVolume = 0;
  let rubTotalVolume = 0;
  let usdTotalPaid = 0;
  let rubTotalPaid = 0;
  
  // Sotuvlar bo'yicha hisoblash
  allSales.forEach(sale => {
    if (sale.sale_currency === 'USD') {
      usdTotalDebt += sale.total_price || 0;
      usdTotalVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
    } else if (sale.sale_currency === 'RUB') {
      rubTotalDebt += sale.total_price || 0;
      rubTotalVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
    }
  });
  
  // To'lovlar bo'yicha hisoblash
  allPayments.forEach(payment => {
    if (payment.currency === 'USD') {
      usdTotalPaid += payment.amount || 0;
    } else if (payment.currency === 'RUB') {
      rubTotalPaid += payment.amount || 0;
    }
  });
  
  console.log(`   USD qarz: ${usdTotalDebt}, to'langan: ${usdTotalPaid}`);
  console.log(`   RUB qarz: ${rubTotalDebt}, to'langan: ${rubTotalPaid}`);
  
  // Session bilan mijoz ma'lumotlarini yangilash
  const client = await Client.findById(clientId).session(session);
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
  const client = await Client.findById(doc.client).session(session);
  if (!client) {
    throw new Error(`Mijoz topilmadi: ${doc.client}`);
  }
  
  console.log(`📝 Cash yozuvlari yaratilmoqda: ${client.name}`);
  console.log(`   Jami narx: ${doc.total_price} ${doc.sale_currency}`);
  console.log(`   To'langan: ${doc.paid_amount || 0} ${doc.sale_currency}`);
  
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
    
    // 3. Yaratilgan yozuvlarni tekshirish
    const createdRecords = await Cash.find({
      vagonSale: doc._id,
      isDeleted: false
    }).session(session);
    
    console.log(`✅ Yaratilgan Cash yozuvlari soni: ${createdRecords.length}`);
    
    return createdRecords;
  } catch (error) {
    console.error(`❌ Cash yozuvlari yaratishda xatolik:`, error);
    throw new Error(`Cash yozuvlari yaratishda xatolik: ${error.message}`);
  }
}

// Barcha sotuvlar
router.get('/', auth, async (req, res) => {
  try {
    const { vagon, client, status } = req.query;
    
    const filter = { isDeleted: false };
    if (vagon) filter.vagon = vagon;
    if (client) filter.client = client;
    if (status) filter.status = status;
    
    const sales = await VagonSale.find(filter)
      .populate('vagon', 'vagonCode month status')
      .populate('lot', 'dimensions purchase_currency')
      .populate('client', 'name phone')
      .sort({ createdAt: -1 });
    
    res.json(sales);
  } catch (error) {
    console.error('VagonSale list error:', error);
    res.status(500).json({ message: 'Sotuvlar ro\'yxatini olishda xatolik' });
  }
});

// Bitta sotuv ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await VagonSale.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
      .populate('vagon')
      .populate('lot')
      .populate('client');
    
    if (!sale) {
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    res.json(sale);
  } catch (error) {
    console.error('VagonSale get error:', error);
    res.status(500).json({ message: 'Sotuv ma\'lumotlarini olishda xatolik' });
  }
});

// Yangi sotuv yaratish yoki mavjudini yangilash (ENG MUHIM!)
router.post('/', auth, async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  
  try {
    const {
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
      // BRAK JAVOBGARLIK TAQSIMOTI
      brak_liability_distribution,
      sale_currency,
      price_per_m3,
      price_per_piece,
      paid_amount,
      notes
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
      if (!dispatchedVolume || !price_per_m3) {
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
    
    // Lotni tekshirish
    const VagonLot = require('../models/VagonLot');
    const lotDoc = await VagonLot.findOne({ 
      _id: lot, 
      isDeleted: false 
    }).session(session);
    
    if (!lotDoc) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Lot topilmadi' });
    }
    
    // Vagonni tekshirish
    const vagonDoc = await Vagon.findOne({ 
      _id: lotDoc.vagon, 
      isDeleted: false 
    }).session(session);
    
    if (!vagonDoc) {
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
    
    // Hajm va dona bo'yicha tekshirish
    let finalDispatchedVolume = dispatchedVolume;
    let finalSentQuantity = sent_quantity;
    
    if (sale_unit === 'pieces') {
      // Dona bo'yicha sotishda hajmni hisoblash
      const volumePerPiece = lotDoc.volume_m3 / lotDoc.quantity;
      finalDispatchedVolume = sent_quantity * volumePerPiece;
      
      // Dona tekshiruvi
      if (sent_quantity > (lotDoc.remaining_quantity || 0)) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `Lot da mavjud dona: ${lotDoc.remaining_quantity || 0}. Siz ${sent_quantity} dona jo'natmoqchisiz` 
        });
      }
    } else {
      // Hajm bo'yicha sotishda dona sonini hisoblash
      const volumePerPiece = lotDoc.volume_m3 / lotDoc.quantity;
      finalSentQuantity = Math.floor(finalDispatchedVolume / volumePerPiece);
      
      // Hajm tekshiruvi
      if (finalDispatchedVolume > lotDoc.warehouse_remaining_volume_m3) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `Lot da mavjud hajm: ${lotDoc.warehouse_remaining_volume_m3} m³. Siz ${finalDispatchedVolume} m³ jo'natmoqchisiz` 
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
    
    // Mijozni tekshirish
    const clientDoc = await Client.findOne({ 
      _id: client, 
      isDeleted: false 
    }).session(session);
    
    if (!clientDoc) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Bir xil mijoz va lotga sotuv borligini tekshirish
    const existingSale = await VagonSale.findOne({
      lot,
      client,
      isDeleted: false
    }).session(session);
    
    let sale;
    
    if (existingSale) {
      // Mavjud sotuvni yangilash
      const oldData = existingSale.toObject();
      const oldDispatchedVolume = existingSale.warehouse_dispatched_volume_m3 || existingSale.sent_volume_m3;
      const oldSentQuantity = existingSale.sent_quantity || 0;
      const oldTotalPrice = existingSale.total_price;
      const oldReceivedVolume = existingSale.client_received_volume_m3 || existingSale.accepted_volume_m3;
      
      existingSale.warehouse_dispatched_volume_m3 = (existingSale.warehouse_dispatched_volume_m3 || existingSale.sent_volume_m3) + finalDispatchedVolume;
      existingSale.sent_quantity = (existingSale.sent_quantity || 0) + finalSentQuantity;
      existingSale.transport_loss_m3 = (existingSale.transport_loss_m3 || existingSale.client_loss_m3) + transportLoss;
      existingSale.transport_loss_responsible_person = transport_loss_responsible_person || client_loss_responsible_person || existingSale.transport_loss_responsible_person;
      existingSale.transport_loss_reason = transport_loss_reason || client_loss_reason || existingSale.transport_loss_reason;
      existingSale.sale_currency = sale_currency; // Yangi valyuta
      existingSale.sale_unit = sale_unit || 'volume';
      existingSale.price_per_m3 = price_per_m3 || existingSale.price_per_m3; // Yangi narx
      existingSale.price_per_piece = price_per_piece || existingSale.price_per_piece;
      existingSale.paid_amount += (paid_amount || 0);
      if (notes) {
        existingSale.notes = notes;
      }
      
      await existingSale.save({ session }); // pre-save hook hisoblaydi
      
      // ✅ MAVJUD SOTUV YANGILANGANDA HAM MIJOZ QARZINI YANGILASH
      if (existingSale.total_price > 0) {
        console.log(`💰 Mavjud sotuv yangilandi, mijoz qarzi qayta hisoblanmoqda...`);
        
        try {
          await updateClientDebtWithSession(existingSale.client, session);
          console.log(`✅ Mijoz qarzi yangilandi`);
          
          // ✅ AGAR TO'LOV QO'SHILGAN BO'LSA, CASH JADVALIGA YOZISH
          if (paid_amount && parseFloat(paid_amount) > 0) {
            const client = await Client.findById(existingSale.client).session(session);
            if (client) {
              const paymentRecord = await Cash.create([{
                type: 'client_payment',
                client: existingSale.client,
                vagon: existingSale.vagon,
                vagonSale: existingSale._id,
                currency: existingSale.sale_currency,
                amount: parseFloat(paid_amount),
                description: `${client.name} tomonidan qo'shimcha to'lov - ${paid_amount} ${existingSale.sale_currency}`,
                transaction_date: new Date()
              }], { session });
              
              console.log(`✅ Qo'shimcha to'lov Cash jadvaliga yozildi: ${paid_amount} ${existingSale.sale_currency}`);
            }
          }
        } catch (cashError) {
          console.error(`❌ Mavjud sotuv yangilashda Cash xatolik:`, cashError);
          throw new Error(`Cash yangilashda xatolik: ${cashError.message}`);
        }
      }
      
      // Audit log
      await logUserAction(
        req, 
        'UPDATE', 
        'VagonSale', 
        existingSale._id, 
        oldData, 
        existingSale.toObject(), 
        `Sotuv yangilandi: ${clientDoc.name}`,
        { 
          added_volume: finalDispatchedVolume, 
          added_quantity: finalSentQuantity,
          total_volume: existingSale.warehouse_dispatched_volume_m3,
          total_quantity: existingSale.sent_quantity,
          transport_loss: transportLoss
        }
      );
      
      sale = existingSale;
      
      // LOTNI YANGILASH (faqat farqni qo'shamiz)
      lotDoc.warehouse_dispatched_volume_m3 += finalDispatchedVolume;
      // NaN ni oldini olish
      const priceDiff = isNaN(sale.total_price) || isNaN(oldTotalPrice) ? 0 : (sale.total_price - oldTotalPrice);
      lotDoc.total_revenue = (lotDoc.total_revenue || 0) + priceDiff;
      await lotDoc.save({ session });
      
      console.log(`✅ Mavjud sotuv yangilandi: ${clientDoc.name} - ${lotDoc.dimensions}`);
      console.log(`💰 Mijoz qarzi transaction ichida qayta hisoblandi`);
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
        price_per_m3: price_per_m3,
        price_per_piece: price_per_piece,
        paid_amount: paid_amount || 0,
        notes
      });
      
      await sale.save({ session });
      
      // ✅ POST-SAVE HOOK'NING ISHINI TRANSACTION ICHIDA BAJARISH
      if (sale.total_price > 0) {
        console.log(`💰 Mijoz qarzi va Cash yozuvlari yaratilmoqda...`);
        
        try {
          await updateClientDebtWithSession(sale.client, session);
          console.log(`✅ Mijoz qarzi yangilandi`);
          
          // ✅ YANGI SOTUV BO'LGANI UCHUN KASSAGA YOZISH (har doim yangi sotuv)
          await createCashRecordsWithSession(sale, session);
          console.log(`✅ Cash yozuvlari yaratildi`);
        } catch (cashError) {
          console.error(`❌ Cash yozuvlari yaratishda xatolik:`, cashError);
          throw new Error(`Cash yozuvlari yaratishda xatolik: ${cashError.message}`);
        }
      } else {
        console.log(`ℹ️  Jami narx 0, Cash yozuvlari yaratilmaydi`);
      }
      
      // Audit log
      await logUserAction(
        req, 
        'CREATE', 
        'VagonSale', 
        sale._id, 
        null, 
        sale.toObject(), 
        `Yangi sotuv yaratildi: ${clientDoc.name}`,
        { 
          dispatched_volume: finalDispatchedVolume,
          sent_quantity: finalSentQuantity,
          transport_loss: transportLoss,
          received_volume: sale.client_received_volume_m3
        }
      );
      
      // LOTNI YANGILASH
      lotDoc.warehouse_dispatched_volume_m3 += finalDispatchedVolume;
      // NaN ni oldini olish
      const revenueToAdd = isNaN(sale.total_price) ? 0 : sale.total_price;
      lotDoc.total_revenue = (lotDoc.total_revenue || 0) + revenueToAdd;
      await lotDoc.save({ session });
      
      console.log(`✅ Yangi sotuv yaratildi: ${clientDoc.name} - ${lotDoc.dimensions}`);
      console.log(`📊 Sotuv ma'lumotlari: ${sale.total_price} ${sale.sale_currency}`);
      console.log(`💰 Mijoz qarzi transaction ichida yangilandi`);
    }
    
    // VAGONNI YANGILASH (lotlardan)
    await updateVagonTotals(lotDoc.vagon, session);
    
    // VAGON YOPILISH TEKSHIRUVI
    const updatedVagon = await Vagon.findById(lotDoc.vagon).session(session);
    const canCloseResult = updatedVagon.canClose();
    
    if (canCloseResult.canClose && canCloseResult.reason === 'auto_close_percentage') {
      console.log(`🔒 Vagon avtomatik yopilmoqda: ${updatedVagon.vagonCode} (${canCloseResult.soldPercentage}% sotilgan)`);
      await updatedVagon.closeVagon(req.user.id, 'fully_sold', `Avtomatik yopildi: ${canCloseResult.soldPercentage}% sotilgan`);
    } else if (canCloseResult.canClose && canCloseResult.reason === 'min_remaining_volume') {
      console.log(`🔒 Vagon avtomatik yopilmoqda: ${updatedVagon.vagonCode} (${canCloseResult.remainingVolume} m³ qolgan)`);
      await updatedVagon.closeVagon(req.user.id, 'remaining_too_small', `Avtomatik yopildi: ${canCloseResult.remainingVolume} m³ qolgan`);
    }
    
    // ✅ TRANSACTION COMMIT QILISHDAN OLDIN CASH YOZUVLARINI TEKSHIRISH
    if (sale.total_price > 0) {
      const cashRecords = await Cash.find({
        vagonSale: sale._id,
        isDeleted: false
      }).session(session);
      
      console.log(`🔍 Yaratilgan Cash yozuvlari tekshirilmoqda...`);
      console.log(`   Kutilgan: debt_sale (${sale.total_price}) + client_payment (${sale.paid_amount || 0})`);
      console.log(`   Topilgan: ${cashRecords.length} ta yozuv`);
      
      const debtSaleRecord = cashRecords.find(r => r.type === 'debt_sale');
      const paymentRecord = cashRecords.find(r => r.type === 'client_payment');
      
      if (!debtSaleRecord) {
        throw new Error(`debt_sale yozuvi yaratilmagan! Sotuv ID: ${sale._id}`);
      }
      
      if (sale.paid_amount > 0 && !paymentRecord) {
        throw new Error(`client_payment yozuvi yaratilmagan! To'lov: ${sale.paid_amount}`);
      }
      
      console.log(`✅ Barcha Cash yozuvlari mavjud va to'g'ri`);
    }
    
    // Transaction commit
    await session.commitTransaction();
    console.log('✅ Transaction muvaffaqiyatli yakunlandi');
    
    // Populate qilib qaytarish
    await sale.populate('vagon', 'vagonCode month');
    await sale.populate('lot', 'dimensions purchase_currency');
    await sale.populate('client', 'name phone');
    
    // POST-SAVE HOOK'NING ISHLASHINI KUTISH
    // Hook asynchronous ishlaydi, shuning uchun biroz kutamiz
    setTimeout(() => {
      console.log('📝 Post-save hook ishlab bo\'lishi kerak');
    }, 1000);
    
    res.status(201).json(sale);
  } catch (error) {
    await session.abortTransaction();
    console.error('VagonSale create error:', error);
    
    // Error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validatsiya xatosi',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Server ichki xatosi',
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
    console.error('VagonSale update error:', error);
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
    }).session(session);
    
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
    const lotDoc = await VagonLot.findById(sale.lot).session(session);
    const clientDoc = await Client.findById(sale.client).session(session);
    
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
    console.error('VagonSale delete error:', error);
    res.status(500).json({ message: 'Sotuvni o\'chirishda xatolik' });
  } finally {
    session.endSession();
  }
});

// To'lov qilish - DEPRECATED
// Endi faqat /api/cash/client-payment ishlatiladi
// Bu endpoint keyingi versiyada o'chiriladi
router.post('/:id/payment', auth, async (req, res) => {
  res.status(410).json({ 
    message: 'Bu endpoint ishlatilmaydi. Iltimos /api/cash/client-payment ishlatting',
    deprecated: true,
    alternative: 'POST /api/cash/client-payment'
  });
});

module.exports = router;
