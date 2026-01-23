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

async function fixMissingCashRecords() {
  try {
    await connectDB();
    
    console.log('🔧 YETISHMAYOTGAN CASH YOZUVLARINI YARATISH...\n');
    
    // Barcha sotuvlarni olish
    const sales = await VagonSale.find({ isDeleted: false }).populate('client', 'name');
    
    console.log(`📦 JAMI SOTUVLAR: ${sales.length}\n`);
    
    let fixedSales = 0;
    let fixedPayments = 0;
    
    for (const sale of sales) {
      if (!sale.client) {
        console.log(`⚠️  Mijoz topilmadi: ${sale._id}`);
        continue;
      }
      
      console.log(`\n📦 SOTUV: ${sale.client.name} - ${sale.total_price} ${sale.sale_currency}`);
      
      // Bu sotuv uchun Cash yozuvlarini tekshirish
      const existingCashRecords = await Cash.find({
        vagonSale: sale._id,
        isDeleted: false
      });
      
      console.log(`   Mavjud Cash yozuvlari: ${existingCashRecords.length} ta`);
      
      // debt_sale yozuvi borligini tekshirish
      const debtSaleRecord = existingCashRecords.find(r => r.type === 'debt_sale');
      if (!debtSaleRecord && sale.total_price > 0) {
        // debt_sale yozuvini yaratish
        await Cash.create({
          type: 'debt_sale',
          client: sale.client._id,
          vagon: sale.vagon,
          vagonSale: sale._id,
          currency: sale.sale_currency,
          amount: sale.total_price,
          description: `Qarzga sotuv: ${sale.client.name} - ${sale.total_price} ${sale.sale_currency}`,
          transaction_date: sale.sale_date || sale.createdAt || new Date()
        });
        
        console.log(`   ✅ debt_sale yozuvi yaratildi: ${sale.total_price} ${sale.sale_currency}`);
        fixedSales++;
      }
      
      // client_payment yozuvi borligini tekshirish
      const paymentRecord = existingCashRecords.find(r => r.type === 'client_payment');
      if (!paymentRecord && sale.paid_amount > 0) {
        // client_payment yozuvini yaratish
        await Cash.create({
          type: 'client_payment',
          client: sale.client._id,
          vagon: sale.vagon,
          vagonSale: sale._id,
          currency: sale.sale_currency,
          amount: sale.paid_amount,
          description: `${sale.client.name} tomonidan to'lov - ${sale.paid_amount} ${sale.sale_currency}`,
          transaction_date: sale.sale_date || sale.createdAt || new Date()
        });
        
        console.log(`   ✅ client_payment yozuvi yaratildi: ${sale.paid_amount} ${sale.sale_currency}`);
        fixedPayments++;
      }
      
      if (debtSaleRecord && paymentRecord) {
        console.log(`   ✅ Barcha Cash yozuvlari mavjud`);
      }
    }
    
    console.log(`\n🎉 YAKUNIY NATIJA:`);
    console.log(`   ✅ Yaratilgan debt_sale yozuvlari: ${fixedSales}`);
    console.log(`   ✅ Yaratilgan client_payment yozuvlari: ${fixedPayments}`);
    console.log(`   📊 Jami sotuvlar: ${sales.length}`);
    
    // Endi mijoz qarzlarini qayta hisoblash
    console.log(`\n🔄 MIJOZ QARZLARINI QAYTA HISOBLASH...`);
    
    const clients = await Client.find({ isDeleted: false });
    
    for (const client of clients) {
      // Mijozning barcha to'lovlarini hisoblash (Cash jadvalidan)
      const allPayments = await Cash.find({
        client: client._id,
        type: { $in: ['client_payment', 'debt_payment'] },
        isDeleted: false
      });
      
      let usdTotalPaid = 0;
      let rubTotalPaid = 0;
      
      allPayments.forEach(payment => {
        if (payment.currency === 'USD') {
          usdTotalPaid += payment.amount || 0;
        } else if (payment.currency === 'RUB') {
          rubTotalPaid += payment.amount || 0;
        }
      });
      
      // Mijoz to'lovlarini yangilash
      const oldUsdPaid = client.usd_total_paid || 0;
      const oldRubPaid = client.rub_total_paid || 0;
      
      client.usd_total_paid = usdTotalPaid;
      client.rub_total_paid = rubTotalPaid;
      
      await client.save();
      
      if (Math.abs(oldUsdPaid - usdTotalPaid) > 0.01 || Math.abs(oldRubPaid - rubTotalPaid) > 0.01) {
        console.log(`   ✅ ${client.name}: USD to'lov ${oldUsdPaid} → ${usdTotalPaid}, RUB to'lov ${oldRubPaid} → ${rubTotalPaid}`);
      }
    }
    
    console.log(`\n🎉 BARCHA CASH YOZUVLARI VA MIJOZ QARZLARI TUZATILDI!`);
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

fixMissingCashRecords();