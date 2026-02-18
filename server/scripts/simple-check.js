const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('=== Environment Check ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'NOT FOUND');
console.log('PORT:', process.env.PORT);
console.log('========================\n');

const mongoose = require('mongoose');

async function simpleCheck() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB\n');

    const User = require('../models/User');
    
    const allUsers = await User.find({});
    console.log(`Total users in database: ${allUsers.length}\n`);
    
    if (allUsers.length > 0) {
      console.log('All users:');
      console.log('=====================================');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log('');
      });
      console.log('=====================================\n');
      
      const admins = allUsers.filter(u => u.role === 'admin');
      console.log(`Admin users: ${admins.length}`);
      if (admins.length > 0) {
        console.log('\n⚠️  Admin credentials are encrypted in database.');
        console.log('If you forgot the password, create a new admin or reset password.');
      }
    } else {
      console.log('❌ No users found in database!');
      console.log('\nCreate admin with: node server/scripts/create-admin.js');
    }

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

simpleCheck();
