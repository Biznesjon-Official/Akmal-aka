const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

async function createAdmin() {
  try {
    console.log('👑 ADMIN USER YARATISH...');
    
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');
    
    // Admin ma'lumotlari
    const adminData = {
      username: 'admin',
      email: 'admin@akmalaka.uz',
      password: 'admin123',
      role: 'admin'
    };
    
    // Mavjud admin tekshirish
    const existingAdmin = await User.findOne({ 
      $or: [
        { username: adminData.username },
        { email: adminData.email }
      ]
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin allaqachon mavjud:');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      
      // Parolni yangilash
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      await User.findByIdAndUpdate(existingAdmin._id, {
        password: hashedPassword,
        lastLogin: null,
        loginAttempts: 0,
        lockUntil: null
      });
      
      console.log('✅ Admin paroli yangilandi: admin123');
    } else {
      // Yangi admin yaratish
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      
      const newAdmin = new User({
        username: adminData.username,
        email: adminData.email,
        password: hashedPassword,
        role: adminData.role
      });
      
      await newAdmin.save();
      
      console.log('✅ Yangi admin yaratildi:');
      console.log(`   Username: ${adminData.username}`);
      console.log(`   Email: ${adminData.email}`);
      console.log(`   Password: ${adminData.password}`);
      console.log(`   Role: ${adminData.role}`);
    }
    
    // Barcha adminlarni ko'rsatish
    const allAdmins = await User.find({ role: 'admin' });
    console.log(`\n👑 JAMI ADMIN USERLAR: ${allAdmins.length} ta`);
    
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Yaratilgan: ${admin.createdAt}`);
      console.log('   ---');
    });
    
  } catch (error) {
    console.error('❌ XATOLIK:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB ulanishi yopildi');
    process.exit(0);
  }
}

createAdmin();