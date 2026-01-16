const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  // Bog'langan lot
  woodLot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wood',
    required: true
  },
  
  // Xarid narxi
  birlikNarxi: {
    type: Number,
    required: true // Narx/m³
  },
  valyuta: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true
  },
  jamiSumma: {
    type: Number,
    required: true // Umumiy xarid summasi
  },
  
  // Sotuvchi ma'lumotlari
  sotuvchi: {
    type: String,
    required: true // Kompaniya/shaxs nomi
  },
  sotuvchiTelefon: String,
  sotuvchiManzil: String,
  
  // Xarid joyi
  xaridJoyi: {
    type: String,
    required: true // Shahar/viloyat
  },
  xaridMamlakati: {
    type: String,
    default: 'Rossiya'
  },
  
  // Sana va shartnoma
  xaridSanasi: {
    type: Date,
    required: true
  },
  shartnoma: String, // Shartnoma raqami
  
  // Valyuta kursi (o'sha kundagi)
  valyutaKursi: {
    type: Number,
    required: true // 1 USD/RUB = ? UZS
  },
  
  // UZS da qiymati
  jamiUZS: {
    type: Number,
    required: true // jamiSumma * valyutaKursi
  },
  
  // To'lov holati
  tolovHolati: {
    type: String,
    enum: ['to\'langan', 'qarz', 'qisman'],
    default: 'to\'langan'
  },
  tolangan: {
    type: Number,
    default: 0
  },
  qarz: {
    type: Number,
    default: 0
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

// Query middleware - vaqtincha o'chirildi (migration kerak)
// purchaseSchema.pre(/^find/, function(next) {
//   if (!this.getOptions().includeDeleted) {
//     this.where({ isDeleted: false });
//   }
//   next();
// });

// Jami UZS ni avtomatik hisoblash
purchaseSchema.pre('save', function(next) {
  this.jamiUZS = this.jamiSumma * this.valyutaKursi;
  
  // Qarzni hisoblash
  if (this.tolovHolati === 'qisman') {
    this.qarz = this.jamiSumma - this.tolangan;
  } else if (this.tolovHolati === 'qarz') {
    this.qarz = this.jamiSumma;
    this.tolangan = 0;
  } else {
    this.tolangan = this.jamiSumma;
    this.qarz = 0;
  }
  
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
