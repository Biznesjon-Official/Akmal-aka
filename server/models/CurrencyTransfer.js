const mongoose = require('mongoose');

const currencyTransferSchema = new mongoose.Schema({
  // Qaysi valyutadan
  from_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: [true, 'Qaysi valyutadan o\'tkazilayotgani kiritilishi shart']
  },
  
  // Qaysi valyutaga
  to_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: [true, 'Qaysi valyutaga o\'tkazilayotgani kiritilishi shart']
  },
  
  // O'tkaziladigan summa (from_currency da)
  from_amount: {
    type: Number,
    required: [true, 'O\'tkaziladigan summa kiritilishi shart'],
    min: [0.01, 'Summa 0 dan katta bo\'lishi kerak']
  },
  
  // Olingan summa (to_currency da)
  to_amount: {
    type: Number,
    required: [true, 'Olingan summa kiritilishi shart'],
    min: [0.01, 'Summa 0 dan katta bo\'lishi kerak']
  },
  
  // Qo'llanilgan valyuta kursi
  exchange_rate: {
    type: Number,
    required: [true, 'Valyuta kursi kiritilishi shart'],
    min: [0.01, 'Kurs 0 dan katta bo\'lishi kerak'],
    comment: '1 from_currency = X to_currency'
  },
  
  // O'tkazma sanasi
  transfer_date: {
    type: Date,
    default: Date.now
  },
  
  // Izoh
  notes: {
    type: String,
    trim: true
  },
  
  // Kim o'tkazdi
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Hardcoded admin uchun optional
  },
  
  // Cash yozuvlari (chiqim va kirim)
  cash_out_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cash',
    comment: 'Chiqim (from_currency) Cash yozuvi'
  },
  
  cash_in_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cash',
    comment: 'Kirim (to_currency) Cash yozuvi'
  },
  
  // Status
  status: {
    type: String,
    enum: ['completed', 'cancelled'],
    default: 'completed'
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexlar
currencyTransferSchema.index({ from_currency: 1, to_currency: 1 });
currencyTransferSchema.index({ transfer_date: -1 });
currencyTransferSchema.index({ created_by: 1 });
currencyTransferSchema.index({ status: 1 });

// Validation: from_currency va to_currency bir xil bo'lmasligi kerak
currencyTransferSchema.pre('save', function(next) {
  if (this.from_currency === this.to_currency) {
    return next(new Error('Bir xil valyutaga o\'tkazish mumkin emas'));
  }
  next();
});

module.exports = mongoose.model('CurrencyTransfer', currencyTransferSchema);
