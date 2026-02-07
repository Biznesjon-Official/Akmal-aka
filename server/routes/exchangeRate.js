const express = require('express');
const { body, validationResult } = require('express-validator');
const ExchangeRate = require('../models/ExchangeRate');
const exchangeRateService = require('../services/exchangeRateService');
const auth = require('../middleware/auth');

const router = express.Router();

// Barcha valyuta kurslarini olish (database + real-time)
router.get('/', auth, async (req, res) => {
  try {
    const rates = await exchangeRateService.getCurrentRates();
    
    res.json({
      database: rates.database,
      realTime: rates.realTime,
      lastFetch: rates.lastFetch
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Real-time kurslarni yangilash (faqat admin)
router.post('/update-realtime', [auth, auth.adminOnly], async (req, res) => {
  try {
    const realTimeRates = await exchangeRateService.fetchRealTimeRates();
    
    if (!realTimeRates) {
      return res.status(503).json({ 
        message: 'Real-time API dan ma\'lumot olib bo\'lmadi' 
      });
    }

    const success = await exchangeRateService.updateDatabaseRates(
      realTimeRates, 
      req.user.userId
    );

    if (success) {
      const updatedRates = await ExchangeRate.find()
        .populate('updatedBy', 'username')
        .sort({ currency: 1 });

      res.json({
        message: 'Real-time kurslar muvaffaqiyatli yangilandi',
        rates: updatedRates,
        realTimeData: realTimeRates
      });
    } else {
      res.status(500).json({ message: 'Kurslarni yangilashda xatolik' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Avtomatik yangilashni yoqish/o'chirish (faqat admin)
router.post('/auto-update', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { enable } = req.body;

    if (enable) {
      exchangeRateService.startAutoUpdate(req.user.userId);
      res.json({ message: 'Avtomatik yangilash yoqildi' });
    } else {
      exchangeRateService.stopAutoUpdate();
      res.json({ message: 'Avtomatik yangilash o\'chirildi' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Faqat real-time kurslarni olish
router.get('/realtime', auth, async (req, res) => {
  try {
    const realTimeRates = await exchangeRateService.fetchRealTimeRates();
    
    if (!realTimeRates) {
      return res.status(503).json({ 
        message: 'Real-time API dan ma\'lumot olib bo\'lmadi' 
      });
    }

    res.json(realTimeRates);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});
// Valyuta kursini qo'lda yangilash yoki yaratish (faqat admin)
router.post('/', [auth, auth.adminOnly, [
  body('currency').isIn(['USD', 'RUB', 'UZS']).withMessage('Noto\'g\'ri valyuta'),
  body('rate').isNumeric().withMessage('Kurs raqam bo\'lishi kerak').isFloat({ min: 0 }).withMessage('Kurs musbat bo\'lishi kerak')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currency, rate } = req.body;

    // Mavjud kursni yangilash yoki yangi yaratish (qo'lda)
    const exchangeRate = await ExchangeRate.findOneAndUpdate(
      { currency },
      { 
        rate, 
        lastUpdated: new Date(),
        updatedBy: req.user.userId,
        isRealTime: false,
        source: 'manual'
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    ).populate('updatedBy', 'username');

    res.json(exchangeRate);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Bitta valyuta kursini olish
router.get('/:currency', auth, async (req, res) => {
  try {
    const { currency } = req.params;
    
    if (!['USD', 'RUB', 'UZS'].includes(currency.toUpperCase())) {
      return res.status(400).json({ message: 'Noto\'g\'ri valyuta' });
    }

    const rate = await ExchangeRate.findOne({ currency: currency.toUpperCase() })
      .populate('updatedBy', 'username');
    
    if (!rate) {
      return res.status(404).json({ message: 'Valyuta kursi topilmadi' });
    }
    
    res.json(rate);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Valyuta kursini o'chirish (faqat admin)
router.delete('/:currency', [auth, auth.adminOnly], async (req, res) => {
  try {
    const { currency } = req.params;
    
    const rate = await ExchangeRate.findOneAndDelete({ currency: currency.toUpperCase() });
    
    if (!rate) {
      return res.status(404).json({ message: 'Valyuta kursi topilmadi' });
    }
    
    res.json({ message: 'Valyuta kursi o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;