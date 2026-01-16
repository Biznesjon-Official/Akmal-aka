const express = require('express');
const router = express.Router();
const VagonSale = require('../models/VagonSale');
const Vagon = require('../models/Vagon');
const Client = require('../models/Client');
const auth = require('../middleware/auth');

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
      sent_volume_m3,
      client_loss_m3,
      sale_currency,
      price_per_m3,
      paid_amount,
      notes
    } = req.body;
    
    // Validatsiya
    if (!lot || !client || !sent_volume_m3 || !sale_currency || !price_per_m3) {
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
    if (sent_volume_m3 > lotDoc.remaining_volume_m3) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `Lot da mavjud hajm: ${lotDoc.remaining_volume_m3} m³. Siz ${sent_volume_m3} m³ jo'natmoqchisiz` 
      });
    }
    
    // Yo'qotish tekshiruvi
    if (client_loss_m3 && client_loss_m3 >= sent_volume_m3) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Yo\'qotish hajmi jo\'natilgan hajmdan kichik bo\'lishi kerak' 
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
      const oldSentVolume = existingSale.sent_volume_m3;
      const oldTotalPrice = existingSale.total_price;
      const oldAcceptedVolume = existingSale.accepted_volume_m3;
      
      existingSale.sent_volume_m3 += sent_volume_m3;
      existingSale.client_loss_m3 += (client_loss_m3 || 0);
      existingSale.sale_currency = sale_currency; // Yangi valyuta
      existingSale.price_per_m3 = price_per_m3; // Yangi narx
      existingSale.paid_amount += (paid_amount || 0);
      if (notes) {
        existingSale.notes = notes;
      }
      
      await existingSale.save({ session }); // pre-save hook hisoblaydi
      
      sale = existingSale;
      
      // LOTNI YANGILASH (faqat farqni qo'shamiz)
      lotDoc.sold_volume_m3 += sent_volume_m3;
      lotDoc.total_revenue += (sale.total_price - oldTotalPrice);
      await lotDoc.save({ session });
      
      // MIJOZNI YANGILASH (faqat farqni qo'shamiz)
      clientDoc.total_received_volume += (sale.accepted_volume_m3 - oldAcceptedVolume);
      clientDoc.total_debt += (sale.total_price - oldTotalPrice);
      clientDoc.total_paid += (paid_amount || 0);
      await clientDoc.save({ session });
      
      console.log(`✅ Mavjud sotuv yangilandi: ${clientDoc.name} - ${lotDoc.dimensions}`);
    } else {
      // Yangi sotuv yaratish
      sale = new VagonSale({
        vagon: lotDoc.vagon,
        lot,
        client,
        sent_volume_m3,
        client_loss_m3: client_loss_m3 || 0,
        sale_currency: sale_currency,
        price_per_m3,
        paid_amount: paid_amount || 0,
        notes
      });
      
      await sale.save({ session });
      
      // LOTNI YANGILASH
      lotDoc.sold_volume_m3 += sent_volume_m3;
      lotDoc.total_revenue += sale.total_price;
      await lotDoc.save({ session });
      
      // MIJOZNI YANGILASH
      clientDoc.total_received_volume += sale.accepted_volume_m3;
      clientDoc.total_debt += sale.total_price;
      clientDoc.total_paid += sale.paid_amount;
      await clientDoc.save({ session });
      
      console.log(`✅ Yangi sotuv yaratildi: ${clientDoc.name} - ${lotDoc.dimensions}`);
    }
    
    // VAGONNI YANGILASH (lotlardan)
    await updateVagonTotals(lotDoc.vagon, session);
    
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
  
  // Hajmlar
  vagon.total_volume_m3 = lots.reduce((sum, lot) => sum + lot.volume_m3, 0);
  vagon.total_loss_m3 = lots.reduce((sum, lot) => sum + lot.loss_volume_m3, 0);
  vagon.available_volume_m3 = lots.reduce((sum, lot) => sum + lot.available_volume_m3, 0);
  vagon.sold_volume_m3 = lots.reduce((sum, lot) => sum + lot.sold_volume_m3, 0);
  vagon.remaining_volume_m3 = lots.reduce((sum, lot) => sum + lot.remaining_volume_m3, 0);
  
  // USD
  const usdLots = lots.filter(lot => lot.purchase_currency === 'USD');
  vagon.usd_total_cost = usdLots.reduce((sum, lot) => sum + lot.total_expenses, 0);
  vagon.usd_total_revenue = usdLots.reduce((sum, lot) => sum + lot.total_revenue, 0);
  vagon.usd_profit = usdLots.reduce((sum, lot) => sum + lot.profit, 0);
  
  // RUB
  const rubLots = lots.filter(lot => lot.purchase_currency === 'RUB');
  vagon.rub_total_cost = rubLots.reduce((sum, lot) => sum + lot.total_expenses, 0);
  vagon.rub_total_revenue = rubLots.reduce((sum, lot) => sum + lot.total_revenue, 0);
  vagon.rub_profit = rubLots.reduce((sum, lot) => sum + lot.profit, 0);
  
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

module.exports = router;
