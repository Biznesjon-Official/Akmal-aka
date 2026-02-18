const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  // Tartib raqam
  orderNumber: {
    type: Number,
    required: true,
    comment: 'Soni (tartib raqam)'
  },
  
  // Oy
  month: {
    type: String,
    required: true,
    match: /^\d{4}-(0[1-9]|1[0-2])$/,
    comment: 'YYYY-MM formatda'
  },
  
  // Kodlar
  codeUZ: {
    type: String,
    required: true,
    comment: 'Kod UZ'
  },
  
  codeKZ: {
    type: String,
    required: true,
    comment: 'KZ kod'
  },
  
  // Marshrutlar
  fromLocation: {
    type: String,
    required: true,
    comment: 'Jonatish joyi (from)'
  },
  
  toLocation: {
    type: String,
    required: true,
    comment: 'Kelish joyi (to)'
  },
  
  // Vaznlar
  tonnage: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Tonna (zayavkadagi vazn)'
  },
  
  actualWeight: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Fakticheskiy ves (real tortilgan vazn)'
  },
  
  roundedWeight: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Okruglonniy ves (hisob uchun yaxlitlangan vazn)'
  },
  
  // Sanalar
  orderDate: {
    type: Date,
    required: true,
    comment: 'Data zayavki (buyurtma sanasi)'
  },
  
  // Tomonlar
  sender: {
    type: String,
    required: true,
    comment: 'Yuboruvchi'
  },
  
  receiver: {
    type: String,
    required: true,
    comment: 'Qabul qiluvchi'
  },
  
  // Mijoz (YANGI)
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: false, // Ixtiyoriy, chunki ba'zi deliverylar mijozga bog'lanmasligi mumkin
    comment: 'Qaysi mijoz uchun delivery'
  },
  
  // Vagon malumotlari
  vagonNumber: {
    type: String,
    required: true,
    comment: 'Nomer vagon'
  },
  
  shipmentNumber: {
    type: String,
    required: true,
    comment: 'Nomer otpravka'
  },
  
  // Tariflar (USD)
  rateKZ: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Stavka KZ (1 tonna uchun)'
  },
  
  tariffKZ: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Tarif KZ = Okruglonniy ves × Stavka KZ'
  },
  
  rateUZ: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Stavka UZ (1 tonna uchun)'
  },
  
  tariffUZ: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Tarif UZ = Okruglonniy ves × Stavka UZ'
  },
  
  afghanTariff: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Avgon Tarif (Afgoniston tomondagi kelishilgan summa)'
  },
  
  totalTariff: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Obshiy tarif = Avgon Tarif + Tarif KZ + Tarif UZ'
  },
  
  // Tolovlar (USD)
  payment: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Tolov (hozirgacha tolangan summa)'
  },
  
  debt: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Dolg = Obshiy tarif − Tolov'
  },
  
  // Status
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid',
    comment: 'unpaid: tolangan yoq, partial: qisman tolangan, paid: tolig tolangan'
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date,
    default: null
  },
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Yaratuvchi va yangilovchi
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Hardcoded admin uchun optional
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Hardcoded admin uchun optional
  }
}, {
  timestamps: true
});

// Index'lar - tezroq qidirish uchun
deliverySchema.index({ month: 1, orderNumber: 1 });
deliverySchema.index({ isDeleted: 1 });
deliverySchema.index({ paymentStatus: 1 });
deliverySchema.index({ client: 1 }); // YANGI: Mijoz bo'yicha qidirish
deliverySchema.index({ month: 1, isDeleted: 1 }); // Compound index
deliverySchema.index({ month: 1, paymentStatus: 1, isDeleted: 1 }); // Compound index
deliverySchema.index({ client: 1, isDeleted: 1 }); // YANGI: Mijoz va deleted status

// Virtual field - to'liq to'langan yoki yo'qligini tekshirish
deliverySchema.virtual('isPaid').get(function() {
  return this.debt === 0;
});

module.exports = mongoose.model('Delivery', deliverySchema);
