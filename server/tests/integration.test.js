const mongoose = require('mongoose');
const request = require('supertest');
require('dotenv').config();

// Models
const User = require('../models/User');
const Wood = require('../models/Wood');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const ExchangeRate = require('../models/ExchangeRate');

// App
const app = require('../index');

let token;
let testWoodId;
let testPurchaseId;
let testSaleId;

describe('🧪 Wood Import/Export System - Integration Tests', () => {
  
  beforeAll(async () => {
    // MongoDB'ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Test database connected');
    
    // Test ma'lumotlarini tozalash (faqat test ma'lumotlari)
    await Wood.deleteMany({ lotCode: /^TEST-/ });
    await Purchase.deleteMany({ sotuvchi: 'Test Sotuvchi' });
    await Sale.deleteMany({ xaridor: /^Test Xaridor/ });
    await Expense.deleteMany({ tavsif: /^Test/ });
  });

  afterAll(async () => {
    // Test ma'lumotlarini tozalash (faqat test ma'lumotlari)
    await Wood.deleteMany({ lotCode: /^TEST-/ });
    await Purchase.deleteMany({ sotuvchi: 'Test Sotuvchi' });
    await Sale.deleteMany({ xaridor: /^Test Xaridor/ });
    await Expense.deleteMany({ tavsif: /^Test/ });
    
    await mongoose.connection.close();
    console.log('✅ Test database disconnected');
  });

  // 1. AUTHENTICATION TESTS
  describe('1️⃣ Authentication', () => {
    
    test('Should check if admin exists', async () => {
      const res = await request(app)
        .get('/api/auth/check-admin');
      
      expect(res.status).toBe(200);
      expect(res.body.adminExists).toBe(true);
    });

    test('Should login with existing admin credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.username).toBe('admin');
      expect(res.body.user.role).toBe('admin');
      token = res.body.token;
    });

    test('Should fail login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });
      
      expect(res.status).toBe(400);
    });

    test('Should get current user info', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('admin');
      expect(res.body.role).toBe('admin');
    });
  });

  // 2. EXCHANGE RATE TESTS
  describe('2️⃣ Exchange Rates', () => {
    
    test('Should get exchange rates', async () => {
      const res = await request(app)
        .get('/api/exchange-rate')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Should update exchange rate', async () => {
      const res = await request(app)
        .post('/api/exchange-rate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currency: 'RUB',
          rate: 135
        });
      
      expect(res.status).toBe(200);
      expect(res.body.currency).toBe('RUB');
      expect(res.body.rate).toBe(135);
    });

    test('Should get latest exchange rate for RUB', async () => {
      const res = await request(app)
        .get('/api/exchange-rate/RUB')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.currency).toBe('RUB');
      expect(res.body.rate).toBeGreaterThan(0);
    });
  });

  // 3. PURCHASE TESTS (Xarid + Lot yaratish)
  describe('3️⃣ Purchase (Xarid)', () => {
    
    test('Should create purchase and auto-create lot', async () => {
      // Avval RUB kursini olish
      const rateRes = await request(app)
        .get('/api/exchange-rate/RUB')
        .set('Authorization', `Bearer ${token}`);
      
      const valyutaKursi = rateRes.body.rate;
      
      const res = await request(app)
        .post('/api/purchase')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lotCode: 'TEST-001',
          qalinlik: 25,
          eni: 100,
          uzunlik: 6,
          soni: 100,
          yogochZichligi: 0.65,
          birlikNarxi: 1000,
          valyuta: 'RUB',
          sotuvchi: 'Test Sotuvchi',
          xaridJoyi: 'Moskva',
          xaridSanasi: new Date().toISOString(),
          valyutaKursi: valyutaKursi
        });
      
      expect(res.status).toBe(201);
      expect(res.body.purchase).toHaveProperty('_id');
      expect(res.body.wood).toHaveProperty('_id');
      expect(res.body.wood.lotCode).toBe('TEST-001');
      
      testPurchaseId = res.body.purchase._id;
      testWoodId = res.body.wood._id;
    });

    test('Should get all purchases', async () => {
      const res = await request(app)
        .get('/api/purchase')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.purchases).toBeDefined();
      expect(res.body.purchases.length).toBeGreaterThan(0);
    });

    test('Should update purchase', async () => {
      const res = await request(app)
        .put(`/api/purchase/${testPurchaseId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          birlikNarxi: 1100
        });
      
      expect(res.status).toBe(200);
      expect(res.body.birlikNarxi).toBe(1100);
    });
  });

  // 4. WOOD TESTS
  describe('4️⃣ Wood (Lotlar)', () => {
    
    test('Should get all woods', async () => {
      const res = await request(app)
        .get('/api/wood')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.woods).toBeDefined();
      expect(res.body.woods.length).toBeGreaterThan(0);
    });

    test('Should get wood by id', async () => {
      const res = await request(app)
        .get(`/api/wood/${testWoodId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.lotCode).toBe('TEST-001');
      expect(res.body.status).toBe('xarid_qilindi');
    });
  });

  // 5. EXPENSE TESTS
  describe('5️⃣ Expense (Xarajatlar)', () => {
    
    test('Should create expense', async () => {
      const res = await request(app)
        .post('/api/expense')
        .set('Authorization', `Bearer ${token}`)
        .send({
          woodLot: testWoodId,
          xarajatTuri: 'transport_kelish',
          summa: 5000,
          valyuta: 'RUB',
          tavsif: 'Test transport xarajati',
          sana: new Date()
        });
      
      expect(res.status).toBe(201);
      expect(res.body.xarajatTuri).toBe('transport_kelish');
    });

    test('Should get all expenses', async () => {
      const res = await request(app)
        .get('/api/expense')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.expenses).toBeDefined();
    });
  });

  // 6. SALE TESTS
  describe('6️⃣ Sale (Sotuv)', () => {
    
    test('Should create sale', async () => {
      // Avval RUB kursini olish
      const rateRes = await request(app)
        .get('/api/exchange-rate/RUB')
        .set('Authorization', `Bearer ${token}`);
      
      const valyutaKursi = rateRes.body.rate;
      
      const res = await request(app)
        .post('/api/sale')
        .set('Authorization', `Bearer ${token}`)
        .send({
          woodLot: testWoodId,
          birlikNarxi: 1500,
          valyuta: 'RUB',
          xaridor: 'Test Xaridor',
          sotuvJoyi: 'Toshkent',
          sotuvSanasi: new Date().toISOString(),
          valyutaKursi: valyutaKursi
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      testSaleId = res.body._id;
    });

    test('Should update wood status to "sotildi"', async () => {
      const res = await request(app)
        .get(`/api/wood/${testWoodId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('sotildi');
    });

    test('Should calculate profit correctly', async () => {
      const res = await request(app)
        .get(`/api/wood/${testWoodId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.sof_foyda).toBeGreaterThan(0);
      expect(res.body.foyda_foizi).toBeGreaterThan(0);
    });

    test('Should not allow selling already sold lot', async () => {
      // Avval RUB kursini olish
      const rateRes = await request(app)
        .get('/api/exchange-rate/RUB')
        .set('Authorization', `Bearer ${token}`);
      
      const valyutaKursi = rateRes.body.rate;
      
      const res = await request(app)
        .post('/api/sale')
        .set('Authorization', `Bearer ${token}`)
        .send({
          woodLot: testWoodId,
          birlikNarxi: 1500,
          valyuta: 'RUB',
          xaridor: 'Test Xaridor 2',
          sotuvJoyi: 'Toshkent',
          sotuvSanasi: new Date().toISOString(),
          valyutaKursi: valyutaKursi
        });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('sotilgan');
    });
  });

  // 7. SALES HISTORY TESTS
  describe('7️⃣ Sales History (Sotuv Tarixi)', () => {
    
    test('Should get sold lots history', async () => {
      const res = await request(app)
        .get('/api/wood/sold-history')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.woods).toBeDefined();
      expect(res.body.stats).toBeDefined();
      expect(res.body.woods.length).toBeGreaterThan(0);
    });

    test('Should have correct statistics', async () => {
      const res = await request(app)
        .get('/api/wood/sold-history')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.stats.totalLots).toBeGreaterThan(0);
      expect(res.body.stats.totalProfit).toBeGreaterThan(0);
    });
  });

  // 8. KASSA TESTS
  describe('8️⃣ Kassa (Moliya)', () => {
    
    test('Should have automatic kassa entries', async () => {
      const res = await request(app)
        .get('/api/kassa')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.kassa).toBeDefined();
      expect(res.body.kassa.length).toBeGreaterThan(0);
    });

    test('Should have purchase rasxod entry', async () => {
      const res = await request(app)
        .get('/api/kassa')
        .set('Authorization', `Bearer ${token}`);
      
      const rasxod = res.body.kassa.find(k => k.turi === 'rasxod' && k.purchase);
      expect(rasxod).toBeDefined();
    });

    test('Should have sale prixod entry', async () => {
      const res = await request(app)
        .get('/api/kassa')
        .set('Authorization', `Bearer ${token}`);
      
      const prixod = res.body.kassa.find(k => k.turi === 'prixod' && k.sale);
      expect(prixod).toBeDefined();
    });
  });

  // 9. REPORTS TESTS
  describe('9️⃣ Reports (Hisobotlar)', () => {
    
    test('Should get general report', async () => {
      const res = await request(app)
        .get('/api/reports/general')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.woodStats).toBeDefined();
      expect(res.body.kassaStats).toBeDefined();
    });
  });

  // 10. DELETE TESTS
  describe('🔟 Delete Operations', () => {
    
    test('Should delete sale', async () => {
      const res = await request(app)
        .delete(`/api/sale/${testSaleId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });

    test('Should delete purchase', async () => {
      const res = await request(app)
        .delete(`/api/purchase/${testPurchaseId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
    });

    test('Deleted items should not appear in list', async () => {
      const res = await request(app)
        .get('/api/purchase')
        .set('Authorization', `Bearer ${token}`);
      
      // Soft delete qilingan itemlar ro'yxatda bo'lmasligi kerak
      const allIds = res.body.purchases.map(p => p._id);
      expect(allIds).not.toContain(testPurchaseId);
    });
  });
});
