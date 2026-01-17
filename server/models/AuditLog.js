const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Foydalanuvchi ma'lumotlari
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true // Foydalanuvchi o'chirilsa ham log saqlanadi
  },
  
  // Harakat ma'lumotlari
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT'],
    required: true
  },
  
  // Resurs ma'lumotlari
  resource_type: {
    type: String,
    enum: [
      'Vagon', 'VagonLot', 'VagonSale', 'Expense', 'Client', 
      'User', 'Kassa', 'ExchangeRate', 'AuditLog'
    ],
    required: true
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Ma'lumotlar o'zgarishi
  old_data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  new_data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Qo'shimcha ma'lumotlar
  description: {
    type: String,
    required: true
  },
  
  // Texnik ma'lumotlar
  ip_address: String,
  user_agent: String,
  session_id: String,
  
  // Vaqt
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Qo'shimcha kontekst
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: false // timestamp field'i bor
});

// Indexlar (tez qidirish uchun)
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// Static method: Log yaratish
auditLogSchema.statics.createLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Audit log yaratishda xatolik:', error);
    // Audit log xatosi asosiy jarayonni to'xtatmasligi kerak
  }
};

// Static method: Foydalanuvchi harakatlari
auditLogSchema.statics.getUserActivity = async function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username role');
};

// Static method: Resurs tarixi
auditLogSchema.statics.getResourceHistory = async function(resourceType, resourceId) {
  return this.find({ 
    resource_type: resourceType, 
    resource_id: resourceId 
  })
    .sort({ timestamp: -1 })
    .populate('user', 'username role');
};

// Virtual: O'zgarish tavsifi
auditLogSchema.virtual('change_summary').get(function() {
  if (this.action === 'CREATE') {
    return `Yangi ${this.resource_type} yaratildi`;
  } else if (this.action === 'UPDATE') {
    return `${this.resource_type} yangilandi`;
  } else if (this.action === 'DELETE') {
    return `${this.resource_type} o'chirildi`;
  }
  return `${this.resource_type} ko'rildi`;
});

module.exports = mongoose.model('AuditLog', auditLogSchema);