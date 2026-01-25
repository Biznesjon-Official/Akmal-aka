const mongoose = require('mongoose');
require('dotenv').config();

async function addPerformanceIndexes() {
  try {
    console.log('🔄 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    const db = mongoose.connection.db;

    console.log('\n📊 Performance indexlar qo\'shilmoqda...');

    // 1. Vagon collection indexlari
    console.log('🚂 Vagon indexlari...');
    await db.collection('vagons').createIndex({ status: 1, isDeleted: 1 });
    await db.collection('vagons').createIndex({ month: 1, isDeleted: 1 });
    await db.collection('vagons').createIndex({ createdAt: -1, isDeleted: 1 });
    await db.collection('vagons').createIndex({ vagonCode: 1, isDeleted: 1 });
    await db.collection('vagons').createIndex({ 
      sending_place: 'text', 
      receiving_place: 'text', 
      vagonCode: 'text' 
    });

    // 2. VagonLot collection indexlari
    console.log('📦 VagonLot indexlari...');
    await db.collection('vagonlots').createIndex({ vagon: 1, isDeleted: 1 });
    await db.collection('vagonlots').createIndex({ purchase_currency: 1, isDeleted: 1 });
    await db.collection('vagonlots').createIndex({ createdAt: -1, isDeleted: 1 });

    // 3. VagonSale collection indexlari
    console.log('💰 VagonSale indexlari...');
    await db.collection('vagonsales').createIndex({ vagon: 1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ client: 1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ lot: 1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ status: 1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ sale_date: -1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ createdAt: -1, isDeleted: 1 });

    // 4. Client collection indexlari
    console.log('👥 Client indexlari...');
    await db.collection('clients').createIndex({ name: 'text', phone: 'text' });
    await db.collection('clients').createIndex({ status: 1, isDeleted: 1 });
    await db.collection('clients').createIndex({ createdAt: -1, isDeleted: 1 });

    // 5. Cash collection indexlari
    console.log('💵 Cash indexlari...');
    await db.collection('cashes').createIndex({ client: 1, isDeleted: 1 });
    await db.collection('cashes').createIndex({ vagonSale: 1, isDeleted: 1 });
    await db.collection('cashes').createIndex({ type: 1, isDeleted: 1 });
    await db.collection('cashes').createIndex({ transaction_date: -1, isDeleted: 1 });
    await db.collection('cashes').createIndex({ createdAt: -1, isDeleted: 1 });

    // 6. Expense collection indexlari
    console.log('💸 Expense indexlari...');
    await db.collection('expenses').createIndex({ category: 1, isDeleted: 1 });
    await db.collection('expenses').createIndex({ expense_date: -1, isDeleted: 1 });
    await db.collection('expenses').createIndex({ createdAt: -1, isDeleted: 1 });

    // 7. Compound indexlar (ko'p ishlatiladigan kombinatsiyalar)
    console.log('🔗 Compound indexlar...');
    
    // Vagon filter uchun
    await db.collection('vagons').createIndex({ 
      status: 1, 
      month: 1, 
      isDeleted: 1 
    });

    // VagonSale filter uchun
    await db.collection('vagonsales').createIndex({ 
      client: 1, 
      status: 1, 
      sale_date: -1, 
      isDeleted: 1 
    });

    // Cash filter uchun
    await db.collection('cashes').createIndex({ 
      type: 1, 
      transaction_date: -1, 
      isDeleted: 1 
    });

    console.log('✅ Barcha performance indexlar muvaffaqiyatli qo\'shildi!');

    // Indexlar ro'yxatini ko'rsatish
    console.log('\n📋 Qo\'shilgan indexlar:');
    const collections = ['vagons', 'vagonlots', 'vagonsales', 'clients', 'cashes', 'expenses'];
    
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`\n${collectionName}:`);
      indexes.forEach(index => {
        const keys = Object.keys(index.key).join(', ');
        console.log(`  - ${keys}`);
      });
    }

  } catch (error) {
    console.error('❌ Index qo\'shishda xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

// Script'ni ishga tushirish
if (require.main === module) {
  addPerformanceIndexes();
}

module.exports = { addPerformanceIndexes };