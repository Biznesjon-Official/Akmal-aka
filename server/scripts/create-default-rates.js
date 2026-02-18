const mongoose = require('mongoose');
const ExchangeRate = require('../models/ExchangeRate');
require('dotenv').config();

async function createDefaultRates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Mavjud kurslarni o'chirish
    await ExchangeRate.deleteMany({});
    console.log('🗑️  Eski kurslar o\'chirildi\n');

    // Default kurslar
    const rates = [
      {
        from_currency: 'USD',
        to_currency: 'RUB',
        rate: 90,
        is_active: true,
        source: 'manual',
        notes: 'Default kurs'
      },
      {
        from_currency: 'RUB',
        to_currency: 'USD',
        rate: 0.011,
        is_active: true,
        source: 'manual',
        notes: 'Default kurs'
      }
    ];

    for (const rate of rates) {
      await ExchangeRate.create(rate);
      console.log(`✅ Kurs yaratildi: 1 ${rate.from_currency} = ${rate.rate} ${rate.to_currency}`);
    }

    console.log('\n=====================================');
    console.log('Default valyuta kurslari yaratildi!');
    console.log('1 USD = 90 RUB');
    console.log('1 RUB = 0.011 USD');
    console.log('=====================================\n');

    await mongoose.connection.close();
    console.log('✅ Tugadi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

createDefaultRates();
