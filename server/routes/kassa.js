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

// Yangi kassa tranzaksiyasi qo'shish - TRANSACTION bilan
router.post('/', [auth, [
  body('turi').isIn(['otpr', 'prixod', 'rasxod', 'klent_prixod']).withMessage('Noto\'g\'ri tranzaksiya turi'),
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

// Kassa balansini hisoblash
router.get('/balance', auth, async (req, res) => {
  try {
    const { valyuta } = req.query;
    const filter = { isDeleted: false }; // Soft delete filter qo'shildi
    if (valyuta) filter.valyuta = valyuta;
    
    const balanceData = await Kassa.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$valyuta',
          otpr: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'otpr'] }, '$summa', 0]
            }
          },
          prixod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'prixod'] }, '$summa', 0]
            }
          },
          rasxod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'rasxod'] }, '$summa', 0]
            }
          },
          klentPrixod: {
            $sum: {
              $cond: [{ $eq: ['$turi', 'klent_prixod'] }, '$summa', 0]
            }
          }
        }
      },
      {
        $addFields: {
          chistiyPrixod: {
            $subtract: [
              { $add: ['$otpr', '$prixod', '$klentPrixod'] },
              '$rasxod'
            ]
          }
        }
      }
    ]);
    
    res.json(balanceData);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
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

// Professional kassa hisoboti
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
    
    // Kirim-chiqim bo'yicha umumiy statistika
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
    
    // Xarajat turlari bo'yicha (faqat rasxod uchun)
    const expenseTypes = await Kassa.aggregate([
      { 
        $match: { 
          ...matchFilter,
          turi: 'rasxod'
        }
      },
      {
        $group: {
          _id: {
            xarajatTuri: '$xarajatTuri',
            valyuta: '$valyuta'
          },
          totalSumma: { $sum: '$summa' },
          count: { $sum: 1 },
          avgSumma: { $avg: '$summa' }
        }
      },
      { $sort: { totalSumma: -1 } }
    ]);
    
    // Foyda/zarar hisoblash
    const profitLoss = summary.reduce((acc, item) => {
      const { turi, valyuta } = item._id;
      
      if (!acc[valyuta]) {
        acc[valyuta] = {
          kirim: 0,
          chiqim: 0,
          foyda: 0
        };
      }
      
      if (turi === 'prixod' || turi === 'klent_prixod') {
        acc[valyuta].kirim += item.totalSumma;
      } else if (turi === 'rasxod' || turi === 'otpr') {
        acc[valyuta].chiqim += item.totalSumma;
      }
      
      acc[valyuta].foyda = acc[valyuta].kirim - acc[valyuta].chiqim;
      
      return acc;
    }, {});
    
    // Valyuta almashinuvi (oxirgi 30 kun)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const currencyExchange = await Kassa.aggregate([
      {
        $match: {
          ...matchFilter,
          createdAt: { $gte: thirtyDaysAgo },
          valyuta: { $in: ['USD', 'RUB'] }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            valyuta: '$valyuta'
          },
          avgRate: { $avg: { $divide: ['$summaRUB', '$summa'] } },
          totalVolume: { $sum: '$summa' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Top tranzaksiyalar
    const topTransactions = await Kassa.find(matchFilter)
      .sort({ summa: -1 })
      .limit(10)
      .populate('woodLot', 'lotCode')
      .populate('yaratuvchi', 'username');
    
    res.json({
      summary,
      trend,
      expenseTypes,
      profitLoss,
      currencyExchange,
      topTransactions,
      period,
      dateRange: {
        startDate: startDate || 'Boshlanish yo\'q',
        endDate: endDate || 'Tugash yo\'q'
      }
    });
  } catch (error) {
    console.error('Advanced report error:', error);
    res.status(500).json({ message: 'Hisobot yaratishda xatolik' });
  }
});

// Kirim qo'shish (mijozdan to'lov, boshqa manbalar)
router.post('/income', [auth, [
  body('turi').isIn(['prixod', 'klent_prixod']).withMessage('Noto\'g\'ri kirim turi'),
  body('summa').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('tavsif').notEmpty().withMessage('Tavsif kiritilishi shart')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      turi,
      summa,
      valyuta,
      summaRUB,
      summaUSD,
      tavsif,
      manba, // Kirim manbai
      mijozNomi,
      hujjatRaqami,
      sana
    } = req.body;
    
    const kassaEntry = new Kassa({
      turi,
      summa,
      valyuta,
      summaRUB: summaRUB || summa,
      summaUSD: summaUSD || 0,
      tavsif: `${turi === 'klent_prixod' ? 'Mijoz to\'lovi' : 'Kirim'}: ${tavsif}`,
      sana: sana ? new Date(sana) : new Date(),
      yaratuvchi: req.user.userId,
      // Qo'shimcha ma'lumotlar
      qoshimchaMalumot: JSON.stringify({
        manba,
        mijozNomi,
        hujjatRaqami
      })
    });
    
    await kassaEntry.save({ session });
    
    // Audit log
    await createAuditLog(req.user.userId, 'CREATE', 'Kassa', kassaEntry._id, {
      turi: 'KIRIM',
      summa,
      valyuta,
      tavsif
    }, session);
    
    await session.commitTransaction();
    
    res.status(201).json(kassaEntry);
  } catch (error) {
    await session.abortTransaction();
    console.error('Income create error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Chiqim qo'shish (xarajatlar, maosh, boshqa)
router.post('/expense', [auth, [
  body('turi').equals('rasxod').withMessage('Faqat rasxod turi'),
  body('xarajatTuri').isIn([
    'transport_kelish', 'transport_ketish', 'bojxona_kelish', 'bojxona_ketish',
    'yuklash_tushirish', 'saqlanish', 'ishchilar', 'qayta_ishlash', 'maosh', 'boshqa'
  ]).withMessage('Noto\'g\'ri xarajat turi'),
  body('summa').isNumeric().withMessage('Summa raqam bo\'lishi kerak'),
  body('valyuta').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('tavsif').notEmpty().withMessage('Tavsif kiritilishi shart')
]], async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      xarajatTuri,
      summa,
      valyuta,
      summaRUB,
      summaUSD,
      tavsif,
      javobgarShaxs,
      hujjatRaqami,
      sana,
      woodLot
    } = req.body;
    
    const kassaEntry = new Kassa({
      turi: 'rasxod',
      xarajatTuri,
      summa,
      valyuta,
      summaRUB: summaRUB || summa,
      summaUSD: summaUSD || 0,
      tavsif: `${getExpenseTypeLabel(xarajatTuri)}: ${tavsif}`,
      woodLot,
      sana: sana ? new Date(sana) : new Date(),
      yaratuvchi: req.user.userId,
      // Qo'shimcha ma'lumotlar
      qoshimchaMalumot: JSON.stringify({
        javobgarShaxs,
        hujjatRaqami
      })
    });
    
    await kassaEntry.save({ session });
    
    // Audit log
    await createAuditLog(req.user.userId, 'CREATE', 'Kassa', kassaEntry._id, {
      turi: 'CHIQIM',
      xarajatTuri,
      summa,
      valyuta,
      tavsif
    }, session);
    
    await session.commitTransaction();
    
    res.status(201).json(kassaEntry);
  } catch (error) {
    await session.abortTransaction();
    console.error('Expense create error:', error);
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Valyuta kurslari tarixi
router.get('/exchange-rates', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const rates = await Kassa.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo },
          valyuta: { $in: ['USD', 'RUB'] },
          summa: { $gt: 0 },
          summaRUB: { $gt: 0 },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            valyuta: '$valyuta'
          },
          avgRate: { $avg: { $divide: ['$summaRUB', '$summa'] } },
          minRate: { $min: { $divide: ['$summaRUB', '$summa'] } },
          maxRate: { $max: { $divide: ['$summaRUB', '$summa'] } },
          volume: { $sum: '$summa' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    res.json(rates);
  } catch (error) {
    console.error('Exchange rates error:', error);
    res.status(500).json({ message: 'Valyuta kurslari tarixini olishda xatolik' });
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

// Helper functions
function getExpenseTypeLabel(xarajatTuri) {
  const labels = {
    'transport_kelish': 'Transport (Kelish)',
    'transport_ketish': 'Transport (Ketish)',
    'bojxona_kelish': 'Bojxona (Import)',
    'bojxona_ketish': 'Bojxona (Export)',
    'yuklash_tushirish': 'Yuklash/Tushirish',
    'saqlanish': 'Ombor/Saqlanish',
    'ishchilar': 'Ishchilar',
    'qayta_ishlash': 'Qayta ishlash',
    'maosh': 'Maosh',
    'boshqa': 'Boshqa'
  };
  return labels[xarajatTuri] || xarajatTuri;
}

module.exports = router;