const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const VagonSale = require('../models/VagonSale');
const Cash = require('../models/Cash');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Barcha mijozlar ro'yxati (PAGINATION BILAN)
router.get('/', auth, async (req, res) => {
  try {
    const { 
      search, 
      hasDebt, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = { isDeleted: false };
    
    // Qidiruv filtri
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Qarzli mijozlar filtri - FIXED: Delivery qarzini ham hisobga olish
    if (hasDebt === 'true') {
      filter.$or = [
        { $expr: { $gt: [{ $subtract: ['$usd_total_debt', '$usd_total_paid'] }, 0] } },
        { $expr: { $gt: [{ $subtract: ['$rub_total_debt', '$rub_total_paid'] }, 0] } },
        { $expr: { $gt: [{ $subtract: ['$delivery_total_debt', '$delivery_total_paid'] }, 0] } }
      ];
    }
    
    // Pagination parametrlari
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Jami soni
    const total = await Client.countDocuments(filter);
    
    // Mijozlarni olish (faqat kerakli fieldlar)
    const clients = await Client.find(filter)
      .select('name phone address usd_total_debt usd_total_paid rub_total_debt rub_total_paid delivery_total_debt delivery_total_paid usd_total_received_volume rub_total_received_volume createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Virtual field'larni qo'shish - FIXED: Delivery qarzini ham hisoblash
    const clientsWithVirtuals = clients.map(client => {
      const obj = client.toObject({ virtuals: true });
      
      // DELIVERY QARZINI TO'G'RI HISOBLASH
      const deliveryCurrentDebt = Math.max(0, (client.delivery_total_debt || 0) - (client.delivery_total_paid || 0));
      obj.delivery_current_debt = deliveryCurrentDebt;
      
      // JAMI QARZ (USD ekvivalentida)
      const usdDebt = Math.max(0, (client.usd_total_debt || 0) - (client.usd_total_paid || 0));
      const rubDebtUsd = Math.max(0, (client.rub_total_debt || 0) - (client.rub_total_paid || 0)) * 0.011; // RUB to USD
      obj.total_current_debt_usd = usdDebt + rubDebtUsd + deliveryCurrentDebt;
      
      return obj;
    });
    
    // Pagination ma'lumotlari
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      clients: clientsWithVirtuals,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    logger.error('Client list error:', error);
    res.status(500).json({ message: 'Mijozlar ro\'yxatini olishda xatolik' });
  }
});

// Bitta mijoz ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Virtual field'lar bilan qaytarish
    const clientWithVirtuals = client.toObject({ virtuals: true });
    
    // DELIVERY QARZINI TO'G'RI HISOBLASH
    const deliveryCurrentDebt = Math.max(0, (client.delivery_total_debt || 0) - (client.delivery_total_paid || 0));
    clientWithVirtuals.delivery_current_debt = deliveryCurrentDebt;
    
    console.log(`📊 Mijoz ${client.name} ma'lumotlari:`);
    console.log(`   USD qarz: ${client.usd_total_debt || 0} - ${client.usd_total_paid || 0} = ${Math.max(0, (client.usd_total_debt || 0) - (client.usd_total_paid || 0))}`);
    console.log(`   RUB qarz: ${client.rub_total_debt || 0} - ${client.rub_total_paid || 0} = ${Math.max(0, (client.rub_total_debt || 0) - (client.rub_total_paid || 0))}`);
    console.log(`   Delivery qarz: ${client.delivery_total_debt || 0} - ${client.delivery_total_paid || 0} = ${deliveryCurrentDebt}`);
    
    res.json(clientWithVirtuals);
  } catch (error) {
    logger.error('Client get error:', error);
    res.status(500).json({ message: 'Mijoz ma\'lumotlarini olishda xatolik' });
  }
});

// Yangi mijoz yaratish
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    
    // Validatsiya
    if (!name || !phone) {
      return res.status(400).json({ 
        message: 'Mijoz nomi va telefon raqami kiritilishi shart' 
      });
    }
    
    // Telefon raqami mavjudligini tekshirish
    const existingClient = await Client.findOne({ 
      phone, 
      isDeleted: false 
    });
    
    if (existingClient) {
      return res.status(400).json({ 
        message: 'Bu telefon raqami bilan mijoz allaqachon mavjud' 
      });
    }
    
    // Yangi mijoz yaratish
    const client = new Client({
      name,
      phone,
      address,
      notes
    });
    
    await client.save();
    
    res.status(201).json(client);
  } catch (error) {
    logger.error('Client create error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Mijozni yangilash
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Telefon raqami o'zgargan bo'lsa, mavjudligini tekshirish
    if (phone && phone !== client.phone) {
      const existingClient = await Client.findOne({ 
        phone, 
        isDeleted: false,
        _id: { $ne: req.params.id }
      });
      
      if (existingClient) {
        return res.status(400).json({ 
          message: 'Bu telefon raqami bilan boshqa mijoz mavjud' 
        });
      }
    }
    
    // Yangilash
    if (name) client.name = name;
    if (phone) client.phone = phone;
    if (address !== undefined) client.address = address;
    if (notes !== undefined) client.notes = notes;
    
    await client.save();
    
    res.json(client);
  } catch (error) {
    logger.error('Client update error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Mijozni o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Qarz borligini tekshirish - YANGI TIZIM (USD va RUB alohida)
    const usdDebt = Math.max(0, client.usd_total_debt - client.usd_total_paid);
    const rubDebt = Math.max(0, client.rub_total_debt - client.rub_total_paid);
    
    if (usdDebt > 0 || rubDebt > 0) {
      let debtMessage = 'Mijozning qarzi bor:';
      if (usdDebt > 0) {
        debtMessage += ` ${usdDebt.toLocaleString()} USD`;
      }
      if (rubDebt > 0) {
        if (usdDebt > 0) debtMessage += ' va';
        debtMessage += ` ${rubDebt.toLocaleString()} RUB`;
      }
      debtMessage += '. Avval qarzni to\'lang';
      
      return res.status(400).json({ 
        message: debtMessage,
        debt_details: {
          usd: usdDebt,
          rub: rubDebt
        }
      });
    }
    
    client.isDeleted = true;
    await client.save();
    
    res.json({ message: 'Mijoz o\'chirildi' });
  } catch (error) {
    logger.error('Client delete error:', error);
    res.status(500).json({ message: 'Mijozni o\'chirishda xatolik' });
  }
});

// Mijoz statistikasi
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    const stats = {
      total_received_volume: client.total_received_volume,
      total_debt: client.total_debt,
      total_paid: client.total_paid,
      current_debt: client.current_debt,
      payment_percentage: client.total_debt > 0 
        ? ((client.total_paid / client.total_debt) * 100).toFixed(2)
        : 100
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('Client stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

// Mijoz qarzini boshqarish (qo'shish/kamaytirish)
router.post('/:id/debt', auth, async (req, res) => {
  const session = await require('mongoose').startSession();
  
  try {
    session.startTransaction();
    
    const { amount, currency, description, type } = req.body;
    
    console.log(`🔍 Debt management request:`, {
      clientId: req.params.id,
      amount,
      currency,
      description,
      type,
      userId: req.user?.userId
    });
    
    if (!amount || !currency || !type) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Summa, valyuta va amal turi kiritilishi shart' 
      });
    }
    
    if (!['debt_increase', 'debt_decrease'].includes(type)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Amal turi faqat debt_increase yoki debt_decrease bo\'lishi mumkin' 
      });
    }
    
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    }).session(session).read('primary');
    
    if (!client) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    const amountValue = Math.abs(amount);
    console.log(`💰 Processing debt operation: ${type} ${amountValue} ${currency} for ${client.name}`);
    
    // Kassaga yozish
    const Cash = require('../models/Cash');
    let cashTransaction;
    
    if (type === 'debt_increase') {
      // Qarz qo'shish = Yog'och sotilgan (kirim)
      cashTransaction = await Cash.create([{
        type: 'debt_sale',
        client: client._id,
        currency: currency,
        amount: amountValue,
        description: description || `Qarzga sotuv: ${client.name} - ${amountValue} ${currency}`,
        transaction_date: new Date(),
        createdBy: req.user.userId
      }], { session });
      
      // FAQAT qarzni oshirish, to'lovni emas!
      if (currency === 'USD') {
        client.usd_total_debt += amountValue;
        // usd_total_paid ni o'zgartirmaymiz!
      } else if (currency === 'RUB') {
        client.rub_total_debt += amountValue;
        // rub_total_paid ni o'zgartirmaymiz!
      }
      
      console.log(`✅ Qarz qo'shildi: ${client.name} - ${amountValue} ${currency}`);
      
    } else if (type === 'debt_decrease') {
      // Qarz kamaytirish = To'lov qilingan
      
      // Avval qarz borligini tekshirish
      const currentDebt = currency === 'USD' ? 
        Math.max(0, client.usd_total_debt - client.usd_total_paid) : 
        Math.max(0, client.rub_total_debt - client.rub_total_paid);
      
      console.log(`🔍 Current debt check: ${currency} debt = ${currentDebt}, trying to reduce by ${amountValue}`);
      
      if (amountValue > currentDebt) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `${currency} da qarz: ${currentDebt.toLocaleString()}. Siz ${amountValue.toLocaleString()} kamaytirmoqchisiz` 
        });
      }
      
      cashTransaction = await Cash.create([{
        type: 'client_payment',
        client: client._id,
        currency: currency,
        amount: amountValue,
        description: description || `Qarz to'lovi: ${client.name} - ${amountValue} ${currency}`,
        transaction_date: new Date(),
        createdBy: req.user.userId
      }], { session });
      
      // FAQAT to'lovni oshirish, qarzni emas!
      if (currency === 'USD') {
        client.usd_total_paid += amountValue;
        // usd_total_debt ni o'zgartirmaymiz!
      } else if (currency === 'RUB') {
        client.rub_total_paid += amountValue;
        // rub_total_debt ni o'zgartirmaymiz!
      }
      
      console.log(`✅ Qarz to'landi: ${client.name} - ${amountValue} ${currency}`);
    }
    
    await client.save({ session });
    await session.commitTransaction();
    
    // Yangilangan qarz hisobini hisoblash
    const updatedClient = await Client.findById(client._id);
    const usdDebt = Math.max(0, updatedClient.usd_total_debt - updatedClient.usd_total_paid);
    const rubDebt = Math.max(0, updatedClient.rub_total_debt - updatedClient.rub_total_paid);
    
    console.log(`✅ Debt operation completed. New debt: USD ${usdDebt}, RUB ${rubDebt}`);
    
    res.json({ 
      message: `${type === 'debt_increase' ? 'Qarz qo\'shildi' : 'Qarz to\'landi'}`,
      client: client.name,
      amount: amountValue,
      currency: currency,
      transaction_id: cashTransaction[0]._id,
      updated_debt: {
        usd: usdDebt,
        rub: rubDebt
      },
      // Yangilangan client ma'lumotlarini ham qaytarish
      updated_client: updatedClient.toObject({ virtuals: true })
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Client debt management error:', error);
    res.status(500).json({ message: 'Qarz boshqarishda xatolik', error: error.message });
  } finally {
    session.endSession();
  }
});

// Mijozning batafsil ma'lumotlari (sotuvlar, to'lovlar, qarzlar)
router.get('/:id/details', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }

    // Mijozning sotuvlari
    const sales = await VagonSale.find({
      client: client._id,
      isDeleted: false
    })
    .populate('lot', 'lotCode client_received_volume_m3 thickness width length')
    .sort({ sale_date: -1 });

    // Sotuvlar statistikasi (valyuta bo'yicha)
    const salesStats = await VagonSale.aggregate([
      {
        $match: {
          client: client._id,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$sale_currency',
          totalSales: { $sum: '$total_price' },
          totalVolume: { $sum: '$client_received_volume_m3' },
          count: { $sum: 1 },
          avgPrice: { $avg: '$price_per_m3' }
        }
      }
    ]);

    // To'lov tarixi (Cash dan)
    const payments = await Cash.find({
      client: client._id,
      type: 'client_payment',
      isDeleted: false
    }).sort({ transaction_date: -1 });

    // Qarz holati (valyuta bo'yicha)
    const debtByCurrency = await VagonSale.aggregate([
      {
        $match: {
          client: client._id,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$sale_currency',
          totalDebt: { $sum: '$total_price' },
          totalPaid: { $sum: '$paid_amount' },
          remainingDebt: { $sum: { $subtract: ['$total_price', '$paid_amount'] } }
        }
      }
    ]);

    // Oxirgi 6 oylik sotuv dinamikasi
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySales = await VagonSale.aggregate([
      {
        $match: {
          client: client._id,
          sale_date: { $gte: sixMonthsAgo },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$sale_date' },
            month: { $month: '$sale_date' },
            currency: '$sale_currency'
          },
          totalSales: { $sum: '$total_price' },
          totalVolume: { $sum: '$client_received_volume_m3' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      client,
      sales,
      salesStats,
      payments,
      debtByCurrency,
      monthlySales,
      summary: {
        totalSales: sales.length,
        totalVolume: sales.reduce((sum, sale) => sum + (sale.client_received_volume_m3 || 0), 0),
        totalValue: salesStats.reduce((sum, stat) => sum + stat.totalSales, 0),
        lastSaleDate: sales.length > 0 ? sales[0].sale_date : null
      }
    });
  } catch (error) {
    logger.error('Client details error:', error);
    res.status(500).json({ message: 'Mijoz tafsilotlarini olishda xatolik' });
  }
});

// Mijozning sotib olgan lotlari
router.get('/:id/lots', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }

    // Mijoz sotib olgan lotlar
    const purchasedLots = await VagonSale.find({
      client: client._id,
      isDeleted: false
    })
    .populate({
      path: 'lot',
      select: 'lotCode thickness width length client_received_volume_m3 status'
    })
    .sort({ sale_date: -1 });

    // Lot statistikasi
    const lotStats = purchasedLots.reduce((acc, sale) => {
      const lot = sale.lot;
      if (!lot) return acc;

      const existing = acc.find(item => item.lotCode === lot.lotCode);
      if (existing) {
        existing.totalVolume += (sale.client_received_volume_m3 || 0);
        existing.totalAmount += (sale.total_price || 0);
        existing.sales.push(sale);
      } else {
        acc.push({
          lotCode: lot.lotCode,
          dimensions: `${lot.thickness}×${lot.width}×${lot.length}`,
          totalVolume: sale.client_received_volume_m3 || 0,
          totalAmount: sale.total_price || 0,
          currency: sale.sale_currency,
          status: lot.status,
          sales: [sale]
        });
      }
      return acc;
    }, []);

    res.json({
      client,
      purchasedLots,
      lotStats,
      summary: {
        uniqueLots: lotStats.length,
        totalVolume: lotStats.reduce((sum, lot) => sum + lot.totalVolume, 0)
      }
    });
  } catch (error) {
    logger.error('Client lots error:', error);
    res.status(500).json({ message: 'Mijoz lotlarini olishda xatolik' });
  }
});

// Mijozning to'lov tarixi
router.get('/:id/payments', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }

    // To'lovlarni qidirish (client ID bo'yicha)
    const payments = await Cash.find({
      client: client._id,
      type: 'client_payment',
      isDeleted: false
    }).sort({ transaction_date: -1 });

    // To'lovlar statistikasi
    const paymentStats = payments.reduce((acc, payment) => {
      if (!acc[payment.currency]) {
        acc[payment.currency] = {
          totalAmount: 0,
          count: 0,
          lastPayment: null
        };
      }

      acc[payment.currency].totalAmount += payment.amount;
      acc[payment.currency].count += 1;

      if (!acc[payment.currency].lastPayment ||
          payment.transaction_date > acc[payment.currency].lastPayment) {
        acc[payment.currency].lastPayment = payment.transaction_date;
      }

      return acc;
    }, {});

    // Oylik to'lovlar (oxirgi 12 oy)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyPayments = await Cash.aggregate([
      {
        $match: {
          client: client._id,
          type: 'client_payment',
          isDeleted: false,
          transaction_date: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$transaction_date' },
            month: { $month: '$transaction_date' },
            currency: '$currency'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      client,
      payments,
      paymentStats,
      monthlyPayments,
      summary: {
        totalPayments: payments.length,
        totalAmount: Object.values(paymentStats).reduce((sum, stat) => sum + stat.totalAmount, 0),
        lastPaymentDate: payments.length > 0 ? payments[0].transaction_date : null
      }
    });
  } catch (error) {
    logger.error('Client payments error:', error);
    res.status(500).json({ message: 'To\'lov tarixini olishda xatolik' });
  }
});

module.exports = router;