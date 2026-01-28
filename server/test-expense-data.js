const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yogoch_export')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Expense = require('./models/Expense');
    const Vagon = require('./models/Vagon');
    
    // Test Expense data
    const expenseCount = await Expense.countDocuments({ isDeleted: false });
    console.log('\n=== EXPENSE DATA ===');
    console.log('Total expenses:', expenseCount);
    
    if (expenseCount > 0) {
      const expenses = await Expense.find({ isDeleted: false }).limit(3).lean();
      console.log('Sample expenses:', JSON.stringify(expenses, null, 2));
      
      // Group by category
      const byCategory = await Expense.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: { turi: '$turi', valyuta: '$valyuta' },
            count: { $sum: 1 },
            total: { $sum: '$summa' }
          }
        }
      ]);
      console.log('\nExpenses by category:', JSON.stringify(byCategory, null, 2));
    }
    
    // Test Vagon data
    const vagonCount = await Vagon.countDocuments({ isDeleted: false });
    console.log('\n=== VAGON DATA ===');
    console.log('Total vagons:', vagonCount);
    
    if (vagonCount > 0) {
      const vagons = await Vagon.find({ isDeleted: false }).limit(2).lean();
      console.log('Sample vagons:', JSON.stringify(vagons.map(v => ({
        _id: v._id,
        vagon_number: v.vagon_number,
        usd_cost_price: v.usd_cost_price,
        rub_cost_price: v.rub_cost_price,
        total_volume_m3: v.total_volume_m3,
        sold_volume_m3: v.sold_volume_m3
      })), null, 2));
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
