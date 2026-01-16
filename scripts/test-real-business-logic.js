#!/usr/bin/env node

/**
 * Test Script: Real Business Logic
 * 
 * Bu script real biznes logikasini test qiladi
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Vagon = require('../server/models/Vagon');
const VagonSale = require('../server/models/VagonSale');
const Client = require('../server/models/Client');

async function test() {
  try {
    console.log('🧪 Test boshlandi...\n');
    
    // Database ga ulanish
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vagon-system-test');
    console.log('✅ Test database ga ulandi\n');
    
    // Test ma'lumotlarini tozalash
    await Vagon.deleteMany({});
    await VagonSale.deleteMany({});
    await Client.deleteMany({});
    console.log('🧹 Test ma'lumotlari tozalandi\n');
    
    // ========================================
    // 1️⃣ VAGON YARATISH
    // ========================================
    console.log('1️⃣ VAGON YARATISH');
    console.log('─'.repeat(50));
    
    const vagon = new Vagon({
      vagonCode: 'VG-2024-01',
      month: '2024-01',
      sending_place: 'Rossiya',
      receiving_place: 'Toshkent',
      arrived_volume_m3: 100,
      arrival_loss_m3: 5,
      total_cost: 35000,
      total_expenses: 0
    });
    
    await vagon.save();
    
    console.log(`✅ Vagon yaratildi: ${vagon.vagonCode}`);
    console.log(`   Keldi: ${vagon.arrived_volume_m3} m³`);
    console.log(`   Brak: ${vagon.arrival_loss_m3} m³`);
    console.log(`   Mavjud: ${vagon.available_volume_m3} m³`);
    console.log(`   Xarajat: ${vagon.total_cost.toLocaleString()} USD`);
    console.log('');
    
    // ========================================
    // 2️⃣ KLIENTLAR YARATISH
    // ========================================
    console.log('2️⃣ KLIENTLAR YARATISH');
    console.log('─'.repeat(50));
    
    const client1 = new Client({
      name: 'Alisher',
      phone: '+998901234567',
      address: 'Toshkent'
    });
    await client1.save();
    console.log(`✅ Klient 1: ${client1.name}`);
    
    const client2 = new Client({
      name: 'Bekzod',
      phone: '+998907654321',
      address: 'Samarqand'
    });
    await client2.save();
    console.log(`✅ Klient 2: ${client2.name}`);
    console.log('');
    
    // ========================================
    // 3️⃣ BIRINCHI SOTUV
    // =====================================qqonsole.log('3️⃣ BIRINCHI SOTUV (Alisher)');
    console.log('─'.repeat(50));
    
    const sale1 = new VagonSale({
      vagon: vagq._id,
      client: client1._id,
      sent_volume_m3: 50,
      client_loss_m3: 2,
      price_per_m3: 500
    });
    qsave();
    
    console.log(`✅ Sotuv yaratildi`);
    console.log(`   Yuborildi: ${sale1.sent_volume_m3} m³`);
    console.log(`   Klientda brak: ${sale1.client_loss_m3} m³`);
    console.log(`   Qabul qildi: ${sale1.accepted_volume_m3} m³`);
    console.log(`   Narx: ${sale1.price_per_m3} USD/m³`);
    console.log(`   Jami: ${sale1.total_qtoLocaleString()} USD`);
    console.log('');
    
    // Vagonni yangilash
    vagon.sent_vq= sale1.sent_volume_m3;
    vagon.accepted_volume_m3 += salqed_volume_m3;
    vagon.total_revenue += sale1.total_price;
    await vagon.save();
    
   qog(`📦 Vagon holati:`);
    console.log(`   Yuborildi: ${vagon.sent_volume_m3} mqnsole.log(`   Qabul qilindi: ${vagon.accepted_volume_m3} m³`);
    consoq(`   Qoldi: ${vagon.remaining_volume_m3} m³`);
    console.log(`   Daromad: ${vagon.total_revenue.toLocaleString()} USD`);
    console.log('');
    
    // ========================================
    // 4️⃣ IKKINCHI SOTUV
    // ========================================
    console.log('4️⃣ IKKINCHI SOTUV (Bekzod)');
    console.log('─'.repeat(50));
    
    const sale2 = new VagonSale({
      vagon: vagon._id,
      client: client2._id,
      sent_volume_m3: 45,
      client_loss_m3: 3,
      price_per_m3: 600
    });
    await sale2.savq;
    
    console.log(`✅ Sotuv yaratildi`);
    console.log(`   Yuborildi: ${sale2.sent_volume_m3} m³`);
    console.log(`   Klientda brak: ${sale2qlienqqqqqqqqqqoss_m3} m³`);
    console.log(`   Qabul qildi: ${sale2.accepted_volume_m3} m³`);
    console.log(`   Narx: ${sale2.price_per_m3} USD/m³`);
    console.log(`   Jami: ${sale2.total_price.toLocaleStrqing()} USD`);
    console.log('');
    
    // Vagonni yangilash
    vagon.sent_volume_m3 += sale2.sent_volume_m3;
    vagon.accepted_volume_m3 += sale2.accepted_volume_m3;
    vagon.total_revenue += sale2.total_price;
    await vagon.sq
    console.log(`📦 Vagon holati:`);
    console.log(`   Yuborildi: ${vagon.sent_volume_m3} m³`);
    console.log(`   Qabul qqqqqqqqqqqqq);
  qqog(`   Qolqqqon.remainiqqqqqqqqqqqq);
    conqq Daromad: $qqqqqtal_rqqtoLocaleStrqD`);
    console.log(q'');
    
q======================================
    // 5️⃣ YAKUNIY NATIJALAR
    // ========================================
    console.log('5️⃣ YAKUNIY NATIJALAR');
    console.log('='.repeat(50));
    console.log('');
    
    console.log('📦 VAGON:');
    console.log(`   Keldi: ${vagon.arrived_volume_m3} m³`);
    console.log(`   Brak (kelganda): ${vagon.arrival_loss_m3} m³`);
    console.log(`   Mavjud: ${vagon.available_volume_m3} m³`);
    console.log(`   Yuborildi: ${vagon.sent_volume_m3} m³`);
    console.log(`   Qabul qilindi: ${vagon.accepted_volume_m3} m³`);
    console.log(`   Qoldi: ${vagon.remaining_volume_m3} m³`);
    console.log('');
    
    console.log('💰 MOLIYA:');
    console.log(`   Xarajat: ${vagon.total_cost.toLocaleString()} USD`);
    console.log(`   Daromad: ${vagon.total_revenue.toLocaleString()} USD`);
    console.log(`   Foyda: ${vagon.net_profit.toLocaleString()} USD`);
    console.log('');
    
    // ========================================
    // 6️⃣ TEKSHIRISH
    // ========================================
    console.log('6️⃣ TEKSHIRISH');
    console.log('='.repeat(50));
    console.log('');
    
    const checks = [
      {
        name: 'Mavjud hajm',
        expected: 95,
        actual: vagon.available_volume_m3,
        formula: '100 - 5'
      },
      {
        name: 'Yuborilgan hajm',
        expected: 95,
        actual: vagon.sent_volume_m3,
        formula: '50 + 45'
      },
      {
        name: 'Qabul qilingan hajm',
        expected: 90,
        actual: vagon.accepted_volume_m3,
        formula: '48 + 42'
      },
      {
        name: 'Qolgan hajm',
        expected: 0,
        actual: vagon.remaining_volume_m3,
        formula: '95 - 95'
      },
      {
        name: 'Daromad',
        expected: 49200,
        actual: vagon.total_revenue,
        formula: '(48 × 500) + (42 × 600)'
      },
      {
        name: 'Foyda',
        expected: 14200,
        actual: vagon.net_profit,
        formula: '49200 - 35000'
      }
    ];
    
    let passed = 0;
    let failed = 0;
    
    checks.forEach(check => {
      const isPass = check.expected === check.actual;
      const icon = isPass ? '✅' : '❌';
      
      console.log(`${icon} ${check.name}:`);
      console.log(`   Kutilgan: ${check.expected.toLocaleString()} (${check.formula})`);
      console.log(`   Haqiqiy: ${check.actual.toLocaleString()}`);
      
      if (isPass) {
        passed++;
      } else {
        failed++;
        console.log(`   ⚠️  XATO: ${check.expected - check.actual} farq`);
      }
      console.log('');
    });
    
    console.log('='.repeat(50));
    console.log(`✅ O'tdi: ${passed}/${checks.length}`);
    console.log(`❌ Xato: ${failed}/${checks.length}`);
    console.log('');
    
    if (failed === 0) {
      console.log('🎉 BARCHA TESTLAR MUVAFFAQIYATLI O\'TDI!');
    } else {
      console.log('⚠️  BA\'ZI TESTLAR XATO!');
    }
    
  } catch (error) {
    console.error('\n❌ Test xatosi:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database ulanishi yopildi');
    process.exit(0);
  }
}

// Script ni ishga tushirish
if (require.main === module) {
  test();
}

module.exports = test;
