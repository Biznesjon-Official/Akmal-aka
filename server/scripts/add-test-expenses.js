const mongoose = require('mongoose');
require('dotenv').config();

async function addTestExpenses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yogoch_export');
    console.log('✅ Connected to MongoDB');

    const Expense = require('../models/Expense');
    const Vagon = require('../models/Vagon');
    const User = require('../models/User');

    // Get first vagon and user
    const vagon = await Vagon.findOne({ isDeleted: false });
    const user = await User.findOne();

    if (!vagon) {
      console.log('❌ Vagon topilmadi. Avval vagon qo\'shing!');
      process.exit(1);
    }

    if (!user) {
      console.log('❌ User topilmadi!');
      process.exit(1);
    }

    console.log('📦 Vagon:', vagon.vagon_number);
    console.log('👤 User:', user.username);

    // Test xarajatlar
    const testExpenses = [
      {
        turi: 'transport',
        transportTuri: 'yuk_tashish',
        summa: 5000,
        valyuta: 'USD',
        summaRUB: 5000 * 90,
        summaUSD: 5000,
        xarajatSanasi: new Date(),
        tavsif: 'Yuk tashish xarajati (test)',
        javobgarShaxs: 'Test Manager',
        yaratuvchi: user._id,
        vagon: vagon._id,
        tolovHolati: 'tolangan',
        isDeleted: false
      },
      {
        turi: 'bojxona',
        bojxonaTuri: 'import_bojxona',
        summa: 3000,
        valyuta: 'USD',
        summaRUB: 3000 * 90,
        summaUSD: 3000,
        xarajatSanasi: new Date(),
        tavsif: 'Bojxona to\'lovi (test)',
        javobgarShaxs: 'Test Manager',
        yaratuvchi: user._id,
        vagon: vagon._id,
        tolovHolati: 'tolangan',
        isDeleted: false
      },
      {
        turi: 'ishchilar',
        ishchilarTuri: 'yuklash',
        summa: 150000,
        valyuta: 'RUB',
        summaRUB: 150000,
        summaUSD: 150000 / 90,
        xarajatSanasi: new Date(),
        tavsif: 'Ishchilar maoshi (test)',
        javobgarShaxs: 'Test Manager',
        yaratuvchi: user._id,
        vagon: vagon._id,
        tolovHolati: 'tolangan',
        isDeleted: false
      },
      {
        turi: 'ombor',
        omborTuri: 'ijara',
        summa: 2000,
        valyuta: 'USD',
        summaRUB: 2000 * 90,
        summaUSD: 2000,
        xarajatSanasi: new Date(),
        tavsif: 'Ombor ijarasi (test)',
        javobgarShaxs: 'Test Manager',
        yaratuvchi: user._id,
        tolovHolati: 'tolangan',
        isDeleted: false
      }
    ];

    // Insert test expenses
    const result = await Expense.insertMany(testExpenses);
    console.log(`✅ ${result.length} ta test xarajat qo'shildi!`);

    // Show summary
    const summary = await Expense.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: { turi: '$turi', valyuta: '$valyuta' },
          count: { $sum: 1 },
          total: { $sum: '$summa' }
        }
      }
    ]);

    console.log('\n📊 Xarajatlar xulosasi:');
    summary.forEach(item => {
      console.log(`  ${item._id.turi} (${item._id.valyuta}): ${item.count} ta, Jami: ${item.total}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

addTestExpenses();
