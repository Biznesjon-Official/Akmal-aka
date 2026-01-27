const mongoose = require('mongoose');
require('dotenv').config();

const VagonLot = require('../models/VagonLot');

async function fixRemainingQuantity() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ga ulandi');

    // Barcha lot'larni olish
    const lots = await VagonLot.find({ isDeleted: false });
    console.log(`Jami ${lots.length} ta lot topildi`);

    let updatedCount = 0;

    for (const lot of lots) {
      const oldRemainingQuantity = lot.remaining_quantity;
      
      // Pre-save hook'ni ishga tushirish uchun save qilish
      await lot.save();
      
      if (lot.remaining_quantity !== oldRemainingQuantity) {
        console.log(`Lot ${lot._id}: ${oldRemainingQuantity} -> ${lot.remaining_quantity} dona`);
        updatedCount++;
      }
    }

    console.log(`\n${updatedCount} ta lot yangilandi`);
    console.log('Tugadi!');
    
  } catch (error) {
    console.error('Xatolik:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixRemainingQuantity();