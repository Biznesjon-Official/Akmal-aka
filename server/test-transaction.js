/**
 * Test script to verify MongoDB transactions are working
 * 
 * Usage:
 *   node test-transaction.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testTransaction() {
  try {
    console.log('🔌 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Check if replica set is enabled
    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();
    
    if (!serverStatus.repl) {
      console.log('❌ XATO: MongoDB replica set rejimida ishlamayapti!');
      console.log('📝 Transaction\'lar faqat replica set\'da ishlaydi.\n');
      console.log('🔧 Yechim:');
      console.log('   1. mongod --replSet rs0');
      console.log('   2. mongo --eval "rs.initiate()"\n');
      process.exit(1);
    }

    console.log('✅ Replica set faol:', serverStatus.repl.setName);
    console.log('✅ Transaction\'lar ishlaydi!\n');

    // Test a simple transaction
    console.log('🧪 Transaction testini boshlash...');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create a test collection
      const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
      
      await TestModel.create([{ name: 'test' }], { session });
      console.log('✅ Transaction ichida document yaratildi');
      
      await session.commitTransaction();
      console.log('✅ Transaction commit qilindi');
      
      // Clean up
      await TestModel.deleteMany({ name: 'test' });
      console.log('✅ Test ma\'lumotlari tozalandi\n');
      
      console.log('🎉 Barcha testlar muvaffaqiyatli o\'tdi!');
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('❌ Test xatosi:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 MongoDB ulanishi yopildi');
  }
}

// Run test
testTransaction();
