const mongoose = require('mongoose');

const expenseAllocationSchema = new mongoose.Schema({
  // Asosiy bog'lanishlar
  expense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kassa', // Kassa yozuvi (xarajat)
    required: true
  },
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon',
    required: true
  },
  lot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonLot',
    required: true
  },
  
  // Taqsimlash ma'lumotlari
  allocation_method: {
    type: String,
    enum: [
      'volume_based',      // Hajm bo'yicha (eng keng tarqalgan)
      'value_based',       // Qiymat bo'yicha
      'equal_split',       // Teng taqsimlash
      'manual',            // Qo'lda belgilangan
      'weight_based'       // Og'irlik bo'yicha
    ],
    required: true,
    default: 'volume_based'
  },
  
  allocation_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    comment: 'Ushbu lotga taqsimlanadigan foiz'
  },
  
  allocation_amount: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Ushbu lotga taqsimlanadigan summa'
  },
  
  allocation_currency: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true,
    comment: 'Taqsimlangan summa valyutasi'
  },
  
  // Hisoblash asoslari
  lot_volume_m3: {
    type: Number,
    required: true,
    comment: 'Taqsimlash vaqtidagi lot hajmi'
  },
  total_vagon_volume_m3: {
    type: Number,
    required: true,
    comment: 'Taqsimlash vaqtidagi jami vagon hajmi'
  },
  
  lot_value: {
    type: Number,
    comment: 'Lot qiymati (value_based method uchun)'
  },
  total_vagon_value: {
    type: Number,
    comment: 'Jami vagon qiymati (value_based method uchun)'
  },
  
  // Qo'shimcha ma'lumotlar
  allocation_reason: {
    type: String,
    required: true,
    comment: 'Taqsimlash sababi'
  },
  notes: {
    type: String,
    trim: true
  },
  
  // Valyuta kursi (taqsimlash vaqtidagi)
  exchange_rate: {
    usd_to_rub: Number,
    rub_to_usd: Number,
    rate_date: Date,
    rate_source: String
  },
  
  // Yaratuvchi va tasdiqlovchi
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: Date,
  
  // Holat
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
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
expenseAllocationSchema.index({ expense: 1, lot: 1 });
expenseAllocationSchema.index({ vagon: 1, status: 1 });
expenseAllocationSchema.index({ lot: 1, status: 1 });
expenseAllocationSchema.index({ created_by: 1, createdAt: -1 });

// Unique constraint: bir xarajat bir lotga faqat bir marta taqsimlanishi mumkin
expenseAllocationSchema.index(
  { expense: 1, lot: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { isDeleted: false }
  }
);

// Pre-save: Validatsiya va avtomatik hisoblashlar
expenseAllocationSchema.pre('save', async function(next) {
  // 1. Allocation percentage va amount mos kelishini tekshirish
  if (this.isNew || this.isModified(['allocation_percentage', 'allocation_amount'])) {
    const Kassa = require('./Kassa');
    const expense = await Kassa.findById(this.expense);
    
    if (expense) {
      const expectedAmount = (expense.summa * this.allocation_percentage) / 100;
      const tolerance = 0.01; // 1 tiyin xatolikka ruxsat
      
      if (Math.abs(this.allocation_amount - expectedAmount) > tolerance) {
        return next(new Error('Taqsimlash summasi va foizi mos kelmaydi'));
      }
    }
  }
  
  // 2. Valyuta kursi (agar berilmagan bo'lsa, joriy kursni olish)
  if (!this.exchange_rate && this.isNew) {
    const ExchangeRateHistory = require('./ExchangeRateHistory');
    const currentRate = await ExchangeRateHistory.getCurrentRate();
    
    if (currentRate) {
      this.exchange_rate = {
        usd_to_rub: currentRate.usd_to_rub,
        rub_to_usd: currentRate.rub_to_usd,
        rate_date: currentRate.date,
        rate_source: currentRate.source
      };
    }
  }
  
  next();
});

// Static method: Xarajatni lotlarga taqsimlash
expenseAllocationSchema.statics.allocateExpenseToLots = async function(
  expenseId, 
  vagonId, 
  method = 'volume_based',
  createdBy,
  reason = 'Avtomatik taqsimlash'
) {
  const VagonLot = require('./VagonLot');
  const Kassa = require('./Kassa');
  
  // Xarajat va lotlarni olish
  const expense = await Kassa.findById(expenseId);
  const lots = await VagonLot.find({ vagon: vagonId, isDeleted: false });
  
  if (!expense || lots.length === 0) {
    throw new Error('Xarajat yoki lotlar topilmadi');
  }
  
  let allocations = [];
  
  switch (method) {
    case 'volume_based':
      allocations = await this.allocateByVolume(expense, lots, createdBy, reason);
      break;
    case 'value_based':
      allocations = await this.allocateByValue(expense, lots, createdBy, reason);
      break;
    case 'equal_split':
      allocations = await this.allocateEqually(expense, lots, createdBy, reason);
      break;
    default:
      throw new Error('Noto\'g\'ri taqsimlash usuli');
  }
  
  // Taqsimlashlarni saqlash
  const savedAllocations = await this.insertMany(allocations);
  
  // Lotlarning xarajatlarini yangilash
  await this.updateLotExpenses(lots.map(lot => lot._id));
  
  return savedAllocations;
};

// Hajm bo'yicha taqsimlash
expenseAllocationSchema.statics.allocateByVolume = async function(expense, lots, createdBy, reason) {
  const totalVolume = lots.reduce((sum, lot) => sum + lot.volume_m3, 0);
  
  return lots.map(lot => {
    const percentage = (lot.volume_m3 / totalVolume) * 100;
    const amount = (expense.summa * percentage) / 100;
    
    return {
      expense: expense._id,
      vagon: lot.vagon,
      lot: lot._id,
      allocation_method: 'volume_based',
      allocation_percentage: percentage,
      allocation_amount: amount,
      allocation_currency: expense.valyuta,
      lot_volume_m3: lot.volume_m3,
      total_vagon_volume_m3: totalVolume,
      allocation_reason: reason,
      created_by: createdBy,
      status: 'approved' // Avtomatik tasdiqlash
    };
  });
};

// Qiymat bo'yicha taqsimlash
expenseAllocationSchema.statics.allocateByValue = async function(expense, lots, createdBy, reason) {
  const totalValue = lots.reduce((sum, lot) => sum + lot.purchase_amount, 0);
  
  return lots.map(lot => {
    const percentage = (lot.purchase_amount / totalValue) * 100;
    const amount = (expense.summa * percentage) / 100;
    
    return {
      expense: expense._id,
      vagon: lot.vagon,
      lot: lot._id,
      allocation_method: 'value_based',
      allocation_percentage: percentage,
      allocation_amount: amount,
      allocation_currency: expense.valyuta,
      lot_volume_m3: lot.volume_m3,
      total_vagon_volume_m3: lots.reduce((sum, lot) => sum + lot.volume_m3, 0),
      lot_value: lot.purchase_amount,
      total_vagon_value: totalValue,
      allocation_reason: reason,
      created_by: createdBy,
      status: 'approved'
    };
  });
};

// Teng taqsimlash
expenseAllocationSchema.statics.allocateEqually = async function(expense, lots, createdBy, reason) {
  const percentage = 100 / lots.length;
  const amount = expense.summa / lots.length;
  
  return lots.map(lot => ({
    expense: expense._id,
    vagon: lot.vagon,
    lot: lot._id,
    allocation_method: 'equal_split',
    allocation_percentage: percentage,
    allocation_amount: amount,
    allocation_currency: expense.valyuta,
    lot_volume_m3: lot.volume_m3,
    total_vagon_volume_m3: lots.reduce((sum, lot) => sum + lot.volume_m3, 0),
    allocation_reason: reason,
    created_by: createdBy,
    status: 'approved'
  }));
};

// Lotlarning xarajatlarini yangilash
expenseAllocationSchema.statics.updateLotExpenses = async function(lotIds) {
  const VagonLot = require('./VagonLot');
  
  for (const lotId of lotIds) {
    const allocations = await this.find({ 
      lot: lotId, 
      status: 'approved', 
      isDeleted: false 
    });
    
    const totalAllocatedExpenses = allocations.reduce((sum, allocation) => {
      // Valyuta konvertatsiyasi (lot valyutasiga)
      const lot = allocation.lot;
      if (allocation.allocation_currency === lot.purchase_currency) {
        return sum + allocation.allocation_amount;
      } else {
        // Konvertatsiya kerak
        // Bu yerda ExchangeRateHistory.convertCurrency ishlatiladi
        return sum + allocation.allocation_amount; // Hozircha sodda
      }
    }, 0);
    
    await VagonLot.findByIdAndUpdate(lotId, {
      allocated_expenses: totalAllocatedExpenses,
      total_expenses: totalAllocatedExpenses // + purchase_amount (pre-save da hisoblanadi)
    });
  }
};

module.exports = mongoose.model('ExpenseAllocation', expenseAllocationSchema);