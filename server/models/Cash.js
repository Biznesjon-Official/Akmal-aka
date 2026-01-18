const mongoose = require('mongoose');

const cashSchema = new mongoose.Schema({
  // Tranzaksiya turi
  type: {
    type: String,
    enum: ['client_payment', 'expense', 'initial_balance', 'delivery_payment', 'delivery_expense'],
    required: [true, 'Tranzaksiya turi kiritilishi shart']
  },
  
  // Bog'lanishlar
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon'
  },
  vagonSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonSale'
  },
  expense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  },
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  
  // Pul ma'lumotlari
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
  
  // Qo'shimcha ma'lumotlar
  description: {
    type: String,
    trim: true
  },
  transaction_date: {
    type: Date,
    default: Date.now
  },
  
  // Kim qo'shdi
  createdBy: {
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

// Indexlar (tezroq qidirish uchun)
cashSchema.index({ type: 1 });
cashSchema.index({ client: 1 });
cashSchema.index({ vagon: 1 });
cashSchema.index({ transaction_date: -1 });
cashSchema.index({ isDeleted: 1 });

// Pre-save hook ni o'chirish - endi konvertatsiya yo'q
cashSchema.pre('save', function(next) {
  // Hech narsa qilmaymiz - to'g'ridan-to'g'ri USD yoki RUB
  next();
});

// Static method: Valyuta bo'yicha balans
cashSchema.statics.getBalanceByCurrency = async function() {
  const result = await this.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: { currency: '$currency', type: '$type' },
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  const balances = {};
  
  result.forEach(item => {
    const currency = item._id.currency;
    if (!balances[currency]) {
      balances[currency] = { income: 0, expense: 0, balance: 0 };
    }
    
    if (item._id.type === 'client_payment' || item._id.type === 'initial_balance' || item._id.type === 'delivery_payment') {
      balances[currency].income += item.total;
    } else if (item._id.type === 'expense' || item._id.type === 'delivery_expense') {
      balances[currency].expense += item.total;
    }
    
    balances[currency].balance = balances[currency].income - balances[currency].expense;
  });
  
  return balances;
};

module.exports = mongoose.model('Cash', cashSchema);
