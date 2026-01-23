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
const Cash = require('./models/Cash');
const Client = require('./models/Client');

async function syncVagonSalePayments() {
  try {
    await connectDB();
    
    console.log('🔄 VAGON SALE TO\'LOVLARINI SINXRONLASH...\n');
    
    // Barcha sotuvlarni olish
    const sales = await VagonSale.find({ isDeleted: false }).populate('client', 'name');
    
    console.log(`📦 JAMI SOTUVLAR: ${sales.length}\n`);
    
    let syncedCount = 0;
    let totalFixed = 0;
    
    for (const sale of sales) {
      if (!sale.client) {
        console.log(`⚠️  Mijoz topilmadi: ${sale._id}`);
        continue;
      }
      
      console.log(`\n📦 SOTUV: ${sale.client.name} - ${sale.total_price} ${sale.sale_currency}`);
      console.log(`   Joriy paid_amount: ${sale.paid_amount}`);
      
      // Cash jadvalidan haqiqiy to'lovni hisoblash
      const payments = await Cash.find({
        vagonSale: sale._id,
        type: { $in: ['client_payment', 'debt_payment'] },
        isDeleted: false
      });
      
      let actualPaidAmount = 0;
      payments.forEach(payment => {
        if (payment.currency === sale.sale_currency) {
          actualPaidAmount += payment.amount || 0;
        }
      });
      
      console.log(`   Cash jadvalidagi to'lov: ${actualPaidAmount}`);
      console.log(`   Cash yozuvlari soni: ${payments.length}`);
      
      // Agar farq bo'lsa, sinxronlash
      if (Math.abs(sale.paid_amount - actualPaidAmount) > 0.01) {
        const oldPaidAmount = sale.paid_amount;
        const oldDebt = sale.debt;
        const oldStatus = sale.status;
        
        sale.paid_amount = actualPaidAmount;
        sale.debt = sale.total_price - sale.paid_amount;
        
        // Holat yangilash
        if (sale.debt === 0 && sale.total_price > 0) {
          sale.status = 'paid';
        } else if (sale.paid_amount > 0) {
          sale.status = 'partial';
        } else {
          sale.status = 'pending';
        }
        
        await sale.save();
        
        console.log(`   ✅ SINXRONLANDI:`);
        console.log(`      paid_amount: ${oldPaidAmount} → ${sale.paid_amount}`);
        console.log(`      debt: ${oldDebt} → ${sale.debt}`);
        console.log(`      status: ${oldStatus} → ${sale.status}`);
        
        syncedCount++;
        totalFixed += Math.abs(oldPaidAmount - actualPaidAmount);
      } else {
        console.log(`   ✅ Sinxronlashgan`);
      }
    }
    
    console.log(`\n🎉 YAKUNIY NATIJA:`);
    console.log(`   ✅ Sinxronlangan sotuvlar: ${syncedCount}`);
    console.log(`   📊 Jami sotuvlar: ${sales.length}`);
    console.log(`   💰 Jami tuzatilgan summa: ${totalFixed.toFixed(2)}`);
    
    if (syncedCount === 0) {
      console.log(`\n🎯 Barcha sotuvlar allaqachon sinxronlashgan!`);
    } else {
      console.log(`\n🔧 ${syncedCount} ta sotuv sinxronlandi. Endi mijozlar qismida to'lovlar to'g'ri ko'rinadi.`);
    }
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

syncVagonSalePayments();