const mongoose = require('mongoose');
require('dotenv').config();

const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');
const VagonSale = require('../models/VagonSale');
const { updateVagonTotals } = require('../utils/vagonHelpers');

async function fixVagonCalculations() {
  try {
    console.log('🔄 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // 1. Barcha VagonLot'larni qayta hisoblash
    console.log('\n📊 1. VagonLot larni qayta hisoblash...');
    const lots = await VagonLot.find({ isDeleted: false });
    console.log(`Jami ${lots.length} ta lot topildi`);

    let fixedLots = 0;
    for (const lot of lots) {
      try {
        // Pre-save hook ishga tushishi uchun save() qilish
        await lot.save();
        fixedLots++;
        
        if (fixedLots % 10 === 0) {
          console.log(`✅ ${fixedLots}/${lots.length} lot qayta hisoblandi`);
        }
      } catch (error) {
        console.error(`❌ Lot ${lot._id} qayta hisoblashda xatolik:`, error.message);
      }
    }
    console.log(`✅ ${fixedLots} ta lot muvaffaqiyatli qayta hisoblandi`);

    // 2. Barcha VagonSale'larni qayta hisoblash
    console.log('\n💰 2. VagonSale larni qayta hisoblash...');
    const sales = await VagonSale.find({ isDeleted: false });
    console.log(`Jami ${sales.length} ta sotuv topildi`);

    let fixedSales = 0;
    for (const sale of sales) {
      try {
        // Pre-save hook ishga tushishi uchun save() qilish
        await sale.save();
        fixedSales++;
        
        if (fixedSales % 10 === 0) {
          console.log(`✅ ${fixedSales}/${sales.length} sotuv qayta hisoblandi`);
        }
      } catch (error) {
        console.error(`❌ Sotuv ${sale._id} qayta hisoblashda xatolik:`, error.message);
      }
    }
    console.log(`✅ ${fixedSales} ta sotuv muvaffaqiyatli qayta hisoblandi`);

    // 3. Barcha Vagon'larni qayta hisoblash
    console.log('\n🚂 3. Vagon larni qayta hisoblash...');
    const vagons = await Vagon.find({ isDeleted: false });
    console.log(`Jami ${vagons.length} ta vagon topildi`);

    let fixedVagons = 0;
    for (const vagon of vagons) {
      try {
        await updateVagonTotals(vagon._id);
        fixedVagons++;
        
        if (fixedVagons % 5 === 0) {
          console.log(`✅ ${fixedVagons}/${vagons.length} vagon qayta hisoblandi`);
        }
      } catch (error) {
        console.error(`❌ Vagon ${vagon._id} qayta hisoblashda xatolik:`, error.message);
      }
    }
    console.log(`✅ ${fixedVagons} ta vagon muvaffaqiyatli qayta hisoblandi`);

    // 4. Natijalarni tekshirish
    console.log('\n📈 4. Natijalarni tekshirish...');
    
    const sampleVagon = await Vagon.findOne({ isDeleted: false });
    
    if (sampleVagon) {
      console.log('\n📊 Namuna vagon ma\'lumotlari:');
      console.log(`Vagon kodi: ${sampleVagon.vagonCode}`);
      console.log(`Jami hajm: ${sampleVagon.total_volume_m3} m³`);
      console.log(`Mavjud hajm: ${sampleVagon.available_volume_m3} m³`);
      console.log(`Sotilgan hajm: ${sampleVagon.sold_volume_m3} m³`);
      console.log(`Qolgan hajm: ${sampleVagon.remaining_volume_m3} m³`);
      console.log(`USD xarajat: $${sampleVagon.usd_total_cost}`);
      console.log(`USD daromad: $${sampleVagon.usd_total_revenue}`);
      console.log(`USD foyda: $${sampleVagon.usd_profit}`);
      console.log(`RUB xarajat: ₽${sampleVagon.rub_total_cost}`);
      console.log(`RUB daromad: ₽${sampleVagon.rub_total_revenue}`);
      console.log(`RUB foyda: ₽${sampleVagon.rub_profit}`);
    }

    console.log('\n🎉 Barcha hisoblashlar muvaffaqiyatli tuzatildi!');
    console.log(`📊 Jami: ${fixedLots} lot, ${fixedSales} sotuv, ${fixedVagons} vagon`);

  } catch (error) {
    console.error('❌ Umumiy xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB dan uzildi');
  }
}

// Script'ni ishga tushirish
if (require.main === module) {
  fixVagonCalculations();
}

module.exports = { fixVagonCalculations };