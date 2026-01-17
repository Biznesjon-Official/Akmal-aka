const mongoose = require('mongoose');

const lossLiabilitySchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  loss_type: {
    type: String,
    enum: [
      'warehouse_loss',    // Ombor braki (VagonLot)
      'transport_loss',    // Transport yo'qotishi (VagonSale)
      'handling_loss',     // Yuklash/tushirish yo'qotishi
      'quality_loss'       // Sifat yo'qotishi
    ],
    required: true
  },
  
  // Bog'langan resurslar
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: true
  },
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonLot'
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonSale'
  },
  
  // Yo'qotish ma'lumotlari
  loss_volume_m3: {
    type: Number,
    required: true,
    min: 0.001,
    comment: 'Yo\'qotilgan hajm (m³)'
  },
  loss_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  loss_location: {
    type: String,
    required: true,
    comment: 'Yo\'qotish joyi (ombor, yo\'l, mijoz joyi)'
  },
  loss_reason: {
    type: String,
    required: true,
    comment: 'Yo\'qotish sababi'
  },
  
  // Javobgar shaxs
  responsible_person: {
    type: String,
    required: true,
    trim: true,
    comment: 'Javobgar shaxs (ism-familiya)'
  },
  responsible_position: {
    type: String,
    comment: 'Javobgar shaxs lavozimi'
  },
  responsible_phone: {
    type: String,
    comment: 'Javobgar shaxs telefoni'
  },
  
  // Moddiy javobgarlik
  estimated_loss_value: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Taxminiy zarar qiymati'
  },
  estimated_loss_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true
  },
  
  financial_liability: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Moddiy javobgarlik summasi'
  },
  liability_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    default: 'USD'
  },
  liability_percentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
    comment: 'Javobgarlik foizi (100% = to\'liq javobgarlik)'
  },
  
  // Holat va jarayon
  status: {
    type: String,
    enum: [
      'reported',        // Xabar berilgan
      'investigating',   // Tekshirilmoqda
      'acknowledged',    // Tan olingan
      'disputed',        // Bahsli
      'resolved',        // Hal qilingan
      'paid',           // To'langan
      'waived',         // Kechirilib yuborilgan
      'cancelled'       // Bekor qilingan
    ],
    default: 'reported'
  },
  
  // Tekshiruv ma'lumotlari
  investigation_notes: {
    type: String,
    comment: 'Tekshiruv natijalari'
  },
  investigated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  investigation_date: Date,
  
  // Hal qilish ma'lumotlari
  resolution_date: Date,
  resolution_method: {
    type: String,
    enum: [
      'full_payment',      // To'liq to'lov
      'partial_payment',   // Qisman to'lov
      'salary_deduction',  // Maoshdan ushlab qolish
      'insurance_claim',   // Sug'urta da'vosi
      'waived',           // Kechirilib yuborilgan
      'other'             // Boshqa usul
    ]
  },
  resolution_notes: {
    type: String,
    comment: 'Hal qilish haqida tafsilotlar'
  },
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // To'lov ma'lumotlari
  payment_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  payment_currency: {
    type: String,
    enum: ['USD', 'RUB']
  },
  payment_date: Date,
  payment_method: {
    type: String,
    enum: ['cash', 'bank_transfer', 'salary_deduction', 'other']
  },
  payment_reference: {
    type: String,
    comment: 'To\'lov ma\'lumotnomasi'
  },
  
  // Hujjatlar
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['photo', 'report', 'statement', 'receipt', 'other']
    },
    url: String,
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Yaratuvchi va yangilovchi
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
lossLiabilitySchema.index({ vagon: 1, loss_date: -1 });
lossLiabilitySchema.index({ responsible_person: 1, status: 1 });
lossLiabilitySchema.index({ status: 1, loss_date: -1 });
lossLiabilitySchema.index({ lot: 1 });
lossLiabilitySchema.index({ sale: 1 });

// Pre-save: Moddiy javobgarlik hisoblash
lossLiabilitySchema.pre('save', function(next) {
  // Agar financial_liability berilmagan bo'lsa, avtomatik hisoblash
  if (!this.financial_liability && this.estimated_loss_value && this.liability_percentage) {
    this.financial_liability = (this.estimated_loss_value * this.liability_percentage) / 100;
    this.liability_currency = this.estimated_loss_currency;
  }
  
  next();
});

// Static method: Javobgar shaxs bo'yicha statistika
lossLiabilitySchema.statics.getPersonLiabilityStats = async function(responsiblePerson) {
  const stats = await this.aggregate([
    {
      $match: {
        responsible_person: responsiblePerson,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total_loss_volume: { $sum: '$loss_volume_m3' },
        total_liability: { $sum: '$financial_liability' }
      }
    }
  ]);
  
  return stats;
};

// Static method: Vagon bo'yicha yo'qotishlar
lossLiabilitySchema.statics.getVagonLosses = async function(vagonId) {
  return this.find({
    vagon: vagonId,
    isDeleted: false
  })
    .populate('lot', 'dimensions volume_m3')
    .populate('sale', 'client_received_volume_m3')
    .populate('created_by', 'username')
    .sort({ loss_date: -1 });
};

// Instance method: Javobgarlikni tan olish
lossLiabilitySchema.methods.acknowledge = async function(acknowledgedBy, notes = '') {
  if (this.status !== 'reported' && this.status !== 'investigating') {
    throw new Error('Faqat xabar berilgan yoki tekshirilayotgan holatdagi javobgarlikni tan olish mumkin');
  }
  
  this.status = 'acknowledged';
  this.investigation_notes = notes;
  this.investigated_by = acknowledgedBy;
  this.investigation_date = new Date();
  this.updated_by = acknowledgedBy;
  
  await this.save();
  return this;
};

// Instance method: To'lov qilish
lossLiabilitySchema.methods.makePayment = async function(
  amount, 
  currency, 
  method, 
  reference = '', 
  paidBy
) {
  if (this.status !== 'acknowledged' && this.status !== 'resolved') {
    throw new Error('Faqat tan olingan javobgarlik uchun to\'lov qilish mumkin');
  }
  
  this.payment_amount += amount;
  this.payment_currency = currency;
  this.payment_method = method;
  this.payment_reference = reference;
  this.payment_date = new Date();
  this.updated_by = paidBy;
  
  // Agar to'liq to'langan bo'lsa
  if (this.payment_amount >= this.financial_liability) {
    this.status = 'paid';
    this.resolution_date = new Date();
    this.resolution_method = 'full_payment';
    this.resolved_by = paidBy;
  } else {
    this.status = 'resolved';
    this.resolution_method = 'partial_payment';
  }
  
  await this.save();
  return this;
};

// Instance method: Kechirish
lossLiabilitySchema.methods.waive = async function(waivedBy, reason = '') {
  this.status = 'waived';
  this.resolution_date = new Date();
  this.resolution_method = 'waived';
  this.resolution_notes = reason;
  this.resolved_by = waivedBy;
  this.updated_by = waivedBy;
  
  await this.save();
  return this;
};

// Virtual: To'lov foizi
lossLiabilitySchema.virtual('payment_percentage').get(function() {
  if (this.financial_liability === 0) return 0;
  return ((this.payment_amount / this.financial_liability) * 100).toFixed(2);
});

// Virtual: Qolgan qarz
lossLiabilitySchema.virtual('remaining_debt').get(function() {
  return Math.max(0, this.financial_liability - this.payment_amount);
});

module.exports = mongoose.model('LossLiability', lossLiabilitySchema);