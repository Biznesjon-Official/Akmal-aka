const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB ga ulanish
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB ga ulandi');
  } catch (error) {
    console.error('❌ MongoDB ga ulanishda xatolik:', error);
    process.exit(1);
  }
}

const VagonSale = require('./models/VagonSale');
const Client = require('./models/Client');
const Cash = require('./models/Cash');

async function fixAllClientPayments() {
  try {
    await connectDB();
    
    console.log('🔧 BARCHA MIJOZLAR TO\'LOVLARINI TUZATISH...\n');
    
    // Barcha mijozlarni olish
    const clients = await Client.find({ isDeleted: false });
    
    console.log(`👥 JAMI MIJOZLAR: ${clients.length}\n`);
    
    let fixedClients = 0;
    let totalUsdFixed = 0;
    let totalRubFixed = 0;
    
    for (const client of clients) {
      console.log(`\n👤 MIJOZ: ${client.name} (ID: ${client._id})`);
      
      // Mijozning barcha sotuvlarini olish
      const allSales = await VagonSale.find({ 
        client: client._id, 
        isDeleted: false 
      });
      
      // Mijozning barcha to'lovlarini olish (Cash jadvalidan)
      const allPayments = await Cash.find({
        client: client._id,
        type: { $in: ['client_payment', 'debt_payment'] },
        isDeleted: false
      });
      
      console.log(`   Sotuvlar: ${allSales.length} ta`);
      console.log(`   To'lovlar: ${allPayments.length} ta`);
      
      let usdTotalDebt = 0;
      let rubTotalDebt = 0;
      let usdTotalVolume = 0;
      let rubTotalVolume = 0;
      let usdTotalPaid = 0;
      let rubTotalPaid = 0;
      
      // Sotuvlar bo'yicha hisoblash
      allSales.forEach(sale => {
        if (sale.sale_currency === 'USD') {
          usdTotalDebt += sale.total_price || 0;
          usdTotalVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
        } else if (sale.sale_currency === 'RUB') {
          rubTotalDebt += sale.total_price || 0;
          rubTotalVolume += (sale.client_received_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0);
        }
      });
      
      // To'lovlar bo'yicha hisoblash
      allPayments.forEach(payment => {
        if (payment.currency === 'USD') {
          usdTotalPaid += payment.amount || 0;
        } else if (payment.currency === 'RUB') {
          rubTotalPaid += payment.amount || 0;
        }
      });
      
      console.log(`   Hisoblangan USD qarz: ${usdTotalDebt}, to'langan: ${usdTotalPaid}`);
      console.log(`   Hisoblangan RUB qarz: ${rubTotalDebt}, to'langan: ${rubTotalPaid}`);
      
      // Hozirgi qiymatlar bilan taqqoslash
      const oldUsdDebt = client.usd_total_debt || 0;
      const oldUsdPaid = client.usd_total_paid || 0;
      const oldRubDebt = client.rub_total_debt || 0;
      const oldRubPaid = client.rub_total_paid || 0;
      
      console.log(`   Hozirgi USD qarz: ${oldUsdDebt}, to'langan: ${oldUsdPaid}`);
      console.log(`   Hozirgi RUB qarz: ${oldRubDebt}, to'langan: ${oldRubPaid}`);
      
      // Agar farq bo'lsa, yangilash
      const usdDebtDiff = Math.abs(usdTotalDebt - oldUsdDebt);
      const usdPaidDiff = Math.abs(usdTotalPaid - oldUsdPaid);
      const rubDebtDiff = Math.abs(rubTotalDebt - oldRubDebt);
      const rubPaidDiff = Math.abs(rubTotalPaid - oldRubPaid);
      
      if (usdDebtDiff > 0.01 || usdPaidDiff > 0.01 || rubDebtDiff > 0.01 || rubPaidDiff > 0.01) {
        client.usd_total_debt = usdTotalDebt;
        client.rub_total_debt = rubTotalDebt;
        client.usd_total_paid = usdTotalPaid;
        client.rub_total_paid = rubTotalPaid;
        client.usd_total_received_volume = usdTotalVolume;
        client.rub_total_received_volume = rubTotalVolume;
        
        await client.save();
        
        console.log(`   ✅ TUZATILDI:`);
        console.log(`      USD qarz: ${oldUsdDebt} → ${usdTotalDebt}`);
        console.log(`      USD to'langan: ${oldUsdPaid} → ${usdTotalPaid}`);
        console.log(`      RUB qarz: ${oldRubDebt} → ${rubTotalDebt}`);
        console.log(`      RUB to'langan: ${oldRubPaid} → ${rubTotalPaid}`);
        
        fixedClients++;
        totalUsdFixed += usdPaidDiff;
        totalRubFixed += rubPaidDiff;
      } else {
        console.log(`   ✅ To'g'ri, o'zgarish kerak emas`);
      }
    }
    
    console.log(`\n🎉 YAKUNIY NATIJA:`);
    console.log(`   ✅ Tuzatilgan mijozlar: ${fixedClients}`);
    console.log(`   📊 Jami mijozlar: ${clients.length}`);
    console.log(`   💰 Jami USD to'lov farqi: ${totalUsdFixed.toFixed(2)}`);
    console.log(`   💰 Jami RUB to'lov farqi: ${totalRubFixed.toFixed(2)}`);
    
    if (fixedClients === 0) {
      console.log(`\n🎯 Barcha mijozlar ma'lumotlari allaqachon to'g'ri!`);
    } else {
      console.log(`\n🔧 ${fixedClients} ta mijoz ma'lumotlari tuzatildi. Endi frontend'da to'g'ri ko'rinadi.`);
    }
    
    // Tekshirish uchun bir nechta mijozni ko'rsatish
    console.log(`\n🔍 TUZATILGAN MIJOZLARNI TEKSHIRISH:`);
    const updatedClients = await Client.find({ isDeleted: false }).limit(3);
    
    for (const client of updatedClients) {
      const usdCurrentDebt = Math.max(0, (client.usd_total_debt || 0) - (client.usd_total_paid || 0));
      const rubCurrentDebt = Math.max(0, (client.rub_total_debt || 0) - (client.rub_total_paid || 0));
      
      console.log(`   👤 ${client.name}:`);
      console.log(`      USD: qarz ${client.usd_total_debt || 0}, to'langan ${client.usd_total_paid || 0}, joriy qarz ${usdCurrentDebt}`);
      console.log(`      RUB: qarz ${client.rub_total_debt || 0}, to'langan ${client.rub_total_paid || 0}, joriy qarz ${rubCurrentDebt}`);
    }
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

fixAllClientPayments();