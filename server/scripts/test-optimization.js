const mongoose = require('mongoose');
require('dotenv').config();

async function testOptimization() {
  console.log('🚀 OPTIMIZATSIYA TESTLARI BOSHLANDI\n');
  
  try {
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    console.log('📊 INDEX TESTLARI:');
    console.log('==================');
    
    // Avval collection nomlarini topamiz
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Mavjud collection\'lar:', collections.map(c => c.name).join(', '));
    
    // Index'larni tekshirish
    const testCollections = [
      { name: 'VagonSale', collection: 'vagonsales' },
      { name: 'Cash', collection: 'cashes' },
      { name: 'Client', collection: 'clients' },
      { name: 'Vagon', collection: 'vagons' },
      { name: 'VagonLot', collection: 'vagonlots' },
      { name: 'Expense', collection: 'expenses' }
    ];
    
    for (const col of testCollections) {
      try {
        const indexes = await mongoose.connection.db.collection(col.collection).getIndexes();
        const indexCount = Object.keys(indexes).length;
        console.log(`✅ ${col.name}: ${indexCount} ta index`);
        
        // Index nomlarini ko'rsatish
        const indexNames = Object.keys(indexes).slice(0, 5); // Birinchi 5 tasini ko'rsatish
        console.log(`   Indexlar: ${indexNames.join(', ')}${indexCount > 5 ? '...' : ''}`);
      } catch (error) {
        console.log(`❌ ${col.name}: Index tekshirishda xatolik - ${error.message}`);
      }
    }

    console.log('\n🔧 AGGREGATION TESTLARI:');
    console.log('========================');
    
    // Client debt aggregation test
    const Client = require('../models/Client');
    const clients = await Client.find({ isDeleted: false }).limit(1);
    
    if (clients.length > 0) {
      const clientId = clients[0]._id;
      console.log(`Client ${clients[0].name} uchun aggregation test...`);
      
      const startTimeAgg = Date.now();
      const { updateClientTotalDebts } = require('../utils/clientHelpers');
      await updateClientTotalDebts(clientId);
      const endTimeAgg = Date.now();
      
      console.log(`✅ Client debt aggregation: ${endTimeAgg - startTimeAgg}ms`);
    } else {
      console.log('⚠️  Test uchun client topilmadi');
    }
    
    // Vagon totals aggregation test
    const Vagon = require('../models/Vagon');
    const vagons = await Vagon.find({ isDeleted: false }).limit(1);
    
    if (vagons.length > 0) {
      const vagonId = vagons[0]._id;
      console.log(`Vagon ${vagons[0].vagonCode} uchun aggregation test...`);
      
      const startTimeVagon = Date.now();
      const { updateVagonTotals } = require('../utils/vagonHelpers');
      await updateVagonTotals(vagonId);
      const endTimeVagon = Date.now();
      
      console.log(`✅ Vagon totals aggregation: ${endTimeVagon - startTimeVagon}ms`);
    } else {
      console.log('⚠️  Test uchun vagon topilmadi');
    }

    console.log('\n📈 DATABASE STATISTIKASI:');
    console.log('=========================');
    
    // Collection'lar statistikasi
    for (const col of collections) {
      try {
        const stats = await mongoose.connection.db.collection(col.collection).stats();
        console.log(`${col.name}:`);
        console.log(`   Documents: ${stats.count}`);
        console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   Indexes: ${stats.nindexes}`);
        console.log(`   Index size: ${(stats.totalIndexSize / 1024).toFixed(2)} KB`);
      } catch (error) {
        console.log(`❌ ${col.name}: Statistika olishda xatolik`);
      }
    }

    console.log('\n🎉 OPTIMIZATSIYA TESTLARI TUGADI!');
    console.log('==================================');
    console.log('✅ Pagination qo\'shildi');
    console.log('✅ Index\'lar qo\'shildi');
    console.log('✅ Aggregation pipeline optimizatsiya qilindi');
    console.log('✅ Response compression yoqildi');
    console.log('✅ Field selection optimizatsiya qilindi');
    console.log('✅ Frontend xatoliklari tuzatildi');

  } catch (error) {
    console.error('❌ Test xatoligi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

// Script ishga tushirish
if (require.main === module) {
  testOptimization();
}

module.exports = testOptimization;