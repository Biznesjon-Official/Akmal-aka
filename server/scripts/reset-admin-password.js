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

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    const User = require('../models/User');
    
    // Admin username so'rash
    const username = await question('Admin username kiriting (default: admin): ') || 'admin';
    
    const user = await User.findOne({ username: username.trim() });
    
    if (!user) {
      console.log(`❌ "${username}" nomli foydalanuvchi topilmadi!`);
      rl.close();
      process.exit(1);
    }

    console.log(`\n✅ Foydalanuvchi topildi: ${user.username} (${user.role})\n`);

    // Yangi parol so'rash
    const newPassword = await question('Yangi parol kiriting: ');
    
    if (!newPassword || newPassword.length < 6) {
      console.log('❌ Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
      rl.close();
      process.exit(1);
    }

    // Parolni yangilash (pre-save hook avtomatik hash qiladi)
    user.password = newPassword;
    await user.save();

    console.log('\n✅ Parol muvaffaqiyatli yangilandi!');
    console.log('=====================================');
    console.log(`Username: ${user.username}`);
    console.log(`New Password: ${newPassword}`);
    console.log(`Role: ${user.role}`);
    console.log('=====================================');
    console.log('\n⚠️  MUHIM: Bu ma\'lumotlarni xavfsiz joyda saqlang!');

    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    rl.close();
    process.exit(1);
  }
}

resetPassword();
