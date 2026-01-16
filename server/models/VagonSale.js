const mongoose = require('mongoose');

const vagonSaleSchema = new mongoose.Schema({
  // Asosiy bog'lanishlar
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: [true, 'Vagon tanlanishi shart']
  },
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonLot',
    required: [true, 'Lot tanlanishi shart']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Mijoz tanlanishi shart']
  },
  
  // Hajm ma'lumotlari (m³)
  sent_volume_m3: {
    type: Number,
    required: [true, 'Jo\'natilgan hajm kiritilishi shart'],
    min: [0.01, 'Hajm 0 dan katta bo\'lishi kerak']
  },
  client_loss_m3: {
    type: Number,
    default: 0,
    min: [0, 'Yo\'qotish 0 dan kichik bo\'lishi mumkin emas']
  },
  accepted_volume_m3: {
    type: Number,
    min: 0
  },
  
  // Narx ma'lumotlari
  sale_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: [true, 'Valyuta tanlanishi shart']
  },
  price_per_m3: {
    type: Number,
    required: [true, 'Narx kiritilishi shart'],
    min: [1, 'Narx 0 dan katta bo\'lishi kerak']
  },
  exchange_rate: {
    type: Number,
    default: 1
  },
  total_price: {
    type: Number,
    min: 0,
    comment: 'Jami narx (lot valyutasida)'
  },
  
  // To'lov ma'lumotlari (lot valyutasida)
  paid_amount: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'To\'langan summa (lot valyutasida)'
  },
  debt: {
    type: Number,
    default: 0,
    comment: 'Qarz (lot valyutasida)'
  },
  
  // Qo'shimcha
  sale_date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  
  // Holat
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
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
vagonSaleSchema.index({ vagon: 1 });
vagonSaleSchema.index({ client: 1 });
vagonSaleSchema.index({ status: 1 });
vagonSaleSchema.index({ isDeleted: 1 });
vagonSaleSchema.index({ sale_date: -1 });

// Avtomatik hisoblashlar (save dan oldin)
vagonSaleSchema.pre('save', function(next) {
  // 1. Qabul qilingan hajm = Jo'natilgan - Yo'qotish
  this.accepted_volume_m3 = this.sent_volume_m3 - this.client_loss_m3;
  
  // 2. Jami narx = Qabul qilingan hajm × Narx (lot valyutasida)
  this.total_price = this.accepted_volume_m3 * this.price_per_m3;
  
  // 3. Qarz = Jami narx - To'langan (lot valyutasida)
  this.debt = this.total_price - this.paid_amount;
  
  // 4. Holat
  if (this.debt === 0 && this.total_price > 0) {
    this.status = 'paid';
  } else if (this.paid_amount > 0) {
    this.status = 'partial';
  } else {
    this.status = 'pending';
  }
  
  next();
});

// Virtual fields
vagonSaleSchema.virtual('payment_percentage').get(function() {
  if (this.total_price === 0) return 0;
  return ((this.paid_amount / this.total_price) * 100).toFixed(2);
});

vagonSaleSchema.virtual('loss_percentage').get(function() {
  if (this.sent_volume_m3 === 0) return 0;
  return ((this.client_loss_m3 / this.sent_volume_m3) * 100).toFixed(2);
});

// JSON ga o'tkazganda virtual fieldlarni ko'rsatish
vagonSaleSchema.set('toJSON', { virtuals: true });
vagonSaleSchema.set('toObject', { virtuals: true });

// Instance method: To'lov qilish mumkinligini tekshirish
vagonSaleSchema.methods.canPay = function(amount) {
  return amount > 0 && amount <= this.debt;
};

// Instance method: To'liq to'langanligini tekshirish
vagonSaleSchema.methods.isPaid = function() {
  return this.debt === 0 && this.total_price > 0;
};

module.exports = mongoose.model('VagonSale', vagonSaleSchema);
