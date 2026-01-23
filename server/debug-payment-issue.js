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

async function debugPaymentIssue() {
  try {
    await connectDB();
    
    console.log('🔍 TO\'LOV MUAMMOSINI TEKSHIRISH...\n');
    
    // Barcha mijozlarni olish
    const clients = await Client.find({ isDeleted: false });
    
    console.log(`👥 JAMI MIJOZLAR: ${clients.length}\n`);
    
    for (const client of clients) {
      console.log(`\n👤 MIJOZ: ${client.name} (ID: ${client._id})`);
      
      // Mijozning sotuvlari
      const sales = await VagonSale.find({ 
        client: client._id, 
        isDeleted: false 
      }).sort({ createdAt: -1 });
      
      // Mijozning to'lovlari (Cash jadvalidan)
      const payments = await Cash.find({
        client: client._id,
        isDeleted: false
      }).sort({ createdAt: -1 });
      
      console.log(`📦 SOTUVLAR: ${sales.length} ta`);
      console.log(`💰 CASH YOZUVLARI: ${payments.length} ta`);
      
      // Sotuvlardagi to'lovlar
      let totalPaidInSales = 0;
      let totalDebtInSales = 0;
      
      sales.forEach((sale, index) => {
        console.log(`\n   📦 SOTUV ${index + 1}:`);
        console.log(`      Jami narx: ${sale.total_price} ${sale.sale_currency}`);
        console.log(`      To'langan: ${sale.paid_amount || 0} ${sale.sale_currency}`);
        console.log(`      Qarz: ${sale.debt || 0} ${sale.sale_currency}`);
        console.log(`      Sana: ${sale.createdAt?.toLocaleDateString()}`);
        
        if (sale.sale_currency === 'USD') {
          totalPaidInSales += sale.paid_amount || 0;
          totalDebtInSales += sale.total_price || 0;
        }
      });
      
      // Cash jadvalidagi to'lovlar
      let totalPaidInCash = 0;
      let totalDebtInCash = 0;
      
      payments.forEach((payment, index) => {
        console.log(`\n   💰 CASH YOZUV ${index + 1}:`);
        console.log(`      Turi: ${payment.type}`);
        console.log(`      Miqdor: ${payment.amount} ${payment.currency}`);
        console.log(`      Tavsif: ${payment.description}`);
        console.log(`      Sana: ${payment.createdAt?.toLocaleDateString()}`);
        
        if (payment.currency === 'USD') {
          if (payment.type === 'client_payment' || payment.type === 'debt_payment') {
            totalPaidInCash += payment.amount || 0;
          } else if (payment.type === 'debt_sale') {
            totalDebtInCash += payment.amount || 0;
          }
        }
      });
      
      console.log(`\n📊 XULOSA:`);
      console.log(`   Sotuvlardagi jami to'lov: ${totalPaidInSales} USD`);
      console.log(`   Cash jadvalidagi to'lov: ${totalPaidInCash} USD`);
      console.log(`   Sotuvlardagi jami qarz: ${totalDebtInSales} USD`);
      console.log(`   Cash jadvalidagi qarz: ${totalDebtInCash} USD`);
      
      // Mijoz ma'lumotlari
      console.log(`\n   Mijoz USD qarz (DB): ${client.usd_total_debt || 0}`);
      console.log(`   Mijoz USD to'langan (DB): ${client.usd_total_paid || 0}`);
      console.log(`   Mijoz USD joriy qarz: ${(client.usd_total_debt || 0) - (client.usd_total_paid || 0)}`);
      
      // Muammolarni aniqlash
      if (totalPaidInSales > 0 && totalPaidInCash === 0) {
        console.log(`\n❌ MUAMMO: Sotuvda to'lov bor, lekin Cash jadvalida yo'q!`);
      }
      
      if (Math.abs(totalPaidInSales - totalPaidInCash) > 0.01) {
        console.log(`\n⚠️  FARQ: Sotuvdagi to'lov (${totalPaidInSales}) va Cash jadvalidagi to'lov (${totalPaidInCash}) mos kelmaydi`);
      }
      
      if (Math.abs(totalDebtInSales - totalDebtInCash) > 0.01) {
        console.log(`\n⚠️  FARQ: Sotuvdagi qarz (${totalDebtInSales}) va Cash jadvalidagi qarz (${totalDebtInCash}) mos kelmaydi`);
      }
      
      console.log(`\n${'='.repeat(80)}`);
    }
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

debugPaymentIssue();