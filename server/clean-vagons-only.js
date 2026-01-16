require('dotenv').config();
const mongoose = require('mongoose');

async function cleanVagons() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // Vagonlar va bog'liq ma'lumotlarni o'chirish
    const result1 = await mongoose.connection.db.collection('vagons').deleteMany({});
    console.log(`✅ ${result1.deletedCount} ta vagon o'chirildi`);
    
    const result2 = await mongoose.connection.db.collection('vagonlots').deleteMany({});
    console.log(`✅ ${result2.deletedCount} ta lot o'chirildi`);
    
    const result3 = await mongoose.connection.db.collection('vagonexpenses').deleteMany({});
    console.log(`✅ ${result3.deletedCount} ta xarajat o'chirildi`);
    
    const result4 = await mongoose.connection.db.collection('vagonsales').deleteMany({});
    console.log(`✅ ${result4.deletedCount} ta sotuv o'chirildi`);
    
    console.log('\n🎉 Barcha vagon ma\'lumotlari tozalandi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

cleanVagons();
