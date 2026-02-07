const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import all models
const User = require('../models/User');
const Client = require('../models/Client');
const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');
const VagonSale = require('../models/VagonSale');
const VagonExpense = require('../models/VagonExpense');
const Cash = require('../models/Cash');
const Delivery = require('../models/Delivery');
const ExchangeRate = require('../models/ExchangeRate');
const AuditLog = require('../models/AuditLog');

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
    
    // Vagon Lotlar
    const deletedVagonLots = await VagonLot.deleteMany({});
    console.log(`   📦 Vagon Lotlar: ${deletedVagonLots.deletedCount} ta`);
    
    // Vagonlar
    const deletedVagons = await Vagon.deleteMany({});
    console.log(`   🚛 Vagonlar: ${deletedVagons.deletedCount} ta`);
    
    // Vagon sotuvlari
    const deletedVagonSales = await VagonSale.deleteMany({});
    console.log(`   💰 Vagon sotuvlari: ${deletedVagonSales.deletedCount} ta`);
    
    // Cash (yangi tizim)
    const deletedCash = await Cash.deleteMany({});
    console.log(`   💵 Cash: ${deletedCash.deletedCount} ta`);
    
    // Vagon xarajatlari
    const deletedVagonExpenses = await VagonExpense.deleteMany({});
    console.log(`   💸 Vagon xarajatlari: ${deletedVagonExpenses.deletedCount} ta`);
    
    // Olib kelib berish
    const deletedDeliveries = await Delivery.deleteMany({});
    console.log(`   🚚 Olib kelib berish: ${deletedDeliveries.deletedCount} ta`);
    
    // Audit Loglar (admindan tashqari)
    const deletedAuditLogs = await AuditLog.deleteMany({});
    console.log(`   📝 Audit Loglar: ${deletedAuditLogs.deletedCount} ta`);
    
    // Eski tizim ma'lumotlari (agar mavjud bo'lsa) - OLIB TASHLANDI
    console.log('\n🗑️ Eski tizim ma\'lumotlari tozalandi (modellar o\'chirilgan)');
    
    // 4. VALYUTA KURSLARINI SAQLASH (faqat oxirgi kursni)
    console.log('\n💱 VALYUTA KURSLARINI SAQLASH:');
    try {
      const latestRate = await ExchangeRate.findOne().sort({ date: -1 });
      if (latestRate) {
        await ExchangeRate.deleteMany({ _id: { $ne: latestRate._id } });
        console.log(`   ✅ Oxirgi valyuta kursi saqlandi: ${latestRate.usdToRub} RUB/USD`);
      }
    } catch (error) {
      console.log(`   ⚠️  Valyuta kurslari topilmadi`);
    }
    
    // 5. ADMIN USERLARNI YANGILASH (parollarni reset qilish)
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
    
    // 6. STATISTIKA
    console.log('\n📈 YAKUNIY STATISTIKA:');
    const remainingUsers = await User.countDocuments();
    const remainingClients = await Client.countDocuments();
    const remainingVagons = await Vagon.countDocuments();
    const remainingVagonLots = await VagonLot.countDocuments();
    const remainingCash = await Cash.countDocuments();
    const remainingVagonExpenses = await VagonExpense.countDocuments();
    const remainingExchangeRates = await ExchangeRate.countDocuments();
    
    console.log(`   👤 Qolgan userlar: ${remainingUsers} ta (faqat adminlar)`);
    console.log(`   👥 Qolgan mijozlar: ${remainingClients} ta`);
    console.log(`   🚛 Qolgan vagonlar: ${remainingVagons} ta`);
    console.log(`   📦 Qolgan vagon lotlar: ${remainingVagonLots} ta`);
    console.log(`   💵 Qolgan cash yozuvlari: ${remainingCash} ta`);
    console.log(`   💸 Qolgan vagon xarajatlari: ${remainingVagonExpenses} ta`);
    console.log(`   💱 Qolgan valyuta kurslari: ${remainingExchangeRates} ta`);
    
    console.log('\n✅ BARCHA MA\'LUMOTLAR MUVAFFAQIYATLI TOZALANDI!');
    console.log('🔑 Admin login ma\'lumotlari:');
    adminUsers.forEach(admin => {
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: admin123`);
      console.log(`   Email: ${admin.email}`);
      console.log('   ---');
    });
    
    console.log('\n💡 KEYINGI QADAMLAR:');
    console.log('   1. Tizimga admin sifatida kiring');
    console.log('   2. Yangi mijozlar qo\'shing');
    console.log('   3. Yangi vagonlar va lotlar yarating');
    console.log('   4. Sotuvlarni boshlang!');
    
  } catch (error) {
    console.error('❌ XATOLIK:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB ulanishi yopildi');
    process.exit(0);
  }
}

// Tasdiqlash
console.log('⚠️  DIQQAT: Bu script barcha ma\'lumotlarni o\'chiradi!');
console.log('⚠️  Faqat admin userlar va oxirgi valyuta kursi saqlanadi.');
console.log('⚠️  Bu amal qaytarib bo\'lmaydi!');
console.log('');
console.log('Davom etish uchun 5 sekund kuting...');

setTimeout(() => {
  cleanAllData();
}, 5000);