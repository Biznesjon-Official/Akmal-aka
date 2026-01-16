const mongoose = require('mongoose');

const vagonSchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  vagonCode: {
    type: String,
    required: [true, 'Vagon kodi kiritilishi shart'],
    unique: true,
    trim: true
  },
  month: {
    type: String,  // Format: "2024-01"
    required: [true, 'Oy kiritilishi shart']
  },
  sending_place: {
    type: String,
    required: [true, 'Jo\'natish joyi kiritilishi shart'],
    trim: true
  },
  receiving_place: {
    type: String,
    required: [true, 'Qabul qilish joyi kiritilishi shart'],
    trim: true
  },
  
  // Hajm ma'lumotlari (m³) - AVTOMATIK (lotlardan)
  total_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Jami hajm (barcha lotlar)'
  },
  total_loss_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Jami yo\'qotish (barcha lotlar)'
  },
  available_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Mavjud hajm = Jami - Yo\'qotish'
  },
  sold_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Sotilgan hajm (barcha lotlar)'
  },
  remaining_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Qolgan hajm = Mavjud - Sotilgan'
  },
  
  // Moliyaviy ma'lumotlar (AVTOMATIK - lotlardan)
  // USD
  usd_total_cost: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'USD da jami xarajat'
  },
  usd_total_revenue: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'USD da jami daromad'
  },
  usd_profit: {
    type: Number,
    default: 0,
    comment: 'USD da foyda'
  },
  
  // RUB
  rub_total_cost: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'RUB da jami xarajat'
  },
  rub_total_revenue: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'RUB da jami daromad'
  },
  rub_profit: {
    type: Number,
    default: 0,
    comment: 'RUB da foyda'
  },
  
  // Holat
  status: {
    type: String,
    enum: ['in_transit', 'warehouse', 'closed'],
    default: 'in_transit'
  },
  
  // Qo'shimcha ma'lumotlar
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

// Indexlar (tezroq qidirish uchun)
// vagonCode indexi unique: true orqali yaratilgan
vagonSchema.index({ month: 1 });
vagonSchema.index({ status: 1 });
vagonSchema.index({ isDeleted: 1 });

// Hajmlarni avtomatik hisoblash (save dan oldin)
// ESLATMA: Hozir lotlar yo'q, shuning uchun faqat 0 ga o'rnatamiz
// Lotlar qo'shilganda, route da yangilanadi
vagonSchema.pre('save', function(next) {
  // Barcha ma'lumotlar lotlardan olinadi
  // Bu hook faqat default qiymatlar uchun
  next();
});

// Virtual fields
vagonSchema.virtual('sold_percentage').get(function() {
  if (this.total_volume_m3 === 0) return 0;
  return ((this.sold_volume_m3 / this.total_volume_m3) * 100).toFixed(2);
});

vagonSchema.virtual('loss_percentage').get(function() {
  if (this.total_volume_m3 === 0) return 0;
  return ((this.total_loss_m3 / this.total_volume_m3) * 100).toFixed(2);
});

// JSON ga o'tkazganda virtual fieldlarni ko'rsatish
vagonSchema.set('toJSON', { virtuals: true });
vagonSchema.set('toObject', { virtuals: true });

// Static method: Vagon kodi generatsiya
vagonSchema.statics.generateVagonCode = async function(year) {
  const count = await this.countDocuments({ 
    vagonCode: new RegExp(`^VAG-${year}-`) 
  });
  return `VAG-${year}-${String(count + 1).padStart(3, '0')}`;
};

// Instance method: Sotish mumkinligini tekshirish
vagonSchema.methods.canSell = function(volume) {
  return this.remaining_volume_m3 >= volume;
};

// Instance method: Yopish mumkinligini tekshirish
vagonSchema.methods.canClose = function() {
  return this.remaining_volume_m3 === 0 || this.status === 'closed';
};

module.exports = mongoose.model('Vagon', vagonSchema);
