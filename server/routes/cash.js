const express = require('express');
const router = express.Router();
const Cash = require('../models/Cash');
const VagonSale = require('../models/VagonSale');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { ClientNotFoundError, InvalidCurrencyError, handleCustomError } = require('../utils/customErrors');

// Double submit prevention middleware
const preventDoubleSubmit = (req, res, next) => {
  const key = `${req.user.userId}-${req.method}-${req.originalUrl}`;
  const now = Date.now();
  
  if (!req.app.locals.recentRequests) {
    req.app.locals.recentRequests = new Map();
  }
  
  const lastRequest = req.app.locals.recentRequests.get(key);
  if (lastRequest && (now - lastRequest) < 2000) { // 2 sekund ichida
    return res.status(409).json({ 
      message: 'Takroriy yuborildi. Iltimos kutib turing.',
      code: 'DUPLICATE_REQUEST'
    });
  }
  
  req.app.locals.recentRequests.set(key, now);
  
  // Eski requestlarni tozalash
  if (req.app.locals.recentRequests.size > 1000) {
    const cutoff = now - 10000; // 10 sekund
    for (const [k, v] of req.app.locals.recentRequests.entries()) {
      if (v < cutoff) {
        req.app.locals.recentRequests.delete(k);
      }
    }
  }
  
  next();
};

// Umumiy balans (/:id dan oldin bo'lishi kerak!)
router.get('/balance', auth, async (req, res) => {
  try {
    const balances = await Cash.getBalanceByCurrency();
    
    // Frontend format'iga moslashtirish
    const formattedBalances = Object.keys(balances).map(currency => ({
      _id: currency,
      jamiKirim: balances[currency].income || 0,
      xarajatlar: balances[currency].expense || 0,
      sof: balances[currency].balance || 0,
      vagonSotuvi: 0, // Hisoblash kerak
      mijozTolovi: 0  // Hisoblash kerak
    }));
    
    res.json(formattedBalances);
  } catch (error) {
    logger.error('Balance error:', error);
    res.status(500).json({ message: 'Balansni hisoblashda xatolik' });
  }
});

router.get('/balance/total', auth, async (req, res) => {
  try {
    const balance = await Cash.getTotalBalance();
    res.json(balance);
  } catch (error) {
    logger.error('Balance error:', error);
    res.status(500).json({ message: 'Balansni hisoblashda xatolik' });
  }
});

// Valyuta bo'yicha balans
router.get('/balance/by-currency', auth, async (req, res) => {
  try {
    const balances = await Cash.getBalanceByCurrency();
    res.json(balances);
  } catch (error) {
    logger.error('Balance by currency error:', error);
    res.status(500).json({ message: 'Valyuta bo\'yicha balansni hisoblashda xatolik' });
  }
});

// Barcha tranzaksiyalar (PAGINATION BILAN)
router.get('/', auth, async (req, res) => {
  try {
    const { 
      type, 
      startDate, 
      endDate, 
      currency, 
      client,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = { isDeleted: false };
    if (type) filter.type = type;
    if (currency) filter.currency = currency;
    if (client) filter.client = client;
    
    if (startDate || endDate) {
      filter.transaction_date = {};
      if (startDate) filter.transaction_date.$gte = new Date(startDate);
      if (endDate) filter.transaction_date.$lte = new Date(endDate);
    }
    
    // Pagination parametrlari
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Jami soni
    const total = await Cash.countDocuments(filter);
    
    // Tranzaksiyalarni olish (faqat kerakli fieldlar)
    const transactions = await Cash.find(filter)
      .select('type client vagon vagonSale expense currency amount description transaction_date createdAt')
      .populate('client', 'name phone')
      .populate('vagon', 'vagonCode month')
      .populate('createdBy', 'username')
      .sort({ transaction_date: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Pagination ma'lumotlari
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      transactions: transactions,
      kassa: transactions, // Backward compatibility
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
    logger.error('Cash list error:', error);
    res.status(500).json({ message: 'Tranzaksiyalar ro\'yxatini olishda xatolik' });
  }
});

// Bitta tranzaksiya ma'lumotlari
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Cash.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
      .populate('client')
      .populate('vagon')
      .populate('vagonSale')
      .populate('expense')
      .populate('createdBy', 'username');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Tranzaksiya topilmadi' });
    }
    
    res.json(transaction);
  } catch (error) {
    logger.error('Cash get error:', error);
    res.status(500).json({ message: 'Tranzaksiya ma\'lumotlarini olishda xatolik' });
  }
});

// YANGI FEATURE: Daromad qo'shish
router.post('/income', auth, preventDoubleSubmit, async (req, res) => {
  try {
    const { income_source, amount, currency, description, client_id, date, vagon_id, yogoch_id, client_type, one_time_client_name, one_time_client_phone, total_price, paid_amount } = req.body;
    
    // Initialize variables
    let yogoch = null;
    
    // Validatsiya
    const errors = [];
    
    if (!income_source || !['yogoch_tolovi', 'qarz_daftarcha', 'yetkazib_berish'].includes(income_source)) {
      errors.push('income_source faqat yogoch_tolovi, qarz_daftarcha yoki yetkazib_berish bo\'lishi mumkin');
    }
    
    if (!amount || amount <= 0) {
      errors.push('amount 0 dan katta bo\'lishi shart');
    }
    
    if (amount > 1e9) {
      errors.push('amount juda katta (maksimal 1 milliard)');
    }
    
    if (!currency || !['USD', 'RUB'].includes(currency)) {
      errors.push('currency faqat USD yoki RUB bo\'lishi mumkin');
    }
    
    if (!description || description.trim().length < 3) {
      errors.push('description kamida 3 belgi bo\'lishi shart');
    }
    
    if (description && description.length > 500) {
      errors.push('description 500 belgidan oshmasin');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('date formati YYYY-MM-DD bo\'lishi shart');
    }
    
    // Qarz daftarcha uchun client_id majburiy
    if (income_source === 'qarz_daftarcha' && !client_id) {
      errors.push('Qarz daftarcha uchun client_id majburiy');
    }
    
    // Yogoch tolovi uchun vagon va yogoch majburiy
    if (income_source === 'yogoch_tolovi' && !vagon_id) {
      errors.push('Yogoch tolovi uchun vagon_id majburiy');
    }
    
    if (income_source === 'yogoch_tolovi' && vagon_id && !yogoch_id) {
      errors.push('Yogoch tolovi uchun yogoch_id majburiy');
    }
    
    // Yogoch tolovi uchun mijoz majburiy
    if (income_source === 'yogoch_tolovi') {
      if (client_type === 'existing' && !client_id) {
        errors.push('Yogoch tolovi uchun doimiy mijoz tanlanishi shart');
      }
      if (client_type === 'one_time') {
        if (!one_time_client_name || one_time_client_name.trim().length < 2) {
          errors.push('Bir martalik mijoz ismi kamida 2 belgi bo\'lishi shart');
        }
        if (!one_time_client_phone || one_time_client_phone.trim().length < 9) {
          errors.push('Bir martalik mijoz telefoni kamida 9 belgi bo\'lishi shart');
        }
      }
      if (!client_type || !['existing', 'one_time'].includes(client_type)) {
        errors.push('Yogoch tolovi uchun mijoz turi (existing yoki one_time) tanlanishi shart');
      }
    }
    
    // Yetkazib berish uchun faqat vagon majburiy (yogoch ixtiyoriy)
    if (income_source === 'yetkazib_berish' && !vagon_id) {
      errors.push('Yetkazib berish uchun vagon_id majburiy');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validatsiya xatoliklari',
        errors 
      });
    }
    
    // Client mavjudligini tekshirish
    if (client_id) {
      const Client = require('../models/Client');
      const client = await Client.findById(client_id);
      if (!client) {
        return res.status(400).json({ message: 'Mijoz topilmadi' });
      }
    }
    
    // Vagon mavjudligini tekshirish
    if (vagon_id) {
      const Vagon = require('../models/Vagon');
      const vagon = await Vagon.findOne({ _id: vagon_id, isDeleted: false });
      if (!vagon) {
        return res.status(400).json({ message: 'Vagon topilmadi' });
      }
    }
    
    // Yogoch mavjudligini tekshirish
    if (yogoch_id) {
      const VagonLot = require('../models/VagonLot');
      yogoch = await VagonLot.findOne({ _id: yogoch_id, isDeleted: false });
      if (!yogoch) {
        return res.status(400).json({ message: 'Yog\'och topilmadi' });
      }
      
      // Yogoch va vagon mos kelishini tekshirish
      if (vagon_id && yogoch.vagon.toString() !== vagon_id) {
        return res.status(400).json({ message: 'Tanlangan yog\'och bu vagonga tegishli emas' });
      }
    }
    
    // Type mapping
    let type = 'client_payment';
    if (income_source === 'yogoch_tolovi') type = 'vagon_sale';
    else if (income_source === 'yetkazib_berish') type = 'delivery_payment';
    else if (income_source === 'qarz_daftarcha') type = 'debt_payment';
    
    // Yogoch tolovi uchun VagonSale yaratish va qarz boshqaruvi
    let vagonSaleId = null;
    
    if (income_source === 'yogoch_tolovi') {
      // Narxlarni hisoblash
      const totalPrice = total_price || parseFloat(amount);
      const paidAmount = paid_amount || 0;
      const debt = totalPrice - paidAmount;
      
      // Status aniqlash
      let status = 'pending';
      if (paidAmount >= totalPrice) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      }
      
      // VagonSale yaratish
      const vagonSale = new VagonSale({
        vagon: vagon_id,
        lot: yogoch_id,
        client: client_id || null, // Doimiy mijoz bo'lsa
        warehouse_dispatched_volume_m3: yogoch ? yogoch.volume_m3 : 0,
        client_received_volume_m3: yogoch ? yogoch.volume_m3 : 0,
        sale_unit: 'volume',
        sent_quantity: yogoch ? yogoch.quantity : 0,
        accepted_quantity: yogoch ? yogoch.quantity : 0,
        total_price: totalPrice,
        sale_currency: currency,
        paid_amount: paidAmount,
        debt: debt,
        status: status,
        sale_date: new Date(date),
        // Bir martalik mijoz ma'lumotlari
        one_time_client_name: one_time_client_name?.trim() || null,
        one_time_client_phone: one_time_client_phone?.trim() || null
      });
      
      await vagonSale.save();
      vagonSaleId = vagonSale._id;
      
      // Agar doimiy mijoz bo'lsa, Client modelini yangilash
      if (client_id) {
        const Client = require('../models/Client');
        const client = await Client.findById(client_id);
        if (client) {
          if (currency === 'USD') {
            client.usd_total_debt += debt;
            client.usd_total_paid += paidAmount;
          } else {
            client.rub_total_debt += debt;
            client.rub_total_paid += paidAmount;
          }
          await client.save();
        }
      }
    }
    
    // Cash tranzaksiyasini yaratish (faqat to'langan summa uchun)
    let cash = null;
    if (income_source !== 'yogoch_tolovi' || (income_source === 'yogoch_tolovi' && paid_amount > 0)) {
      const cashAmount = income_source === 'yogoch_tolovi' ? parseFloat(paid_amount) : parseFloat(amount);
      
      cash = new Cash({
        type,
        client: client_id || null,
        vagon: vagon_id || null,
        yogoch: yogoch_id || null,
        vagonSale: vagonSaleId || null,
        amount: cashAmount,
        currency,
        description: description.trim(),
        transaction_date: new Date(date),
        createdBy: req.user.userId,
        // Bir martalik mijoz ma'lumotlari
        one_time_client_name: one_time_client_name?.trim() || null,
        one_time_client_phone: one_time_client_phone?.trim() || null
      });
      
      await cash.save();
    }
    
    res.status(201).json({
      message: income_source === 'yogoch_tolovi' 
        ? 'Yogoch sotuvi muvaffaqiyatli yaratildi' 
        : 'Daromad muvaffaqiyatli qo\'shildi',
      cash,
      vagonSale: vagonSaleId ? { _id: vagonSaleId } : null
    });
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// YANGI FEATURE: Xarajat qo'shish
router.post('/expense', auth, preventDoubleSubmit, async (req, res) => {
  try {
    const { expense_source, amount, currency, description, responsible_person, date, related_client_id, vagon_id, yogoch_id } = req.body;
    
    // Validatsiya
    const errors = [];
    
    if (!expense_source || !['transport', 'bojxona', 'ish_haqi', 'yuklash_tushurish', 'soliq', 'sifatsiz_mahsulot'].includes(expense_source)) {
      errors.push('expense_source faqat transport, bojxona, ish_haqi, yuklash_tushurish, soliq yoki sifatsiz_mahsulot bo\'lishi mumkin');
    }
    
    if (!amount || amount <= 0) {
      errors.push('amount 0 dan katta bo\'lishi shart');
    }
    
    if (amount > 1e9) {
      errors.push('amount juda katta (maksimal 1 milliard)');
    }
    
    if (!currency || !['USD', 'RUB'].includes(currency)) {
      errors.push('currency faqat USD yoki RUB bo\'lishi mumkin');
    }
    
    if (!description || description.trim().length < 3) {
      errors.push('description kamida 3 belgi bo\'lishi shart');
    }
    
    if (description && description.length > 500) {
      errors.push('description 500 belgidan oshmasin');
    }
    
    if (!responsible_person || responsible_person.trim().length === 0) {
      errors.push('responsible_person bo\'sh bo\'lmasin');
    }
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('date formati YYYY-MM-DD bo\'lishi shart');
    }
    
    // Sifatsiz mahsulot uchun maxsus validatsiya
    if (expense_source === 'sifatsiz_mahsulot' && description.trim().length < 10) {
      errors.push('Sifatsiz mahsulot uchun description kamida 10 belgi bo\'lishi shart');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validatsiya xatoliklari',
        errors 
      });
    }
    
    // Client mavjudligini tekshirish
    if (related_client_id) {
      const Client = require('../models/Client');
      const client = await Client.findById(related_client_id);
      if (!client) {
        return res.status(400).json({ message: 'Bog\'liq mijoz topilmadi' });
      }
    }
    
    // Vagon mavjudligini tekshirish
    if (vagon_id) {
      const Vagon = require('../models/Vagon');
      const vagon = await Vagon.findOne({ _id: vagon_id, isDeleted: false });
      if (!vagon) {
        return res.status(400).json({ message: 'Vagon topilmadi' });
      }
    }
    
    // Yogoch mavjudligini tekshirish
    if (yogoch_id) {
      const VagonLot = require('../models/VagonLot');
      const yogoch = await VagonLot.findOne({ _id: yogoch_id, isDeleted: false });
      if (!yogoch) {
        return res.status(400).json({ message: 'Yog\'och topilmadi' });
      }
      
      // Yogoch va vagon mos kelishini tekshirish
      if (vagon_id && yogoch.vagon.toString() !== vagon_id) {
        return res.status(400).json({ message: 'Tanlangan yog\'och bu vagonga tegishli emas' });
      }
    }
    
    // Type mapping
    let type = 'expense';
    if (expense_source === 'yetkazib_berish') type = 'delivery_expense';
    
    // Cash tranzaksiyasini yaratish
    const cash = new Cash({
      type,
      client: related_client_id || null,
      vagon: vagon_id || null,
      yogoch: yogoch_id || null,
      amount: parseFloat(amount),
      currency,
      description: `${expense_source.toUpperCase()}: ${description.trim()} (Javobgar: ${responsible_person.trim()})`,
      transaction_date: new Date(date),
      createdBy: req.user.userId
    });
    
    await cash.save();
    
    res.status(201).json({
      message: 'Xarajat muvaffaqiyatli qo\'shildi',
      cash
    });
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Mijoz to'lovi (client_payment)
router.post('/client-payment', auth, async (req, res) => {
  try {
    const { vagonSale, amount, currency, description } = req.body;
    
    // Validatsiya
    if (!vagonSale || !amount) {
      return res.status(400).json({ 
        message: 'Sotuv va summa kiritilishi shart' 
      });
    }
    
    // Valyuta validatsiyasi
    if (currency && !['USD', 'RUB'].includes(currency)) {
      throw new InvalidCurrencyError(currency);
    }
    
    // Sotuvni tekshirish
    const sale = await VagonSale.findOne({ 
      _id: vagonSale, 
      isDeleted: false 
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    // Qarzdan ko'p to'lash mumkin emas
    if (amount > sale.debt) {
      throw new PaymentExceedsDebtError(amount, sale.debt);
    }
    
    // Cash tranzaksiyasini yaratish
    const cash = new Cash({
      type: 'client_payment',
      client: sale.client,
      vagon: sale.vagon,
      vagonSale: vagonSale,
      amount,
      currency: currency || 'RUB',
      description: description || `To'lov: ${sale.client?.name || 'Mijoz'}`,
      createdBy: req.user.userId
    });
    
    await cash.save();
    
    // Sotuvni yangilash (VagonSale API orqali)
    sale.paid_amount += amount;
    await sale.save(); // pre-save hook avtomatik hisoblaydi
    
    // Mijozni yangilash
    const client = await Client.findById(sale.client);
    if (client) {
      client.total_paid += amount;
      await client.save();
    }
    
    res.status(201).json({
      message: 'To\'lov qabul qilindi',
      cash,
      sale
    });
  } catch (error) {
    return handleCustomError(error, res);
  }
});

// Boshlang'ich balans (initial_balance)
router.post('/initial-balance', auth, async (req, res) => {
  try {
    const { amount, currency, description } = req.body;
    
    // Validatsiya
    if (!amount) {
      return res.status(400).json({ 
        message: 'Summa kiritilishi shart' 
      });
    }
    
    // Cash tranzaksiyasini yaratish
    const cash = new Cash({
      type: 'initial_balance',
      amount,
      currency: currency || 'RUB',
      description: description || 'Boshlang\'ich balans',
      createdBy: req.user.userId
    });
    
    await cash.save();
    
    res.status(201).json({
      message: 'Boshlang\'ich balans qo\'shildi',
      cash
    });
  } catch (error) {
    logger.error('Initial balance error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Tranzaksiyani o'chirish (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const cash = await Cash.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!cash) {
      return res.status(404).json({ message: 'Tranzaksiya topilmadi' });
    }
    
    // Mijoz to'lovi bo'lsa, sotuvni va mijozni qaytarish
    if (cash.type === 'client_payment' && cash.vagonSale) {
      const sale = await VagonSale.findById(cash.vagonSale);
      if (sale) {
        sale.paid_amount -= cash.amount_rub;
        await sale.save();
      }
      
      const client = await Client.findById(cash.client);
      if (client) {
        client.total_paid -= cash.amount_rub;
        await client.save();
      }
    }
    
    cash.isDeleted = true;
    await cash.save();
    
    res.json({ message: 'Tranzaksiya o\'chirildi' });
  } catch (error) {
    logger.error('Cash delete error:', error);
    res.status(500).json({ message: 'Tranzaksiyani o\'chirishda xatolik' });
  }
});

// Statistika (kunlik, oylik)
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { period } = req.query; // 'today', 'week', 'month', 'year'
    
    let startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0); // Barcha vaqt
    }
    
    const transactions = await Cash.find({
      isDeleted: false,
      transaction_date: { $gte: startDate }
    });
    
    let income = 0;
    let expense = 0;
    
    transactions.forEach(t => {
      if (t.type === 'client_payment' || t.type === 'initial_balance' || t.type === 'debt_sale') {
        income += t.amount_rub;
      } else if (t.type === 'expense' || t.type === 'debt_payment') {
        expense += t.amount_rub;
      }
    });
    
    res.json({
      period,
      income,
      expense,
      balance: income - expense,
      transaction_count: transactions.length
    });
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

module.exports = router;
