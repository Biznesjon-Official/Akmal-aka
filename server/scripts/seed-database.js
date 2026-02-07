const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
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
const ExchangeRateHistory = require('../models/ExchangeRateHistory');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const ExpenseAllocation = require('../models/ExpenseAllocation');
const LossLiability = require('../models/LossLiability');
const StorageExpense = require('../models/StorageExpense');

async function seedDatabase() {
  try {
    console.log('🌱 DATABASE SEED BOSHLANDI...');
    console.log('⚠️  DIQQAT: Bu amal barcha ma\'lumotlarni o\'chiradi va yangi ma\'lumotlar bilan to\'ldiradi!');
    
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');
    
    // 1. BARCHA MA'LUMOTLARNI O'CHIRISH (ADMIN USERLARNI HAM)
    console.log('\n🧹 BARCHA MA\'LUMOTLARNI TOZALASH:');
    
    // Admin userlarni saqlash
    const adminUsers = await User.find({ role: 'admin' }).lean();
    console.log(`   👑 Topilgan admin userlar: ${adminUsers.length} ta`);
    
    // Biznes ma'lumotlari
    const deletedClients = await Client.deleteMany({});
    console.log(`   👥 Mijozlar: ${deletedClients.deletedCount} ta o'chirildi`);
    
    const deletedVagonSales = await VagonSale.deleteMany({});
    console.log(`   💰 Vagon sotuvlari: ${deletedVagonSales.deletedCount} ta o'chirildi`);
    
    const deletedVagonLots = await VagonLot.deleteMany({});
    console.log(`   📦 Vagon lotlar: ${deletedVagonLots.deletedCount} ta o'chirildi`);
    
    const deletedVagons = await Vagon.deleteMany({});
    console.log(`   🚛 Vagonlar: ${deletedVagons.deletedCount} ta o'chirildi`);
    
    const deletedVagonExpenses = await VagonExpense.deleteMany({});
    console.log(`   💸 Vagon xarajatlari: ${deletedVagonExpenses.deletedCount} ta o'chirildi`);
    
    const deletedCash = await Cash.deleteMany({});
    console.log(`   💵 Cash yozuvlari: ${deletedCash.deletedCount} ta o'chirildi`);
    
    const deletedDeliveries = await Delivery.deleteMany({});
    console.log(`   🚚 Yetkazib berish: ${deletedDeliveries.deletedCount} ta o'chirildi`);
    
    // BARCHA USERLARNI O'CHIRISH (admin ham)
    const deletedUsers = await User.deleteMany({});
    console.log(`   👤 Barcha userlar: ${deletedUsers.deletedCount} ta o'chirildi`);
    
    const deletedAuditLogs = await AuditLog.deleteMany({});
    console.log(`   📝 Audit loglar: ${deletedAuditLogs.deletedCount} ta o'chirildi`);
    
    // Qo'shimcha modellar
    try {
      const deletedExpenseAllocations = await ExpenseAllocation.deleteMany({});
      console.log(`   📊 Xarajat taqsimoti: ${deletedExpenseAllocations.deletedCount} ta o'chirildi`);
    } catch (e) { /* Model mavjud emas */ }
    
    try {
      const deletedLossLiabilities = await LossLiability.deleteMany({});
      console.log(`   ⚠️  Yo'qotish javobgarligi: ${deletedLossLiabilities.deletedCount} ta o'chirildi`);
    } catch (e) { /* Model mavjud emas */ }
    
    try {
      const deletedStorageExpenses = await StorageExpense.deleteMany({});
      console.log(`   🏪 Saqlash xarajatlari: ${deletedStorageExpenses.deletedCount} ta o'chirildi`);
    } catch (e) { /* Model mavjud emas */ }
    
    // 2. ADMIN USERLARNI QAYTA YARATISH
    console.log('\n👑 ADMIN USERLARNI QAYTA YARATISH:');
    
    if (adminUsers.length === 0) {
      // Agar admin yo'q bo'lsa, default admin yaratish
      console.log('   ⚠️  Admin topilmadi, default admin yaratilmoqda...');
      const defaultAdmin = new User({
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      await defaultAdmin.save();
      console.log('   ✅ Default admin yaratildi: admin / admin123');
    } else {
      // Mavjud adminlarni qayta yaratish (yangi ID bilan)
      for (const adminData of adminUsers) {
        const newAdmin = new User({
          username: adminData.username,
          password: 'admin123', // Reset password
          role: adminData.role,
          isActive: adminData.isActive || true
        });
        await newAdmin.save();
        console.log(`   ✅ ${adminData.username} qayta yaratildi, parol: admin123`);
      }
    }
    
    // 3. VALYUTA KURSLARINI TIKLASH
    console.log('\n💱 VALYUTA KURSLARINI TIKLASH:');
    
    // Eski kurslarni o'chirish
    await ExchangeRate.deleteMany({});
    try {
      await ExchangeRateHistory.deleteMany({});
    } catch (e) { /* Model mavjud emas */ }
    
    // Admin user ID olish (valyuta kursi uchun)
    const firstAdmin = await User.findOne({ role: 'admin' });
    
    // Yangi kurslar yaratish
    const usdRate = new ExchangeRate({
      currency: 'USD',
      rate: 95.50, // 1 USD = 95.50 RUB
      source: 'manual',
      updatedBy: firstAdmin ? firstAdmin._id : null,
      isRealTime: false
    });
    
    const rubRate = new ExchangeRate({
      currency: 'RUB', 
      rate: 1 / 95.50, // 1 RUB = 0.0105 USD
      source: 'manual',
      updatedBy: firstAdmin ? firstAdmin._id : null,
      isRealTime: false
    });
    
    await usdRate.save();
    await rubRate.save();
    console.log('   ✅ Joriy valyuta kurslari o\'rnatildi:');
    console.log('   ✅ USD: 1 USD = 95.50 RUB');
    console.log('   ✅ RUB: 1 RUB = 0.0105 USD');
    
    // 4. TIZIM SOZLAMALARINI TIKLASH
    console.log('\n⚙️  TIZIM SOZLAMALARINI TIKLASH:');
    
    try {
      await SystemSettings.deleteMany({});
      
      const defaultSettings = [
        {
          setting_key: 'default_currency',
          setting_value: 'USD',
          description: 'Tizimning asosiy valyutasi'
        },
        {
          setting_key: 'exchange_rate_auto_update',
          setting_value: 'true',
          description: 'Valyuta kursini avtomatik yangilash'
        },
        {
          setting_key: 'business_name',
          setting_value: 'Akmalaka Export-Import',
          description: 'Biznes nomi'
        },
        {
          setting_key: 'pagination_limit',
          setting_value: '20',
          description: 'Sahifalash limiti'
        }
      ];
      
      await SystemSettings.insertMany(defaultSettings);
      console.log(`   ✅ ${defaultSettings.length} ta tizim sozlamasi yaratildi`);
    } catch (e) {
      console.log('   ⚠️  SystemSettings modeli mavjud emas');
    }
    
    // 5. DEMO MA'LUMOTLAR YARATISH (IXTIYORIY)
    console.log('\n🎭 DEMO MA\'LUMOTLAR YARATISH:');
    
    const createDemo = process.argv.includes('--demo') || process.argv.includes('-d');
    
    if (createDemo) {
      console.log('   📝 Demo ma\'lumotlar yaratilmoqda...');
      
      // Demo mijozlar
      const demoClients = [
        {
          name: 'Test Mijoz 1',
          phone: '+998901234567',
          address: 'Toshkent, Chilonzor tumani',
          usd_total_debt: 0,
          usd_total_paid: 0,
          rub_total_debt: 0,
          rub_total_paid: 0,
          delivery_total_debt: 0,
          delivery_total_paid: 0
        },
        {
          name: 'Test Mijoz 2',
          phone: '+998907654321',
          address: 'Samarqand, Registon ko\'chasi',
          usd_total_debt: 0,
          usd_total_paid: 0,
          rub_total_debt: 0,
          rub_total_paid: 0,
          delivery_total_debt: 0,
          delivery_total_paid: 0
        }
      ];
      
      const createdClients = await Client.insertMany(demoClients);
      console.log(`   👥 ${createdClients.length} ta demo mijoz yaratildi`);
      
      // Demo vagon
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const monthStr = `${String(currentMonth).padStart(2, '0')}/${currentYear}`;
      
      const demoVagon = new Vagon({
        vagonCode: `VAG-${currentYear}-001`,
        month: monthStr,
        sending_place: 'Moskva',
        receiving_place: 'Toshkent',
        status: 'active',
        total_volume_m3: 0,
        total_loss_m3: 0,
        available_volume_m3: 0,
        sold_volume_m3: 0,
        remaining_volume_m3: 0,
        usd_total_cost: 0,
        usd_total_revenue: 0,
        usd_profit: 0,
        rub_total_cost: 0,
        rub_total_revenue: 0,
        rub_profit: 0
      });
      
      await demoVagon.save();
      console.log(`   🚛 Demo vagon yaratildi: ${demoVagon.vagonCode}`);
      
      // Demo lot
      const demoLot = new VagonLot({
        vagon: demoVagon._id,
        dimensions: '31×125×6000',
        quantity: 100,
        volume_m3: 23.25, // 31*125*6000*100/1000000
        loss_volume_m3: 0,
        warehouse_available_volume_m3: 23.25,
        warehouse_dispatched_volume_m3: 0,
        warehouse_remaining_volume_m3: 23.25,
        purchase_currency: 'USD',
        purchase_amount: 5000,
        total_investment: 5000,
        realized_profit: 0,
        unrealized_value: 5000,
        break_even_price_per_m3: 215.05, // 5000/23.25
        remaining_quantity: 100,
        remaining_volume_m3: 23.25
      });
      
      await demoLot.save();
      console.log(`   📦 Demo lot yaratildi: ${demoLot.dimensions} × ${demoLot.quantity}`);
      
      // Vagon ma'lumotlarini yangilash
      await demoVagon.updateOne({
        total_volume_m3: 23.25,
        available_volume_m3: 23.25,
        remaining_volume_m3: 23.25,
        usd_total_cost: 5000
      });
      
      console.log('   ✅ Demo ma\'lumotlar yaratildi');
    } else {
      console.log('   ⏭️  Demo ma\'lumotlar o\'tkazib yuborildi (--demo flag ishlatilmagan)');
    }
    
    // 6. YAKUNIY STATISTIKA
    console.log('\n📈 YAKUNIY STATISTIKA:');
    const finalUsers = await User.countDocuments();
    const finalClients = await Client.countDocuments();
    const finalVagons = await Vagon.countDocuments();
    const finalVagonLots = await VagonLot.countDocuments();
    const finalCash = await Cash.countDocuments();
    const finalExchangeRates = await ExchangeRate.countDocuments();
    
    console.log(`   👤 Userlar: ${finalUsers} ta`);
    console.log(`   👥 Mijozlar: ${finalClients} ta`);
    console.log(`   🚛 Vagonlar: ${finalVagons} ta`);
    console.log(`   📦 Vagon lotlar: ${finalVagonLots} ta`);
    console.log(`   💵 Cash yozuvlari: ${finalCash} ta`);
    console.log(`   💱 Valyuta kurslari: ${finalExchangeRates} ta`);
    
    // 7. LOGIN MA'LUMOTLARI
    console.log('\n🔑 LOGIN MA\'LUMOTLARI:');
    const allAdmins = await User.find({ role: 'admin' });
    allAdmins.forEach(admin => {
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: admin123`);
      console.log(`   Role: ${admin.role}`);
      console.log('   ---');
    });
    
    console.log('\n✅ DATABASE SEED MUVAFFAQIYATLI TUGALLANDI!');
    console.log('\n💡 KEYINGI QADAMLAR:');
    console.log('   1. Tizimga admin sifatida kiring');
    console.log('   2. Parolni o\'zgartiring (tavsiya etiladi)');
    console.log('   3. Yangi mijozlar va vagonlar qo\'shing');
    console.log('   4. Tizimni ishlatishni boshlang!');
    
    if (createDemo) {
      console.log('\n🎭 DEMO MA\'LUMOTLAR:');
      console.log('   - 2 ta demo mijoz yaratildi');
      console.log('   - 1 ta demo vagon yaratildi');
      console.log('   - 1 ta demo lot yaratildi');
      console.log('   - Demo ma\'lumotlarni o\'chirib, haqiqiy ma\'lumotlar bilan almashtiring');
    }
    
  } catch (error) {
    console.error('❌ XATOLIK:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB ulanishi yopildi');
    process.exit(0);
  }
}

// Argumentlarni tekshirish
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log('🌱 DATABASE SEED SCRIPT');
  console.log('');
  console.log('Bu script ma\'lumotlar bazasini to\'liq tozalab, yangi ma\'lumotlar bilan to\'ldiradi.');
  console.log('');
  console.log('Foydalanish:');
  console.log('  node seed-database.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --demo, -d     Demo ma\'lumotlar yaratish');
  console.log('  --help, -h     Yordam ko\'rsatish');
  console.log('');
  console.log('Misollar:');
  console.log('  node seed-database.js           # Faqat tozalash va admin tiklash');
  console.log('  node seed-database.js --demo    # Demo ma\'lumotlar bilan');
  console.log('');
  console.log('⚠️  DIQQAT: Bu amal qaytarib bo\'lmaydi!');
  process.exit(0);
}

// Tasdiqlash
console.log('🌱 DATABASE SEED SCRIPT');
console.log('⚠️  DIQQAT: Bu script BARCHA ma\'lumotlarni o\'chiradi (admin userlar ham)!');
console.log('⚠️  Admin userlar qayta yaratiladi va parollari "admin123" ga o\'zgartiriladi.');
console.log('⚠️  Bu amal qaytarib bo\'lmaydi!');
console.log('');

if (args.includes('--demo') || args.includes('-d')) {
  console.log('🎭 Demo ma\'lumotlar ham yaratiladi.');
  console.log('');
}

console.log('Davom etish uchun 3 sekund kuting...');
console.log('Bekor qilish uchun Ctrl+C bosing.');

setTimeout(() => {
  seedDatabase();
}, 3000);