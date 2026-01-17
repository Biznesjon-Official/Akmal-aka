const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
  // Valyuta nomi
  currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true,
    unique: true,
    comment: 'USD: 1 USD = X RUB, RUB: 1 RUB = X USD'
  },
  
  // Kurs qiymati
  rate: {
    type: Number,
    required: true,
    min: 0,
    comment: 'USD uchun: 1 USD = X RUB, RUB uchun: 1 RUB = X USD'
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