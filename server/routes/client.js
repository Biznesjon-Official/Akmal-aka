const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const auth = require('../middleware/auth');

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
    console.error('Client list error:', error);
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
    console.error('Client get error:', error);
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
    console.error('Client create error:', error);
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
    console.error('Client update error:', error);
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
    console.error('Client delete error:', error);
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
    console.error('Client stats error:', error);
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
    console.error('Client debt management error:', error);
    res.status(500).json({ message: 'Qarz boshqarishda xatolik', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
// Mijozning batafsil ma'lumotlari (sotuvlar, to'lovlar, qarzlar)
router.get('/:id/details', auth, async (req, res) => {
  try {
    const Sale = require('../models/Sale');
    const Kassa = require('../models/Kassa');
    
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }

    // Mijozning sotuvlari
    const sales = await Sale.find({
      xaridor: client.name,
      isDeleted: false
    })
    .populate('woodLot', 'lotCode kubHajmi qalinlik eni uzunlik')
    .sort({ sotuvSanasi: -1 });

    // Sotuvlar statistikasi (valyuta bo'yicha)
    const salesStats = await Sale.aggregate([
      {
        $match: {
          xaridor: client.name,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$valyuta',
          totalSales: { $sum: '$jamiSumma' },
          totalVolume: { $sum: { $multiply: ['$kubHajmi', '$soni'] } },
          count: { $sum: 1 },
          avgPrice: { $avg: '$birlikNarxi' }
        }
      }
    ]);

    // To'lov tarixi (kassa dan)
    const payments = await Kassa.find({
      $or: [
        { tavsif: { $regex: client.name, $options: 'i' } },
        { tavsif: { $regex: client.phone, $options: 'i' } }
      ],
      turi: 'klent_prixod'
    }).sort({ createdAt: -1 });

    // Qarz holati (valyuta bo'yicha)
    const debtByCurrency = await Sale.aggregate([
      {
        $match: {
          xaridor: client.name,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$valyuta',
          totalDebt: { $sum: '$jamiSumma' },
          totalPaid: { $sum: '$tolangan' },
          remainingDebt: { $sum: { $subtract: ['$jamiSumma', '$tolangan'] } }
        }
      }
    ]);

    // Oxirgi 6 oylik sotuv dinamikasi
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlySales = await Sale.aggregate([
      {
        $match: {
          xaridor: client.name,
          sotuvSanasi: { $gte: sixMonthsAgo },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$sotuvSanasi' },
            month: { $month: '$sotuvSanasi' },
            valyuta: '$valyuta'
          },
          totalSales: { $sum: '$jamiSumma' },
          totalVolume: { $sum: { $multiply: ['$kubHajmi', '$soni'] } },
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
      debtByurrency,
      monthlySales,
      summary: {
        totalSales: sales.length,
        totalVolume: sales.reduce((sum, sale) => sum + (sale.kubHajmi * sale.soni), 0),
        totalValue: salesStats.reduce((sum, stat) => sum + stat.totalSales, 0),
        lastSaleDate: sales.length > 0 ? sales[0].sotuvSanasi : null
      }
    });
  } catch (error) {
    console.error('Client details error:', error);
    res.status(500).json({ message: 'Mijoz tafsilotlarini olishda xatolik' });
  }
});

// Mijozning sotib olgan lotlari
router.get('/:id/lots', auth, async (req, res) => {
  try {
    const Sale = require('../models/Sale');
    const Wood = require('../models/Wood');
    
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }

    // Mijoz sotib olgan lotlar
    const purchasedLots = await Sale.find({
      xaridor: client.name,
      isDeleted: false
    })
    .populate({
      path: 'woodLot',
      select: 'lotCode qalinlik eni uzunlik kubHajmi status jami_xarid jami_sotuv jami_xarajat'
    })
    .sort({ sotuvSanasi: -1 });

    // Lot statistikasi
    const lotStats = purchasedLots.reduce((acc, sale) => {
      const lot = sale.woodLot;
      if (!lot) return acc;

      const existing = acc.find(item => item.lotCode === lot.lotCode);
      if (existing) {
        existing.totalPurchased += sale.soni;
        existing.totalVolume += (sale.kubHajmi * sale.soni);
        existing.totalAmount += sale.jamiSumma;
        existing.sales.push(sale);
      } else {
        acc.push({
          lotCode: lot.lotCode,
          dimensions: `${lot.qalinlik}×${lot.eni}×${lot.uzunlik}`,
          totalPurchased: sale.soni,
          totalVolume: sale.kubHajmi * sale.soni,
          totalAmount: sale.jamiSumma,
          currency: sale.valyuta,
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
        totalPieces: lotStats.reduce((sum, lot) => sum + lot.totalPurchased, 0),
        totalVolume: lotStats.reduce((sum, lot) => sum + lot.totalVolume, 0)
      }
    });
  } catch (error) {
    console.error('Client lots error:', error);
    res.status(500).json({ message: 'Mijoz lotlarini olishda xatolik' });
  }
});

// Mijozning to'lov tarixi
router.get('/:id/payments', auth, async (req, res) => {
  try {
    const Kassa = require('../models/Kassa');
    
    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }

    // To'lovlarni qidirish (ism yoki telefon bo'yicha)
    const payments = await Kassa.find({
      $or: [
        { tavsif: { $regex: client.name, $options: 'i' } },
        { tavsif: { $regex: client.phone, $options: 'i' } }
      ],
      turi: 'klent_prixod'
    }).sort({ createdAt: -1 });

    // To'lovlar statistikasi
    const paymentStats = payments.reduce((acc, payment) => {
      if (!acc[payment.valyuta]) {
        acc[payment.valyuta] = {
          totalAmount: 0,
          count: 0,
          lastPayment: null
        };
      }
      
      acc[payment.valyuta].totalAmount += payment.summa;
      acc[payment.valyuta].count += 1;
      
      if (!acc[payment.valyuta].lastPayment || 
          payment.createdAt > acc[payment.valyuta].lastPayment) {
        acc[payment.valyuta].lastPayment = payment.createdAt;
      }
      
      return acc;
    }, {});

    // Oylik to'lovlar (oxirgi 12 oy)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyPayments = await Kassa.aggregate([
      {
        $match: {
          $or: [
            { tavsif: { $regex: client.name, $options: 'i' } },
            { tavsif: { $regex: client.phone, $options: 'i' } }
          ],
          turi: 'klent_prixod',
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            valyuta: '$valyuta'
          },
          totalAmount: { $sum: '$summa' },
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
        lastPaymentDate: payments.length > 0 ? payments[0].createdAt : null
      }
    });
  } catch (error) {
    console.error('Client payments error:', error);
    res.status(500).json({ message: 'To\'lov tarixini olishda xatolik' });
  }
});