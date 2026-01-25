const mongoose = require('mongoose');
require('dotenv').config();

// Modellarni import qilish
const Vagon = require('../models/Vagon');
const VagonLot = require('../models/VagonLot');
const VagonSale = require('../models/VagonSale');
const Client = require('../models/Client');
const Cash = require('../models/Cash');
const Expense = require('../models/Expense');

async function addIndexes() {
  try {
    console.log('🔗 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    console.log('📊 Indexlar qo\'shilmoqda...');

    // Xavfsiz index qo'shish funksiyasi
    async function safeCreateIndex(collection, indexSpec, options = {}) {
      try {
        await collection.createIndex(indexSpec, options);
        return true;
      } catch (error) {
        if (error.code === 86 || error.code === 11000) {
          console.log(`⚠️  Index allaqachon mavjud: ${JSON.stringify(indexSpec)}`);
          return false;
        }
        throw error;
      }
    }

    // 1. VagonSale indexlari
    console.log('1️⃣ VagonSale indexlari...');
    await safeCreateIndex(VagonSale.collection, { client: 1, isDeleted: 1 });
    await safeCreateIndex(VagonSale.collection, { vagon: 1, isDeleted: 1 });
    await safeCreateIndex(VagonSale.collection, { lot: 1, isDeleted: 1 });
    await safeCreateIndex(VagonSale.collection, { sale_date: -1 });
    await safeCreateIndex(VagonSale.collection, { sale_currency: 1, isDeleted: 1 });
    await safeCreateIndex(VagonSale.collection, { status: 1, isDeleted: 1 });
    await safeCreateIndex(VagonSale.collection, { createdAt: -1 });
    console.log('✅ VagonSale indexlari qo\'shildi');

    // 2. Cash indexlari
    console.log('2️⃣ Cash indexlari...');
    await safeCreateIndex(Cash.collection, { client: 1, isDeleted: 1 });
    await safeCreateIndex(Cash.collection, { type: 1, isDeleted: 1 });
    await safeCreateIndex(Cash.collection, { currency: 1, isDeleted: 1 });
    await safeCreateIndex(Cash.collection, { transaction_date: -1 });
    await safeCreateIndex(Cash.collection, { vagon: 1, isDeleted: 1 });
    await safeCreateIndex(Cash.collection, { vagonSale: 1, isDeleted: 1 });
    await safeCreateIndex(Cash.collection, { createdAt: -1 });
    console.log('✅ Cash indexlari qo\'shildi');

    // 3. Client indexlari
    console.log('3️⃣ Client indexlari...');
    await safeCreateIndex(Client.collection, { name: 1, isDeleted: 1 });
    await safeCreateIndex(Client.collection, { 
      usd_total_debt: 1, 
      rub_total_debt: 1, 
      delivery_total_debt: 1 
    });
    await safeCreateIndex(Client.collection, { createdAt: -1 });
    console.log('✅ Client indexlari qo\'shildi');

    // 4. Vagon indexlari
    console.log('4️⃣ Vagon indexlari...');
    await safeCreateIndex(Vagon.collection, { month: 1, isDeleted: 1 });
    await safeCreateIndex(Vagon.collection, { status: 1, isDeleted: 1 });
    await safeCreateIndex(Vagon.collection, { createdAt: -1 });
    console.log('✅ Vagon indexlari qo\'shildi');

    // 5. VagonLot indexlari
    console.log('5️⃣ VagonLot indexlari...');
    await safeCreateIndex(VagonLot.collection, { vagon: 1, isDeleted: 1 });
    await safeCreateIndex(VagonLot.collection, { purchase_currency: 1, isDeleted: 1 });
    await safeCreateIndex(VagonLot.collection, { createdAt: -1 });
    console.log('✅ VagonLot indexlari qo\'shildi');

    // 6. Expense indexlari
    console.log('6️⃣ Expense indexlari...');
    await safeCreateIndex(Expense.collection, { turi: 1, isDeleted: 1 });
    await safeCreateIndex(Expense.collection, { valyuta: 1, isDeleted: 1 });
    await safeCreateIndex(Expense.collection, { xarajatSanasi: -1 });
    await safeCreateIndex(Expense.collection, { woodLot: 1, isDeleted: 1 });
    await safeCreateIndex(Expense.collection, { vagon: 1, isDeleted: 1 });
    await safeCreateIndex(Expense.collection, { tolovHolati: 1, isDeleted: 1 });
    await safeCreateIndex(Expense.collection, { createdAt: -1 });
    console.log('✅ Expense indexlari qo\'shildi');

    // 7. Compound indexlar (murakkab) - PERFORMANCE CRITICAL
    console.log('7️⃣ Compound indexlar...');
    
    // Client bo'yicha sotuvlar (eng ko'p ishlatiladigan)
    await safeCreateIndex(VagonSale.collection, { 
      client: 1, 
      sale_date: -1, 
      isDeleted: 1 
    });

    // Vagon bo'yicha sotuvlar
    await safeCreateIndex(VagonSale.collection, { 
      vagon: 1, 
      sale_date: -1, 
      isDeleted: 1 
    });

    // Cash tranzaksiyalar (client + date)
    await safeCreateIndex(Cash.collection, { 
      client: 1, 
      transaction_date: -1, 
      isDeleted: 1 
    });

    // Cash tranzaksiyalar (type + date)
    await safeCreateIndex(Cash.collection, { 
      type: 1, 
      transaction_date: -1, 
      isDeleted: 1 
    });

    // Client qarzlari (multi-currency)
    await safeCreateIndex(Client.collection, { 
      usd_total_debt: -1, 
      rub_total_debt: -1, 
      isDeleted: 1 
    });

    // Vagon status + month
    await safeCreateIndex(Vagon.collection, { 
      status: 1, 
      month: 1, 
      isDeleted: 1 
    });

    // VagonSale payment status
    await safeCreateIndex(VagonSale.collection, { 
      payment_status: 1, 
      sale_date: -1, 
      isDeleted: 1 
    });

    console.log('✅ Compound indexlar qo\'shildi');

    // 8. Text indexlar (qidiruv uchun)
    console.log('8️⃣ Text indexlar...');
    
    // Client name search
    await safeCreateIndex(Client.collection, { 
      name: 'text', 
      phone: 'text' 
    }, { name: 'client_search_text' });

    // Vagon code search
    await safeCreateIndex(Vagon.collection, { 
      vagonCode: 'text' 
    }, { name: 'vagon_search_text' });

    console.log('✅ Text indexlar qo\'shildi');

    // 9. Sparse indexlar (null qiymatlar uchun)
    console.log('9️⃣ Sparse indexlar...');
    
    // VagonSale lot reference (sparse)
    await safeCreateIndex(VagonSale.collection, { 
      lot: 1 
    }, { sparse: true });

    // Cash vagon reference (sparse)
    await safeCreateIndex(Cash.collection, { 
      vagon: 1 
    }, { sparse: true });

    // Cash vagonSale reference (sparse)
    await safeCreateIndex(Cash.collection, { 
      vagonSale: 1 
    }, { sparse: true });

    console.log('✅ Sparse indexlar qo\'shildi');

    // 10. Performance monitoring indexlar
    console.log('🔟 Performance monitoring indexlar...');
    
    // Dashboard queries optimization
    await safeCreateIndex(Cash.collection, { 
      transaction_date: -1, 
      type: 1, 
      currency: 1, 
      isDeleted: 1 
    });

    // Recent activities
    await safeCreateIndex(VagonSale.collection, { 
      createdAt: -1, 
      isDeleted: 1 
    });

    await safeCreateIndex(Cash.collection, { 
      createdAt: -1, 
      isDeleted: 1 
    });

    console.log('✅ Performance monitoring indexlar qo\'shildi');
    
    // Vagon bo'yicha sotuvlar
    await safeCreateIndex(VagonSale.collection, { 
      vagon: 1, 
      createdAt: -1, 
      isDeleted: 1 
    });
    
    // Cash flow bo'yicha
    await safeCreateIndex(Cash.collection, { 
      client: 1, 
      transaction_date: -1, 
      type: 1, 
      isDeleted: 1 
    });
    
    // Valyuta va sana bo'yicha
    await safeCreateIndex(Cash.collection, { 
      currency: 1, 
      transaction_date: -1, 
      isDeleted: 1 
    });
    
    console.log('✅ Compound indexlar qo\'shildi');

    // 8. Text indexlar (qidiruv uchun)
    console.log('8️⃣ Text indexlar...');
    await safeCreateIndex(Client.collection, { 
      name: 'text', 
      phone: 'text' 
    });
    console.log('✅ Text indexlar qo\'shildi');

    console.log('🎉 Barcha indexlar muvaffaqiyatli qo\'shildi!');
    
    // Index'lar ro'yxatini ko'rsatish
    console.log('\n📋 Qo\'shilgan indexlar:');
    const collections = [
      { name: 'VagonSale', model: VagonSale },
      { name: 'Cash', model: Cash },
      { name: 'Client', model: Client },
      { name: 'Vagon', model: Vagon },
      { name: 'VagonLot', model: VagonLot },
      { name: 'Expense', model: Expense }
    ];
    
    for (const collection of collections) {
      const indexes = await collection.model.collection.getIndexes();
      console.log(`\n${collection.name}:`);
      Object.keys(indexes).forEach(indexName => {
        console.log(`  - ${indexName}`);
      });
    }

  } catch (error) {
    console.error('❌ Index qo\'shishda xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB dan uzildi');
  }
}

// Script ishga tushirish
if (require.main === module) {
  addIndexes();
}

module.exports = addIndexes;