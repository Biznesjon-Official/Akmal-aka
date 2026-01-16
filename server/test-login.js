const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function testLogin() {
  try {
    // MongoDB'ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Barcha userlarni ko'rish
    const users = await User.find({});
    console.log('📋 Database\'dagi barcha userlar:');
    users.forEach(user => {
      console.log(`  - Username: ${user.username}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    isActive: ${user.isActive}`);
      console.log(`    Password hash: ${user.password.substring(0, 20)}...`);
      console.log('');
    });

    // Admin'ni topish
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.log('❌ Admin topilmadi!');
      process.exit(1);
    }

    console.log('✅ Admin topildi:');
    console.log(`  Username: ${admin.username}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  isActive: ${admin.isActive}`);
    console.log('');

    // Parolni tekshirish
    const testPassword = 'admin123';
    console.log(`🔐 Parolni tekshirish: "${testPassword}"`);
    
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    console.log(`  Natija: ${isMatch ? '✅ TO\'G\'RI' : '❌ NOTO\'G\'RI'}`);
    
    if (!isMatch) {
      console.log('\n⚠️  Parol noto\'g\'ri! Yangi admin yaratish kerak.');
    } else {
      console.log('\n✅ Login ishlashi kerak!');
      console.log('📋 Login ma\'lumotlari:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

testLogin();
