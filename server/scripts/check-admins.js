const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function checkAdmins() {
  try {
    console.log('🔍 ADMIN USERLARNI TEKSHIRISH...');
    
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');
    
    // Barcha userlarni ko'rish
    const allUsers = await User.find({});
    console.log(`\n👤 JAMI USERLAR: ${allUsers.length} ta`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - ${user.role}`);
    });
    
    // Admin userlarni alohida ko'rish
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`\n👑 ADMIN USERLAR: ${adminUsers.length} ta`);
    
    if (adminUsers.length === 0) {
      console.log('⚠️  ADMIN USER TOPILMADI!');
      console.log('⚠️  Avval admin user yarating!');
    } else {
      adminUsers.forEach((admin, index) => {
        console.log(`${index + 1}. Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Yaratilgan: ${admin.createdAt}`);
        console.log(`   Oxirgi login: ${admin.lastLogin || 'Hech qachon'}`);
        console.log('   ---');
      });
    }
    
    // Oddiy userlar
    const regularUsers = await User.find({ role: { $ne: 'admin' } });
    console.log(`\n👥 ODDIY USERLAR: ${regularUsers.length} ta`);
    
    if (regularUsers.length > 0) {
      regularUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.email}) - ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ XATOLIK:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB ulanishi yopildi');
    process.exit(0);
  }
}

checkAdmins();