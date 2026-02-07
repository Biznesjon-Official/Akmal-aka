const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Cash = require('../models/Cash');
const Client = require('../models/Client');
const { updateClientDeliveryDebt } = require('../utils/clientHelpers');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Oy bo'yicha hisobot (bu route birinchi bo'lishi kerak, chunki /reports/monthly /:id bilan conflict qiladi)
router.get('/reports/monthly', auth, async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month) {
      return res.status(400).json({ message: 'Oy parametri kerak' });
    }
    
    const deliveries = await Delivery.find({ 
      month, 
      isDeleted: false 
    });
    
    const report = {
      month,
      totalOrders: deliveries.length,
      totalTariff: deliveries.reduce((sum, d) => sum + d.totalTariff, 0),
      totalPayment: deliveries.reduce((sum, d) => sum + d.payment, 0),
      totalDebt: deliveries.reduce((sum, d) => sum + d.debt, 0),
      paidOrders: deliveries.filter(d => d.paymentStatus === 'paid').length,
      partialOrders: deliveries.filter(d => d.paymentStatus === 'partial').length,
      unpaidOrders: deliveries.filter(d => d.paymentStatus === 'unpaid').length
    };
    
    res.json(report);
  } catch (error) {
    logger.error('Hisobot olishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Barcha deliverylarni olish (soft-deleted bo'lmaganlar) - optimizatsiya bilan
router.get('/', auth, async (req, res) => {
  try {
    const { month, status, client } = req.query;
    
    const filter = { isDeleted: false };
    
    if (month) {
      filter.month = month;
    }
    
    if (status) {
      filter.paymentStatus = status;
    }
    
    if (client) {
      filter.client = client;
    }
    
    // Faqat kerakli fieldlarni olish (projection)
    const deliveries = await Delivery.find(filter)
      .select('-__v') // __v fieldini chiqarib tashlash
      .populate('client', 'name phone') // YANGI: Mijoz ma'lumotlarini olish
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .sort({ month: -1, orderNumber: -1 })
      .lean(); // Plain JavaScript object qaytarish (tezroq)
    
    res.json(deliveries);
  } catch (error) {
    logger.error('Delivery olishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Bitta deliveryni olish
router.get('/:id', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
      .populate('client', 'name phone') // YANGI: Mijoz ma'lumotlarini olish
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery topilmadi' });
    }
    
    res.json(delivery);
  } catch (error) {
    logger.error('Delivery olishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi delivery yaratish
router.post('/', auth, async (req, res) => {
  console.log('📥 Olib kelib berish yaratish so\'rovi keldi:', req.body);
  
  try {
    const {
      orderNumber,
      month,
      codeUZ,
      codeKZ,
      fromLocation,
      toLocation,
      tonnage,
      orderDate,
      sender,
      receiver,
      client, // YANGI: Mijoz ID
      vagonNumber,
      shipmentNumber,
      actualWeight,
      roundedWeight,
      rateKZ,
      rateUZ,
      afghanTariff,
      payment
    } = req.body;
    
    // Tariflarni hisoblash
    const tariffKZ = roundedWeight * rateKZ;
    const tariffUZ = roundedWeight * rateUZ;
    const totalTariff = afghanTariff + tariffKZ + tariffUZ;
    const debt = totalTariff - (payment || 0);
    
    // Payment status aniqlash
    let paymentStatus = 'unpaid';
    if (payment > 0) {
      paymentStatus = debt === 0 ? 'paid' : 'partial';
    }
    
    const delivery = new Delivery({
      orderNumber,
      month,
      codeUZ,
      codeKZ,
      fromLocation,
      toLocation,
      tonnage,
      orderDate,
      sender,
      receiver,
      client: client || null, // YANGI: Mijoz (ixtiyoriy)
      vagonNumber,
      shipmentNumber,
      actualWeight,
      roundedWeight,
      rateKZ,
      tariffKZ,
      rateUZ,
      tariffUZ,
      afghanTariff,
      totalTariff,
      payment: payment || 0,
      debt,
      paymentStatus,
      createdBy: req.user.userId,
      updatedBy: req.user.userId
    });
    
    await delivery.save();
    
    // MIJOZ QARZINI DARHOL YANGILASH (agar mijoz tanlangan bo'lsa)
    if (client) {
      console.log(`🚚 Olib kelib berish yaratildi, mijoz qarzi darhol yangilanmoqda: ${client}`);
      try {
        await updateClientDeliveryDebt(client);
        console.log(`✅ Mijoz ${client} qarzi darhol yangilandi`);
      } catch (error) {
        logger.error(`❌ Mijoz ${client} qarzini yangilashda xatolik:`, error);
        // Bu xatolik response'ga ta'sir qilmaydi
      }
    } else {
      console.log(`ℹ️  Mijoz tanlanmagan, qarz yangilanmaydi`);
    }
    
    // KASSA INTEGRATSIYASI: To'lov kiritilgan bo'lsa, kassaga qo'shamiz
    if (payment > 0) {
      await Cash.create({
        type: 'delivery_payment',
        delivery: delivery._id,
        client: client || null, // YANGI: Mijoz bilan bog'lash
        currency: 'USD',
        amount: payment,
        description: `Delivery #${orderNumber} to'lovi: ${fromLocation} → ${toLocation}`,
        transaction_date: new Date(),
        createdBy: req.user.userId
      });
    }
    
    // KASSA INTEGRATSIYASI: Xarajatlarni kassaga qo'shamiz
    await Cash.create({
      type: 'delivery_expense',
      delivery: delivery._id,
      currency: 'USD',
      amount: totalTariff,
      description: `Delivery #${orderNumber} xarajatlari: Afgon (${afghanTariff}) + KZ (${tariffKZ.toFixed(2)}) + UZ (${tariffUZ.toFixed(2)})`,
      transaction_date: new Date(),
      createdBy: req.user.userId
    });
    
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('client', 'name phone') // YANGI: Mijoz ma'lumotlarini olish
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    res.status(201).json(populatedDelivery);
  } catch (error) {
    logger.error('Delivery yaratishda xatolik:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Request body:', req.body);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Deliveryni yangilash
router.put('/:id', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery topilmadi' });
    }
    
    const {
      orderNumber,
      month,
      codeUZ,
      codeKZ,
      fromLocation,
      toLocation,
      tonnage,
      orderDate,
      sender,
      receiver,
      client, // YANGI: Mijoz ID
      vagonNumber,
      shipmentNumber,
      actualWeight,
      roundedWeight,
      rateKZ,
      rateUZ,
      afghanTariff,
      payment
    } = req.body;
    
    // Tariflarni qayta hisoblash
    const tariffKZ = roundedWeight * rateKZ;
    const tariffUZ = roundedWeight * rateUZ;
    const totalTariff = afghanTariff + tariffKZ + tariffUZ;
    const debt = totalTariff - (payment || 0);
    
    // Payment status aniqlash
    let paymentStatus = 'unpaid';
    if (payment > 0) {
      paymentStatus = debt === 0 ? 'paid' : 'partial';
    }
    
    // Eski to'lov va xarajatlarni eslab qolamiz
    const oldPayment = delivery.payment;
    const oldTotalTariff = delivery.totalTariff;
    
    // Yangilash
    delivery.orderNumber = orderNumber;
    delivery.month = month;
    delivery.codeUZ = codeUZ;
    delivery.codeKZ = codeKZ;
    delivery.fromLocation = fromLocation;
    delivery.toLocation = toLocation;
    delivery.tonnage = tonnage;
    delivery.orderDate = orderDate;
    delivery.sender = sender;
    delivery.receiver = receiver;
    delivery.client = client || null; // YANGI: Mijoz
    delivery.vagonNumber = vagonNumber;
    delivery.shipmentNumber = shipmentNumber;
    delivery.actualWeight = actualWeight;
    delivery.roundedWeight = roundedWeight;
    delivery.rateKZ = rateKZ;
    delivery.tariffKZ = tariffKZ;
    delivery.rateUZ = rateUZ;
    delivery.tariffUZ = tariffUZ;
    delivery.afghanTariff = afghanTariff;
    delivery.totalTariff = totalTariff;
    delivery.payment = payment || 0;
    delivery.debt = debt;
    delivery.paymentStatus = paymentStatus;
    delivery.updatedBy = req.user.userId;
    
    await delivery.save();
    
    // MIJOZ QARZINI DARHOL YANGILASH (agar mijoz tanlangan bo'lsa)
    if (client) {
      await updateClientDeliveryDebt(client);
      console.log(`✅ Mijoz ${client} qarzi darhol yangilandi`);
    }
    
    // KASSA INTEGRATSIYASI: To'lov o'zgarganda kassani yangilaymiz
    if (payment !== oldPayment) {
      // Eski to'lovni o'chiramiz
      await Cash.deleteMany({ delivery: delivery._id, type: 'delivery_payment' });
      
      // Yangi to'lovni qo'shamiz
      if (payment > 0) {
        await Cash.create({
          type: 'delivery_payment',
          delivery: delivery._id,
          client: client || null, // YANGI: Mijoz bilan bog'lash
          currency: 'USD',
          amount: payment,
          description: `Delivery #${orderNumber} to'lovi: ${fromLocation} → ${toLocation}`,
          transaction_date: new Date(),
          createdBy: req.user.userId
        });
      }
    }
    
    // KASSA INTEGRATSIYASI: Xarajat o'zgarganda kassani yangilaymiz
    if (totalTariff !== oldTotalTariff) {
      // Eski xarajatni o'chiramiz
      await Cash.deleteMany({ delivery: delivery._id, type: 'delivery_expense' });
      
      // Yangi xarajatni qo'shamiz
      await Cash.create({
        type: 'delivery_expense',
        delivery: delivery._id,
        currency: 'USD',
        amount: totalTariff,
        description: `Delivery #${orderNumber} xarajatlari: Afgon (${afghanTariff}) + KZ (${tariffKZ.toFixed(2)}) + UZ (${tariffUZ.toFixed(2)})`,
        transaction_date: new Date(),
        createdBy: req.user.userId
      });
    }
    
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('client', 'name phone') // YANGI: Mijoz ma'lumotlarini olish
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    res.json(populatedDelivery);
  } catch (error) {
    logger.error('Delivery yangilashda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Deliveryni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery topilmadi' });
    }
    
    delivery.isDeleted = true;
    delivery.deletedAt = new Date();
    delivery.deletedBy = req.user.userId;
    
    await delivery.save();
    
    // KASSA INTEGRATSIYASI: Delivery o'chirilganda kassadan ham o'chiramiz
    await Cash.deleteMany({ delivery: delivery._id });
    
    res.json({ message: 'Delivery muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    logger.error('Delivery o\'chirishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;