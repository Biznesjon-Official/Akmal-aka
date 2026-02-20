const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
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
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   DATABASE RESET & ADMIN CREATION SCRIPT      ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');
    console.log(`📊 Database: ${mongoose.connection.name}\n`);

    // Tasdiqlash
    console.log('⚠️  OGOHLANTIRISH: Bu script BARCHA ma\'lumotlarni o\'chiradi!');
    console.log('   - Barcha vagonlar');
    console.log('   - Barcha sotuvlar');
    console.log('   - Barcha xarajatlar');
    console.log('   - Barcha mijozlar');
    console.log('   - Barcha kassa operatsiyalari');
    console.log('   - Barcha foydalanuvchilar\n');
    
    const confirm = await question('Rostdan ham davom etmoqchimisiz? (YES ni yozing): ');
    
    if (confirm !== 'YES') {
      console.log('❌ Bekor qilindi');
      rl.close();
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('\n🗑️  Barcha collectionlarni tozalash boshlandi...\n');

    // Barcha collectionlarni olish
    const collections = await mongoose.connection.db.collections();
    
    let totalDeleted = 0;
    for (let collection of collections) {
      const count = await collection.countDocuments();
      await collection.deleteMany({});
      totalDeleted += count;
      console.log(`   ✓ ${collection.collectionName.padEnd(30)} ${count.toString().padStart(6)} ta yozuv o'chirildi`);
    }

    console.log(`\n✅ Jami ${totalDeleted} ta yozuv o'chirildi!\n`);

    // Admin yaratish
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          YANGI ADMIN YARATISH                  ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    const username = await question('Admin username (Enter = admin): ') || 'admin';
    const password = await question('Admin parol (Enter = admin123): ') || 'admin123';

    if (password.length < 6) {
      console.log('❌ Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
      rl.close();
      await mongoose.connection.close();
      process.exit(1);
    }

    const User = require('../models/User');

    // Admin yaratish (Model avtomatik hash qiladi)
    const admin = new User({
      username: username.trim(),
      password: password, // Model pre-save hook'da hash qiladi
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('\n✅ Admin muvaffaqiyatli yaratildi!');
    console.log('╔════════════════════════════════════════════════╗');
    console.log(`║ Username: ${username.trim().padEnd(37)} ║`);
    console.log(`║ Password: ${password.padEnd(37)} ║`);
    console.log('║ Role:     admin                                ║');
    console.log('╚════════════════════════════════════════════════╝');

    // Default valyuta kurslarini yaratish
    console.log('\n💱 Default valyuta kurslarini yaratish...\n');
    
    try {
      const ExchangeRate = require('../models/ExchangeRate');
      
      const defaultRates = [
        {
          from_currency: 'USD',
          to_currency: 'RUB',
          rate: 90,
          is_active: true,
          created_by: admin._id
        },
        {
          from_currency: 'RUB',
          to_currency: 'USD',
          rate: 0.0111,
          is_active: true,
          created_by: admin._id
        }
      ];
      
      for (const rateData of defaultRates) {
        const rate = new ExchangeRate(rateData);
        await rate.save();
        console.log(`   ✓ ${rateData.from_currency} → ${rateData.to_currency}: ${rateData.rate}`);
      }
      
      console.log('\n✅ Valyuta kurslari yaratildi!');
    } catch (error) {
      console.log('⚠️  Valyuta kurslarini yaratishda xatolik:', error.message);
    }

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║              TAYYOR!                           ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n⚠️  MUHIM: Login ma\'lumotlarini xavfsiz joyda saqlang!');
    console.log('\n🌐 Login qilish:');
    console.log('   Development: http://localhost:3000/login');
    console.log('   Production:  https://akmalaka.biznesjon.uz/login\n');

    rl.close();
    await mongoose.connection.close();
    console.log('✅ MongoDB ulanishi yopildi');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Xatolik yuz berdi:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
}

resetAndCreateAdmin();
