const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function createAdmin() {
  try {
    // MongoDB'ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // Mavjud adminni tekshirish
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('\n📋 Mavjud Admin:');
      console.log('Username:', existingAdmin.username);
      console.log('Role:', existingAdmin.role);
      console.log('\n⚠️  Admin allaqachon mavjud!');
      console.log('Agar parolni unutgan bo\'lsangiz, database\'dan o\'chirib qayta yarating.');
      process.exit(0);
    }

    // Yangi admin yaratish
    const username = 'admin';
    const password = 'admin123';
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await User.create({
      username,
      password: hashedPassword,
      role: 'admin'
    });

    console.log('\n✅ Admin muvaffaqiyatli yaratildi!');
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

createAdmin();
