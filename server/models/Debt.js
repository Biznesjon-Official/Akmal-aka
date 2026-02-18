const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Avtomatik yaratilganda user ID bo'lmasligi mumkin
  }
}, {
  timestamps: true
});

const debtSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: false // Bir martalik mijozlar uchun ixtiyoriy
  },
  // Bir martalik mijoz ma'lumotlari
  one_time_client_name: {
    type: String,
    trim: true,
    required: false
  },
  one_time_client_phone: {
    type: String,
    trim: true,
    required: false
  },
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: true
  },
  yogoch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonLot',
    required: false // Ba'zi hollarda yogoch bo'lmasligi mumkin
  },
  // VagonSale reference (qaysi sotuvdan yaratilgan)
  vagonSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonSale',
    required: false
  },
  // Sotish ma'lumotlari
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  paid_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  remaining_amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true
  },
  sold_quantity: {
    type: Number,
    required: false, // Ba'zi hollarda miqdor bo'lmasligi mumkin
    min: 0
  },
  sale_date: {
    type: Date,
    required: true
  },
  // Holat
  status: {
    type: String,
    enum: ['active', 'paid', 'overdue'],
    default: 'active'
  },
  // To'lovlar tarixi
  payment_history: [paymentHistorySchema],
  // Qo'shimcha ma'lumotlar
  notes: {
    type: String,
    trim: true
  },
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
debtSchema.index({ client: 1, status: 1 });
debtSchema.index({ vagon: 1 });
debtSchema.index({ yogoch: 1 });
debtSchema.index({ vagonSale: 1 });
debtSchema.index({ status: 1, sale_date: -1 });
debtSchema.index({ isDeleted: 1 });

// Virtual fields
debtSchema.virtual('is_overdue').get(function() {
  if (this.status !== 'active') return false;
  
  // 30 kundan ortiq bo'lsa muddati o'tgan deb hisoblanadi
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.sale_date < thirtyDaysAgo;
});

// Pre-save middleware
debtSchema.pre('save', function(next) {
  // Remaining amount ni hisoblash
  this.remaining_amount = this.total_amount - this.paid_amount;
  
  // Status ni yangilash
  if (this.remaining_amount <= 0) {
    this.status = 'paid';
  } else if (this.is_overdue) {
    this.status = 'overdue';
  } else {
    this.status = 'active';
  }
  
  next();
});

// Methods
debtSchema.methods.addPayment = function(amount, description, userId) {
  if (amount <= 0) {
    throw new Error('To\'lov summasi 0 dan katta bo\'lishi kerak');
  }
  
  if (amount > this.remaining_amount) {
    throw new Error('To\'lov summasi qolgan qarzdan katta bo\'lmasin');
  }
  
  this.payment_history.push({
    amount,
    date: new Date(),
    description,
    created_by: userId
  });
  
  this.paid_amount += amount;
  
  return this.save();
};

debtSchema.methods.toJSON = function() {
  const debt = this.toObject();
  debt.is_overdue = this.is_overdue;
  return debt;
};

// Static methods
debtSchema.statics.getActiveDebts = function() {
  return this.find({ 
    status: 'active', 
    isDeleted: false 
  }).populate('client vagon yogoch');
};

debtSchema.statics.getOverdueDebts = function() {
  return this.find({ 
    status: 'overdue', 
    isDeleted: false 
  }).populate('client vagon yogoch');
};

debtSchema.statics.getClientDebts = function(clientId) {
  return this.find({ 
    client: clientId, 
    isDeleted: false 
  }).populate('vagon yogoch');
};

module.exports = mongoose.model('Debt', debtSchema);