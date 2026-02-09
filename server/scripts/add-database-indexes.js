/**
 * Database Index'larni Qo'shish
 * Performance optimizatsiya uchun
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function addIndexes() {
  try {
    console.log('🔄 MongoDB'ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB'ga ulandi');
    
    const db = mongoose.connection.db;
    
    // 1. VagonSale index'lari
    console.log('\n📊 VagonSale index'larini qo'shish...');
    await db.collection('vagonsales').createIndex({ isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ sale_date: -1 });
    await db.collection('vagonsales').createIndex({ vagon: 1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ client: 1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ lot: 1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ status: 1, isDeleted: 1 });
    await db.collection('vagonsales').createIndex({ sale_currency: 1 });
    await db.collection('vagonsales').createIndex({ createdAt: -1 });
    console.log('✅ VagonSale index'lari qo'shildi');
    
    // 2. Vagon index'lari
    console.log('\n📊 Vagon index'larini qo'shish...');
    await db.collection('vagons').createIndex({ isDeleted: 1 });
    await db.collection('vagons').createIndex({ status: 1, isDeleted: 1 });
    await db.collection('vagons').createIndex({ month: 1 });
    await db.collection('vagons').createIndex({ vagonCode: 1 }, { unique: true });
    await db.collection('vagons').createIndex({ createdAt: -1 });
    console.log('✅ Vagon index'lari qo'shildi');
    
    // 3. VagonLot index'lari
    console.log('\n📊 VagonLot index'larini qo'shish...');
    await db.collection('vagonlots').createIndex({ isDeleted: 1 });
    await db.collection('vagonlots').createIndex({ vagon: 1, isDeleted: 1 });
    await db.collection('vagonlots').createIndex({ dimensions: 1 });
    await db.collection('vagonlots').createIndex({ purchase_currency: 1 });
    await db.collection('vagonlots').createIndex({ createdAt: -1 });
    console.log('✅ VagonLot index'lari qo'shildi');
    
    // 4. Client index'lari
    console.log('\n📊 Client index'larini qo'shish...');
    await db.collection('clients').createIndex({ isDeleted: 1 });
    await db.collection('clients').createIndex({ name: 1 });
    await db.collection('clients').createIndex({ phone: 1 });
    await db.collection('clients').createIndex({ createdAt: -1 });
    // Text search uchun
    await db.collection('clients').createIndex({ name: 'text', phone: 'text' });
    console.log('✅ Client index'lari qo'shildi');
    
    // 5. Cash index'lari
    console.log('\n📊 Cash index'larini qo'shish...');
    await db.collection('cashes').createIndex({ isDeleted: 1 });
    await db.collection('cashes').createIndex({ type: 1, isDeleted: 1 });
    await db.collection('cashes').createIndex({ client: 1, isDeleted: 1 });
    await db.collection('cashes').createIndex({ vagon: 1, isDeleted: 1 });
    await db.collection('cashes').createIndex({ vagonSale: 1, isDeleted: 1 });
    await db.collection('cashes').createIndex({ currency: 1 });
    await db.collection('cashes').createIndex({ transaction_date: -1 });
    await db.collection('cashes').createIndex({ createdAt: -1 });
    console.log('✅ Cash index'lari qo'shildi');
    
    // 6. Debt index'lari
    console.log('\n📊 Debt index'larini qo'shish...');
    await db.collection('debts').createIndex({ isDeleted: 1 });
    await db.collection('debts').createIndex({ status: 1, isDeleted: 1 });
    await db.collection('debts').createIndex({ client: 1, isDeleted: 1 });
    await db.collection('debts').createIndex({ vagon: 1, isDeleted: 1 });
    await db.collection('debts').createIndex({ currency: 1 });
    await db.collection('debts').createIndex({ sale_date: -1 });
    await db.collection('debts').createIndex({ due_date: 1 });
    await db.collection('debts').createIndex({ createdAt: -1 });
    console.log('✅ Debt index'lari qo'shildi');
    
    // 7. VagonExpense index'lari
    console.log('\n📊 VagonExpense index'larini qo'shish...');
    await db.collection('vagonexpenses').createIndex({ isDeleted: 1 });
    await db.collection('vagonexpenses').createIndex({ vagon: 1, isDeleted: 1 });
    await db.collection('vagonexpenses').createIndex({ type: 1 });
    await db.collection('vagonexpenses').createIndex({ currency: 1 });
    await db.collection('vagonexpenses').createIndex({ date: -1 });
    await db.collection('vagonexpenses').createIndex({ createdAt: -1 });
    console.log('✅ VagonExpense index'lari qo'shildi');
    
    // 8. User index'lari
    console.log('\n📊 User index'larini qo'shish...');
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ isActive: 1 });
    console.log('✅ User index'lari qo'shildi');
    
    // Barcha index'larni ko'rsatish
    console.log('\n📋 Barcha index'lar:');
    const collections = ['vagonsales', 'vagons', 'vagonlots', 'clients', 'cashes', 'debts', 'vagonexpenses', 'users'];
    
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`\n${collectionName}:`);
      indexes.forEach(index => {
        console.log(`  - ${JSON.stringify(index.key)}`);
      });
    }
    
    console.log('\n✅ Barcha index'lar muvaffaqiyatli qo\'shildi!');
    
  } catch (error) {
    console.error('❌ Xato:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 MongoDB'dan uzildi');
  }
}

// Script'ni ishga tushirish
if (require.main === module) {
  addIndexes();
}

module.exports = { addIndexes };
