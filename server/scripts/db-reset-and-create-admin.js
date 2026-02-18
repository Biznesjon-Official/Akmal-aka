const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetAndCreateAdmin() {
  try {
    console.log('=== DATABASE RESET & ADMIN CREATION ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Tasdiqlash
    console.log('⚠️  OGOHLANTIRISH: Bu script barcha ma\'lumotlarni o\'chiradi!');
    const confirm = await question('Davom etishni xohlaysizmi? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Bekor qilindi');
      rl.close();
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('\n🗑️  Barcha collectionlarni tozalash...\n');

    // Barcha collectionlarni olish
    const collections = await mongoose.connection.db.collections();
    
    for (let collection of collections) {
      const count = await collection.countDocuments();
      await collection.deleteMany({});
      console.log(`✅ ${collection.collectionName}: ${count} ta yozuv o'chirildi`);
    }

    console.log('\n✅ Database tozalandi!\n');

    // Admin yaratish
    console.log('=== YANGI ADMIN YARATISH ===\n');
    
    const username = await question('Admin username (default: admin): ') || 'admin';
    const password = await question('Admin parol (default: admin123): ') || 'admin123';

    if (password.length < 6) {
      console.log('❌ Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
      rl.close();
      await mongoose.connection.close();
      process.exit(1);
    }

    const User = require('../models/User');

    // Parolni hash qilish
    const hashedPassword = await bcrypt.hash(password, 12);

    // Admin yaratish
    const admin = new User({
      username: username.trim(),
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('\n✅ Admin muvaffaqiyatli yaratildi!');
    console.log('=====================================');
    console.log(`Username: ${username.trim()}`);
    console.log(`Password: ${password}`);
    console.log('Role: admin');
    console.log('=====================================');
    console.log('\n⚠️  MUHIM: Bu ma\'lumotlarni xavfsiz joyda saqlang!');
    console.log('\nEndi login qilishingiz mumkin: http://localhost:3000/login');

    rl.close();
    await mongoose.connection.close();
    console.log('\n✅ MongoDB ulanishi yopildi');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
}

resetAndCreateAdmin();
