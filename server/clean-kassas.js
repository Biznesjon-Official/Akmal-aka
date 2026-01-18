require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function cleanKassas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Eski Kassa kolleksiyasini o'chirish
    const result = await mongoose.connection.db.collection('kassas').deleteMany({});
    console.log(`✅ Eski Kassa ma'lumotlari o'chirildi: ${result.deletedCount} ta\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

cleanKassas();
