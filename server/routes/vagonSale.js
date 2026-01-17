const express = require('express');
const router = express.Router();
const VagonSale = require('../models/VagonSale');
const Vagon = require('../models/Vagon');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const { logUserAction } = require('../middleware/auditLog');

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
      // BRAK JAVOBGARLIK TAQSIMOTI
      brak_liability_distribution,
      sale_currency,
      price_per_m3,
      paid_amount,
      notes
    } = req.body;
    
    // Validatsiya
    const dispatchedVolume = warehouse_dispatched_volume_m3 || sent_volume_m3;
    const transportLoss = transport_loss_m3 || client_loss_m3 || 0;
    
    if (!lot || !client || !dispatchedVolume || !sale_currency || !price_per_m3) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Barcha majburiy maydonlar to\'ldirilishi shart' 
      });
    }
    
    // Valyuta tekshiruvi
    if (!['USD', 'RUB'].includes(sale_currency)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Valyuta faqat USD yoki RUB bo\'lishi mumkin' 
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
    
    // Hajmni tekshirish
    if (dispatchedVolume > lotDoc.warehouse_remaining_volume_m3) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `Lot da mavjud hajm: ${lotDoc.warehouse_remaining_volume_m3} m³. Siz ${dispatchedVolume} m³ jo'natmoqchisiz` 
      });
    }
    
    // Yo'qotish tekshiruvi
    if (transportLoss && transportLoss >= dispatchedVolume) {
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
      const oldTotalPrice = existingSale.total_price;
      const oldReceivedVolume = existingSale.client_received_volume_m3 || existingSale.accepted_volume_m3;
      
      existingSale.warehouse_dispatched_volume_m3 = (existingSale.warehouse_dispatched_volume_m3 || existingSale.sent_volume_m3) + dispatchedVolume;
      existingSale.transport_loss_m3 = (existingSale.transport_loss_m3 || existingSale.client_loss_m3) + transportLoss;
      existingSale.transport_loss_responsible_person = transport_loss_responsible_person || client_loss_responsible_person || existingSale.transport_loss_responsible_person;
      existingSale.transport_loss_reason = transport_loss_reason || client_loss_reason || existingSale.transport_loss_reason;
      existingSale.sale_currency = sale_currency; // Yangi valyuta
      existingSale.price_per_m3 = price_per_m3; // Yangi narx
      existingSale.paid_amount += (paid_amount || 0);
      if (notes) {
        existingSale.notes = notes;
      }
      
      await existingSale.save({ session }); // pre-save hook hisoblaydi
      
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
          added_volume: dispatchedVolume, 
          total_volume: existingSale.warehouse_dispatched_volume_m3,
          transport_loss: transportLoss
        }
      );
      
      sale = existingSale;
      
      // LOTNI YANGILASH (faqat farqni qo'shamiz)
      lotDoc.warehouse_dispatched_volume_m3 += dispatchedVolume;
      lotDoc.total_revenue += (sale.total_price - oldTotalPrice);
      await lotDoc.save({ session });
      
      // MIJOZNI YANGILASH (valyuta bo'yicha)
      const newReceivedVolume = sale.client_received_volume_m3 || sale.accepted_volume_m3;
      const volumeDifference = newReceivedVolume - oldReceivedVolume;
      const priceDifference = sale.total_price - oldTotalPrice;
      
      // Valyuta bo'yicha yangilash
      if (sale.sale_currency === 'USD') {
        clientDoc.usd_total_received_volume += volumeDifference;
        clientDoc.usd_total_debt += priceDifference;
        clientDoc.usd_total_paid += (paid_amount || 0);
      } else if (sale.sale_currency === 'RUB') {
        clientDoc.rub_total_received_volume += volumeDifference;
        clientDoc.rub_total_debt += priceDifference;
        clientDoc.rub_total_paid += (paid_amount || 0);
      }
      
      // Backward compatibility (pre-save hook avtomatik hisoblaydi)
      await clientDoc.save({ session });
      
      console.log(`✅ Mavjud sotuv yangilandi: ${clientDoc.name} - ${lotDoc.dimensions}`);
    } else {
      // Yangi sotuv yaratish
      sale = new VagonSale({
        vagon: lotDoc.vagon,
        lot,
        client,
        warehouse_dispatched_volume_m3: dispatchedVolume,
        transport_loss_m3: transportLoss,
        transport_loss_responsible_person: transport_loss_responsible_person || client_loss_responsible_person,
        transport_loss_reason: transport_loss_reason || client_loss_reason,
        // BRAK JAVOBGARLIK TAQSIMOTI
        brak_liability_distribution: brak_liability_distribution || null,
        // Backward compatibility
        sent_volume_m3: dispatchedVolume,
        client_loss_m3: transportLoss,
        client_loss_responsible_person: transport_loss_responsible_person || client_loss_responsible_person,
        client_loss_reason: transport_loss_reason || client_loss_reason,
        sale_currency: sale_currency,
        price_per_m3,
        paid_amount: paid_amount || 0,
        notes
      });
      
      await sale.save({ session });
      
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
          dispatched_volume: dispatchedVolume, 
          transport_loss: transportLoss,
          received_volume: sale.client_received_volume_m3
        }
      );
      
      // LOTNI YANGILASH
      lotDoc.warehouse_dispatched_volume_m3 += dispatchedVolume;
      lotDoc.total_revenue += sale.total_price;
      await lotDoc.save({ session });
      
      // MIJOZNI YANGILASH (valyuta bo'yicha)
      const receivedVolume = sale.client_received_volume_m3 || sale.accepted_volume_m3;
      
      // Valyuta bo'yicha yangilash
      if (sale.sale_currency === 'USD') {
        clientDoc.usd_total_received_volume += receivedVolume;
        clientDoc.usd_total_debt += sale.total_price;
        clientDoc.usd_total_paid += sale.paid_amount;
      } else if (sale.sale_currency === 'RUB') {
        clientDoc.rub_total_received_volume += receivedVolume;
        clientDoc.rub_total_debt += sale.total_price;
        clientDoc.rub_total_paid += sale.paid_amount;
      }
      
      // Backward compatibility (pre-save hook avtomatik hisoblaydi)
      await clientDoc.save({ session });
      
      console.log(`✅ Yangi sotuv yaratildi: ${clientDoc.name} - ${lotDoc.dimensions}`);
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
    
    // Transaction commit
    await session.commitTransaction();
    
    // Populate qilib qaytarish
    await sale.populate('vagon', 'vagonCode month');
    await sale.populate('lot', 'dimensions purchase_currency');
    await sale.populate('client', 'name phone');
    
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

// Helper function: Vagon jami ma'lumotlarini yangilash
async function updateVagonTotals(vagonId, session) {
  const VagonLot = require('../models/VagonLot');
  const lots = await VagonLot.find({ 
    vagon: vagonId, 
    isDeleted: false 
  }).session(session);
  
  const vagon = await Vagon.findById(vagonId).session(session);
  if (!vagon) return;
  
  // Hajmlar (yangi terminologiya bilan xavfsiz hisoblash)
  vagon.total_volume_m3 = lots.reduce((sum, lot) => sum + (lot.volume_m3 || 0), 0);
  vagon.total_loss_m3 = lots.reduce((sum, lot) => sum + (lot.loss_volume_m3 || 0), 0);
  vagon.available_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_available_volume_m3 || lot.available_volume_m3 || 0), 0);
  vagon.sold_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_dispatched_volume_m3 || lot.sold_volume_m3 || 0), 0);
  vagon.remaining_volume_m3 = lots.reduce((sum, lot) => sum + (lot.warehouse_remaining_volume_m3 || lot.remaining_volume_m3 || 0), 0);
  
  // USD (yangi terminologiya bilan)
  const usdLots = lots.filter(lot => lot.purchase_currency === 'USD');
  vagon.usd_total_cost = usdLots.reduce((sum, lot) => sum + (lot.total_investment || lot.total_expenses || 0), 0);
  vagon.usd_total_revenue = usdLots.reduce((sum, lot) => sum + (lot.total_revenue || 0), 0);
  vagon.usd_profit = usdLots.reduce((sum, lot) => sum + (lot.realized_profit || lot.profit || 0), 0);
  
  // RUB (yangi terminologiya bilan)
  const rubLots = lots.filter(lot => lot.purchase_currency === 'RUB');
  vagon.rub_total_cost = rubLots.reduce((sum, lot) => sum + (lot.total_investment || lot.total_expenses || 0), 0);
  vagon.rub_total_revenue = rubLots.reduce((sum, lot) => sum + (lot.total_revenue || 0), 0);
  vagon.rub_profit = rubLots.reduce((sum, lot) => sum + (lot.realized_profit || lot.profit || 0), 0);
  
  await vagon.save({ session });
}

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

// HELPER FUNCTION: Vagon jami ma'lumotlarini yangilash
async function updateVagonTotals(vagonId, session = null) {
  try {
    const VagonLot = require('../models/VagonLot');
    
    // Vagon bo'yicha barcha lotlarni olish
    const lots = await VagonLot.find({ 
      vagon: vagonId, 
      isDeleted: false 
    }).session(session);
    
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
        totals.usd_total_cost += lot.total_investment || lot.total_expenses || 0;
        totals.usd_total_revenue += lot.total_revenue || 0;
        totals.usd_profit += lot.realized_profit || lot.profit || 0;
      } else if (lot.purchase_currency === 'RUB') {
        totals.rub_total_cost += lot.total_investment || lot.total_expenses || 0;
        totals.rub_total_revenue += lot.total_revenue || 0;
        totals.rub_profit += lot.realized_profit || lot.profit || 0;
      }
    });
    
    // Vagonni yangilash
    const updateOptions = session ? { session } : {};
    await Vagon.findByIdAndUpdate(vagonId, totals, updateOptions);
    
    console.log(`✅ Vagon ${vagonId} jami ma'lumotlari yangilandi:`, {
      total_volume: totals.total_volume_m3,
      sold_volume: totals.sold_volume_m3,
      remaining_volume: totals.remaining_volume_m3,
      usd_profit: totals.usd_profit,
      rub_profit: totals.rub_profit
    });
    
  } catch (error) {
    console.error(`❌ Vagon ${vagonId} ma'lumotlarini yangilashda xatolik:`, error);
    throw error;
  }
}

module.exports = router;
