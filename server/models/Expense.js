const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  turi: {
    type: String,
    enum: [
      'transport',        // Transport xarajatlari
      'bojxona',         // Bojxona to'lovlari
      'ishchilar',       // Ishchilar maoshi
      'ombor',           // Ombor/Saqlanish
      'yoqilgi',         // Yoqilg'i
      'tamir',           // Ta'mir-montaj
      'qadoqlash',       // Qadoqlash
      'boshqa'           // Boshqa xarajatlar
    ],
    required: true
  },
  
  // Transport turi (faqat transport uchun)
  transportTuri: {
    type: String,
    enum: [
      'yuk_tashish',     // Yuk tashish
      'yoqilgi',         // Yoqilg'i
      'yol_haqi',        // Yo'l haqi
      'haydovchi',       // Haydovchi maoshi
      'tamir'            // Transport ta'miri
    ]
  },
  
  // Bojxona turi (faqat bojxona uchun)
  bojxonaTuri: {
    type: String,
    enum: [
      'import_bojxona',  // Import bojxona to'lovi
      'export_bojxona',  // Export bojxona to'lovi
      'rasmiylashtirish', // Hujjatlar rasmiylashtirish
      'ekspertiza',      // Ekspertiza
      'sertifikat'       // Sertifikatlar
    ]
  },
  
  // Ishchilar turi (faqat ishchilar uchun)
  ishchilarTuri: {
    type: String,
    enum: [
      'yuklash',         // Yuklash
      'tushirish',       // Tushirish
      'saralash',        // Saralash
      'qadoqlash',       // Qadoqlash
      'nazorat',         // Nazorat/Tekshirish
      'boshqaruv'        // Boshqaruv
    ]
  },
  
  // Ombor turi (faqat ombor uchun)
  omborTuri: {
    type: String,
    enum: [
      'ijara',           // Ombor ijarasi
      'qoriqlash',       // Qo'riqlash
      'kommunal',        // Kommunal to'lovlar
      'tamir',           // Ombor ta'miri
      'jihozlar'         // Jihozlar/Asboblar
    ]
  },
  
  // Summa va valyuta
  summa: {
    type: Number,
    required: true,
    min: 0
  },
  valyuta: {
    type: String,
    enum: ['USD', 'RUB'],
    required: true
  },
  summaRUB: {
    type: Number,
    required: true // RUB da qiymati (asosiy valyuta)
  },
  summaUSD: {
    type: Number,
    default: 0 // USD da qiymati (agar kerak bo'lsa)
  },
  
  // Sanalar
  xarajatSanasi: {
    type: Date,
    required: true,
    default: Date.now
  },
  tolovSanasi: {
    type: Date // To'lov qachon amalga oshirilgan
  },
  
  // Tavsif
  tavsif: {
    type: String,
    required: true
  },
  qoshimchaMalumot: {
    type: String // Qo'shimcha tafsilotlar
  },
  
  // Bog'langan ma'lumotlar
  woodLot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wood'
  },
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon'
  },
  
  // To'lov holati
  tolovHolati: {
    type: String,
    enum: ['kutilmoqda', 'tolangan', 'qisman_tolangan', 'bekor_qilingan'],
    default: 'kutilmoqda'
  },
  
  // Hujjat ma'lumotlari
  hujjatRaqami: String,
  hujjatSanasi: Date,
  
  // Javobgar shaxs
  javobgarShaxs: {
    type: String,
    required: true
  },
  
  // Yaratuvchi
  yaratuvchi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Tasdiqlash
  tasdiqlangan: {
    type: Boolean,
    default: false
  },
  tasdiqlovchi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tasdiqSanasi: Date,
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
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

// Indexlar
expenseSchema.index({ turi: 1, xarajatSanasi: -1 });
expenseSchema.index({ valyuta: 1, summa: -1 });
expenseSchema.index({ tolovHolati: 1 });
expenseSchema.index({ yaratuvchi: 1 });
expenseSchema.index({ woodLot: 1 });
expenseSchema.index({ vagon: 1 });

// Virtual fields
expenseSchema.virtual('jami').get(function() {
  return this.summa;
});

// Methods
expenseSchema.methods.tolovQilish = function(tolovSanasi = new Date()) {
  this.tolovHolati = 'tolangan';
  this.tolovSanasi = tolovSanasi;
  return this.save();
};

expenseSchema.methods.tasdiqlash = function(tasdiqlovchi) {
  this.tasdiqlangan = true;
  this.tasdiqlovchi = tasdiqlovchi;
  this.tasdiqSanasi = new Date();
  return this.save();
};

// Static methods
expenseSchema.statics.getByType = function(turi, startDate, endDate) {
  const filter = { turi, isDeleted: false };
  if (startDate || endDate) {
    filter.xarajatSanasi = {};
    if (startDate) filter.xarajatSanasi.$gte = startDate;
    if (endDate) filter.xarajatSanasi.$lte = endDate;
  }
  return this.find(filter).sort({ xarajatSanasi: -1 });
};

expenseSchema.statics.getTotalByCurrency = function(valyuta, startDate, endDate) {
  const match = { valyuta, isDeleted: false };
  if (startDate || endDate) {
    match.xarajatSanasi = {};
    if (startDate) match.xarajatSanasi.$gte = startDate;
    if (endDate) match.xarajatSanasi.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalSumma: { $sum: '$summa' },
        totalSummaRUB: { $sum: '$summaRUB' },
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Expense', expenseSchema);