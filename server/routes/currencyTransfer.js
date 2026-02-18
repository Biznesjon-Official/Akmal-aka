const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { 
  transferCurrency, 
  getAllBalances, 
  getTransferHistory 
} = require('../utils/currencyTransferHelper');

/**
 * @route   POST /api/currency-transfer
 * @desc    Valyuta o'tkazish
 * @access  Private (Admin, Manager, Accountant)
 */
router.post('/', auth, async (req, res) => {
  // Role tekshirish
  if (!['admin', 'manager', 'accountant'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Sizda valyuta o\'tkazish ruxsati yo\'q'
    });
  }
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { from_currency, to_currency, from_amount, notes } = req.body;
    
    // Validatsiya
    if (!from_currency || !to_currency) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'from_currency va to_currency kiritilishi shart'
      });
    }
    
    // from_amount'ni number'ga o'tkazish
    const amountNumber = typeof from_amount === 'string' ? parseFloat(from_amount) : from_amount;
    
    if (!amountNumber || isNaN(amountNumber) || amountNumber <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'from_amount 0 dan katta bo\'lishi kerak'
      });
    }
    
    // O'tkazma
    const transfer = await transferCurrency({
      from_currency,
      to_currency,
      from_amount: amountNumber,
      user_id: req.user.userId || req.user._id, // JWT'da userId sifatida saqlanadi
      notes,
      session
    });
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: 'Valyuta o\'tkazmasi muvaffaqiyatli amalga oshirildi',
      data: transfer
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Valyuta o\'tkazishda xatolik:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
});

/**
 * @route   POST /api/currency-transfer/deposit
 * @desc    Hisobni to'ldirish (dastlabki balans)
 * @access  Private (Admin, Manager, Accountant)
 */
router.post('/deposit', auth, async (req, res) => {
  // Role tekshirish
  if (!['admin', 'manager', 'accountant'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Sizda hisob to\'ldirish ruxsati yo\'q'
    });
  }
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { currency, amount, notes } = req.body;
    const Cash = require('../models/Cash');
    
    // Validatsiya
    if (!currency || !['USD', 'RUB'].includes(currency)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Valyuta USD yoki RUB bo\'lishi kerak'
      });
    }
    
    const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (!amountNumber || isNaN(amountNumber) || amountNumber <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Summa 0 dan katta bo\'lishi kerak'
      });
    }
    
    // Kassa yozuvini yaratish
    const cashEntry = await Cash.create([{
      type: 'initial_balance',
      amount: amountNumber,
      currency: currency,
      description: notes || 'Dastlabki balans',
      createdBy: req.user.userId || req.user._id,
      transaction_date: new Date()
    }], { session });
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: 'Hisob muvaffaqiyatli to\'ldirildi',
      data: cashEntry[0]
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Hisob to\'ldirishda xatolik:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
});

/**
 * @route   GET /api/currency-transfer
 * @desc    O'tkazmalar tarixini olish
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { from_currency, to_currency, status, start_date, end_date } = req.query;
    
    const filters = {};
    if (from_currency) filters.from_currency = from_currency;
    if (to_currency) filters.to_currency = to_currency;
    if (status) filters.status = status;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    
    const transfers = await getTransferHistory(filters);
    
    res.json({
      success: true,
      count: transfers.length,
      data: transfers
    });
  } catch (error) {
    console.error('O\'tkazmalar tarixini olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'O\'tkazmalar tarixini olishda xatolik yuz berdi',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/currency-transfer/:id
 * @desc    Bitta o'tkazmani olish
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const CurrencyTransfer = require('../models/CurrencyTransfer');
    
    const transfer = await CurrencyTransfer.findById(req.params.id)
      .populate('created_by', 'username')
      .populate('cash_out_id')
      .populate('cash_in_id');
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'O\'tkazma topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    console.error('O\'tkazmani olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'O\'tkazmani olishda xatolik yuz berdi',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/currency-transfer/balance/all
 * @desc    Barcha valyutalar bo'yicha balansni olish
 * @access  Private
 */
router.get('/balance/all', auth, async (req, res) => {
  try {
    const balances = await getAllBalances();
    
    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    console.error('Balanslarni olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Balanslarni olishda xatolik yuz berdi',
      error: error.message
    });
  }
});

module.exports = router;
