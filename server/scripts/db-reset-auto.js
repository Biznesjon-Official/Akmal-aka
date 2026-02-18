const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetAndCreateAdmin() {
  try {
    console.log('=== DATABASE RESET & ADMIN CREATION ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    console.log('🗑️  Barcha collectionlarni tozalash...\n');

    // Barcha collectionlarni olish
    const collections = await mongoose.connection.db.collections();
    
    let totalDeleted = 0;
    for (let collection of collections) {
      const count = await collection.countDocuments();
      await collection.deleteMany({});
      totalDeleted += count;
      console.log(`✅ ${collection.collectionName}: ${count} ta yozuv o'chirildi`);
    }

    console.log(`\n✅ Jami ${totalDeleted} ta yozuv o'chirildi!\n`);

    // Admin yaratish
    console.log('=== YANGI ADMIN YARATISH ===\n');
    
    const username = 'admin';
    const password = 'admin123';

    const User = require('../models/User');

    // Parolni hash qilish
    const hashedPassword = await bcrypt.hash(password, 12);

    // Admin yaratish
    const admin = new User({
      username: username,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('✅ Admin muvaffaqiyatli yaratildi!');
    console.log('=====================================');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('Role: admin');
    console.log('Active: true');
    console.log('=====================================');
    console.log('\n⚠️  MUHIM: Bu ma\'lumotlarni xavfsiz joyda saqlang!');
    console.log('\nLogin qilish uchun:');
    console.log('  URL: http://localhost:3000/login');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);

    await mongoose.connection.close();
    console.log('\n✅ MongoDB ulanishi yopildi');
    console.log('✅ Jarayon tugadi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetAndCreateAdmin();
