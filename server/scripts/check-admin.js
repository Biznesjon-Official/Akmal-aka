require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkAdmin() {
  try {
    console.log('MongoDB ga ulanmoqda...');
    console.log('URI:', process.env.MONGODB_URI ? 'Mavjud' : 'Topilmadi');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    const admins = await User.find({ role: 'admin' });
    console.log(`Topilgan adminlar soni: ${admins.length}\n`);
    
    if (admins.length === 0) {
      console.log('❌ Admin foydalanuvchi topilmadi!');
      console.log('\nAdmin yaratish uchun quyidagi scriptni ishga tushiring:');
      console.log('node server/scripts/create-admin.js');
    } else {
      console.log('✅ Admin foydalanuvchilar:');
      console.log('=====================================');
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. Username: ${admin.username}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Created: ${admin.createdAt}`);
      });
      console.log('\n=====================================');
      console.log('\n⚠️  ESLATMA: Parollar shifrlangan, ularni ko\'rish mumkin emas.');
      console.log('Agar parolni unutgan bo\'lsangiz, yangi admin yarating yoki parolni yangilang.');
    }

    await mongoose.connection.close();
    console.log('\n✅ MongoDB ulanishi yopildi');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkAdmin();
