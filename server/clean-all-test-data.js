require('dotenv').config();
const mongoose = require('mongoose');

// Models
const Vagon = require('./models/Vagon');
const VagonLot = require('./models/VagonLot');
const VagonExpense = require('./models/VagonExpense');
const VagonSale = require('./models/VagonSale');
const Client = require('./models/Client');
const Cash = require('./models/Cash');

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

    // 6. Kassa (ixtiyoriy - faqat test ma'lumotlar)
    const cashCount = await Cash.countDocuments();
    if (cashCount > 0) {
      await Cash.deleteMany({});
      console.log(`✅ ${cashCount} ta kassa yozuvi o'chirildi`);
    }

    console.log('\n🎉 Barcha test ma\'lumotlar o\'chirildi!');
    console.log('💡 Endi yangi ma\'lumotlar qo\'shishingiz mumkin.\n');

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
console.log('   - Vagonlar');
console.log('   - Lotlar');
console.log('   - Vagon sotuvlari');
console.log('   - Vagon xarajatlari');
console.log('   - Mijozlar');
console.log('   - Kassa yozuvlari');
console.log('');
console.log('⏳ 3 soniyadan keyin boshlanadi...\n');

setTimeout(() => {
  cleanAllTestData();
}, 3000);
