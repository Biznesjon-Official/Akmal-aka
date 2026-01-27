/**
 * Vagon hajmlarini tuzatish skripti
 * 
 * Bu skript:
 * 1. Barcha vagonlarni tekshiradi
 * 2. Har bir vagon uchun lotlardan hajmlarni qayta hisoblaydi
 * 3. Vagon ma'lumotlarini yangilaydi
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');

async function fixVagonVolumes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');
    
    // Barcha vagonlarni olish
    const vagons = await Vagon.find({ isDeleted: false });
    
    console.log(`📊 Jami vagonlar: ${vagons.length}\n`);
    console.log('='.repeat(80));
    
    for (const vagon of vagons) {
      console.log(`\n🚂 VAGON: ${vagon.vagonCode}`);
      console.log('-'.repeat(80));
      
      // Vagon lotlarini olish
      const lots = await VagonLot.find({
        vagon: vagon._id,
        isDeleted: false
      });
      
      console.log(`   Lotlar soni: ${lots.length}`);
      
      if (lots.length === 0) {
        console.log(`   ⚠️  Bu vagonda lotlar yo'q`);
        
        // Agar lotlar yo'q bo'lsa, hajmlarni 0 ga o'rnatish
        vagon.total_volume_m3 = 0;
        vagon.total_loss_m3 = 0;
        vagon.available_volume_m3 = 0;
        vagon.sold_volume_m3 = 0;
        vagon.remaining_volume_m3 = 0;
        vagon.usd_total_cost = 0;
        vagon.usd_total_revenue = 0;
        vagon.usd_profit = 0;
        vagon.rub_total_cost = 0;
        vagon.rub_total_revenue = 0;
        vagon.rub_profit = 0;
        
        await vagon.save();
        console.log(`   ✅ Vagon hajmlari 0 ga o'rnatildi`);
        continue;
      }
      
      // Eski qiymatlar
      const oldTotalVolume = vagon.total_volume_m3;
      const oldAvailableVolume = vagon.available_volume_m3;
      const oldSoldVolume = vagon.sold_volume_m3;
      const oldRemainingVolume = vagon.remaining_volume_m3;
      
      // Yangi qiymatlarni hisoblash
      let totalVolume = 0;
      let totalLoss = 0;
      let availableVolume = 0;
      let soldVolume = 0;
      let remainingVolume = 0;
      
      let usdTotalCost = 0;
      let usdTotalRevenue = 0;
      let usdProfit = 0;
      
      let rubTotalCost = 0;
      let rubTotalRevenue = 0;
      let rubProfit = 0;
      
      console.log(`\n   📦 Lotlar tafsiloti:`);
      lots.forEach((lot, index) => {
        console.log(`      ${index + 1}. ${lot.dimensions}`);
        console.log(`         Hajm: ${lot.volume_m3} m³`);
        console.log(`         Brak: ${lot.loss_volume_m3 || 0} m³`);
        console.log(`         Mavjud: ${lot.warehouse_available_volume_m3 || 0} m³`);
        console.log(`         Sotilgan: ${lot.warehouse_dispatched_volume_m3 || 0} m³`);
        console.log(`         Qolgan: ${lot.warehouse_remaining_volume_m3 || 0} m³`);
        console.log(`         Valyuta: ${lot.purchase_currency}`);
        
        // Hajmlarni yig'ish
        totalVolume += lot.volume_m3 || 0;
        totalLoss += lot.loss_volume_m3 || 0;
        availableVolume += lot.warehouse_available_volume_m3 || lot.available_volume_m3 || 0;
        soldVolume += lot.warehouse_dispatched_volume_m3 || lot.sold_volume_m3 || 0;
        remainingVolume += lot.warehouse_remaining_volume_m3 || lot.remaining_volume_m3 || 0;
        
        // Moliyaviy ma'lumotlarni yig'ish
        if (lot.purchase_currency === 'USD') {
          usdTotalCost += lot.total_investment || lot.total_expenses || 0;
          usdTotalRevenue += lot.total_revenue || 0;
          usdProfit += lot.realized_profit || lot.profit || 0;
        } else if (lot.purchase_currency === 'RUB') {
          rubTotalCost += lot.total_investment || lot.total_expenses || 0;
          rubTotalRevenue += lot.total_revenue || 0;
          rubProfit += lot.realized_profit || lot.profit || 0;
        }
      });
      
      // Vagon ma'lumotlarini yangilash
      vagon.total_volume_m3 = totalVolume;
      vagon.total_loss_m3 = totalLoss;
      vagon.available_volume_m3 = availableVolume;
      vagon.sold_volume_m3 = soldVolume;
      vagon.remaining_volume_m3 = remainingVolume;
      
      vagon.usd_total_cost = usdTotalCost;
      vagon.usd_total_revenue = usdTotalRevenue;
      vagon.usd_profit = usdProfit;
      
      vagon.rub_total_cost = rubTotalCost;
      vagon.rub_total_revenue = rubTotalRevenue;
      vagon.rub_profit = rubProfit;
      
      await vagon.save();
      
      // O'zgarishlarni ko'rsatish
      console.log(`\n   📊 YANGILANGAN QIYMATLAR:`);
      console.log(`      Jami hajm: ${oldTotalVolume.toFixed(2)} → ${totalVolume.toFixed(2)} m³`);
      console.log(`      Mavjud hajm: ${oldAvailableVolume.toFixed(2)} → ${availableVolume.toFixed(2)} m³`);
      console.log(`      Sotilgan hajm: ${oldSoldVolume.toFixed(2)} → ${soldVolume.toFixed(2)} m³`);
      console.log(`      Qolgan hajm: ${oldRemainingVolume.toFixed(2)} → ${remainingVolume.toFixed(2)} m³`);
      
      // O'zgarish borligini tekshirish
      const hasChanges = 
        Math.abs(oldTotalVolume - totalVolume) > 0.01 ||
        Math.abs(oldAvailableVolume - availableVolume) > 0.01 ||
        Math.abs(oldSoldVolume - soldVolume) > 0.01 ||
        Math.abs(oldRemainingVolume - remainingVolume) > 0.01;
      
      if (hasChanges) {
        console.log(`   ✅ Vagon hajmlari tuzatildi`);
      } else {
        console.log(`   ℹ️  O'zgarish yo'q`);
      }
      
      console.log('\n' + '='.repeat(80));
    }
    
    console.log('\n✅ Barcha vagonlar tuzatildi');
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB dan uzildi');
  }
}

// Skriptni ishga tushirish
fixVagonVolumes();
