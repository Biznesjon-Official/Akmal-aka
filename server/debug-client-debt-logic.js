const mongoose = require('mongoose');
require('dotenv').config();

const Client = require('./models/Client');

async function debugClientDebtLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // Test mijoz yaratish
    console.log('\n=== TEST MIJOZ YARATISH ===');
    
    // Avval mavjud test mijozni o'chirish
    await Client.deleteMany({ name: 'Test Mijoz Debt Logic' });
    
    const testClient = new Client({
      name: 'Test Mijoz Debt Logic',
      phone: '+998901234567',
      address: 'Test manzil'
    });
    
    await testClient.save();
    console.log('✅ Test mijoz yaratildi:', testClient.name);
    console.log('Boshlang\'ich holat:');
    console.log('- USD qarz:', testClient.usd_total_debt);
    console.log('- USD to\'langan:', testClient.usd_total_paid);
    console.log('- USD joriy qarz:', testClient.usd_current_debt);

    // 1. Lot sotib olish (2000 USD qarz)
    console.log('\n=== 1. LOT SOTIB OLISH (2000 USD QARZ) ===');
    testClient.addDebt(2000, 'USD', 10); //