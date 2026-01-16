const mongoose = require('mongoose');

const kassaSchema = new mongoose.Schema({
  // Tranzaksiya turi
  turi: {
    type: String,
    enum: [
      'prixod',           // Kirim (sotuv, klient to'lovi)
      'rasxod',           // Chiqim (xarajatlar)
      'otpr',             // Jo'natma (Rossiyaga)
      'klent_prixod'      // Klientdan to'lov
    ],
    required: true
  },
  
  // Xarajat turi (faqat rasxod uchun)
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
    ]
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
  summaUZS: {
    type: Number,
    required: true // UZS da qiymati
  },
  
  // Tavsif
  tavsif: {
    type: String,
    required: true
  },
  
  // Bog'langan ma'lumotlar
  woodLot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wood'
  },
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase'
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },
  expense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  },
  
  // Qarz ma'lumotlari
  qarzBeruvchi: String, // kimga qarz berilgan
  qarzOluvchi: String,  // kimdan qarz olingan
  
  // Sana
  sana: {
    type: Date,
    default: Date.now
  },
  
  // Yaratuvchi
  yaratuvchi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
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

module.exports = mongoose.model('Kassa', kassaSchema);