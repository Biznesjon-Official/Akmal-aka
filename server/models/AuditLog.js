const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Harakat turi
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'restore', 'status_change'],
    required: true
  },
  
  // Qaysi model
  model: {
    type: String,
    enum: ['Wood', 'Purchase', 'Sale', 'Expense', 'Transport', 'Kassa', 'ExchangeRate', 'User'],
    required: true
  },
  
  // Document ID
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // O'zgarishlar
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  
  // Foydalanuvchi
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Qo'shimcha ma'lumotlar
  ipAddress: String,
  userAgent: String,
  description: String
}, {
  timestamps: true
});

// Index'lar - tez qidirish uchun
auditLogSchema.index({ model: 1, documentId: 1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
