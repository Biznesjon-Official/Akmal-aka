const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Eski adminni o'chirish
    await User.deleteMany({ username: 'admin' });
    console.log('🗑️  Eski admin o\'chirildi\n');

    // Yangi admin yaratish
    const admin = new User({
      username: 'admin',
      password: 'admin123', // Model'da avtomatik hash qilinadi
      role: 'admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Yangi admin yaratildi!\n');
    console.log('=====================================');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('=====================================\n');

    // Test qilish
    const testUser = await User.findOne({ username: 'admin' });
    const isMatch = await testUser.comparePassword('admin123');
    console.log('🧪 Parol testi:', isMatch ? '✅ ISHLAYDI' : '❌ ISHLAMAYDI');

    await mongoose.connection.close();
    console.log('\n✅ Tugadi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

createAdmin();
