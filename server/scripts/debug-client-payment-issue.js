/**
 * Mijoz to'lovlari muammosini tekshirish
 * 
 * Bu skript:
 * 1. Barcha mijozlarni ko'rsatadi
 * 2. Har bir mijoz uchun:
 *    - VagonSale jadvalidagi sotuvlar
 *    - Cash jadvalidagi to'lovlar
 *    - Client jadvalidagi qarz ma'lumotlari
 * 3. Nomuvofiqliklarni topadi
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');
const VagonSale = require('../models/VagonSale');
const Cash = require('../models/Cash');

async function debugClientPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');
    
    // Barcha mijozlarni olish
    const clients = await Client.find({ isDeleted: false });
    
    console.log(`📊 Jami mijozlar: ${clients.length}\n`);
    console.log('='.repeat(80));
    
    for (const client of clients) {
      console.log(`\n👤 MIJOZ: ${client.name} (${client.phone})`);
      console.log('-'.repeat(80));
      
      // 1. VagonSale jadvalidagi sotuvlar
      const sales = await VagonSale.find({
        client: client._id,
        isDeleted: false
      });
      
      console.log(`\n📦 SOTUVLAR (${sales.length} ta):`);
      let totalSalesUSD = 0;
      let totalSalesRUB = 0;
      
      sales.forEach((sale, index) => {
        console.log(`   ${index + 1}. Sotuv ID: ${sale._id}`);
        console.log(`      Jami narx: ${sale.total_price} ${sale.sale_currency}`);
        console.log(`      To'langan (VagonSale): ${sale.paid_amount} ${sale.sale_currency}`);
        console.log(`      Qarz: ${sale.debt} ${sale.sale_currency}`);
        console.log(`      Sana: ${new Date(sale.sale_date).toLocaleDateString()}`);
        
        if (sale.sale_currency === 'USD') {
          totalSalesUSD += sale.total_price;
        } else if (sale.sale_currency === 'RUB') {
          totalSalesRUB += sale.total_price;
        }
      });
      
      console.log(`\n   💰 Jami sotuvlar:`);
      console.log(`      USD: ${totalSalesUSD.toFixed(2)}`);
      console.log(`      RUB: ${totalSalesRUB.toFixed(2)}`);
      
      // 2. Cash jadvalidagi to'lovlar
      const payments = await Cash.find({
        client: client._id,
        type: { $in: ['client_payment', 'debt_payment'] },
        isDeleted: false
      });
      
      console.log(`\n💵 TO'LOVLAR (Cash jadvalida ${payments.length} ta):`);
      let totalPaymentsUSD = 0;
      let totalPaymentsRUB = 0;
      
      payments.forEach((payment, index) => {
        console.log(`   ${index + 1}. To'lov ID: ${payment._id}`);
        console.log(`      Turi: ${payment.type}`);
        console.log(`      Summa: ${payment.amount} ${payment.currency}`);
        console.log(`      Tavsif: ${payment.description}`);
        console.log(`      Sana: ${new Date(payment.transaction_date).toLocaleDateString()}`);
        
        if (payment.currency === 'USD') {
          totalPaymentsUSD += payment.amount;
        } else if (payment.currency === 'RUB') {
          totalPaymentsRUB += payment.amount;
        }
      });
      
      console.log(`\n   💰 Jami to'lovlar (Cash):`);
      console.log(`      USD: ${totalPaymentsUSD.toFixed(2)}`);
      console.log(`      RUB: ${totalPaymentsRUB.toFixed(2)}`);
      
      // 3. Client jadvalidagi ma'lumotlar
      console.log(`\n📋 CLIENT JADVALIDAGI MA'LUMOTLAR:`);
      console.log(`   USD:`);
      console.log(`      total_debt: ${client.usd_total_debt || 0}`);
      console.log(`      total_paid: ${client.usd_total_paid || 0}`);
      console.log(`      current_debt: ${Math.max(0, (client.usd_total_debt || 0) - (client.usd_total_paid || 0))}`);
      console.log(`   RUB:`);
      console.log(`      total_debt: ${client.rub_total_debt || 0}`);
      console.log(`      total_paid: ${client.rub_total_paid || 0}`);
      console.log(`      current_debt: ${Math.max(0, (client.rub_total_debt || 0) - (client.rub_total_paid || 0))}`);
      
      // 4. Nomuvofiqliklarni tekshirish
      console.log(`\n🔍 NOMUVOFIQLIKLAR:`);
      
      const usdDebtMismatch = Math.abs(totalSalesUSD - (client.usd_total_debt || 0)) > 0.01;
      const usdPaidMismatch = Math.abs(totalPaymentsUSD - (client.usd_total_paid || 0)) > 0.01;
      const rubDebtMismatch = Math.abs(totalSalesRUB - (client.rub_total_debt || 0)) > 0.01;
      const rubPaidMismatch = Math.abs(totalPaymentsRUB - (client.rub_total_paid || 0)) > 0.01;
      
      if (usdDebtMismatch) {
        console.log(`   ⚠️  USD qarz nomuvofiq:`);
        console.log(`      Sotuvlar: ${totalSalesUSD.toFixed(2)}`);
        console.log(`      Client jadval: ${(client.usd_total_debt || 0).toFixed(2)}`);
        console.log(`      Farq: ${(totalSalesUSD - (client.usd_total_debt || 0)).toFixed(2)}`);
      }
      
      if (usdPaidMismatch) {
        console.log(`   ⚠️  USD to'lov nomuvofiq:`);
        console.log(`      Cash jadval: ${totalPaymentsUSD.toFixed(2)}`);
        console.log(`      Client jadval: ${(client.usd_total_paid || 0).toFixed(2)}`);
        console.log(`      Farq: ${(totalPaymentsUSD - (client.usd_total_paid || 0)).toFixed(2)}`);
      }
      
      if (rubDebtMismatch) {
        console.log(`   ⚠️  RUB qarz nomuvofiq:`);
        console.log(`      Sotuvlar: ${totalSalesRUB.toFixed(2)}`);
        console.log(`      Client jadval: ${(client.rub_total_debt || 0).toFixed(2)}`);
        console.log(`      Farq: ${(totalSalesRUB - (client.rub_total_debt || 0)).toFixed(2)}`);
      }
      
      if (rubPaidMismatch) {
        console.log(`   ⚠️  RUB to'lov nomuvofiq:`);
        console.log(`      Cash jadval: ${totalPaymentsRUB.toFixed(2)}`);
        console.log(`      Client jadval: ${(client.rub_total_paid || 0).toFixed(2)}`);
        console.log(`      Farq: ${(totalPaymentsRUB - (client.rub_total_paid || 0)).toFixed(2)}`);
      }
      
      if (!usdDebtMismatch && !usdPaidMismatch && !rubDebtMismatch && !rubPaidMismatch) {
        console.log(`   ✅ Barcha ma'lumotlar to'g'ri`);
      }
      
      console.log('\n' + '='.repeat(80));
    }
    
    console.log('\n✅ Tekshirish tugadi');
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB dan uzildi');
  }
}

// Skriptni ishga tushirish
debugClientPayments();
