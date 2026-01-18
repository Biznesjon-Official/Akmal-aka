require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Vagon = require('./models/Vagon');
const VagonLot = require('./models/VagonLot');

async function debugVagonTotals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // VAG-2026-001 vagonini topish
    const vagon = await Vagon.findOne({ vagonCode: 'VAG-2026-001' });
    if (!vagon) {
      console.log('❌ Vagon topilmadi');
      process.exit(1);
    }

    console.log('📦 VAGON MA\'LUMOTLARI:');
    console.log('Vagon Code:', vagon.vagonCode);
    console.log('Total Volume:', vagon.total_volume_m3, 'm³');
    console.log('Sold Volume:', vagon.sold_volume_m3, 'm³');
    console.log('USD Total Cost:', vagon.usd_total_cost);
    console.log('USD Total Revenue:', vagon.usd_total_revenue);
    console.log('USD Profit:', vagon.usd_profit);
    console.log('');

    // Lotlarni topish
    const lots = await VagonLot.find({ vagon: vagon._id, isDeleted: false });
    console.log('📋 LOTLAR (' + lots.length + ' ta):');
    
    lots.forEach((lot, index) => {
      console.log(`\nLot ${index + 1}:`);
      console.log('  Dimensions:', lot.dimensions);
      console.log('  Volume:', lot.volume_m3, 'm³');
      console.log('  Purchase Currency:', lot.purchase_currency);
      console.log('  Purchase Amount:', lot.purchase_amount);
      console.log('  Total Investment:', lot.total_investment);
      console.log('  Total Revenue:', lot.total_revenue);
      console.log('  Realized Profit:', lot.realized_profit);
      console.log('  Dispatched Volume:', lot.warehouse_dispatched_volume_m3, 'm³');
      console.log('  Remaining Volume:', lot.warehouse_remaining_volume_m3, 'm³');
    });

    // Jami hisoblash
    console.log('\n🔢 HISOBLANGAN JAMI:');
    let totalCost = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    
    lots.forEach(lot => {
      if (lot.purchase_currency === 'USD') {
        totalCost += lot.total_investment || 0;
        totalRevenue += lot.total_revenue || 0;
        totalProfit += lot.realized_profit || 0;
      }
    });
    
    console.log('USD Total Cost:', totalCost);
    console.log('USD Total Revenue:', totalRevenue);
    console.log('USD Profit:', totalProfit);

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

debugVagonTotals();
