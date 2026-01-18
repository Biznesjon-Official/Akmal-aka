require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('📊 BARCHA KOLLEKSIYALAR:\n');
    
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`${collection.name}: ${count} ta document`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

checkDatabase();
