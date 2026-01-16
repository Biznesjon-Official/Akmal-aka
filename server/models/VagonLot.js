const mongoose = require('mongoose');

const vagonLotSchema = new mongoose.Schema({
  // Vagon bog'lanishi
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: [true, 'Vagon tanlanishi shart']
  },
  
  // O'lcham ma'lumotlari
  dimensions: {
    type: String,
    required: [true, 'O\'lcham kiritilishi shart'],
    trim: true,
    comment: 'Masalan: 35×125×6 mm'
  },
  quantity: {
    type: Number,
    required: [true, 'Soni kiritilishi shart'],
    min: [1, 'Son 0 dan katta bo\'lishi kerak']
  },
  volume_m3: {
    type: Number,
    required: [true, 'Hajm kiritilishi shart'],
    min: [0.001, 'Hajm 0 dan katta bo\'lishi kerak']
  },
  
  // Xarid ma'lumotlari
  purchase_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: [true, 'Valyuta tanlanishi shart']
  },
  purchase_amount: {
    type: Number,
    required: [true, 'Xarid summasi kiritilishi shart'],
    min: [0, 'Summa 0 dan kichik bo\'lishi mumkin emas']
  },
  
  // Yo'qotish (brak) - faqat hajm (m³)
  loss_volume_m3: {
    type: Number,
    default: 0,
    min: [0, 'Yo\'qotish 0 dan kichik bo\'lishi mumkin emas']
  },
  available_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Mavjud hajm = Hajm - Yo\'qotish'
  },
  
  // Sotilgan (avtomatik)
  sold_volume_m3: {
    type: Number,
    default: 0,
    min: 0
  },
  remaining_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Qolgan = Mavjud - Sotilgan'
  },
  
  // Moliyaviy (avtomatik)
  total_expenses: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Xarid + Qo\'shimcha xarajatlar'
  },
  cost_per_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Tannarx = Jami xarajat / Hajm'
  },
  total_revenue: {
    type: Number,
    default: 0,
    min: 0
  },
  profit: {
    type: Number,
    default: 0,
    comment: 'Foyda = Daromad - Proporsional xarajat'
  },
  
  // Qo'shimcha
  notes: {
    type: String,
    trim: true
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
vagonLotSchema.index({ vagon: 1 });
vagonLotSchema.index({ isDeleted: 1 });

// Avtomatik hisoblashlar (save dan oldin)
vagonLotSchema.pre('save', function(next) {
  // 1. Mavjud hajm = Hajm - Yo'qotish (brak)
  this.available_volume_m3 = this.volume_m3 - this.loss_volume_m3;
  
  // 2. Qolgan hajm = Mavjud - Sotilgan
  this.remaining_volume_m3 = this.available_volume_m3 - this.sold_volume_m3;
  
  // 3. Qolgan soni (taxminiy)
  if (this.volume_m3 > 0 && this.quantity > 0) {
    const remaining_percentage = this.remaining_volume_m3 / this.volume_m3;
    this.remaining_quantity = Math.floor(this.quantity * remaining_percentage);
  }
  
  // 4. Jami xarajat = Xarid + Qo'shimcha xarajatlar (xarajatlar alohida qo'shiladi)
  // total_expenses route da yangilanadi
  
  // 5. Tannarx = Jami xarajat / Hajm (100% hajm bilan!)
  if (this.volume_m3 > 0) {
    this.cost_per_m3 = this.total_expenses / this.volume_m3;
  }
  
  // 6. Foyda = Daromad - Proporsional xarajat
  if (this.volume_m3 > 0) {
    const sold_percentage = this.sold_volume_m3 / this.volume_m3;
    const proportional_cost = this.total_expenses * sold_percentage;
    this.profit = this.total_revenue - proportional_cost;
  }
  
  next();
});

// Virtual fields
vagonLotSchema.virtual('sold_percentage').get(function() {
  if (this.volume_m3 === 0) return 0;
  return ((this.sold_volume_m3 / this.volume_m3) * 100).toFixed(2);
});

vagonLotSchema.virtual('loss_percentage').get(function() {
  if (this.volume_m3 === 0) return 0;
  return ((this.loss_volume_m3 / this.volume_m3) * 100).toFixed(2);
});

// JSON ga o'tkazganda virtual fieldlarni ko'rsatish
vagonLotSchema.set('toJSON', { virtuals: true });
vagonLotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('VagonLot', vagonLotSchema);
