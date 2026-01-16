const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
  // Valyuta nomi
  currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true,
    unique: true,
    comment: 'Faqat USD va RUB'
  },
  
  // USD ga nisbatan kurs (1 USD = X RUB)
  rate: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Agar currency=RUB bo\'lsa: 1 USD = X RUB'
  },
  
  // Oxirgi yangilanish sanasi
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Yangilagan admin
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);