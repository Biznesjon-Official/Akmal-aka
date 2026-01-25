const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Vagon = require('../models/Vagon');
const VagonSale = require('../models/VagonSale');
const Client = require('../models/Client');
const Cash = require('../models/Cash');

async function testPerformance() {
  try {
    console.log('🔗 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    console.log('\n🚀 Performance testlari boshlanmoqda...\n');

    // Test 1: Paginated Vagon List
    console.log('1️⃣ Vagon ro\'yxati (pagination)...');
    const vagonStart = Date.now();
    const vagons = await Vagon.find({ isDeleted: false })
      .select('vagonCode month status total_volume_m3 remaining_volume_m3 usd_profit rub_profit')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const vagonTime = Date.now() - vagonStart;
    console.log(`   ✅ ${vagons.length} ta vagon, ${vagonTime}ms`);

    // Test 2: Paginated VagonSale with Aggregation
    console.log('2️⃣ VagonSale aggregation...');
    const saleStart = Date.now();
    const sales = await VagonSale.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: 'vagons',
          localField: 'vagon',
          foreignField: '_id',
          as: 'vagonInfo',
          pipeline: [{ $project: { vagonCode: 1, month: 1 } }]
        }
      },
      { $unwind: { path: '$vagonInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo',
          pipeline: [{ $project: { name: 1, phone: 1 } }]
        }
      },
      { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          vagon: '$vagonInfo',
          client: '$clientInfo',
          total_price: 1,
          sale_date: 1,
          status: 1
        }
      },
      { $sort: { sale_date: -1 } },
      { $limit: 20 }
    ]);
    const saleTime = Date.now() - saleStart;
    console.log(`   ✅ ${sales.length} ta sotuv, ${saleTime}ms`);

    // Test 3: Client Debt Calculation
    console.log('3️⃣ Mijoz qarzlari...');
    const clientStart = Date.now();
    const clientDebts = await Client.aggregate([
      { $match: { isDeleted: false } },
      {
        $addFields: {
          usd_current_debt: {
            $max: [0, { $subtract: ['$usd_total_debt', '$usd_total_paid'] }]
          },
          rub_current_debt: {
            $max: [0, { $subtract: ['$rub_total_debt', '$rub_total_paid'] }]
          }
        }
      },
      {
        $match: {
          $or: [
            { usd_current_debt: { $gt: 100 } },
            { rub_current_debt: { $gt: 9000 } }
          ]
        }
      },
      { $project: { name: 1, usd_current_debt: 1, rub_current_debt: 1 } },
      { $limit: 10 }
    ]);
    const clientTime = Date.now() - clientStart;
    console.log(`   ✅ ${clientDebts.length} ta qarzli mijoz, ${clientTime}ms`);

    // Test 4: Cash Balance Calculation
    console.log('4️⃣ Kassa balansi...');
    const cashStart = Date.now();
    const cashBalance = await Cash.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$currency',
          total: { $sum: '$amount' }
        }
      }
    ]);
    const cashTime = Date.now() - cashStart;
    console.log(`   ✅ ${cashBalance.length} ta valyuta balansi, ${cashTime}ms`);

    // Test 5: Dashboard Data (Simple)
    console.log('5️⃣ Dashboard ma\'lumotlari...');
    const dashStart = Date.now();
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [todayStats, totalBalance, activeVagons] = await Promise.all([
      Cash.aggregate([
        {
          $match: {
            isDeleted: false,
            transaction_date: { $gte: startOfDay, $lt: endOfDay }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]),
      Cash.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$currency',
            total: { $sum: '$amount' }
          }
        }
      ]),
      Vagon.countDocuments({ 
        isDeleted: false, 
        status: { $in: ['active', 'in_transit', 'processing'] } 
      })
    ]);
    
    const dashTime = Date.now() - dashStart;
    console.log(`   ✅ Dashboard ma'lumotlari, ${dashTime}ms`);

    // Test 6: Search Performance
    console.log('6️⃣ Qidiruv tezligi...');
    const searchStart = Date.now();
    const searchResults = await Client.find({
      $or: [
        { name: { $regex: 'test', $options: 'i' } },
        { phone: { $regex: 'test', $options: 'i' } }
      ],
      isDeleted: false
    })
    .select('name phone')
    .limit(10)
    .lean();
    const searchTime = Date.now() - searchStart;
    console.log(`   ✅ ${searchResults.length} ta qidiruv natijasi, ${searchTime}ms`);

    // Performance Summary
    console.log('\n📊 PERFORMANCE SUMMARY:');
    console.log('========================');
    console.log(`Vagon ro'yxati:        ${vagonTime}ms`);
    console.log(`VagonSale aggregation: ${saleTime}ms`);
    console.log(`Mijoz qarzlari:        ${clientTime}ms`);
    console.log(`Kassa balansi:         ${cashTime}ms`);
    console.log(`Dashboard:             ${dashTime}ms`);
    console.log(`Qidiruv:               ${searchTime}ms`);
    
    const totalTime = vagonTime + saleTime + clientTime + cashTime + dashTime + searchTime;
    console.log(`JAMI:                  ${totalTime}ms`);

    // Performance Recommendations
    console.log('\n💡 TAVSIYALAR:');
    if (vagonTime > 100) console.log('⚠️  Vagon ro\'yxati sekin (>100ms) - indexlarni tekshiring');
    if (saleTime > 200) console.log('⚠️  VagonSale aggregation sekin (>200ms) - compound indexlar kerak');
    if (clientTime > 150) console.log('⚠️  Mijoz qarzlari sekin (>150ms) - debt fieldlariga index kerak');
    if (cashTime > 50) console.log('⚠️  Kassa balansi sekin (>50ms) - currency indexini tekshiring');
    if (dashTime > 300) console.log('⚠️  Dashboard sekin (>300ms) - caching qo\'shing');
    if (searchTime > 100) console.log('⚠️  Qidiruv sekin (>100ms) - text indexlarni tekshiring');

    if (totalTime < 500) {
      console.log('✅ Umumiy performance YAXSHI (<500ms)');
    } else if (totalTime < 1000) {
      console.log('⚠️  Umumiy performance O\'RTACHA (500-1000ms)');
    } else {
      console.log('❌ Umumiy performance YOMON (>1000ms) - optimizatsiya kerak');
    }

    // Database Stats
    console.log('\n📈 DATABASE STATISTICS:');
    const collections = ['vagons', 'vagonsales', 'clients', 'cashes'];
    for (const collName of collections) {
      try {
        const stats = await mongoose.connection.db.collection(collName).stats();
        console.log(`${collName}: ${stats.count} documents, ${Math.round(stats.size / 1024)}KB`);
      } catch (error) {
        console.log(`${collName}: Collection not found or error`);
      }
    }

  } catch (error) {
    console.error('❌ Performance test xatosi:', error);
  } finally {
    console.log('\n🔌 MongoDB dan uzilmoqda...');
    await mongoose.connection.close();
    console.log('✅ Test yakunlandi');
  }
}

// Run the test
addIndexes();

async function addIndexes() {
  await testPerformance();
}