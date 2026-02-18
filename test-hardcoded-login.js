const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing hardcoded admin login...\n');
    
    // Local server
    const localUrl = 'http://localhost:5002/api/auth/login';
    
    console.log('URL:', localUrl);
    console.log('Username: admin');
    console.log('Password: admin123\n');
    
    const response = await axios.post(localUrl, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login successful!');
    console.log('Token:', response.data.token.substring(0, 50) + '...');
    console.log('User:', response.data.user);
    
  } catch (error) {
    console.error('❌ Login failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
