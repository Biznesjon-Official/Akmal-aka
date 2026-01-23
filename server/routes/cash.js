const express = require('express');
const router = express.Router();
const Cash = require('../models/Cash');
const VagonSale = require('../models/VagonSale');
const Client = require('../models/Client');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// Umumiy balans (/:id dan oldin bo'lishi kerak!)
router.get('/balance/total', auth, async (req, res) => {
  try {
    const balance = await Cash.getTotalBalance();
    res.json(balance);
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ message: 'Balansni hisoblashda xatolik' });
  }
});

// Valyuta bo'yicha balans
router.get('/balance/by-currency', auth, async (req, res) => {
  try {
    const balances = await Cash.getBalanceByCurrency();
    res.json(balances);
  } catch (error) {
    console.error('Balance by currency error:', error);
    res.status(500).json({ message: 'Valyuta bo\'yicha balansni hisoblashda xatolik' });
  }
});

// Barcha tranzaksiyalar
router.get('/', auth, async (req, res) => {
  try {
    const { type, startDate, endDate, currency } = req.query;
    
    const filter = { isDeleted: false };
    if (type) filter.type = type;
    if (currency) filter.currency = currency;
    
    if (startDate || endDate) {
      filter.transaction_date = {};
      if (startDate) filter.transaction_date.$gte = new Date(startDate);
      if (endDate) filter.transaction_date.$lte = new Date(endDate);
    }
    
    const transactions = await Cash.find(filter)
      .populate('client', 'name phone')
      .populate('vagon', 'vagonCode month')
      .populate('vagonSale')
      .populate('expense')
      .populate('createdBy', 'username')
      .sort({ transaction_date: -1 });
    
    res.json(transactions);
  } catch (error) {
    console.error('Cash list error:', error);
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
    console.error('Cash get error:', error);
    res.status(500).json({ message: 'Tranzaksiya ma\'lumotlarini olishda xatolik' });
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
      return res.status(400).json({ 
        message: `Qarz: ${sale.debt.toLocaleString()} so'm. Siz ${amount.toLocaleString()} so'm to'lamoqchisiz` 
      });
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
    console.error('Client payment error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Xarajat (expense)
router.post('/expense', auth, async (req, res) => {
  try {
    const { expense, amount, currency, description } = req.body;
    
    // Validatsiya
    if (!expense || !amount) {
      return res.status(400).json({ 
        message: 'Xarajat va summa kiritilishi shart' 
      });
    }
    
    // Xarajatni tekshirish
    const expenseDoc = await Expense.findOne({ 
      _id: expense, 
      isDeleted: false 
    });
    
    if (!expenseDoc) {
      return res.status(404).json({ message: 'Xarajat topilmadi' });
    }
    
    // Cash tranzaksiyasini yaratish
    const cash = new Cash({
      type: 'expense',
      vagon: expenseDoc.wood, // Hozircha wood field ishlatiladi
      expense: expense,
      amount,
      currency: currency || 'RUB',
      description: description || `Xarajat: ${expenseDoc.type}`,
      createdBy: req.user.userId
    });
    
    await cash.save();
    
    res.status(201).json({
      message: 'Xarajat qo\'shildi',
      cash
    });
  } catch (error) {
    console.error('Expense error:', error);
    res.status(400).json({ message: error.message });
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
    console.error('Initial balance error:', error);
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
    console.error('Cash delete error:', error);
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
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Statistikani olishda xatolik' });
  }
});

module.exports = router;
