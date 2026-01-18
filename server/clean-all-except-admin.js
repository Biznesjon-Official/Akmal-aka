require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

// Models
const Client = require('./models/Client');
const Vagon = require('./models/Vagon');
const VagonLot = require('./models/VagonLot');
const VagonSale = require('./models/VagonSale');
const Expense = require('./models/Expense');
const ExpenseAllocation = require('./models/ExpenseAllocation');
const LossLiability = require('./models/LossLiability');
const Delivery = require('./models/Delivery');
const ExchangeRate = require('./models/ExchangeRate');
const ExchangeRateHistory = require('./models/ExchangeRateHistory');
const AuditLog = require('./models/AuditLog');
const SystemSettings = require('./models/SystemSettings');

async function cleanAllData() {
  try {
    console.log('🔌 MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    console.log('📊 Hozirgi ma\'lumotlar:');
    const clientCount = await Client.countDocuments();
    const vagonCount = await Vagon.countDocuments();
    const vagonLotCount = await VagonLot.countDocuments();
    const vagonSaleCount = await VagonSale.countDocuments();
    const expenseCount = await Expense.countDocuments();
    const expenseAllocationCount = await ExpenseAllocation.countDocuments();
    const lossLiabilityCount = await LossLiability.countDocuments();
    const deliveryCount = await Delivery.countDocuments();
    const exchangeRateCount = await ExchangeRate.countDocuments();
    const exchangeRateHistoryCount = await ExchangeRateHistory.countDocuments();
    const auditLogCount = await AuditLog.countDocuments();
    const systemSettingsCount = await SystemSettings.countDocuments();

    console.log(`  - Mijozlar: ${clientCount}`);
    console.log(`  - Vagonlar: ${vagonCount}`);
    console.log(`  - Vagon Lotlar: ${vagonLotCount}`);
    console.log(`  - Vagon Sotuvlar: ${vagonSaleCount}`);
    console.log(`  - Xarajatlar: ${expenseCount}`);
    console.log(`  - Xarajat Taqsimoti: ${expenseAllocationCount}`);
    console.log(`  - Yo'qotish Javobgarligi: ${lossLiabilityCount}`);
    console.log(`  - Yetkazib berish: ${deliveryCount}`);
    console.log(`  - Valyuta Kurslari: ${exchangeRateCount}`);
    console.log(`  - Valyuta Kurslari Tarixi: ${exchangeRateHistoryCount}`);
    console.log(`  - Audit Loglar: ${auditLogCount}`);
    console.log(`  - Tizim Sozlamalari: ${systemSettingsCount}`);
    console.log('');

    console.log('🗑️  Barcha ma\'lumotlarni o\'chirish (Admin dan tashqari)...\n');

    // O'chirish
    const deletedClient = await Client.deleteMany({});
    console.log(`✅ Mijozlar o'chirildi: ${deletedClient.deletedCount}`);

    const deletedVagonSale = await VagonSale.deleteMany({});
    console.log(`✅ Vagon Sotuvlar o'chirildi: ${deletedVagonSale.deletedCount}`);

    const deletedVagonLot = await VagonLot.deleteMany({});
    console.log(`✅ Vagon Lotlar o'chirildi: ${deletedVagonLot.deletedCount}`);

    const deletedVagon = await Vagon.deleteMany({});
    console.log(`✅ Vagonlar o'chirildi: ${deletedVagon.deletedCount}`);

    const deletedExpenseAllocation = await ExpenseAllocation.deleteMany({});
    console.log(`✅ Xarajat Taqsimoti o'chirildi: ${deletedExpenseAllocation.deletedCount}`);

    const deletedExpense = await Expense.deleteMany({});
    console.log(`✅ Xarajatlar o'chirildi: ${deletedExpense.deletedCount}`);

    const deletedLossLiability = await LossLiability.deleteMany({});
    console.log(`✅ Yo'qotish Javobgarligi o'chirildi: ${deletedLossLiability.deletedCount}`);

    const deletedDelivery = await Delivery.deleteMany({});
    console.log(`✅ Yetkazib berish o'chirildi: ${deletedDelivery.deletedCount}`);

    const deletedExchangeRateHistory = await ExchangeRateHistory.deleteMany({});
    console.log(`✅ Valyuta Kurslari Tarixi o'chirildi: ${deletedExchangeRateHistory.deletedCount}`);

    const deletedAuditLog = await AuditLog.deleteMany({});
    console.log(`✅ Audit Loglar o'chirildi: ${deletedAuditLog.deletedCount}`);

    console.log('\n✅ Barcha ma\'lumotlar o\'chirildi (Admin va Valyuta Kurslari saqlab qolindi)!');
    console.log('📝 Admin foydalanuvchi va Valyuta Kurslari saqlab qolindi\n');

  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB ulanishi yopildi');
    process.exit(0);
  }
}

cleanAllData();
