const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('../models/User');
const Client = require('../models/Client');
const Vagon = require('../models/Vagon');
const VagonSale = require('../models/VagonSale');
const Cash = require('../models/Cash');
const Delivery = require('../models/Delivery');
const Wood = require('../models/Wood');
const Sale = require('../models/Sale');
const Kassa = require('../models/Kassa');

async function cleanAllData() {
  try {
    console.log('🧹 BARCHA MA\'LUMOTLARNI TOZALASH BOSHLANDI...');
    console.log('⚠️  DIQQAT: Bu amal qaytarib bo\'lmaydigan!');
    
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');
    
    // 1. ADMIN USERLARNI SAQLASH
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`👑 Admin userlar saqlanadi: ${adminUsers.length} ta`);
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.username} (${admin.email})`);
    });
    
    // 2. ADMIN DAN TASHQARI BARCHA USERLARNI O'CHIRISH
    const deletedUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`🗑️  O'chirilgan userlar: ${deletedUsers.deletedCount} ta`);
    
    // 3. BARCHA BIZNES MA'LUMOTLARINI O'CHIRISH
    console.log('\n📊 BIZNES MA\'LUMOTLARINI O\'CHIRISH:');
    
    // Mijozlar
    const deletedClients = await Client.deleteMany({});
    console.log(`   👥 Mijozlar: ${deletedClients.deletedCount} ta`);
    
    // Vagonlar
    const deletedVagons = await Vagon.deleteMany({});
    console.log(`   🚛 Vagonlar: ${deletedVagons.deletedCount} ta`);
    
    // Vagon sotuvlari
    const deletedVagonSales = await VagonSale.deleteMany({});
    console.log(`   💰 Vagon sotuvlari: ${deletedVagonSales.deletedCount} ta`);
    
    // Kassa (yangi tizim)
    const deletedCash = await Cash.deleteMany({});
    console.log(`   💵 Kassa (yangi): ${deletedCash.deletedCount} ta`);
    
    // Olib kelib berish
    const deletedDeliveries = await Delivery.deleteMany({});
    console.log(`   🚚 Olib kelib berish: ${deletedDeliveries.deletedCount} ta`);
    
    // Eski tizim ma'lumotlari (agar mavjud bo'lsa)
    try {
      const deletedWood = await Wood.deleteMany({});
      console.log(`   🌳 Yog'och (eski): ${deletedWood.deletedCount} ta`);
    } catch (error) {
      console.log(`   🌳 Yog'och modeli topilmadi (normal)`);
    }
    
    try {
      const deletedSales = await Sale.deleteMany({});
      console.log(`   🛒 Sotuvlar (eski): ${deletedSales.deletedCount} ta`);
    } catch (error) {
      console.log(`   🛒 Sale modeli topilmadi (normal)`);
    }
    
    try {
      const deletedKassa = await Kassa.deleteMany({});
      console.log(`   💰 Kassa (eski): ${deletedKassa.deletedCount} ta`);
    } catch (error) {
      console.log(`   💰 Kassa (eski) modeli topilmadi (normal)`);
    }
    
    // 4. ADMIN USERLARNI YANGILASH (parollarni reset qilish)
    console.log('\n👑 ADMIN USERLARNI YANGILASH:');
    for (const admin of adminUsers) {
      // Parolni "admin123" ga o'zgartirish
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await User.findByIdAndUpdate(admin._id, {
        password: hashedPassword,
        lastLogin: null,
        loginAttempts: 0,
        lockUntil: null
      });
      
      console.log(`   ✅ ${admin.username} paroli "admin123" ga o'zgartirildi`);
    }
    
    // 5. STATISTIKA
    console.log('\n📈 YAKUNIY STATISTIKA:');
    const remainingUsers = await User.countDocuments();
    const remainingClients = await Client.countDocuments();
    const remainingVagons = await Vagon.countDocuments();
    const remainingCash = await Cash.countDocuments();
    
    console.log(`   👤 Qolgan userlar: ${remainingUsers} ta (faqat adminlar)`);
    console.log(`   👥 Qolgan mijozlar: ${remainingClients} ta`);
    console.log(`   🚛 Qolgan vagonlar: ${remainingVagons} ta`);
    console.log(`   💵 Qolgan kassa yozuvlari: ${remainingCash} ta`);
    
    console.log('\n✅ BARCHA MA\'LUMOTLAR MUVAFFAQIYATLI TOZALANDI!');
    console.log('🔑 Admin login ma\'lumotlari:');
    adminUsers.forEach(admin => {
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: admin123`);
      console.log(`   Email: ${admin.email}`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('❌ XATOLIK:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB ulanishi yopildi');
    process.exit(0);
  }
}

// Tasdiqlash
console.log('⚠️  DIQQAT: Bu script barcha ma\'lumotlarni o\'chiradi!');
console.log('⚠️  Faqat admin userlar va ularning parollari saqlanadi.');
console.log('⚠️  Bu amal qaytarib bo\'lmaydi!');
console.log('');
console.log('Davom etish uchun 5 sekund kuting...');

setTimeout(() => {
  cleanAllData();
}, 5000);