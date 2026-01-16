#!/usr/bin/env node

/**
 * Migration Script: Vagon Model Field Update
 * 
 * Eski field: sold_volume_m3
 * Yangi fieldlar: sent_volume_m3, accepted_volume_m3
 * 
 * Bu script eski ma'lumotlarni yangi strukturaga o'tkazadi
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Vagon = require('../server/models/Vagon');
const VagonSale = require('../server/models/VagonSale');

async function migrate() {
  try {
    console.log('🚀 Migration boshlandi...\n');
    
    // Database ga ulanish
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vagon-system');
    console.log('✅ Database ga ulandi\n');
    
    // Barcha vagonlarni olish
    const vagons = await Vagon.find({ isDeleted: false });
    console.log(`📦 Jami vagonlar: ${vagons.length}\n`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const vagon of vagons) {
      console.log(`\n🚂 Vagon: ${vagon.vagonCode}`);
      
      // Agar yangi fieldlar mavjud bo'lsa, o'tkazib yuborish
      if (vagon.sent_volume_m3 !== undefined && vagon.accepted_volume_m3 !== undefined) {
        console.log('   ⏭️  Allaqachon yangilangan');
        skipped++;
        continue;
      }
      
      // Ushbu vagon bo'yicha barcha sotuvlarni olish
      const sales = await VagonSale.find({ 
        vagon: vagon._id, 
        isDeleted: false 
      });
      
      console.log(`   📊 Sotuvlar soni: ${sales.length}`);
      
      // Hajmlarni hisoblash
      let totalSent = 0;
      let totalAccepted = 0;
      
      sales.forEach(sale => {
        totalSent += sale.sent_volume_m3;
        totalAccepted += sale.accepted_volume_m3;
      });
      
      console.log(`   📤 Yuborilgan: ${totalSent} m³`);
      console.log(`   ✅ Qabul qilingan: ${totalAccepted} m³`);
      
      // Vagonni yangilash
      vagon.sent_volume_m3 = totalSent;
      vagon.accepted_volume_m3 = totalAccepted;
      
      // Eski fieldni o'chirish (agar mavjud bo'lsa)
      if (vagon.sold_volume_m3 !== undefined) {
        vagon.sold_volume_m3 = undefined;
      }
      
      await vagon.save();
      console.log('   ✅ Yangilandi');
      updated++;
    }
    
    console.log('\n\n📊 NATIJALAR:');
    console.log(`   ✅ Yangilandi: ${updated}`);
    console.log(`   ⏭️  O'tkazib yuborildi: ${skipped}`);
    console.log(`   📦 Jami: ${vagons.length}`);
    
    console.log('\n✅ Migration muvaffaqiyatli yakunlandi!');
    
  } catch (error) {
    console.error('\n❌ Migration xatosi:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database ulanishi yopildi');
    process.exit(0);
  }
}

// Script ni ishga tushirish
if (require.main === module) {
  migrate();
}

module.exports = migrate;
