const express = require('express');
const { body, validationResult } = require('express-validator');
const ExchangeRate = require('../models/ExchangeRate');
const auth = require('../middleware/auth');

const router = express.Router();

// Barcha valyuta kurslarini olish
router.get('/', auth, async (req, res) => {
  try {
    const rates = await ExchangeRate.find()
      .populate('updatedBy', 'username')
      .sort({ currency: 1 });
    
    res.json(rates);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Valyuta kursini yangilash yoki yaratish (faqat admin)
router.post('/', [auth, auth.adminOnly, [
  body('currency').isIn(['USD', 'RUB']).withMessage('Noto\'g\'ri valyuta'),
  body('rate').isNumeric().withMessage('Kurs raqam bo\'lishi kerak').isFloat({ min: 0 }).withMessage('Kurs musbat bo\'lishi kerak')
]], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currency, rate } = req.body;

    // Mavjud kursni yangilash yoki yangi yaratish
    const exchangeRate = await ExchangeRate.findOneAndUpdate(
      { currency },
      { 
        rate, 
        lastUpdated: new Date(),
        updatedBy: req.user.userId 
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
    
    if (!['USD', 'RUB'].includes(currency.toUpperCase())) {
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