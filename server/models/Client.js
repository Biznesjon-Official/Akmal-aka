const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  name: {
    type: String,
    required: [true, 'Mijoz nomi kiritilishi shart'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Telefon raqami kiritilishi shart'],
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // Statistika (avtomatik hisoblanadi)
  total_received_volume: {
    type: Number,
    default: 0,
    min: 0
  },
  total_debt: {
    type: Number,
    default: 0
  },
  total_paid: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Qo'shimcha
  notes: {
    type: String
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index qo'shish (tezroq qidirish uchun)
clientSchema.index({ name: 1 });
clientSchema.index({ phone: 1 });
clientSchema.index({ isDeleted: 1 });

// Virtual field - haqiqiy qarz (to'lanmagan)
clientSchema.virtual('current_debt').get(function() {
  return this.total_debt - this.total_paid;
});

// JSON ga o'tkazganda virtual fieldlarni ko'rsatish
clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Client', clientSchema);
