const mongoose = require('mongoose');

const vagonExpenseSchema = new mongoose.Schema({
  // Bog'lanishlar
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: [true, 'Vagon tanlanishi shart']
  },
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonLot',
    comment: 'Ixtiyoriy - agar lot ga tegishli bo\'lsa'
  },
  
  // Xarajat ma'lumotlari
  expense_type: {
    type: String,
    required: [true, 'Xarajat turi kiritilishi shart'],
    trim: true,
    comment: 'Masalan: Transport, Chegara, Ishchi, Bojxona'
  },
  currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: [true, 'Valyuta tanlanishi shart']
  },
  amount: {
    type: Number,
    required: [true, 'Summa kiritilishi shart'],
    min: [0.01, 'Summa 0 dan katta bo\'lishi kerak']
  },
  
  // Qo'shimcha
  description: {
    type: String,
    trim: true
  },
  expense_date: {
    type: Date,
    default: Date.now
  },
  
  // Kim qo'shdi
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Hardcoded admin uchun optional
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
vagonExpenseSchema.index({ vagon: 1 });
vagonExpenseSchema.index({ lot: 1 });
vagonExpenseSchema.index({ currency: 1 });
vagonExpenseSchema.index({ expense_date: -1 });
vagonExpenseSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('VagonExpense', vagonExpenseSchema);
