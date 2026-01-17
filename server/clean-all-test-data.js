require('dotenv').config();
const mongoose = require('mongoose');

// Models
const Vagon = require('./models/Vagon');
const VagonLot = require('./models/VagonLot');
const VagonExpense = require('./models/VagonExpense');
const VagonSale = require('./models/VagonSale');
const Client = require('./models/Client');
const Kassa = require('./models/Kassa');
const Expense = require('./models/Expense');
const ExpenseAllocation = require('./models/ExpenseAllocation');
const LossLiability = require('./models/LossLiability');
const AuditLog = require('./models/AuditLog');
const ExchangeRate = require('./models/ExchangeRate');
const ExchangeRateHistory = require('./models/ExchangeRateHistory');
const SystemSettings = require('./models/SystemSettings');

async function cleanAllTestData() {
  try {
    console.log('🔌 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Barcha ma'lumotlarni o'chirish
    console.log('🗑️  Ma\'lumotlarni o\'chirish boshlandi...\n');

    // 1. Vagon Sotuvlari
    const salesCount = await VagonSale.countDocuments();
    if (salesCount > 0) {
      await VagonSale.deleteMany({});
      console.log(`✅ ${salesCount} ta vagon sotuvi o'chirildi`);
    }

    // 2. Vagon Xarajatlari
    const expensesCount = await VagonExpense.countDocuments();
    if (expensesCount > 0) {
      await VagonExpense.deleteMany({});
      console.log(`✅ ${expensesCount} ta vagon xarajati o'chirildi`);
    }

    // 3. Vagon Lotlari
    const lotsCount = await VagonLot.countDocuments();
    if (lotsCount > 0) {
      await VagonLot.deleteMany({});
      console.log(`✅ ${lotsCount} ta lot o'chirildi`);
    }

    // 4. Vagonlar
    const vagonsCount = await Vagon.countDocuments();
    if (vagonsCount > 0) {
      await Vagon.deleteMany({});
      console.log(`✅ ${vagonsCount} ta vagon o'chirildi`);
    }

    // 5. Mijozlar
    const clientsCount = await Client.countDocuments();
    if (clientsCount > 0) {
      await Client.deleteMany({});
      console.log(`✅ ${clientsCount} ta mijoz o'chirildi`);
    }

    // 6. Kassa yozuvlari
    const kassaCount = await Kassa.countDocuments();
    if (kassaCount > 0) {
      await Kassa.deleteMany({});
      console.log(`✅ ${kassaCount} ta kassa yozuvi o'chirildi`);
    }

    // 7. Xarajatlar (umumiy)
    const generalExpensesCount = await Expense.countDocuments();
    if (generalExpensesCount > 0) {
      await Expense.deleteMany({});
      console.log(`✅ ${generalExpensesCount} ta umumiy xarajat o'chirildi`);
    }

    // 8. Xarajat taqsimotlari
    const allocationsCount = await ExpenseAllocation.countDocuments();
    if (allocationsCount > 0) {
      await ExpenseAllocation.deleteMany({});
      console.log(`✅ ${allocationsCount} ta xarajat taqsimoti o'chirildi`);
    }

    // 9. Yo'qotish javobgarliklari
    const liabilitiesCount = await LossLiability.countDocuments();
    if (liabilitiesCount > 0) {
      await LossLiability.deleteMany({});
      console.log(`✅ ${liabilitiesCount} ta yo'qotish javobgarligi o'chirildi`);
    }

    // 10. Audit loglar
    const auditCount = await AuditLog.countDocuments();
    if (auditCount > 0) {
      await AuditLog.deleteMany({});
      console.log(`✅ ${auditCount} ta audit log o'chirildi`);
    }

    // 11. Valyuta kurslari tarixi
    const rateHistoryCount = await ExchangeRateHistory.countDocuments();
    if (rateHistoryCount > 0) {
      await ExchangeRateHistory.deleteMany({});
      console.log(`✅ ${rateHistoryCount} ta valyuta kursi tarixi o'chirildi`);
    }

    // 12. Joriy valyuta kurslari
    const ratesCount = await ExchangeRate.countDocuments();
    if (ratesCount > 0) {
      await ExchangeRate.deleteMany({});
      console.log(`✅ ${ratesCount} ta joriy valyuta kursi o'chirildi`);
    }

    // 13. Tizim sozlamalari (ixtiyoriy - default qiymatlar qayta yaratiladi)
    const settingsCount = await SystemSettings.countDocuments();
    if (settingsCount > 0) {
      await SystemSettings.deleteMany({});
      console.log(`✅ ${settingsCount} ta tizim sozlamasi o'chirildi`);
    }

    console.log('\n🎉 Barcha test ma\'lumotlar o\'chirildi!');
    
    // Default tizim sozlamalarini yaratish
    console.log('🔧 Default tizim sozlamalarini yaratmoqda...');
    
    await SystemSettings.initializeDefaultSettings();
    
    console.log('💡 Endi yangi ma\'lumotlar qo\'shishingiz mumkin.');
    console.log('📝 Eslatma: Admin foydalanuvchi saqlanib qoldi.');
    console.log('📝 Valyuta kurslarini admin panelidan o\'rnatishingiz mumkin.\n');

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB ulanishi yopildi');
    process.exit(0);
  }
}

// Tasdiqlash
console.log('⚠️  OGOHLANTIRISH: Bu script BARCHA ma\'lumotlarni o\'chiradi!');
console.log('📋 O\'chiriladigan ma\'lumotlar:');
console.log('   - Vagonlar va lotlar');
console.log('   - Vagon sotuvlari va xarajatlari');
console.log('   - Mijozlar');
console.log('   - Kassa yozuvlari');
console.log('   - Umumiy xarajatlar');
console.log('   - Xarajat taqsimotlari');
console.log('   - Yo\'qotish javobgarliklari');
console.log('   - Audit loglar');
console.log('   - Valyuta kurslari');
console.log('   - Tizim sozlamalari');
console.log('');
console.log('✅ SAQLANADI: Admin foydalanuvchi');
console.log('⏳ 3 soniyadan keyin boshlanadi...\n');
console.log('⏳ 3 soniyadan keyin boshlanadi...\n');

setTimeout(() => {
  cleanAllTestData();
}, 3000);
