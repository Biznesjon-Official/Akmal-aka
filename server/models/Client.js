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
  
  // ESKI FIELD'LAR (Backward compatibility) - DEPRECATED
  total_received_volume: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'DEPRECATED: Endi usd_total_received_volume + rub_total_received_volume'
  },
  total_debt: {
    type: Number,
    default: 0,
    comment: 'DEPRECATED: Endi usd_total_debt + rub_total_debt (USD ekvivalentida)'
  },
  total_paid: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'DEPRECATED: Endi usd_total_paid + rub_total_paid (USD ekvivalentida)'
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

// Index qo'shish (tezroq qidirish uchun)
clientSchema.index({ name: 1 });
clientSchema.index({ phone: 1 });
clientSchema.index({ isDeleted: 1 });

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

// Backward compatibility uchun eski virtual field
clientSchema.virtual('current_debt').get(function() {
  return this.total_debt - this.total_paid;
});

// Avtomatik hisoblash (save dan oldin) - Backward compatibility uchun
clientSchema.pre('save', async function(next) {
  // Eski field'larni yangi field'lardan hisoblash (USD ekvivalentida)
  // Hozircha 1:1 nisbatda, keyinchalik exchange rate qo'shiladi
  
  this.total_received_volume = this.usd_total_received_volume + this.rub_total_received_volume;
  
  // USD ekvivalentida hisoblash (soddalashtirilgan)
  // Keyinchalik real exchange rate ishlatiladi
  const rubToUsdRate = 0.011; // Taxminiy kurs (keyinchalik dinamik bo'ladi)
  
  this.total_debt = this.usd_total_debt + (this.rub_total_debt * rubToUsdRate);
  this.total_paid = this.usd_total_paid + (this.rub_total_paid * rubToUsdRate);
  
  next();
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
  // Pre-save hook avtomatik eski field'larni yangilaydi
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
  // Pre-save hook avtomatik eski field'larni yangilaydi
};

module.exports = mongoose.model('Client', clientSchema);
