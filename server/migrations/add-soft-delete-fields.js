/**
 * Migration: Add soft delete fields to all collections
 * Run this script once to add isDeleted: false to all existing documents
 * 
 * Usage:
 *   node migrations/add-soft-delete-fields.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    const db = mongoose.connection.db;

    // Collections to update
    const collections = [
      'woods',
      'purchases',
      'sales',
      'expenses',
      'transports',
      'kassas'
    ];

    for (const collectionName of collections) {
      console.log(`\n🔄 ${collectionName} ni yangilanmoqda...`);
      
      const result = await db.collection(collectionName).updateMany(
        { isDeleted: { $exists: false } }, // Faqat isDeleted yo'q bo'lganlarni
        { $set: { isDeleted: false } }
      );

      console.log(`✅ ${collectionName}: ${result.modifiedCount} ta document yangilandi`);
    }

    console.log('\n✅ Migration muvaffaqiyatli bajarildi!');
    
  } catch (error) {
    console.error('❌ Migration xatosi:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 MongoDB ulanishi yopildi');
  }
}

// Run migration
migrate();
