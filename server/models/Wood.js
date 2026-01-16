const mongoose = require('mongoose');

const woodSchema = new mongoose.Schema({
  // Lot ma'lumotlari
  lotCode: {
    type: String,
    required: true,
    unique: true
  },
  
  // Yog'och parametrlari
  qalinlik: {
    type: Number,
    required: true // mm
  },
  eni: {
    type: Number,
    required: true // mm
  },
  uzunlik: {
    type: Number,
    required: true // m
  },
  kubHajmi: {
    type: Number,
    required: true // m³
  },
  soni: {
    type: Number,
    required: true // dona
  },
  tonna: {
    type: Number,
    required: true // kg/t
  },
  
  // Yog'och zichligi
  yogochZichligi: {
    type: Number,
    default: 0.65 // t/m³
  },
  
  // Lot holati (lifecycle)
  status: {
    type: String,
    enum: [
      'xarid_qilindi',      // Rossiyada sotib olindi
      'transport_kelish',   // Rossiya → O'zbekiston yolda
      'omborda',            // O'zbekistonda omborda
      'qayta_ishlash',      // Qayta ishlanmoqda
      'transport_ketish',   // O'zbekiston → Rossiya yolda
      'sotildi',            // Rossiyada sotildi
      'bekor_qilindi'       // Bekor qilindi
    ],
    default: 'xarid_qilindi'
  },
  
  // Moliyaviy ma'lumotlar (avtomatik hisoblanadi)
  jami_xarid: {
    type: Number,
    default: 0 // Purchase'dan
  },
  jami_sotuv: {
    type: Number,
    default: 0 // Sale'dan
  },
  jami_xarajat: {
    type: Number,
    default: 0 // Expense'lardan
  },
  sof_foyda: {
    type: Number,
    default: 0 // sotuv - xarid - xarajat
  },
  foyda_foizi: {
    type: Number,
    default: 0 // (foyda / xarid) * 100
  },
  
  // Valyuta kurslari (tarixiy)
  xarid_kursi: Number,  // Xarid paytidagi kurs
  sotuv_kursi: Number,  // Sotuv paytidagi kurs
  
  // Qo'shimcha ma'lumotlar
  izoh: String,
  
  // Yaratuvchi
  yaratuvchi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
// woodSchema.pre(/^find/, function(next) {
//   if (!this.getOptions().includeDeleted) {
//     this.where({ isDeleted: false });
//   }
//   next();
// });

// Virtual fields - bog'langan ma'lumotlar
woodSchema.virtual('purchase', {
  ref: 'Purchase',
  localField: '_id',
  foreignField: 'woodLot',
  justOne: true
});

woodSchema.virtual('sale', {
  ref: 'Sale',
  localField: '_id',
  foreignField: 'woodLot',
  justOne: true
});

woodSchema.virtual('expenses', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'woodLot'
});

// ToJSON da virtual fieldlarni ko'rsatish
woodSchema.set('toJSON', { virtuals: true });
woodSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Wood', woodSchema);