const express = require('express');
const SystemSettings = require('../models/SystemSettings');
const auth = require('../middleware/auth');
const { auditMiddleware, logUserAction } = require('../middleware/auditLog');

const router = express.Router();

// Barcha sozlamalarni olish
router.get('/', auth, async (req, res) => {
  try {
    const { category, is_system } = req.query;
    
    const filter = {};
    if (category) filter.setting_key = new RegExp(category, 'i');
    if (is_system !== undefined) filter.is_system = is_system === 'true';
    
    const settings = await SystemSettings.find(filter)
      .sort({ setting_key: 1 });
    
    res.json(settings);
  } catch (error) {
    console.error('SystemSettings list error:', error);
    res.status(500).json({ message: 'Sozlamalarni olishda xatolik' });
  }
});

// Bitta sozlamani olish
router.get('/:key', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSettings.getSetting(key);
    
    if (setting === null) {
      return res.status(404).json({ message: 'Sozlama topilmadi' });
    }
    
    res.json({ setting_key: key, setting_value: setting });
  } catch (error) {
    console.error('SystemSettings get error:', error);
    res.status(500).json({ message: 'Sozlamani olishda xatolik' });
  }
});

// Sozlamani o'rnatish/yangilash
router.put('/:key', [auth, auth.adminOnly, auditMiddleware('SystemSettings')], async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type, description } = req.body;
    
    if (!value || !type) {
      return res.status(400).json({ 
        message: 'Qiymat va tur kiritilishi shart' 
      });
    }
    
    // Tizim sozlamalarini tekshirish
    const existingSetting = await SystemSettings.findOne({ setting_key: key });
    if (existingSetting && existingSetting.is_system && !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        message: 'Tizim sozlamalarini faqat super admin o\'zgartira oladi' 
      });
    }
    
    const setting = await SystemSettings.setSetting(
      key, 
      value, 
      type, 
      description, 
      req.user.id
    );
    
    // Audit log
    await logUserAction(
      req,
      'UPDATE',
      'SystemSettings',
      setting._id,
      existingSetting ? existingSetting.toObject() : null,
      setting.toObject(),
      `Sozlama yangilandi: ${key}`,
      { setting_key: key, new_value: value }
    );
    
    res.json({
      message: 'Sozlama muvaffaqiyatli yangilandi',
      setting
    });
  } catch (error) {
    console.error('SystemSettings update error:', error);
    res.status(500).json({ message: 'Sozlamani yangilashda xatolik' });
  }
});

// Valyuta kursi yangilash
router.put('/exchange-rate/:fromCurrency/:toCurrency', [auth, auth.adminOnly, auditMiddleware('ExchangeRate')], async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.params;
    const { rate } = req.body;
    
    if (!rate || rate <= 0) {
      return res.status(400).json({ 
        message: 'Kurs 0 dan katta bo\'lishi kerak' 
      });
    }
    
    const rateKey = `exchange_rate_${fromCurrency}_${toCurrency}`;
    
    const setting = await SystemSettings.setSetting(
      rateKey,
      rate,
      'number',
      `${fromCurrency} dan ${toCurrency} ga kurs`,
      req.user.id
    );
    
    // ExchangeRateHistory ga ham qo'shish
    const ExchangeRateHistory = require('../models/ExchangeRateHistory');
    await ExchangeRateHistory.create({
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate: rate,
      source: 'manual_admin',
      set_by: req.user.id
    });
    
    res.json({
      message: 'Valyuta kursi muvaffaqiyatli yangilandi',
      setting,
      rate_key: rateKey
    });
  } catch (error) {
    console.error('Exchange rate update error:', error);
    res.status(500).json({ message: 'Valyuta kursini yangilashda xatolik' });
  }
});

// Asosiy valyutani o'rnatish
router.put('/base-currency', [auth, auth.adminOnly, auditMiddleware('SystemSettings')], async (req, res) => {
  try {
    const { currency } = req.body;
    
    if (!['USD', 'RUB'].includes(currency)) {
      return res.status(400).json({ 
        message: 'Faqat USD yoki RUB qo\'llab-quvvatlanadi' 
      });
    }
    
    const oldCurrency = await SystemSettings.getBaseCurrency();
    
    const setting = await SystemSettings.setSetting(
      'base_currency',
      currency,
      'string',
      'Asosiy valyuta (barcha hisob-kitoblar uchun)',
      req.user.id
    );
    
    // Audit log
    await logUserAction(
      req,
      'UPDATE',
      'SystemSettings',
      setting._id,
      { base_currency: oldCurrency },
      { base_currency: currency },
      `Asosiy valyuta o'zgartirildi: ${oldCurrency} → ${currency}`,
      { old_currency: oldCurrency, new_currency: currency }
    );
    
    res.json({
      message: 'Asosiy valyuta muvaffaqiyatli o\'zgartirildi',
      old_currency: oldCurrency,
      new_currency: currency,
      warning: 'Barcha mavjud ma\'lumotlar qayta hisoblanadi'
    });
  } catch (error) {
    console.error('Base currency update error:', error);
    res.status(500).json({ message: 'Asosiy valyutani o\'zgartirishda xatolik' });
  }
});

// Konvertatsiya kalkulyatori
router.post('/convert', auth, async (req, res) => {
  try {
    const { amount, from_currency, to_currency } = req.body;
    
    if (!amount || !from_currency || !to_currency) {
      return res.status(400).json({ 
        message: 'Summa, manba va maqsad valyuta kiritilishi shart' 
      });
    }
    
    if (from_currency === to_currency) {
      return res.json({
        original_amount: amount,
        original_currency: from_currency,
        converted_amount: amount,
        converted_currency: to_currency,
        exchange_rate: 1,
        converted_at: new Date()
      });
    }
    
    const rate = await SystemSettings.getCurrentExchangeRate(from_currency, to_currency);
    const convertedAmount = amount * rate;
    
    res.json({
      original_amount: amount,
      original_currency: from_currency,
      converted_amount: convertedAmount,
      converted_currency: to_currency,
      exchange_rate: rate,
      converted_at: new Date()
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ message: 'Valyuta konvertatsiyasida xatolik' });
  }
});

// Asosiy valyutaga konvertatsiya
router.post('/convert-to-base', auth, async (req, res) => {
  try {
    const { amount, from_currency } = req.body;
    
    if (!amount || !from_currency) {
      return res.status(400).json({ 
        message: 'Summa va manba valyuta kiritilishi shart' 
      });
    }
    
    const result = await SystemSettings.convertToBaseCurrency(amount, from_currency);
    
    res.json(result);
  } catch (error) {
    console.error('Base currency conversion error:', error);
    res.status(500).json({ message: 'Asosiy valyutaga konvertatsiyada xatolik' });
  }
});

// Default sozlamalarni qayta tiklash
router.post('/initialize-defaults', [auth, auth.adminOnly, auditMiddleware('SystemSettings')], async (req, res) => {
  try {
    await SystemSettings.initializeDefaultSettings();
    
    await logUserAction(
      req,
      'CREATE',
      'SystemSettings',
      'bulk',
      null,
      { action: 'initialize_defaults' },
      'Default sozlamalar qayta tiklandi',
      { initialized_by: req.user.id }
    );
    
    res.json({
      message: 'Default sozlamalar muvaffaqiyatli qayta tiklandi'
    });
  } catch (error) {
    console.error('Initialize defaults error:', error);
    res.status(500).json({ message: 'Default sozlamalarni tiklashtda xatolik' });
  }
});

// Tizim statistikasi
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const baseCurrency = await SystemSettings.getBaseCurrency();
    const totalSettings = await SystemSettings.countDocuments();
    const systemSettings = await SystemSettings.countDocuments({ is_system: true });
    const userSettings = totalSettings - systemSettings;
    
    // Valyuta kurslari
    const exchangeRates = {};
    const currencies = ['USD', 'RUB'];
    
    for (const from of currencies) {
      for (const to of currencies) {
        if (from !== to) {
          const rate = await SystemSettings.getCurrentExchangeRate(from, to);
          exchangeRates[`${from}_${to}`] = rate;
        }
      }
    }
    
    res.json({
      base_currency: baseCurrency,
      total_settings: totalSettings,
      system_settings: systemSettings,
      user_settings: userSettings,
      exchange_rates: exchangeRates,
      supported_currencies: currencies
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ message: 'Tizim statistikasini olishda xatolik' });
  }
});

module.exports = router;