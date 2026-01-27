const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Kassa = require('../models/Kassa');
const auth = require('../middleware/auth');
const { createAuditLog } = require('../middleware/auditLog');
const { cacheMiddleware, SmartInvalidation } = require('../utils/cacheManager');

const router = express.Router();

// Barcha kassa tranzaksiyalarini olish
router.get('/', auth, cacheMiddleware(180), async (req, res) => {
  try {
    const { turi, valyuta, page = 1, limit = 10, startDate, endDate } = req.query;
    const filter = { isDeleted: false }; // Soft delete filter qo'shildi
    
    if (turi) filter.turi = turi;
    if (valyuta) filter.valyuta = valyuta;
    
    // Sana filtri
    if (startDate || endDate) {
      filter.sana = {};
      if (startDate) filter.sana.$gte = new Date(startDate);
      if (endDate) filter.sana.$lte = new Date(endDate);
    }
    
    const kassaList = await Kassa.find(filter)
      .populate('woodLot', 'lotCode')
      .populate('purchase', '_id')
      .populate('sale', '_id')
      .populate('expense', '_id')
      .populate('yaratuvchi', 'username')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ sana: -1 });
    
    const total = await Kassa.countDocuments(filter);
    
    res.json({
      kassa: kassaList, // Frontend 'kassa' kutmoqda
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi kassa tranzaksiyasi qo'shish - KIRIM VA CHIQIM - TRANSACTION bilan
router.post('/', [auth, [
  body('turi').isIn(['prixod', 'klent_prixod', 'rasxod']).withMessage('Noto\'g\'ri tranzaksiya turi'),
  body('summa').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('summaRUB').isNumeric().withMessage('RUB summasi raqam bo\'lishi kerak'),
  body('tavsif').notEmpty().withMessage('Tavsif kiritilishi shart')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      console.log('❌ Validation xatolari:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const kassaData = {
      ...req.body,
      yaratuvchi: req.user.userId
    };

    const kassa = await Kassa.create([kassaData], { session });
    
    // Cache invalidation
    SmartInvalidation.onCashChange();
    
    // Audit log
    await createAuditLog(
      'create',
      'Kassa',
      kassa[0]._id,
      { after: kassa[0].toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    console.log(`💰 KASSA TRANZAKSIYA: ${kassaData.turi} - ${kassaData.summa} ${kassaData.valyuta}`);
    
    await kassa[0].populate([
      { path: 'woodLot', select: 'lotCode' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.status(201).json(kassa[0]);
  } catch (error) {
    await session.abortTransaction();
    console.error('Kassa yaratishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Kassa balansini hisoblash - KIRIM VA CHIQIM
router.get('/balance', auth, async (req, res) => {
  try {
    const { valyuta } = req.query;
    const filter = { isDeleted: false };
    if (valyuta) filter.valyuta = valyuta;
    
    const balanceData = await Kassa.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$valyuta',
          vagonSotuvi: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'prixod'] }, '$summa', 0]
            }
          },
          mijozTolovi: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'klent_prixod'] }, '$summa', 0]
            }
          },
          xarajatlar: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'rasxod'] }, '$summa', 0]
            }
          }
        }
      },
      {
        $addFields: {
          jamiKirim: {
            $add: ['$vagonSotuvi', '$mijozTolovi']
          },
          sof: {
            $subtract: [
              { $add: ['$vagonSotuvi', '$mijozTolovi'] },
              '$xarajatlar'
            ]
          }
        }
      }
    ]);
    
    // Agar ma'lumot bo'lmasa, bo'sh array qaytarish
    res.json(balanceData || []);
  } catch (error) {
    console.error('Balance calculation error:', error);
    res.status(500).json({ 
      message: 'Balansni hisoblashda xatolik', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Kassa tranzaksiyasini yangilash - TRANSACTION bilan
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const kassa = await Kassa.findById(req.params.id).session(session);
    if (!kassa) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Kassa tranzaksiyasi topilmadi' });
    }
    
    const oldData = kassa.toObject();
    
    Object.assign(kassa, req.body);
    await kassa.save({ session });
    
    // Audit log
    await createAuditLog(
      'update',
      'Kassa',
      kassa._id,
      { before: oldData, after: kassa.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    await kassa.populate([
      { path: 'woodLot', select: 'lotCode' },
      { path: 'yaratuvchi', select: 'username' }
    ]);
    
    res.json(kassa);
  } catch (error) {
    await session.abortTransaction();
    console.error('Kassa yangilashda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Kassa tranzaksiyasini o'chirish (SOFT DELETE) - TRANSACTION bilan
router.delete('/:id', [auth, auth.adminOnly], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const kassa = await Kassa.findById(req.params.id).session(session);
    if (!kassa) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Kassa tranzaksiyasi topilmadi' });
    }
    
    // Soft delete
    kassa.isDeleted = true;
    kassa.deletedAt = new Date();
    kassa.deletedBy = req.user.userId;
    kassa.deleteReason = req.body.reason || 'Admin tomonidan o\'chirildi';
    await kassa.save({ session });
    
    // Audit log
    await createAuditLog(
      'delete',
      'Kassa',
      kassa._id,
      { before: kassa.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    res.json({ message: 'Kassa tranzaksiyasi arxivlandi' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Kassa o\'chirishda xato:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

// Professional kassa hisoboti - KIRIM VA CHIQIM
router.get('/advanced-report', auth, async (req, res) => {
  try {
    const { startDate, endDate, valyuta, period = 'month' } = req.query;
    
    const matchFilter = { isDeleted: false };
    
    // Sana filtri
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }
    if (valyuta) matchFilter.valyuta = valyuta;
    
    // Kirim va chiqim bo'yicha umumiy statistika
    const summary = await Kassa.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            turi: '$turi',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          totalSummaRUB: { $sum: '$summaRUB' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Kunlik/oylik trend
    const trendGroupBy = period === 'day' 
      ? { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        }
      : { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
    
    const trend = await Kassa.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            ...trendGroupBy,
            turi: '$turi',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Kirim manbalar bo'yicha
    const incomeBySource = summary.reduce((acc, item) => {
      const { turi, valyuta } = item._id;
      
      if (!acc[valyuta]) {
        acc[valyuta] = {
          vagonSotuvi: 0,
          mijozTolovi: 0,
          xarajatlar: 0,
          jami: 0,
          sof: 0
        };
      }
      
      if (turi === 'prixod') {
        acc[valyuta].vagonSotuvi += item.totalSumma;
      } else if (turi === 'klent_prixod') {
        acc[valyuta].mijozTolovi += item.totalSumma;
      } else if (turi === 'rasxod') {
        acc[valyuta].xarajatlar += item.totalSumma;
      }
      
      acc[valyuta].jami = acc[valyuta].vagonSotuvi + acc[valyuta].mijozTolovi;
      acc[valyuta].sof = acc[valyuta].jami - acc[valyuta].xarajatlar;
      
      return acc;
    }, {});
    
    // Top tranzaksiyalar
    const topTransactions = await Kassa.find(matchFilter)
      .sort({ summa: -1 })
      .limit(10)
      .populate('vagonSale', 'saleNumber')
      .populate('vagon', 'vagonCode')
      .populate('client', 'name')
      .populate('yaratuvchi', 'username');
    
    res.json({
      summary: summary || [],
      trend: trend || [],
      incomeBySource: incomeBySource || {},
      topTransactions: topTransactions || [],
      period,
      dateRange: {
        startDate: startDate || 'Boshlanish yo\'q',
        endDate: endDate || 'Tugash yo\'q'
      }
    });
  } catch (error) {
    console.error('Advanced report error:', error);
    res.status(500).json({ 
      message: 'Hisobot yaratishda xatolik',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Vagon sotuvi kirimini qo'shish
router.post('/vagon-sale-income', [auth, [
  body('vagonSale').isMongoId().withMessage('Vagon sotuvi ID noto\'g\'ri'),
  body('summa').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('tavsif').notEmpty().withMessage('Tavsif kiritilishi shart')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { vagonSale, summa, valyuta, tavsif, sana } = req.body;
    
    const kassaEntry = new Kassa({
      turi: 'prixod',
      summa,
      valyuta,
      summaRUB: valyuta === 'RUB' ? summa : summa * 95.5,
      summaUSD: valyuta === 'USD' ? summa : summa * 0.0105,
      tavsif: `Vagon sotuvi: ${tavsif}`,
      vagonSale,
      sana: sana ? new Date(sana) : new Date(),
      yaratuvchi: req.user.userId
    });
    
    await kassaEntry.save({ session });
    
    // Cache invalidation
    SmartInvalidation.onCashChange();
    
    // Audit log
    await createAuditLog(
      'create',
      'Kassa',
      kassaEntry._id,
      { after: kassaEntry.toObject() },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    res.status(201).json(kassaEntry);
  } catch (error) {
    await session.abortTransaction();
    console.error('Vagon sale income error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});



// MIJOZ TO'LOVI - Yangi endpoint
router.post('/client-payment', [auth, [
  body('client').isMongoId().withMessage('Mijoz ID noto\'g\'ri'),
  body('amount').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('currency').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('payment_method').isIn(['cash', 'bank_transfer', 'card', 'other']).withMessage('Noto\'g\'ri to\'lov usuli')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await session.abortTransaction();
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { client, amount, currency, payment_method, notes } = req.body;
    
    // Mijozni tekshirish
    const Client = require('../models/Client');
    const clientDoc = await Client.findById(client).session(session);
    if (!clientDoc) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Qarz tekshiruvi - JORIY QARZNI HISOBLASH
    const currentDebt = currency === 'USD' ? 
      Math.max(0, clientDoc.usd_total_debt - clientDoc.usd_total_paid) : 
      Math.max(0, clientDoc.rub_total_debt - clientDoc.rub_total_paid);
      
    if (amount > currentDebt) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `Mijoz joriy qarzi: ${currentDebt} ${currency}. Siz ${amount} ${currency} kiritdingiz.` 
      });
    }
    
    // Kassa tranzaksiyasini yaratish
    const kassaEntry = new Kassa({
      turi: 'klent_prixod', // Mijoz to'lovi
      summa: amount,
      valyuta: currency,
      summaRUB: currency === 'RUB' ? amount : amount * 95.5, // Taxminiy kurs
      summaUSD: currency === 'USD' ? amount : amount * 0.0105,
      tavsif: `Mijoz to'lovi: ${clientDoc.name} (${payment_method}) ${notes ? '- ' + notes : ''}`,
      sana: new Date(),
      yaratuvchi: req.user.userId
    });
    
    await kassaEntry.save({ session });
    
    // Cash modeliga ham yozish (yangi tizim uchun)
    const Cash = require('../models/Cash');
    const cashEntry = new Cash({
      type: 'client_payment',
      client: client,
      currency: currency,
      amount: amount,
      description: `Qarz to'lovi: ${clientDoc.name} - ${amount} ${currency} (${payment_method})`,
      transaction_date: new Date(),
      createdBy: req.user.userId
    });
    
    await cashEntry.save({ session });
    
    // Mijoz qarzini yangilash - FAQAT TO'LOVNI OSHIRISH
    if (currency === 'USD') {
      clientDoc.usd_total_paid += amount;
      // usd_total_debt ni o'zgartirmaymiz - u doimiy qoladi
    } else {
      clientDoc.rub_total_paid += amount;
      // rub_total_debt ni o'zgartirmaymiz - u doimiy qoladi
    }
    
    // Backward compatibility - FAQAT TO'LOVNI OSHIRISH
    clientDoc.total_paid += (currency === 'USD' ? amount * 95.5 : amount);
    // total_debt ni o'zgartirmaymiz - u doimiy qoladi
    
    await clientDoc.save({ session });
    
    // Audit log
    await createAuditLog(
      'create',
      'ClientPayment',
      kassaEntry._id,
      { 
        after: {
          client: clientDoc.name,
          amount,
          currency,
          payment_method,
          remaining_debt: currency === 'USD' ? 
            Math.max(0, clientDoc.usd_total_debt - clientDoc.usd_total_paid) : 
            Math.max(0, clientDoc.rub_total_debt - clientDoc.rub_total_paid)
        }
      },
      req.user.userId,
      req
    );
    
    await session.commitTransaction();
    
    res.status(201).json({
      message: 'To\'lov muvaffaqiyatli saqlandi',
      payment: kassaEntry,
      client_remaining_debt: {
        usd: Math.max(0, clientDoc.usd_total_debt - clientDoc.usd_total_paid),
        rub: Math.max(0, clientDoc.rub_total_debt - clientDoc.rub_total_paid)
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Client payment error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;