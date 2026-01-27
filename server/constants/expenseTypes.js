// Xarajat turlari konstantalari
// Bu faylni barcha joylarda ishlatish orqali nomuvofiqlikni oldini olamiz

const EXPENSE_TYPES = [
  // Kategoriyalar (asosiy)
  'shaxsiy',             // Shaxsiy xarajatlar kategoriyasi
  'qarzdorlik',          // Qarzdorlik xarajatlari kategoriyasi
  'chiqim',              // Chiqim kategoriyasi
  
  // Chiqim ichidagi xarajat turlari
  'transport_kz',        // Transport KZ
  'transport_uz',        // Transport UZ
  'transport_kelish',    // Rossiya → O'zbekiston
  'bojxona_nds',         // Bojxona NDS
  'yuklash_tushirish',   // Yuklash/Tushirish
  'saqlanish',           // Ombor/Saqlanish
  'ishchilar'            // Ishchilar maoshi
];

const EXPENSE_TYPE_LABELS = {
  'transport_kz': 'Transport KZ',
  'transport_uz': 'Transport UZ',
  'transport_kelish': 'Transport kelish',
  'bojxona_nds': 'Bojxona NDS',
  'yuklash_tushirish': 'Yuklash/Tushirish',
  'saqlanish': 'Ombor/Saqlanish',
  'ishchilar': 'Ishchilar maoshi',
  'shaxsiy': 'Shaxsiy xarajatlar',
  'qarzdorlik': 'Qarzdorlik xarajatlari',
  'chiqim': 'Chiqim'
};

const EXPENSE_TYPE_DETAILS = [
  // KATEGORIYALAR (Asosiy tanlov)
  {
    id: 'shaxsiy',
    name: 'Shaxsiy xarajatlar',
    description: 'Biznesmen o\'zi uchun sarflagan pullar (tavsif yozing)',
    icon: 'dollar-sign',
    category: 'personal',
    isCategory: true
  },
  {
    id: 'qarzdorlik',
    name: 'Qarzdorlik xarajatlari',
    description: 'Mijozga qarz berish (mijoz tanlanadi)',
    icon: 'credit-card',
    category: 'debt',
    isCategory: true,
    requiresClient: true
  },
  {
    id: 'chiqim',
    name: 'Chiqim',
    description: 'Boshqa barcha xarajatlar (tavsif yozing)',
    icon: 'details',
    category: 'other',
    isCategory: true,
    hasSubTypes: true
  },
  
  // CHIQIM ICHIDAGI XARAJAT TURLARI
  {
    id: 'transport_kz',
    name: 'Transport KZ',
    description: 'Qozog\'iston orqali transport xarajatlari',
    icon: 'truck',
    parentCategory: 'chiqim'
  },
  {
    id: 'transport_uz',
    name: 'Transport UZ',
    description: 'O\'zbekiston ichidagi transport xarajatlari',
    icon: 'truck',
    parentCategory: 'chiqim'
  },
  {
    id: 'transport_kelish',
    name: 'Transport kelish',
    description: 'Rossiya → O\'zbekiston transport xarajatlari',
    icon: 'truck',
    parentCategory: 'chiqim'
  },
  {
    id: 'bojxona_nds',
    name: 'Bojxona NDS',
    description: 'Bojxona NDS to\'lovlari',
    icon: 'building',
    parentCategory: 'chiqim'
  },
  {
    id: 'yuklash_tushirish',
    name: 'Yuklash/Tushirish',
    description: 'Yog\'ochni yuklash va tushirish xizmatlari',
    icon: 'package',
    parentCategory: 'chiqim'
  },
  {
    id: 'saqlanish',
    name: 'Ombor/Saqlanish',
    description: 'Omborda saqlash xarajatlari',
    icon: 'building',
    parentCategory: 'chiqim'
  },
  {
    id: 'ishchilar',
    name: 'Ishchilar maoshi',
    description: 'Ishchilar maoshi va mehnat haqqi',
    icon: 'users',
    parentCategory: 'chiqim'
  }
];

module.exports = {
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  EXPENSE_TYPE_DETAILS
};
