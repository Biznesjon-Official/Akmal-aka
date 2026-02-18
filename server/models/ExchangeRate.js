const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
  // Qaysi valyutadan
  from_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true,
    comment: 'Asosiy valyuta'
  },
  
  // Qaysi valyutaga
  to_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true,
    comment: 'Maqsad valyuta'
  },
  
  // Kurs qiymati (1 from_currency = X to_currency)
  rate: {
    type: Number,
    required: true,
    min: 0.01,
    comment: 'Misol: 1 USD = 80 RUB'
  },
  
  // Kurs amal qilish sanasi
  effective_date: {
    type: Date,
    default: Date.now
  },
  
  // Yangilagan admin
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Faolmi
  is_active: {
    type: Boolean,
    default: true,
    comment: 'Faqat bitta faol kurs bo\'lishi mumkin'
  },
  
  // Kurs manbai
  source: {
    type: String,
    enum: ['manual', 'api'],
    default: 'manual'
  },
  
  // Izoh
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexlar
exchangeRateSchema.index({ from_currency: 1, to_currency: 1, is_active: 1 });
exchangeRateSchema.index({ effective_date: -1 });

// Validation: from_currency va to_currency bir xil bo'lmasligi kerak
exchangeRateSchema.pre('save', function(next) {
  if (this.from_currency === this.to_currency) {
    return next(new Error('Bir xil valyutaga kurs o\'rnatish mumkin emas'));
  }
  next();
});

// Static method: Faol kursni olish
exchangeRateSchema.statics.getActiveRate = async function(from_currency, to_currency) {
  const rate = await this.findOne({
    from_currency,
    to_currency,
    is_active: true
  }).sort({ effective_date: -1 });
  
  if (!rate) {
    throw new Error(`Faol kurs topilmadi: ${from_currency} -> ${to_currency}`);
  }
  
  return rate.rate;
};

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);