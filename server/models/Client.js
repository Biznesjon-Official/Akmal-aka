const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  name: {
    type: String,
    required: [true, 'Mijoz nomi kiritilishi shart'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Telefon raqami kiritilishi shart'],
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // Statistika (avtomatik hisoblanadi) - VALYUTA BO'YICHA
  
  // USD hisoblar
  usd_total_received_volume: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'USD da jami qabul qilingan hajm (m³)'
  },
  usd_total_debt: {
    type: Number,
    default: 0,
    comment: 'USD da jami qarz'
  },
  usd_total_paid: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'USD da jami to\'langan'
  },
  
  // RUB hisoblar
  rub_total_received_volume: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'RUB da jami qabul qilingan hajm (m³)'
  },
  rub_total_debt: {
    type: Number,
    default: 0,
    comment: 'RUB da jami qarz'
  },
  rub_total_paid: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'RUB da jami to\'langan'
  },
  
  // DELIVERY QARZLARI (YANGI)
  delivery_total_debt: {
    type: Number,
    default: 0,
    comment: 'Delivery (olib kelib berish) jami qarzi (USD)'
  },
  delivery_total_paid: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Delivery uchun jami to\'langan (USD)'
  },
  
  // Qo'shimcha
  notes: {
    type: String
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ⚡ OPTIMIZATSIYA: MongoDB Indexlar (tezroq qidirish uchun)
clientSchema.index({ name: 1 });
clientSchema.index({ phone: 1 });
clientSchema.index({ isDeleted: 1 });
clientSchema.index({ createdAt: -1 }); // Yangi qo'shildi - sana bo'yicha saralash uchun
// Text index - qidiruv uchun (name va phone bo'yicha)
clientSchema.index({ name: 'text', phone: 'text' });
// Compound index - qarzli mijozlarni tez topish uchun
clientSchema.index({ usd_total_debt: 1, usd_total_paid: 1 });
clientSchema.index({ rub_total_debt: 1, rub_total_paid: 1 });

// Virtual fields - haqiqiy qarzlar (valyuta bo'yicha)
clientSchema.virtual('usd_current_debt').get(function() {
  return this.usd_total_debt - this.usd_total_paid;
});

clientSchema.virtual('rub_current_debt').get(function() {
  return this.rub_total_debt - this.rub_total_paid;
});

// DELIVERY VIRTUAL FIELDS (YANGI)
clientSchema.virtual('delivery_current_debt').get(function() {
  return this.delivery_total_debt - this.delivery_total_paid;
});

// JSON ga o'tkazganda virtual fieldlarni ko'rsatish
clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

// Instance method: Valyuta bo'yicha qarz olish
clientSchema.methods.getDebtByCurrency = function(currency) {
  if (currency === 'USD') {
    return {
      total_debt: this.usd_total_debt,
      total_paid: this.usd_total_paid,
      current_debt: this.usd_current_debt,
      received_volume: this.usd_total_received_volume
    };
  } else if (currency === 'RUB') {
    return {
      total_debt: this.rub_total_debt,
      total_paid: this.rub_total_paid,
      current_debt: this.rub_current_debt,
      received_volume: this.rub_total_received_volume
    };
  }
  return null;
};

// Instance method: To'lov qilish (valyuta bo'yicha)
clientSchema.methods.makePayment = function(amount, currency) {
  if (currency === 'USD') {
    this.usd_total_paid += amount;
  } else if (currency === 'RUB') {
    this.rub_total_paid += amount;
  }
};

// Instance method: Qarz qo'shish (valyuta bo'yicha)
clientSchema.methods.addDebt = function(amount, currency, volume = 0) {
  if (currency === 'USD') {
    this.usd_total_debt += amount;
    this.usd_total_received_volume += volume;
  } else if (currency === 'RUB') {
    this.rub_total_debt += amount;
    this.rub_total_received_volume += volume;
  }
};

module.exports = mongoose.model('Client', clientSchema);
