const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function resetAdmin() {
  try {
    // MongoDB'ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // Eski adminni o'chirish
    await User.deleteMany({ role: 'admin' });
    console.log('🗑️  Eski admin o\'chirildi');

    // Yangi admin yaratish
    const username = 'admin';
    const password = 'admin123';
    
    // Model o'zi parolni hash qiladi (pre save middleware)
    await User.create({
      username,
      password, // Oddiy text - model hash qiladi
      role: 'admin',
      isActive: true
    });

    console.log('\n✅ Yangi admin yaratildi!');
    console.log('\n📋 Login Ma\'lumotlari:');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('\n⚠️  MUHIM: Tizimga kirganingizdan keyin parolni o\'zgartiring!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

resetAdmin();
