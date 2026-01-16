require('dotenv').config();
const mongoose = require('mongoose');

// Production MongoDB URI
const MONGODB_URI = 'mongodb+srv://javohir111_db_user:K6gPXt0qZMGDK802@umumuy.rygkhns.mongodb.net/?appName=Umumuy';

async function cleanProductionData() {
  try {
    console.log('🔌 Production MongoDB ga ulanmoqda...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB ga ulandi\n');

    const db = mongoose.connection.db;

    // Collections
    const collections = [
      'vagonsales',
      'vagonexpenses', 
      'vagonlots',
      'vagons',
      'clients',
      'cashes'
    ];

    console.log('🗑️  Ma\'lumotlarni o\'chirish boshlandi...\n');

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          await collection.deleteMany({});
          console.log(`✅ ${collectionName}: ${count} ta yozuv o'chirildi`);
        } else {
          console.log(`ℹ️  ${collectionName}: bo'sh`);
        }
      } catch (error) {
        console.log(`⚠️  ${collectionName}: ${error.message}`);
      }
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

console.log('⚠️  OGOHLANTIRISH: Bu script PRODUCTION database\'dan BARCHA ma\'lumotlarni o\'chiradi!');
console.log('📋 O\'chiriladigan collections:');
console.log('   - vagons (vagonlar)');
console.log('   - vagonlots (lotlar)');
console.log('   - vagonsales (sotuvlar)');
console.log('   - vagonexpenses (xarajatlar)');
console.log('   - clients (mijozlar)');
console.log('   - cashes (kassa)');
console.log('');
console.log('⏳ 3 soniyadan keyin boshlanadi...\n');

setTimeout(() => {
  cleanProductionData();
}, 3000);
