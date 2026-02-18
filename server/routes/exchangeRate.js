const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  getActiveExchangeRate, 
  setExchangeRate, 
  getAllActiveRates, 
  getRateHistory 
} = require('../utils/exchangeRateHelper');

/**
 * @route   GET /api/exchange-rate/current
 * @desc    Joriy faol kurslarni olish
 * @access  Private
 */
router.get('/current', auth, async (req, res) => {
  try {
    const rates = await getAllActiveRates();
    
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Kurslarni olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xatolik yuz berdi',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/exchange-rate/rate
 * @desc    Muayyan valyuta juftligi uchun kursni olish
 * @access  Private
 */
router.get('/rate', auth, async (req, res) => {
  try {
    const { from_currency, to_currency } = req.query;
    
    if (!from_currency || !to_currency) {
      return res.status(400).json({
        success: false,
        message: 'from_currency va to_currency parametrlari kiritilishi shart'
      });
    }
    
    const rate = await getActiveExchangeRate(from_currency, to_currency);
    
    res.json({
      success: true,
      data: {
        from_currency,
        to_currency,
        rate
      }
    });
  } catch (error) {
    console.error('Kursni olishda xatolik:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/exchange-rate
 * @desc    Yangi valyuta kursini o'rnatish
 * @access  Private (Admin only)
 */
router.post('/', auth, async (req, res) => {
  try {
    // Admin tekshirish
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Faqat admin valyuta kursini o\'rnatishi mumkin'
      });
    }
    
    const { from_currency, to_currency, rate, notes } = req.body;
    
    if (!from_currency || !to_currency || !rate) {
      return res.status(400).json({
        success: false,
        message: 'from_currency, to_currency va rate kiritilishi shart'
      });
    }
    
    // Rate'ni number'ga o'tkazish
    const rateNumber = typeof rate === 'string' ? parseFloat(rate) : rate;
    
    if (isNaN(rateNumber) || rateNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Kurs 0 dan katta bo\'lishi kerak'
      });
    }
    
    const newRate = await setExchangeRate(
      from_currency, 
      to_currency, 
      rateNumber, 
      req.user.userId || req.user._id, // JWT'da userId sifatida saqlanadi
      notes
    );
    
    res.status(201).json({
      success: true,
      message: 'Valyuta kursi muvaffaqiyatli o\'rnatildi',
      data: newRate
    });
  } catch (error) {
    console.error('Kursni o\'rnatishda xatolik:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/exchange-rate/history
 * @desc    Kurs tarixini olish
 * @access  Private
 */
router.get('/history', auth, async (req, res) => {
  try {
    const { from_currency, to_currency, limit } = req.query;
    
    const history = await getRateHistory(
      from_currency, 
      to_currency, 
      limit ? parseInt(limit) : 50
    );
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Kurs tarixini olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Kurs tarixini olishda xatolik yuz berdi',
      error: error.message
    });
  }
});

module.exports = router;
