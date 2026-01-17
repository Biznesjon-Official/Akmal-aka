const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Asosiy tizim sozlamalari
  setting_key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  setting_value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  setting_type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Qo'shimcha ma'lumotlar
  is_system: {
    type: Boolean,
    default: false,
    comment: 'Tizim sozlamasi (foydalanuvchi o\'zgartira olmaydi)'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexlar
systemSettingsSchema.index({ setting_key: 1 });
systemSettingsSchema.index({ is_system: 1 });

// Static method: Sozlamani olish
systemSettingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  try {
    const setting = await this.findOne({ setting_key: key });
    return setting ? setting.setting_value : defaultValue;
  } catch (error) {
    console.error(`Setting olishda xatolik (${key}):`, error);
    return defaultValue;
  }
};

// Static method: Sozlamani o'rnatish
systemSettingsSchema.statics.setSetting = async function(key, value, type, description = '', userId = null) {
  try {
    const updateData = {
      setting_value: value,
      setting_type: type,
      description,
      updated_by: userId
    };
    
    const setting = await this.findOneAndUpdate(
      { setting_key: key },
      updateData,
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    );
    
    return setting;
  } catch (error) {
    console.error(`Setting o'rnatishda xatolik (${key}):`, error);
    throw error;
  }
};

// Static method: Asosiy valyutani olish
systemSettingsSchema.statics.getBaseCurrency = async function() {
  return await this.getSetting('base_currency', 'USD');
};

// Static method: Joriy kursni olish
systemSettingsSchema.statics.getCurrentExchangeRate = async function(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;
  
  const rateKey = `exchange_rate_${fromCurrency}_${toCurrency}`;
  const rate = await this.getSetting(rateKey, null);
  
  if (!rate) {
    // Agar kurs topilmasa, ExchangeRate modelidan olish
    const ExchangeRate = require('./ExchangeRate');
    const exchangeRate = await ExchangeRate.findOne({
      from_currency: fromCurrency,
      to_currency: toCurrency
    }).sort({ createdAt: -1 });
    
    return exchangeRate ? exchangeRate.rate : 1;
  }
  
  return rate;
};

// Static method: Summani asosiy valyutaga konvertatsiya qilish
systemSettingsSchema.statics.convertToBaseCurrency = async function(amount, fromCurrency) {
  const baseCurrency = await this.getBaseCurrency();
  
  if (fromCurrency === baseCurrency) {
    return { amount, currency: baseCurrency };
  }
  
  const rate = await this.getCurrentExchangeRate(fromCurrency, baseCurrency);
  const convertedAmount = amount * rate;
  
  return {
    amount: convertedAmount,
    currency: baseCurrency,
    original_amount: amount,
    original_currency: fromCurrency,
    exchange_rate: rate,
    converted_at: new Date()
  };
};

// Static method: Default sozlamalarni yaratish
systemSettingsSchema.statics.initializeDefaultSettings = async function() {
  const defaultSettings = [
    {
      setting_key: 'base_currency',
      setting_value: 'USD',
      setting_type: 'string',
      description: 'Asosiy valyuta (barcha hisob-kitoblar uchun)',
      is_system: true
    },
    {
      setting_key: 'exchange_rate_RUB_USD',
      setting_value: 0.011,
      setting_type: 'number',
      description: 'RUB dan USD ga kurs (1 RUB = 0.011 USD)',
      is_system: false
    },
    {
      setting_key: 'auto_vagon_closure_percentage',
      setting_value: 95,
      setting_type: 'number',
      description: 'Vagon avtomatik yopilish foizi',
      is_system: false
    },
    {
      setting_key: 'min_remaining_volume_for_closure',
      setting_value: 0.1,
      setting_type: 'number',
      description: 'Yopish uchun minimal qolgan hajm (m³)',
      is_system: false
    },
    {
      setting_key: 'dashboard_refresh_interval',
      setting_value: 30000,
      setting_type: 'number',
      description: 'Dashboard yangilanish intervali (millisekund)',
      is_system: false
    }
  ];
  
  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { setting_key: setting.setting_key },
      setting,
      { upsert: true, new: true }
    );
  }
  
  console.log('✅ Default system settings initialized');
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);