/**
 * Mijoz qarzlarini Cash yozuvlariga asoslanib tuzatish
 * 
 * Bu skript:
 * 1. Barcha mijozlarni oladi
 * 2. Har bir mijoz uchun Cash yozuvlarini tekshiradi
 * 3. To'lovlarni to'g'ri hisoblaydi
 * 4. Mijoz ma'lumotlarini yangilaydi
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Client = require('../models/Client');
const VagonSale = require('../models/VagonSale');
const Cash = require('../models/Cash');

async function fixClientDebtFromCash() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');
    
    // Barcha mijozlarni olish
    const clients = await Client.find({ isDeleted: false });
    console.log(`\n📊 Jami ${clients.length} ta mijoz topildi\n`);
    
    for (const client of clients) {
      console.log(`\n🔄 Mijoz: ${client.name} (${client._id})`);
      
      // 1. Barcha sotuvlarni olish
      const allSales = await VagonSale.find({ 
        client: client._id, 
        isDeleted: false 
      });
      
      // 2. Barcha to'lovlarni olish
      const allPayments = await Cash.find({
        client: client._id,
        type: { $in: ['client_payment', 'debt_payment'] },
        isDeleted: false
      });
      
      console.log(`   📦 Sotuvlar: ${allSales.length} ta`);
      console.log(`   💰 To'lovlar: ${allPayments.length} ta`);
      
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
      
      // Oldingi qiymatlar
      const oldUsdDebt = client.usd_total_debt || 0;
      const oldUsdPaid = client.usd_total_paid || 0;
      const oldRubDebt = client.rub_total_debt || 0;
      const oldRubPaid = client.rub_total_paid || 0;
      
      // Yangi qiymatlar
      client.usd_total_debt = usdTotalDebt;
      client.rub_total_debt = rubTotalDebt;
      client.usd_total_paid = usdTotalPaid;
      client.rub_total_paid = rubTotalPaid;
      client.usd_total_received_volume = usdTotalVolume;
      client.rub_total_received_volume = rubTotalVolume;
      
      await client.save();
      
      // O'zgarishlarni ko'rsatish
      console.log(`   💵 USD:`);
      console.log(`      Qarz: ${oldUsdDebt} → ${usdTotalDebt} ${oldUsdDebt !== usdTotalDebt ? '✏️' : '✓'}`);
      console.log(`      To'langan: ${oldUsdPaid} → ${usdTotalPaid} ${oldUsdPaid !== usdTotalPaid ? '✏️' : '✓'}`);
      console.log(`      Qolgan: ${Math.max(0, usdTotalDebt - usdTotalPaid)}`);
      
      if (rubTotalDebt > 0 || oldRubDebt > 0) {
        console.log(`   💶 RUB:`);
        console.log(`      Qarz: ${oldRubDebt} → ${rubTotalDebt} ${oldRubDebt !== rubTotalDebt ? '✏️' : '✓'}`);
        console.log(`      To'langan: ${oldRubPaid} → ${rubTotalPaid} ${oldRubPaid !== rubTotalPaid ? '✏️' : '✓'}`);
        console.log(`      Qolgan: ${Math.max(0, rubTotalDebt - rubTotalPaid)}`);
      }
      
      if (oldUsdDebt !== usdTotalDebt || oldUsdPaid !== usdTotalPaid || oldRubDebt !== rubTotalDebt || oldRubPaid !== rubTotalPaid) {
        console.log(`   ✅ Mijoz ma'lumotlari yangilandi`);
      } else {
        console.log(`   ✓ Mijoz ma'lumotlari to'g'ri`);
      }
    }
    
    console.log(`\n✅ Barcha mijozlar tuzatildi!\n`);
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB dan uzildi');
  }
}

// Skriptni ishga tushirish
fixClientDebtFromCash();
