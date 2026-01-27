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
  
  // Holat (YANGI MEXANIZM)
  status: {
    type: String,
    enum: ['active', 'closing', 'closed', 'archived'],
    default: 'active',
    comment: 'active: faol, closing: yopilmoqda, closed: yopilgan, archived: arxivlangan'
  },
  
  // Yopilish qoidalari
  closure_rules: {
    auto_close_when_sold_percentage: {
      type: Number,
      default: 95,
      min: 0,
      max: 100,
      comment: 'Necha foiz sotilganda avtomatik yopilsin'
    },
    manual_closure_allowed: {
      type: Boolean,
      default: true,
      comment: 'Qo\'lda yopish mumkinmi'
    },
    min_remaining_volume_for_closure: {
      type: Number,
      default: 0.1,
      comment: 'Yopish uchun minimal qolgan hajm (m³)'
    }
  },
  
  // Yopilish ma'lumotlari
  closure_date: {
    type: Date,
    comment: 'Yopilgan sana'
  },
  closure_reason: {
    type: String,
    enum: [
      'fully_sold',           // To\'liq sotilgan
      'remaining_too_small',  // Qolgan hajm juda kichik
      'quality_issues',       // Sifat muammolari
      'manual_closure',       // Qo\'lda yopilgan
      'business_decision'     // Biznes qaror
    ],
    comment: 'Yopilish sababi'
  },
  closed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: 'Kim yopgan'
  },
  closure_notes: {
    type: String,
    comment: 'Yopilish haqida qo\'shimcha ma\'lumot'
  },
  
  // Qo'shimcha ma'lumotlar
  notes: {
    type: String
  },
  
  // YANGI: Hajm tuzatishlari tarixi
  volume_adjustments: [{
    type: {
      type: String,
      enum: ['loss', 'correction'],
      required: true,
      comment: 'loss: brak/yo\'qotish, correction: tuzatish'
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Tuzatish miqdori (m³)'
    },
    reason: {
      type: String,
      required: true,
      comment: 'Tuzatish sababi'
    },
    responsible_person: {
      type: String,
      comment: 'Javobgar shaxs'
    },
    notes: {
      type: String,
      comment: 'Qo\'shimcha izoh'
    },
    adjusted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      comment: 'Kim tuzatgan'
    },
    adjusted_at: {
      type: Date,
      default: Date.now,
      comment: 'Tuzatilgan sana'
    },
    // Tuzatishdan oldingi qiymatlar
    before_total_volume: {
      type: Number,
      comment: 'Tuzatishdan oldingi jami hajm'
    },
    before_available_volume: {
      type: Number,
      comment: 'Tuzatishdan oldingi mavjud hajm'
    },
    before_remaining_volume: {
      type: Number,
      comment: 'Tuzatishdan oldingi qolgan hajm'
    },
    // Tuzatishdan keyingi qiymatlar
    after_total_volume: {
      type: Number,
      comment: 'Tuzatishdan keyingi jami hajm'
    },
    after_available_volume: {
      type: Number,
      comment: 'Tuzatishdan keyingi mavjud hajm'
    },
    after_remaining_volume: {
      type: Number,
      comment: 'Tuzatishdan keyingi qolgan hajm'
    }
  }],
  
  // Vagon xarajatlari (Chiqim kategoriyasidan)
  expenses: {
    USD: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'USD da jami xarajatlar'
    },
    RUB: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'RUB da jami xarajatlar'
    },
    details: [{
      expenseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Kassa'
      },
      xarajatTuri: String,
      summa: Number,
      valyuta: String,
      tavsif: String,
      sana: Date,
      javobgarShaxs: String
    }]
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
// vagonCode indexi unique: true orqali yaratilgan
vagonSchema.index({ month: 1 });
vagonSchema.index({ status: 1 });
vagonSchema.index({ isDeleted: 1 });
vagonSchema.index({ createdAt: -1 }); // Yangi qo'shildi - sana bo'yicha saralash uchun
vagonSchema.index({ sending_place: 1 }); // Yangi qo'shildi - qidiruv uchun
vagonSchema.index({ receiving_place: 1 }); // Yangi qo'shildi - qidiruv uchun
// Compound index - ko'p ishlatiladigan filtrlar uchun
vagonSchema.index({ status: 1, month: 1, createdAt: -1 });

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
  if (this.status === 'closed' || this.status === 'archived') {
    return { canClose: false, reason: 'Vagon allaqachon yopilgan' };
  }
  
  const soldPercentage = this.total_volume_m3 > 0 ? 
    (this.sold_volume_m3 / this.total_volume_m3) * 100 : 0;
  
  // Avtomatik yopilish shartlari
  if (soldPercentage >= this.closure_rules.auto_close_when_sold_percentage) {
    return { canClose: true, reason: 'auto_close_percentage', soldPercentage };
  }
  
  if (this.remaining_volume_m3 <= this.closure_rules.min_remaining_volume_for_closure) {
    return { canClose: true, reason: 'min_remaining_volume', remainingVolume: this.remaining_volume_m3 };
  }
  
  // Qo'lda yopish
  if (this.closure_rules.manual_closure_allowed) {
    return { canClose: true, reason: 'manual_allowed' };
  }
  
  return { canClose: false, reason: 'conditions_not_met', soldPercentage, remainingVolume: this.remaining_volume_m3 };
};

// Instance method: Vagonni yopish
vagonSchema.methods.closeVagon = async function(closedBy, reason, notes = '') {
  const canCloseResult = this.canClose();
  
  if (!canCloseResult.canClose && reason !== 'business_decision') {
    throw new Error(`Vagonni yopib bo'lmaydi: ${canCloseResult.reason}`);
  }
  
  this.status = 'closed';
  this.closure_date = new Date();
  this.closure_reason = reason;
  this.closed_by = closedBy;
  this.closure_notes = notes;
  
  await this.save();
  
  // Audit log
  const AuditLog = require('./AuditLog');
  await AuditLog.createLog({
    user: closedBy,
    username: 'System', // Bu yerda username kerak
    action: 'UPDATE',
    resource_type: 'Vagon',
    resource_id: this._id,
    description: `Vagon yopildi: ${reason}`,
    context: {
      closure_reason: reason,
      closure_notes: notes,
      sold_percentage: canCloseResult.soldPercentage,
      remaining_volume: canCloseResult.remainingVolume
    }
  });
  
  return this;
};

// Instance method: Vagonni qayta ochish
vagonSchema.methods.reopenVagon = async function(reopenedBy, reason = '') {
  if (this.status !== 'closed') {
    throw new Error('Faqat yopilgan vagonlarni qayta ochish mumkin');
  }
  
  this.status = 'active';
  this.closure_date = null;
  this.closure_reason = null;
  this.closed_by = null;
  this.closure_notes = null;
  
  await this.save();
  
  // Audit log
  const AuditLog = require('./AuditLog');
  await AuditLog.createLog({
    user: reopenedBy,
    username: 'System',
    action: 'UPDATE',
    resource_type: 'Vagon',
    resource_id: this._id,
    description: `Vagon qayta ochildi: ${reason}`,
    context: { reopen_reason: reason }
  });
  
  return this;
};

module.exports = mongoose.model('Vagon', vagonSchema);
