const mongoose = require('mongoose');
const Vagon = require('../models/Vagon');
const Counter = require('../models/Counter');
require('dotenv').config();

async function fixVagonCounter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 MongoDB ga ulanildi');
    
    const currentYear = new Date().getFullYear();
    
    // Joriy yildagi eng katta vagon kodini topish
    const lastVagon = await Vagon.findOne({
      vagonCode: new RegExp(`^VAG-${currentYear}-\\d{3}$`),
      isDeleted: false
    })
    .sort({ vagonCode: -1 })
    .select('vagonCode')
    .lean();
    
    let maxNumber = 0;
    
    if (lastVagon && lastVagon.vagonCode) {
      const match = lastVagon.vagonCode.match(/VAG-\d{4}-(\d{3})$/);
      if (match) {
        maxNumber = parseInt(match[1], 10);
        console.log(`📋 Eng katta vagon kodi: ${lastVagon.vagonCode} (raqam: ${maxNumber})`);
      }
    }
    
    // Counter'ni to'g'ri qiymatga o'rnatish
    const sequenceName = `vagon_${currentYear}`;
    await Counter.findOneAndUpdate(
      { _id: sequenceName },
      { sequence_value: maxNumber },
      { upsert: true }
    );
    
    console.log(`✅ Counter o'rnatildi: ${sequenceName} = ${maxNumber}`);
    console.log(`🔢 Keyingi vagon kodi: VAG-${currentYear}-${String(maxNumber + 1).padStart(3, '0')}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

fixVagonCounter();