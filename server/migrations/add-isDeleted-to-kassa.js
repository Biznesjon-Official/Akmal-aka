const mongoose = require('mongoose');
require('dotenv').config();

async function addIsDeletedToKassa() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wood_system');
    console.log('✅ MongoDB ga ulandi');

    const db = mongoose.connection.db;
    const Kassa = db.collection('kassas');

    // Barcha Kassa yozuvlariga isDeleted field qo'shish
    const result = await Kassa.updateMany(
      { isDeleted: { $exists: false } }, // isDeleted field yo'q bo'lganlar
      { 
        $set: { 
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deleteReason: null
        } 
      }
    );

    console.log(`✅ ${result.modifiedCount} ta Kassa yozuviga isDeleted field qo'shildi`);
    
    // Tekshirish
    const totalKassa = await Kassa.countDocuments({});
    const activeKassa = await Kassa.countDocuments({ isDeleted: false });
    
    console.log(`📊 Jami Kassa yozuvlar: ${totalKassa}`);
    console.log(`📊 Aktiv Kassa yozuvlar: ${activeKassa}`);

    await mongoose.connection.close();
    console.log('✅ Migration tugadi');
  } catch (error) {
    console.error('❌ Migration xatosi:', error);
    process.exit(1);
  }
}

addIsDeletedToKassa();
