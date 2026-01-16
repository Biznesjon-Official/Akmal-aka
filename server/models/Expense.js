const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  // Bog'langan lot
  woodLot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wood',
    required: true
  },
  
  // Xarajat turi
  xarajatTuri: {
    type: String,
    enum: [
      'transport_kelish',    // Rossiya → O'zbekiston
      'transport_ketish',    // O'zbekiston → Rossiya
      'bojxona_kelish',      // Bojxona (kelish)
      'bojxona_ketish',      // Bojxona (ketish)
      'yuklash_tushirish',   // Yuklash/Tushirish
      'saqlanish',           // Ombor/Saqlanish
      'ishchilar',           // Ishchilar maoshi
      'qayta_ishlash',       // Qayta ishlash
      'boshqa'               // Boshqa xarajatlar
    ],
    required: true
  },
  
  // Summa va valyuta
  summa: {
    type: Number,
    required: true
  },
  valyuta: {
    type: String,
    enum: ['USD', 'RUB', 'UZS'],
    required: true
  },
  
  // Valyuta kursi (agar USD/RUB bo'lsa)
  valyutaKursi: {
    type: Number
  },
  
  // UZS da qiymati
  summaUZS: {
    type: Number,
    required: true
  },
  
  // Tavsif
  tavsif: {
    type: String,
    required: true
  },
  
  // Sana
  sana: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Qo'shimcha ma'lumotlar
  izoh: String,
  
  // Yaratuvchi
  yaratuvchi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deleteReason: String
}, {
  timestamps: true
});

// UZS summani avtomatik hisoblash
expenseSchema.pre('save', function(next) {
  if (this.valyuta === 'UZS') {
    this.summaUZS = this.summa;
  } else if (this.valyutaKursi) {
    this.summaUZS = this.summa * this.valyutaKursi;
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
