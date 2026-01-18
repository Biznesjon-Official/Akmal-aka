require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const ExchangeRate = require('./models/ExchangeRate');

async function seedExchangeRates() {
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

    console.log('💱 Valyuta kurslarini qo\'shish...\n');

    const rates = [
      {
        currency: 'USD',
        rate: 12800,
        notes: 'Joriy kurs',
        updatedBy: admin._id
      },
      {
        currency: 'RUB',
        rate: 130,
        notes: 'Joriy kurs',
        updatedBy: admin._id
      }
    ];

    for (const rateData of rates) {
      const rate = new ExchangeRate(rateData);
      await rate.save();
      console.log(`✅ ${rateData.currency}: 1 ${rateData.currency} = ${rateData.rate.toLocaleString()} ${rateData.currency === 'USD' ? 'RUB' : 'USD'}`);
    }

    console.log('\n✅ Valyuta kurslari qo\'shildi!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

seedExchangeRates();
