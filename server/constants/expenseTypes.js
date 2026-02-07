// Xarajat turlari konstantalari
// Bu faylni barcha joylarda ishlatish orqali nomuvofiqlikni oldini olamiz

const EXPENSE_TYPES = [
  // Kategoriyalar (asosiy)
  'shaxsiy',             // Shaxsiy xarajatlar kategoriyasi
  'qarzdorlik',          // Qarzdorlik xarajatlari kategoriyasi
  'firma_xarajatlari',   // Firma xarajatlari kategoriyasi
  'chiqim',              // Chiqim kategoriyasi
  'yogoch_sotib_olish',  // Yog'och sotib olish (faqat RUB)
  
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
  'firma_xarajatlari': 'Firma xarajatlari',
  'chiqim': 'Chiqim',
  'yogoch_sotib_olish': 'Yog\'och sotib olish'
};

const EXPENSE_TYPE_DETAILS = [
  // KATEGORIYALAR (Asosiy tanlov)
  {
    id: 'yogoch_sotib_olish',
    name: 'Yog\'och sotib olish',
    description: 'Yog\'och sotib olish xarajatlari (faqat RUB valyutasida)',
    icon: 'tree',
    category: 'wood_purchase',
    isCategory: true,
    currencyRestriction: 'RUB', // Faqat RUB
    priority: 1 // Eng yuqori prioritet
  },
  {
    id: 'shaxsiy',
    name: 'Shaxsiy xarajatlar',
    description: 'Biznesmen o\'zi uchun sarflagan pullar (tavsif yozing)',
    icon: 'user',
    category: 'personal',
    isCategory: true,
    priority: 2
  },
  {
    id: 'qarzdorlik',
    name: 'Qarzdorlik xarajatlari',
    description: 'Mijozga qarz berish (mijoz tanlanadi)',
    icon: 'credit-card',
    category: 'debt',
    isCategory: true,
    requiresClient: true,
    priority: 3
  },
  {
    id: 'firma_xarajatlari',
    name: 'Firma xarajatlari',
    description: 'Firma uchun umumiy xarajatlar (narx va tavsif)',
    icon: 'briefcase',
    category: 'company',
    isCategory: true,
    priority: 4
  },
  {
    id: 'chiqim',
    name: 'Chiqim',
    description: 'Boshqa barcha xarajatlar (tavsif yozing)',
    icon: 'clipboard',
    category: 'other',
    isCategory: true,
    hasSubTypes: true,
    priority: 5
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
    icon: 'customs',
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
