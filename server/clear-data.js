const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Wood = require('./models/Wood');
const Purchase = require('./models/Purchase');
const Sale = require('./models/Sale');
const Expense = require('./models/Expense');
const Kassa = require('./models/Kassa');
const ExchangeRate = require('./models/ExchangeRate');
const AuditLog = require('./models/AuditLog');
const User = require('./models/User');

async function clearData() {
  try {
    console.log('🔌 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga muvaffaqiyatli ulandi\n');

    console.log('📊 Hozirgi ma\'lumotlar:');
    const woodCount = await Wood.countDocuments();
    const purchaseCount = await Purchase.countDocuments();
    const saleCount = await Sale.countDocuments();
    const expenseCount = await Expense.countDocuments();
    const kassaCount = await Kassa.countDocuments();
    const exchangeRateCount = await ExchangeRate.countDocuments();
    const auditLogCount = await AuditLog.countDocuments();
    const userCount = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });

    console.log(`  - Yog'och lotlar: ${woodCount}`);
    console.log(`  - Xaridlar: ${purchaseCount}`);
    console.log(`  - Sotuvlar: ${saleCount}`);
    console.log(`  - Xarajatlar: ${expenseCount}`);
    console.log(`  - Kassa yozuvlari: ${kassaCount}`);
    console.log(`  - Valyuta kurslari: ${exchangeRateCount}`);
    console.log(`  - Audit loglar: ${auditLogCount}`);
    console.log(`  - Foydalanuvchilar: ${userCount} (Admin: ${adminCount})\n`);

    console.log('🗑️  Ma\'lumotlarni o\'chirish boshlandi...\n');

    // O'chirish
    const deletedWood = await Wood.deleteMany({});
    console.log(`✅ Yog'och lotlar o'chirildi: ${deletedWood.deletedCount}`);

    const deletedPurchase = await Purchase.deleteMany({});
    console.log(`✅ Xaridlar o'chirildi: ${deletedPurchase.deletedCount}`);

    const deletedSale = await Sale.deleteMany({});
    console.log(`✅ Sotuvlar o'chirildi: ${deletedSale.deletedCount}`);

    const deletedExpense = await Expense.deleteMany({});
    console.log(`✅ Xarajatlar o'chirildi: ${deletedExpense.deletedCount}`);

    const deletedKassa = await Kassa.deleteMany({});
    console.log(`✅ Kassa yozuvlari o'chirildi: ${deletedKassa.deletedCount}`);

    const deletedExchangeRate = await ExchangeRate.deleteMany({});
    console.log(`✅ Valyuta kurslari o'chirildi: ${deletedExchangeRate.deletedCount}`);

    const deletedAuditLog = await AuditLog.deleteMany({});
    console.log(`✅ Audit loglar o'chirildi: ${deletedAuditLog.deletedCount}`);

    // Admin userlardan tashqari barcha userlarni o'chirish
    const deletedUsers = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`✅ Admin bo'lmagan userlar o'chirildi: ${deletedUsers.deletedCount}`);

    console.log('\n✨ Barcha ma\'lumotlar muvaffaqiyatli o\'chirildi!');
    console.log('⚠️  Admin userlar saqlanib qoldi.\n');

    // Qolgan ma'lumotlarni ko'rsatish
    const remainingUsers = await User.countDocuments();
    const remainingAdmins = await User.countDocuments({ role: 'admin' });
    console.log('📊 Qolgan ma\'lumotlar:');
    console.log(`  - Foydalanuvchilar: ${remainingUsers} (Admin: ${remainingAdmins})`);

    if (remainingAdmins > 0) {
      const admins = await User.find({ role: 'admin' }).select('username role');
      console.log('\n👤 Qolgan adminlar:');
      admins.forEach(admin => {
        console.log(`  - ${admin.username} (${admin.role})`);
      });
    }

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB ulanishi yopildi');
    process.exit(0);
  }
}

// Tasdiqlash
console.log('⚠️  OGOHLANTIRISH: Bu script barcha ma\'lumotlarni o\'chiradi!');
console.log('⚠️  Faqat admin userlar saqlanib qoladi.\n');
console.log('Davom etish uchun 5 soniya kutilmoqda...\n');

setTimeout(() => {
  clearData();
}, 5000);
