require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const ExchangeRate = require('./models/ExchangeRate');
const SystemSettings = require('./models/SystemSettings');

async function initializeSystem() {
  try {
    console.log('🔌 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Admin ni topish
    const User = require('./models/User');
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.error('❌ Admin topilmadi! Avval admin yarating.');
      process.exit(1);
    }

    console.log('🔧 SystemSettings ni initsializatsiya qilish...\n');
    await SystemSettings.initializeDefaultSettings();
    console.log('✅ SystemSettings tayyor\n');

    console.log('💱 Valyuta kurslarini qo\'shish...\n');

    // ExchangeRate lar
    const rates = [
      {
        currency: 'USD',
        rate: 12800,
        notes: 'Joriy kurs (1 USD = 12,800 RUB)',
        updatedBy: admin._id
      },
      {
        currency: 'RUB',
        rate: 130,
        notes: 'Joriy kurs (1 RUB = 130 USD)',
        updatedBy: admin._id
      }
    ];

    for (const rateData of rates) {
      // Agar mavjud bo'lsa, yangilash
      const existing = await ExchangeRate.findOne({ currency: rateData.currency });
      if (existing) {
        console.log(`⚠️  ${rateData.currency} kursi mavjud, yangilanmoqda...`);
        existing.rate = rateData.rate;
        existing.notes = rateData.notes;
        existing.updatedBy = admin._id;
        await existing.save();
      } else {
        const rate = new ExchangeRate(rateData);
        await rate.save();
      }
      console.log(`✅ ${rateData.currency}: ${rateData.notes}`);
    }

    console.log('\n✅ Tizim tayyor!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

initializeSystem();
