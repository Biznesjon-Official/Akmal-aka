const mongoose = require('mongoose');
require('dotenv').config();

const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');
const { getCacheStats } = require('../utils/cacheManager');

async function testAutoOptimization() {
  try {
    console.log('🔄 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    console.log('\n🧪 Avtomatik optimizatsiya testlari...');

    // 1. Cache test
    console.log('\n1️⃣ Cache testi...');
    const initialCacheStats = getCacheStats();
    console.log('Initial cache stats:', {
      query_keys: initialCacheStats.query.keys,
      aggregation_keys: initialCacheStats.aggregation.keys
    });

    // 2. Yangi vagon yaratish (avtomatik index va cache invalidation test)
    console.log('\n2️⃣ Yangi vagon yaratish...');
    const testVagon = new Vagon({
      vagonCode: `TEST-${Date.now()}`,
      month: '2024-01',
      sending_place: 'Test Sender',
      receiving_place: 'Test Receiver',
      status: 'active'
    });
    
    await testVagon.save();
    console.log(`✅ Test vagon yaratildi: ${testVagon.vagonCode}`);

    // 3. Vagon lot qo'shish (avtomatik vagon totals yangilanishi test)
    console.log('\n3️⃣ Vagon lot qo\'shish...');
    const testLot = new VagonLot({
      vagon: testVagon._id,
      dimensions: '30×120×6',
      quantity: 100,
      volume_m3: 2.16,
      purchase_currency: 'USD',
      purchase_amount: 5000
    });
    
    console.log('Lot save dan oldin vagon ma\'lumotlari:');
    const vagonBefore = await Vagon.findById(testVagon._id);
    console.log(`- Total volume: ${vagonBefore.total_volume_m3} m³`);
    console.log(`- USD cost: $${vagonBefore.usd_total_cost}`);
    
    await testLot.save();
    console.log(`✅ Test lot yaratildi`);
    
    // Bir oz kutish (hook'lar ishlashi uchun)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Lot save dan keyin vagon ma\'lumotlari:');
    const vagonAfter = await Vagon.findById(testVagon._id);
    console.log(`- Total volume: ${vagonAfter.total_volume_m3} m³`);
    console.log(`- USD cost: $${vagonAfter.usd_total_cost}`);
    
    // 4. Performance test
    console.log('\n4️⃣ Performance test...');
    const startTime = Date.now();
    
    // Bir nechta vagonlarni parallel yuklash
    const vagons = await Promise.all([
      Vagon.findById(testVagon._id),
      Vagon.find({ status: 'active' }).limit(5),
      Vagon.countDocuments({ isDeleted: false })
    ]);
    
    const endTime = Date.now();
    console.log(`⚡ Parallel queries completed in ${endTime - startTime}ms`);
    
    // 5. Cache stats after operations
    console.log('\n5️⃣ Cache stats after operations...');
    const finalCacheStats = getCacheStats();
    console.log('Final cache stats:', {
      query_keys: finalCacheStats.query.keys,
      query_hits: finalCacheStats.query.hits,
      query_misses: finalCacheStats.query.misses,
      aggregation_keys: finalCacheStats.aggregation.keys,
      aggregation_hits: finalCacheStats.aggregation.hits,
      aggregation_misses: finalCacheStats.aggregation.misses
    });

    // 6. Memory usage
    console.log('\n6️⃣ Memory usage...');
    const memUsage = process.memoryUsage();
    console.log(`- Heap used: ${Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    console.log(`- Heap total: ${Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`);
    console.log(`- RSS: ${Math.round(memUsage.rss / 1024 / 1024 * 100) / 100} MB`);

    // 7. Database indexes check
    console.log('\n7️⃣ Database indexes check...');
    const db = mongoose.connection.db;
    const vagonIndexes = await db.collection('vagons').indexes();
    const lotIndexes = await db.collection('vagonlots').indexes();
    
    console.log(`- Vagon collection indexes: ${vagonIndexes.length}`);
    console.log(`- VagonLot collection indexes: ${lotIndexes.length}`);
    
    // 8. Cleanup test data
    console.log('\n8️⃣ Test ma\'lumotlarini tozalash...');
    await VagonLot.findByIdAndDelete(testLot._id);
    await Vagon.findByIdAndDelete(testVagon._id);
    console.log('✅ Test ma\'lumotlari tozalandi');

    console.log('\n🎉 Avtomatik optimizatsiya testlari muvaffaqiyatli tugadi!');
    
    // Summary
    console.log('\n📊 Test natijalari:');
    console.log(`✅ Avtomatik vagon totals yangilanishi: ${vagonAfter.total_volume_m3 > 0 ? 'ISHLAYDI' : 'ISHLAMAYDI'}`);
    console.log(`✅ Performance: ${endTime - startTime < 1000 ? 'YAXSHI' : 'SEKIN'}`);
    console.log(`✅ Memory usage: ${memUsage.heapUsed / 1024 / 1024 < 200 ? 'NORMAL' : 'YUQORI'}`);
    console.log(`✅ Indexes: ${vagonIndexes.length >= 5 ? 'YETARLI' : 'KAM'}`);

  } catch (error) {
    console.error('❌ Test xatosi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

// Script'ni ishga tushirish
if (require.main === module) {
  testAutoOptimization();
}

module.exports = { testAutoOptimization };