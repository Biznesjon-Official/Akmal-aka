const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    const User = require('../models/User');
    
    const username = 'admin';
    const password = 'admin123';
    
    console.log(`Testing login with:`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}\n`);

    // Foydalanuvchini topish
    const user = await User.findOne({ username, isActive: true });
    
    if (!user) {
      console.log('❌ Foydalanuvchi topilmadi!');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('✅ Foydalanuvchi topildi:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Password hash: ${user.password.substring(0, 20)}...\n`);

    // Parolni tekshirish (comparePassword metodi)
    console.log('Testing comparePassword method...');
    const isMatch = await user.comparePassword(password);
    console.log(`Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}\n`);

    // To'g'ridan-to'g'ri bcrypt bilan tekshirish
    console.log('Testing direct bcrypt.compare...');
    const directMatch = await bcrypt.compare(password, user.password);
    console.log(`Result: ${directMatch ? '✅ MATCH' : '❌ NO MATCH'}\n`);

    if (!isMatch && !directMatch) {
      console.log('⚠️  Parol mos kelmadi. Parolni qayta o\'rnatish kerak.');
      console.log('Run: node server/scripts/reset-admin-password.js');
    } else if (isMatch) {
      console.log('✅ Login ishlashi kerak!');
      console.log('\nLogin credentials:');
      console.log('=====================================');
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
      console.log('=====================================');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testLogin();
