const mongoose = require('mongoose');

// Ombor/Saqlanish xarajatlari modeli
// Vagon omborda saqlanadi va sotilganda xarajat taqsimlanadi
const storageExpenseSchema = new mongoose.Schema({
  // Bog'lanishlar
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: [true, 'Vagon tanlanishi shart']
  },
  expense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: [true, 'Xarajat tanlanishi shart']
  },
  
  // Ombor xarajati ma'lumotlari
  total_storage_cost: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Jami ombor xarajati'
  },
  currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true
  },
  
  // Vagon hajmi (xarajat taqsimlash uchun)
  total_vagon_volume_m3: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Vagonning jami hajmi'
  },
  
  // Sotilgan va qolgan hajm
  sold_volume_m3: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Sotilgan hajm'
  },
  remaining_volume_m3: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Qolgan hajm'
  },
  
  // Xarajat taqsimoti
  allocated_cost: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Sotilgan hajm uchun taqsimlangan xarajat'
  },
  remaining_cost: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Qolgan hajm uchun xarajat'
  },
  
  // Holat
  status: {
    type: String,
    enum: ['active', 'partially_allocated', 'fully_allocated'],
    default: 'active',
    comment: 'active: hali sotilmagan, partially: qisman sotilgan, fully: to\'liq sotilgan'
  },
  
  // Tavsif
  description: {
    type: String,
    trim: true
  },
  
  // Sanalar
  storage_start_date: {
    type: Date,
    default: Date.now,
    comment: 'Omborda saqlash boshlanish sanasi'
  },
  storage_end_date: {
    type: Date,
    comment: 'Omborda saqlash tugash sanasi (vagon to\'liq sotilganda)'
  },
  
  // Yaratuvchi
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
storageExpenseSchema.index({ vagon: 1, status: 1 });
storageExpenseSchema.index({ expense: 1 });
storageExpenseSchema.index({ created_by: 1, createdAt: -1 });
storageExpenseSchema.index({ isDeleted: 1 });

// Pre-save: Avtomatik hisoblashlar
storageExpenseSchema.pre('save', function(next) {
  try {
    // Qolgan hajmni hisoblash
    this.remaining_volume_m3 = this.total_vagon_volume_m3 - this.sold_volume_m3;
    
    // Xarajat taqsimoti (hajm bo'yicha proporsional)
    if (this.total_vagon_volume_m3 > 0) {
      const costPerM3 = this.total_storage_cost / this.total_vagon_volume_m3;
      this.allocated_cost = this.sold_volume_m3 * costPerM3;
      this.remaining_cost = this.remaining_volume_m3 * costPerM3;
    }
    
    // Holatni yangilash
    if (this.sold_volume_m3 === 0) {
      this.status = 'active';
    } else if (this.sold_volume_m3 < this.total_vagon_volume_m3) {
      this.status = 'partially_allocated';
    } else {
      this.status = 'fully_allocated';
      this.storage_end_date = new Date();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method: Vagon sotilganda xarajatni yangilash
storageExpenseSchema.methods.allocateForSale = async function(soldVolumeM3) {
  if (soldVolumeM3 <= 0) {
    throw new Error('Sotilgan hajm 0 dan katta bo\'lishi kerak');
  }
  
  if (this.sold_volume_m3 + soldVolumeM3 > this.total_vagon_volume_m3) {
    throw new Error('Sotilgan hajm jami hajmdan oshib ketdi');
  }
  
  this.sold_volume_m3 += soldVolumeM3;
  await this.save();
  
  return {
    allocated_cost: this.allocated_cost,
    remaining_cost: this.remaining_cost,
    status: this.status
  };
};

// Static method: Vagon uchun faol ombor xarajatlarini olish
storageExpenseSchema.statics.getActiveStorageExpenses = async function(vagonId) {
  return await this.find({
    vagon: vagonId,
    status: { $in: ['active', 'partially_allocated'] },
    isDeleted: false
  }).populate('expense');
};

// Static method: Vagon uchun jami ombor xarajatini hisoblash
storageExpenseSchema.statics.getTotalStorageCost = async function(vagonId, currency = 'USD') {
  const expenses = await this.find({
    vagon: vagonId,
    currency: currency,
    isDeleted: false
  });
  
  return expenses.reduce((total, exp) => total + exp.total_storage_cost, 0);
};

// Static method: Vagon uchun taqsimlangan xarajatni hisoblash
storageExpenseSchema.statics.getAllocatedCost = async function(vagonId, currency = 'USD') {
  const expenses = await this.find({
    vagon: vagonId,
    currency: currency,
    isDeleted: false
  });
  
  return expenses.reduce((total, exp) => total + exp.allocated_cost, 0);
};

// Virtual: M³ uchun xarajat
storageExpenseSchema.virtual('cost_per_m3').get(function() {
  if (this.total_vagon_volume_m3 === 0) return 0;
  return this.total_storage_cost / this.total_vagon_volume_m3;
});

// Virtual: Taqsimlash foizi
storageExpenseSchema.virtual('allocation_percentage').get(function() {
  if (this.total_vagon_volume_m3 === 0) return 0;
  return (this.sold_volume_m3 / this.total_vagon_volume_m3) * 100;
});

// JSON ga o'tkazganda virtual fieldlarni ko'rsatish
storageExpenseSchema.set('toJSON', { virtuals: true });
storageExpenseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StorageExpense', storageExpenseSchema);
