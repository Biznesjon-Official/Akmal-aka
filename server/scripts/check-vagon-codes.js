const mongoose = require('mongoose');
require('dotenv').config();

async function checkVagonCodes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yogoch_export');
    console.log('✅ Connected to MongoDB');

    const Vagon = require('../models/Vagon');

    // Check all vagons
    const vagons = await Vagon.find({ isDeleted: false }).lean();
    
    console.log(`\n📦 Jami vagonlar: ${vagons.length}`);
    
    vagons.forEach((vagon, index) => {
      console.log(`\n${index + 1}. Vagon:`);
      console.log(`   _id: ${vagon._id}`);
      console.log(`   vagonCode: ${vagon.vagonCode || 'NULL ❌'}`);
      console.log(`   month: ${vagon.month || 'NULL'}`);
      console.log(`   sending_place: ${vagon.sending_place || 'NULL'}`);
      console.log(`   receiving_place: ${vagon.receiving_place || 'NULL'}`);
      console.log(`   total_volume_m3: ${vagon.total_volume_m3 || 0}`);
      console.log(`   usd_cost_price: ${vagon.usd_cost_price || 0}`);
      console.log(`   rub_cost_price: ${vagon.rub_cost_price || 0}`);
    });

    // Check vagons without vagonCode
    const vagonsWithoutCode = vagons.filter(v => !v.vagonCode);
    if (vagonsWithoutCode.length > 0) {
      console.log(`\n⚠️  ${vagonsWithoutCode.length} ta vagon vagonCode'siz!`);
      console.log('Bu vagonlarni tuzatish kerak.');
    } else {
      console.log('\n✅ Barcha vagonlarda vagonCode bor!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

checkVagonCodes();
