/**
 * Test ma'lumotlarini yaratish
 * 
 * Bu skript quyidagilarni yaratadi:
 * 1. Test mijoz
 * 2. Test vagon
 * 3. Test lot (91.80 m³)
 * 4. Test sotuv (91.80 m³ - to'liq sotish)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');
const VagonSale = require('../models/VagonSale');
const { updateVagonTotals } = require('../utils/vagonHelpers');

async function createTestData() {
  try {
    console.log('🧪 Test ma\'lumotlarini yaratish boshlandi...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');
    
    // 1. Test mijoz yaratish
    console.log('👤 Test mijoz yaratilmoqda...');
    const testClient = await Client.create({
      name: 'Test Mijoz',
      phone: '+998901234567',
      address: 'Test manzil, Toshkent'
    });
    console.log(`✅ Mijoz yaratildi: ${testClient.name} (ID: ${testClient._id})\n`);
    
    // 2. Test vagon yaratish
    console.log('🚛 Test vagon yaratilmoqda...');
    const testVagon = await Vagon.create({
      vagonCode: 'TEST-2025-001',
      vagon_number: 'TEST001',
      month: 'Yanvar 2025',
      sending_place: 'Rossiya',
      receiving_place: 'O\'zbekiston',
      status: 'active'
    });
    console.log(`✅ Vagon yaratildi: ${testVagon.vagonCode} (ID: ${testVagon._id})\n`);
    
    // 3. Test lot yaratish (91.80 m³)
    console.log('📦 Test lot yaratilmoqda (91.80 m³)...');
    const testLot = await VagonLot.create({
      vagon: testVagon._id,
      dimensions: '150x50x25',
      quantity: 100,
      volume_m3: 91.80,
      purchase_currency: 'USD',
      purchase_amount: 5000,
      total_investment: 5000,
      warehouse_available_volume_m3: 91.80,
      warehouse_remaining_volume_m3: 91.80,
      remaining_quantity: 100
    });
    console.log(`✅ Lot yaratildi: ${testLot.dimensions} - ${testLot.volume_m3} m³ (ID: ${testLot._id})\n`);
    
    // 4. Vagon ma'lumotlarini yangilash
    console.log('🔄 Vagon ma\'lumotlarini yangilash...');
    await updateVagonTotals(testVagon._id);
    
    const updatedVagon = await Vagon.findById(testVagon._id);
    console.log(`✅ Vagon yangilandi:`);
    console.log(`   Status: ${updatedVagon.status}`);
    console.log(`   Jami hajm: ${updatedVagon.total_volume_m3} m³`);
    console.log(`   Qolgan hajm: ${updatedVagon.remaining_volume_m3} m³\n`);
    
    // 5. Natijalarni ko'rsatish
    console.log('=' .repeat(60));
    console.log('📊 YARATILGAN TEST MA\'LUMOTLAR:');
    console.log('='.repeat(60));
    console.log(`👤 Mijoz: ${testClient.name} (${testClient.phone})`);
    console.log(`🚛 Vagon: ${testVagon.vagonCode} - Status: ${updatedVagon.status}`);
    console.log(`📦 Lot: ${testLot.dimensions} - ${testLot.volume_m3} m³`);
    console.log(`💰 Tannarx: ${testLot.purchase_amount} USD`);
    console.log('='.repeat(60));
    
    console.log('\n💡 KEYINGI QADAMLAR:');
    console.log('   1. Tizimga kiring (admin / admin123)');
    console.log('   2. "Vagon Sotuvi" sahifasiga o\'ting');
    console.log('   3. Quyidagi ma\'lumotlarni kiriting:');
    console.log(`      - Vagon: ${testVagon.vagonCode}`);
    console.log(`      - Lot: ${testLot.dimensions}`);
    console.log(`      - Mijoz: ${testClient.name}`);
    console.log(`      - Hajm: 91.80 m³ (to'liq hajm)`);
    console.log(`      - Narx: 100 USD/m³`);
    console.log('   4. Sotuvni saqlang');
    console.log('   5. Vagon statusini tekshiring (avtomatik "closed" bo\'lishi kerak)');
    
    console.log('\n✅ Test ma\'lumotlari muvaffaqiyatli yaratildi!');
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB dan uzildi');
  }
}

// Skriptni ishga tushirish
createTestData();
