require('dotenv').config();
const mongoose = require('mongoose');

// Models
const Client = require('./models/Client');
const Vagon = require('./models/Vagon');
const VagonSale = require('./models/VagonSale');
const Cash = require('./models/Cash');
const ExchangeRate = require('./models/ExchangeRate');

async function cleanAllData() {
  try {
    console.log('🔌 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB ga ulandi\n');

    console.log('🗑️  Barcha ma\'lumotlarni o\'chirish boshlandi...\n');

    // 1. Cash tranzaksiyalarini o'chirish
    const cashCount = await Cash.countDocuments();
    await Cash.deleteMany({});
    console.log(`✅ ${cashCount} ta Cash tranzaksiya o'chirildi`);

    // 2. VagonSale larni o'chirish
    const saleCount = await VagonSale.countDocuments();
    await VagonSale.deleteMany({});
    console.log(`✅ ${saleCount} ta VagonSale o'chirildi`);

    // 3. Vagonlarni o'chirish
    const vagonCount = await Vagon.countDocuments();
    await Vagon.deleteMany({});
    console.log(`✅ ${vagonCount} ta Vagon o'chirildi`);

    // 4. Mijozlarni o'chirish
    const clientCount = await Client.countDocuments();
    await Client.deleteMany({});
    console.log(`✅ ${clientCount} ta Client o'chirildi`);

    // 5. Valyuta kurslarini o'chirish
    const rateCount = await ExchangeRate.countDocuments();
    await ExchangeRate.deleteMany({});
    console.log(`✅ ${rateCount} ta ExchangeRate o'chirildi`);

    console.log('\n✅ Barcha ma\'lumotlar tozalandi!');
    console.log('ℹ️  Admin foydalanuvchi saqlanib qoldi\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

cleanAllData();
