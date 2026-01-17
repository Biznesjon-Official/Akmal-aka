const mongoose = require('mongoose');

const exchangeRateHistorySchema = new mongoose.Schema({
  // Sana (har kun uchun bitta yozuv)
  date: {
    type: Date,
    required: true,
    index: true,
    comment: 'Kurs sanasi (faqat sana, vaqt yo\'q)'
  },
  
  // Kurs ma'lumotlari
  usd_to_rub: {
    type: Number,
    required: true,
    min: 0,
    comment: '1 USD = X RUB'
  },
  rub_to_usd: {
    type: Number,
    required: true,
    min: 0,
    comment: '1 RUB = X USD'
  },
  
  // Manba ma'lumotlari
  source: {
    type: String,
    enum: ['manual', 'cbr_api', 'bank', 'market', 'system'],
    default: 'manual',
    comment: 'Kurs manbai'
  },
  
  // Yaratuvchi
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_by_username: {
    type: String,
    required: true,
    comment: 'Foydalanuvchi o\'chirilsa ham saqlanadi'
  },
  
  // Qo'shimcha ma'lumotlar
  notes: {
    type: String,
    trim: true,
    comment: 'Qo\'shimcha izohlar'
  },
  
  // Holat
  is_active: {
    type: Boolean,
    default: true,
    comment: 'Faol kurs (bekor qilingan kurslar false)'
  },
  
  // Audit ma'lumotlari
  ip_address: String,
  user_agent: String
}, {
  timestamps: true
});

// Compound index: sana va faollik
exchangeRateHistorySchema.index({ date: -1, is_active: 1 });
exchangeRateHistorySchema.index({ created_by: 1, date: -1 });

// Unique index: har kun uchun faqat bitta faol kurs
exchangeRateHistorySchema.index(
  { date: 1, is_active: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { is_active: true },
    name: 'unique_active_rate_per_date'
  }
);

// Pre-save: Sanani normalize qilish (faqat sana, vaqt yo'q)
exchangeRateHistorySchema.pre('save', function(next) {
  if (this.date) {
    const normalizedDate = new Date(this.date);
    normalizedDate.setHours(0, 0, 0, 0);
    this.date = normalizedDate;
  }
  
  // rub_to_usd ni avtomatik hisoblash (agar berilmagan bo'lsa)
  if (!this.rub_to_usd && this.usd_to_rub) {
    this.rub_to_usd = 1 / this.usd_to_rub;
  }
  
  next();
});

// Static method: Muayyan sana uchun kurs olish
exchangeRateHistorySchema.statics.getRateForDate = async function(targetDate) {
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  
  // 1. Aynan shu sana uchun faol kurs
  let rate = await this.findOne({ 
    date: date, 
    is_active: true 
  });
  
  // 2. Agar topilmasa, eng yaqin oldingi sanani olish
  if (!rate) {
    rate = await this.findOne({ 
      date: { $lte: date }, 
      is_active: true 
    }).sort({ date: -1 });
  }
  
  // 3. Agar hali ham topilmasa, eng yangi faol kursni olish
  if (!rate) {
    rate = await this.findOne({ is_active: true }).sort({ date: -1 });
  }
  
  return rate;
};

// Static method: Joriy kurs
exchangeRateHistorySchema.statics.getCurrentRate = async function() {
  return this.findOne({ is_active: true }).sort({ date: -1 });
};

// Static method: Kurs tarixi
exchangeRateHistorySchema.statics.getRateHistory = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  return this.find({ 
    date: { $gte: startDate }, 
    is_active: true 
  }).sort({ date: -1 });
};

// Static method: Valyuta konvertatsiyasi
exchangeRateHistorySchema.statics.convertCurrency = async function(
  amount, 
  fromCurrency, 
  toCurrency, 
  date = new Date()
) {
  if (fromCurrency === toCurrency) {
    return { 
      amount: amount, 
      rate: 1, 
      converted_amount: amount,
      rate_date: date 
    };
  }
  
  const rate = await this.getRateForDate(date);
  if (!rate) {
    throw new Error('Kurs topilmadi');
  }
  
  let convertedAmount;
  let usedRate;
  
  if (fromCurrency === 'USD' && toCurrency === 'RUB') {
    convertedAmount = amount * rate.usd_to_rub;
    usedRate = rate.usd_to_rub;
  } else if (fromCurrency === 'RUB' && toCurrency === 'USD') {
    convertedAmount = amount * rate.rub_to_usd;
    usedRate = rate.rub_to_usd;
  } else {
    throw new Error('Noto\'g\'ri valyuta juftligi');
  }
  
  return {
    amount: amount,
    rate: usedRate,
    converted_amount: convertedAmount,
    rate_date: rate.date,
    rate_source: rate.source
  };
};

// Virtual: Kurs farqi (spread)
exchangeRateHistorySchema.virtual('spread').get(function() {
  const calculatedRubToUsd = 1 / this.usd_to_rub;
  return Math.abs(calculatedRubToUsd - this.rub_to_usd).toFixed(6);
});

// Virtual: Kurs o'zgarishi (oldingi kun bilan taqqoslash)
exchangeRateHistorySchema.virtual('daily_change').get(function() {
  // Bu virtual field faqat populate qilinganda ishlaydi
  return this._daily_change || null;
});

module.exports = mongoose.model('ExchangeRateHistory', exchangeRateHistorySchema);