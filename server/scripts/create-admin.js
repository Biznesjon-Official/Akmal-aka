require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ga ulandi\n');

    // Username so'rash
    const username = await question('Admin username kiriting: ');
    if (!username || username.trim().length < 3) {
      console.log('❌ Username kamida 3 ta belgidan iborat bo\'lishi kerak!');
      rl.close();
      process.exit(1);
    }

    // Mavjud username tekshirish
    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      console.log('❌ Bu username allaqachon mavjud!');
      rl.close();
      process.exit(1);
    }

    // Parol so'rash
    const password = await question('Admin parol kiriting: ');
    if (!password || password.length < 6) {
      console.log('❌ Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
      rl.close();
      process.exit(1);
    }

    // Parolni shifrlash
    const hashedPassword = await bcrypt.hash(password, 10);

    // Admin yaratish
    const admin = new User({
      username: username.trim(),
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();

    console.log('\n✅ Admin muvaffaqiyatli yaratildi!');
    console.log('=====================================');
    console.log(`Username: ${username.trim()}`);
    console.log(`Password: ${password}`);
    console.log('Role: admin');
    console.log('=====================================');
    console.log('\n⚠️  MUHIM: Bu ma\'lumotlarni xavfsiz joyda saqlang!');

    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
