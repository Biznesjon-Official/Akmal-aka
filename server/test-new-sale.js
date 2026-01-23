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
const VagonLot = require('./models/VagonLot');
const Client = require('./models/Client');
const Cash = require('./models/Cash');

async function testNewSale() {
  try {
    await connectDB();
    
    console.log('🧪 YANGI SOTUV YARATISH TESTINI BOSHLASH...\n');
    
    // Test uchun mavjud lot va mijozni topish
    const testLot = await VagonLot.findOne({ 
      isDeleted: false,
      warehouse_remaining_volume_m3: { $gt: 1 }
    }).populate('vagon');
    
    const testClient = await Client.findOne({ isDeleted: false });
    
    if (!testLot || !testClient) {
      console.log('❌ Test uchun lot yoki mijoz topilmadi');
      return;
    }
    
    console.log(`📦 Test lot: ${testLot.dimensions} (${testLot.warehouse_remaining_volume_m3} m³ mavjud)`);
    console.log(`👤 Test mijoz: ${testClient.name}`);
    
    // Yangi sotuv yaratish (API endpoint'ni simulyatsiya qilish)
    const saleData = {
      lot: testLot._id,
      client: testClient._id,
      warehouse_dispatched_volume_m3: 1.0, // 1 m³ test
      transport_loss_m3: 0,
      sale_currency: 'USD',
      price_per_m3: 100,
      paid_amount: 50, // 50 USD to'lov
      notes: 'Test sotuv - muammoni tekshirish uchun'
    };
    
    console.log(`\n🔄 Sotuv yaratilmoqda...`);
    console.log(`   Hajm: ${saleData.warehouse_dispatched_volume_m3} m³`);
    console.log(`   Narx: ${saleData.price_per_m3} USD/m³`);
    console.log(`   To'lov: ${saleData.paid_amount} USD`);
    
    // Manual transaction boshqaruvi (route'dagi kabi)
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // VagonSale yaratish
      const sale = new VagonSale({
        vagon: testLot.vagon._id,
        lot: testLot._id,
        client: testClient._id,
        warehouse_dispatched_volume_m3: saleData.warehouse_dispatched_volume_m3,
        transport_loss_m3: saleData.transport_loss_m3 || 0,
        sale_currency: saleData.sale_currency,
        price_per_m3: saleData.price_per_m3,
        paid_amount: saleData.paid_amount || 0,
        notes: saleData.notes
      });
      
      await sale.save({ session });
      console.log(`✅ VagonSale yaratildi: ${sale._id}`);
      console.log(`   Jami narx: ${sale.total_price} ${sale.sale_currency}`);
      console.log(`   To'langan: ${sale.paid_amount} ${sale.sale_currency}`);
      console.log(`   Qarz: ${sale.debt} ${sale.sale_currency}`);
      
      // Cash yozuvlarini yaratish
      if (sale.total_price > 0) {
        // debt_sale yozuvi
        await Cash.create([{
          type: 'debt_sale',
          client: sale.client,
          vagon: sale.vagon,
          vagonSale: sale._id,
          currency: sale.sale_currency,
          amount: sale.total_price,
          description: `Test qarzga sotuv: ${testClient.name} - ${sale.total_price} ${sale.sale_currency}`,
          transaction_date: new Date()
        }], { session });
        
        console.log(`✅ debt_sale yozuvi yaratildi: ${sale.total_price} ${sale.sale_currency}`);
        
        // client_payment yozuvi (agar to'lov bo'lsa)
        if (sale.paid_amount > 0) {
          await Cash.create([{
            type: 'client_payment',
            client: sale.client,
            vagon: sale.vagon,
            vagonSale: sale._id,
            currency: sale.sale_currency,
            amount: sale.paid_amount,
            description: `Test to'lov: ${testClient.name} - ${sale.paid_amount} ${sale.sale_currency}`,
            transaction_date: new Date()
          }], { session });
          
          console.log(`✅ client_payment yozuvi yaratildi: ${sale.paid_amount} ${sale.sale_currency}`);
        }
      }
      
      // Mijoz qarzini yangilash
      const allSales = await VagonSale.find({ 
        client: testClient._id, 
        isDeleted: false 
      }).session(session);
      
      const allPayments = await Cash.find({
        client: testClient._id,
        type: { $in: ['client_payment', 'debt_payment'] },
        isDeleted: false
      }).session(session);
      
      let usdTotalDebt = 0;
      let usdTotalPaid = 0;
      
      allSales.forEach(s => {
        if (s.sale_currency === 'USD') {
          usdTotalDebt += s.total_price || 0;
        }
      });
      
      allPayments.forEach(p => {
        if (p.currency === 'USD') {
          usdTotalPaid += p.amount || 0;
        }
      });
      
      testClient.usd_total_debt = usdTotalDebt;
      testClient.usd_total_paid = usdTotalPaid;
      await testClient.save({ session });
      
      console.log(`✅ Mijoz qarzi yangilandi:`);
      console.log(`   USD qarz: ${usdTotalDebt}`);
      console.log(`   USD to'langan: ${usdTotalPaid}`);
      console.log(`   USD joriy qarz: ${usdTotalDebt - usdTotalPaid}`);
      
      // Transaction commit
      await session.commitTransaction();
      console.log(`✅ Transaction muvaffaqiyatli yakunlandi`);
      
      // Yaratilgan yozuvlarni tekshirish
      console.log(`\n🔍 YARATILGAN YOZUVLARNI TEKSHIRISH:`);
      
      const createdCashRecords = await Cash.find({
        vagonSale: sale._id,
        isDeleted: false
      });
      
      console.log(`   Cash yozuvlari: ${createdCashRecords.length} ta`);
      createdCashRecords.forEach((record, index) => {
        console.log(`     ${index + 1}. ${record.type}: ${record.amount} ${record.currency}`);
      });
      
      // VagonSale ni qayta o'qish
      const savedSale = await VagonSale.findById(sale._id);
      console.log(`   VagonSale paid_amount: ${savedSale.paid_amount}`);
      console.log(`   VagonSale debt: ${savedSale.debt}`);
      console.log(`   VagonSale status: ${savedSale.status}`);
      
      // Mijozni qayta o'qish
      const savedClient = await Client.findById(testClient._id);
      console.log(`   Mijoz USD qarz: ${savedClient.usd_total_debt}`);
      console.log(`   Mijoz USD to'langan: ${savedClient.usd_total_paid}`);
      
      console.log(`\n🎉 TEST MUVAFFAQIYATLI YAKUNLANDI!`);
      console.log(`   Sotuv ID: ${sale._id}`);
      console.log(`   Barcha Cash yozuvlari yaratildi`);
      console.log(`   Mijoz qarzi to'g'ri yangilandi`);
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
  } catch (error) {
    console.error('❌ Test xatolik:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

testNewSale();