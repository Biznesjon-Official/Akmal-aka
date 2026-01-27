const mongoose = require('mongoose');
const { EXPENSE_TYPES } = require('../constants/expenseTypes');

const kassaSchema = new mongoose.Schema({
  // Tranzaksiya turi
  turi: {
    type: String,
    enum: [
      'prixod',           // Kirim (vagon sotuvi)
      'klent_prixod',     // Klientdan to'lov (qarz to'lovi)
      'rasxod'            // Chiqim (xarajatlar)
    ],
    required: true
  },
  
  // Xarajat turi (faqat rasxod uchun)
  xarajatTuri: {
    type: String,
    enum: EXPENSE_TYPES
  },
  
  // Summa va valyuta
  summa: {
    type: Number,
    required: true
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
  
  // Tavsif
  tavsif: {
    type: String,
    required: true
  },
  
  // Bog'langan ma'lumotlar
  vagonSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VagonSale'  // Vagon sotuvi
  },
  vagon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vagon'  // Vagon xarajatlari uchun
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client' // Mijoz to'lovi uchun
  },
  
  // To'lov usuli
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'other'],
    default: 'cash'
  },
  
  // Qo'shimcha ma'lumotlar (JSON string)
  qoshimchaMalumot: String,
  
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