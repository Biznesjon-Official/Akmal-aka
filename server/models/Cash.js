const mongoose = require('mongoose');

const cashSchema = new mongoose.Schema({
  // Tranzaksiya turi
  type: {
    type: String,
    enum: ['client_payment', 'expense', 'initial_balance', 'delivery_payment', 'delivery_expense', 'debt_sale', 'debt_payment', 'vagon_sale'],
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
  yogoch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonLot'
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
    enum: ['USD', 'RUB', 'UZS'],
    required: [true, 'Valyuta tanlanishi shart']
  },
  amount: {
    type: Number,
    required: [true, 'Summa kiritilishi shart'],
    min: [0.01, 'Summa 0 dan katta bo\'lishi kerak']
  },
  
  // Xarajat turi (yog'och sotib olish uchun)
  expense_type: {
    type: String,
    enum: ['yogoch_sotib_olish', 'shaxsiy', 'qarzdorlik', 'firma_xarajatlari', 'chiqim', 'transport_kz', 'transport_uz', 'transport_kelish', 'bojxona_nds', 'yuklash_tushirish', 'saqlanish', 'ishchilar'],
    comment: 'Xarajat turi (expense type uchun)'
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
  
  // Bir martalik mijoz ma'lumotlari (yogoch tolovi uchun)
  one_time_client_name: {
    type: String,
    trim: true,
    comment: 'Bir martalik mijoz ismi'
  },
  one_time_client_phone: {
    type: String,
    trim: true,
    comment: 'Bir martalik mijoz telefoni'
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
cashSchema.index({ yogoch: 1 });
cashSchema.index({ transaction_date: -1 });
cashSchema.index({ isDeleted: 1 });

// Pre-save hook: Valyuta cheklovlari
cashSchema.pre('save', function(next) {
  // Yog'och sotib olish faqat RUB da
  if (this.expense_type === 'yogoch_sotib_olish' && this.currency !== 'RUB') {
    return next(new Error('Yog\'och sotib olish faqat RUB valyutasida amalga oshirilishi mumkin'));
  }
  
  // Boshqa barcha operatsiyalar faqat USD da (agar expense_type yo'q bo'lsa yoki boshqa tur bo'lsa)
  if (this.expense_type && this.expense_type !== 'yogoch_sotib_olish' && this.currency !== 'USD') {
    return next(new Error('Yog\'och sotib olishdan tashqari barcha operatsiyalar faqat USD valyutasida amalga oshirilishi mumkin'));
  }
  
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
    
    if (item._id.type === 'client_payment' || item._id.type === 'initial_balance' || item._id.type === 'delivery_payment' || item._id.type === 'debt_sale' || item._id.type === 'vagon_sale' || item._id.type === 'debt_payment') {
      balances[currency].income += item.total;
    } else if (item._id.type === 'expense' || item._id.type === 'delivery_expense') {
      balances[currency].expense += item.total;
    }
    
    balances[currency].balance = balances[currency].income - balances[currency].expense;
  });
  
  return balances;
};

module.exports = mongoose.model('Cash', cashSchema);
