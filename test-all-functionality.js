const axios = require('axios');

const BASE_URL = 'http://localhost:5002/api';
let authToken = '';

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTest(testName, success, error = null) {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}: ${error}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error });
  }
}

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    data
  };
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status 
    };
  }
}

async function runTests() {
  console.log('🚀 Loyiha funksiyalarini to\'liq test qilish boshlandi...\n');

  // 1. Authentication Tests
  console.log('📋 1. AUTHENTICATION TESTLARI');
  
  // Check admin exists
  const adminCheck = await makeRequest('GET', '/auth/check-admin');
  logTest('Admin mavjudligini tekshirish', adminCheck.success);
  
  // Login test (assuming admin exists)
  const loginData = {
    username: 'admin',
    password: 'admin123' // Default admin password
  };
  
  const loginResult = await makeRequest('POST', '/auth/login', loginData);
  if (loginResult.success) {
    authToken = loginResult.data.token;
    logTest('Admin login', true);
  } else {
    logTest('Admin login', false, loginResult.error);
  }
  
  // Get current user info
  const userInfo = await makeRequest('GET', '/auth/me');
  logTest('Foydalanuvchi ma\'lumotlarini olish', userInfo.success);
  
  console.log('\n📋 2. VAGON MANAGEMENT TESTLARI');
  
  // Get all vagons
  const vagonsResult = await makeRequest('GET', '/vagon');
  logTest('Vagonlar ro\'yxatini olish', vagonsResult.success);
  
  // Create test vagon
  const vagonData = {
    vagonCode: `TEST-${Date.now()}`,
    month: '15/02/2024', // Fixed date format to DD/MM/YYYY
    sending_place: 'Test Yuborish',
    receiving_place: 'Test Qabul',
    lots: [
      {
        name: 'Test Yog\'och',
        dimensions: '35×125×6',
        quantity: 100,
        volume_m3: 2.625,
        purchase_currency: 'USD',
        purchase_amount: 1000
      }
    ]
  };
  
  const createVagonResult = await makeRequest('POST', '/vagon', vagonData);
  let testVagonId = null;
  if (createVagonResult.success) {
    testVagonId = createVagonResult.data._id;
    logTest('Vagon yaratish', true);
  } else {
    logTest('Vagon yaratish', false, createVagonResult.error);
  }
  
  // Get vagon details
  if (testVagonId) {
    const vagonDetails = await makeRequest('GET', `/vagon/${testVagonId}`);
    logTest('Vagon tafsilotlarini olish', vagonDetails.success);
    
    // Get vagon with lots
    const vagonWithLots = await makeRequest('GET', `/vagon/${testVagonId}/details`);
    logTest('Vagon va lotlar ma\'lumotlarini olish', vagonWithLots.success);
  }
  
  console.log('\n📋 3. CLIENT MANAGEMENT TESTLARI');
  
  // Get all clients
  const clientsResult = await makeRequest('GET', '/client');
  logTest('Mijozlar ro\'yxatini olish', clientsResult.success);
  
  // Create test client
  const clientData = {
    name: `Test Mijoz ${Date.now()}`,
    phone: '+998901234567',
    address: 'Test manzil'
  };
  
  const createClientResult = await makeRequest('POST', '/client', clientData);
  let testClientId = null;
  if (createClientResult.success) {
    testClientId = createClientResult.data._id;
    logTest('Mijoz yaratish', true);
  } else {
    logTest('Mijoz yaratish', false, createClientResult.error);
  }
  
  console.log('\n📋 4. VAGON LOT TESTLARI');
  
  // Get all lots
  const lotsResult = await makeRequest('GET', '/vagon-lot');
  logTest('Vagon lotlari ro\'yxatini olish', lotsResult.success);
  
  if (testVagonId) {
    // Create additional lot
    const lotData = {
      vagon: testVagonId,
      name: 'Qo\'shimcha Yog\'och',
      dimensions: '40×150×6',
      quantity: 50,
      volume_m3: 1.8,
      purchase_currency: 'USD',
      purchase_amount: 800
    };
    
    const createLotResult = await makeRequest('POST', '/vagon-lot', lotData);
    logTest('Vagon lot yaratish', createLotResult.success, createLotResult.error);
  }
  
  console.log('\n📋 5. VAGON EXPENSE TESTLARI');
  
  // Get vagon expenses
  const expensesResult = await makeRequest('GET', '/vagon-expense');
  logTest('Vagon xarajatlari ro\'yxatini olish', expensesResult.success);
  
  if (testVagonId) {
    // Create vagon expense
    const expenseData = {
      vagon: testVagonId,
      expense_type: 'transport',
      currency: 'USD',
      amount: 200,
      description: 'Test transport xarajati',
      expense_date: new Date().toISOString()
    };
    
    const createExpenseResult = await makeRequest('POST', '/vagon-expense', expenseData);
    logTest('Vagon xarajati yaratish', createExpenseResult.success, createExpenseResult.error);
  }
  
  console.log('\n📋 6. CASH MANAGEMENT TESTLARI');
  
  // Get cash balance
  const balanceResult = await makeRequest('GET', '/cash/balance');
  logTest('Kassa balansini olish', balanceResult.success);
  
  // Get cash history
  const cashHistoryResult = await makeRequest('GET', '/cash');
  logTest('Kassa tarixini olish', cashHistoryResult.success);
  
  // Record income (need to get vagon and lot IDs first)
  let testVagonForIncome = null;
  let testLotForIncome = null;
  
  // Get first available vagon and lot for income test
  const availableVagons = await makeRequest('GET', '/vagon?limit=1');
  if (availableVagons.success && availableVagons.data.vagons && availableVagons.data.vagons.length > 0) {
    testVagonForIncome = availableVagons.data.vagons[0]._id;
    
    // Get lots for this vagon
    const availableLots = await makeRequest('GET', `/vagon-lot?vagon=${testVagonForIncome}&limit=1`);
    if (availableLots.success && availableLots.data && availableLots.data.length > 0) {
      testLotForIncome = availableLots.data[0]._id;
    }
  }
  
  const incomeData = {
    income_source: 'yogoch_tolovi',
    amount: 1000,
    currency: 'USD',
    description: 'Test daromad',
    date: new Date().toISOString().split('T')[0],
    client_type: 'one_time',
    one_time_client_name: 'Test Mijoz',
    one_time_client_phone: '+998901234567',
    vagon_id: testVagonForIncome,
    yogoch_id: testLotForIncome
  };
  
  const recordIncomeResult = await makeRequest('POST', '/cash/income', incomeData);
  logTest('Daromad yozish', recordIncomeResult.success, recordIncomeResult.error);
  
  // Record expense
  const expenseData2 = {
    expense_source: 'transport',
    amount: 100,
    currency: 'USD',
    description: 'Test xarajat',
    date: new Date().toISOString().split('T')[0],
    responsible_person: 'Test Javobgar'
  };
  
  const recordExpenseResult = await makeRequest('POST', '/cash/expense', expenseData2);
  logTest('Xarajat yozish', recordExpenseResult.success, recordExpenseResult.error);
  
  console.log('\n📋 7. VAGON SALE TESTLARI');
  
  // Get vagon sales
  const salesResult = await makeRequest('GET', '/vagon-sale');
  logTest('Vagon sotuvlari ro\'yxatini olish', salesResult.success);
  
  console.log('\n📋 8. EXCHANGE RATE TESTLARI');
  
  // Get exchange rates
  const ratesResult = await makeRequest('GET', '/exchange-rate');
  logTest('Valyuta kurslarini olish', ratesResult.success);
  
  console.log('\n📋 9. BUSINESS LOGIC TESTLARI');
  
  // Get business summary
  const businessResult = await makeRequest('GET', '/business-logic/business-summary');
  logTest('Biznes xulosasini olish', businessResult.success);
  
  console.log('\n📋 10. PAGINATION VA FILTERING TESTLARI');
  
  // Test pagination
  const paginationResult = await makeRequest('GET', '/vagon?page=1&limit=5');
  logTest('Pagination test', paginationResult.success);
  
  // Test filtering
  const filterResult = await makeRequest('GET', '/vagon?status=active');
  logTest('Filtering test', filterResult.success);
  
  // Test search
  const searchResult = await makeRequest('GET', '/vagon?search=TEST');
  logTest('Search test', searchResult.success);
  
  console.log('\n📋 11. ERROR HANDLING TESTLARI');
  
  // Test invalid vagon ID
  const invalidVagonResult = await makeRequest('GET', '/vagon/invalid_id');
  logTest('Noto\'g\'ri ID bilan xatolik', !invalidVagonResult.success && invalidVagonResult.status === 400);
  
  // Test unauthorized access (without token)
  authToken = '';
  const unauthorizedResult = await makeRequest('GET', '/vagon');
  logTest('Ruxsatsiz kirish xatoligi', !unauthorizedResult.success && unauthorizedResult.status === 401);
  
  // Restore token for cleanup
  if (loginResult.success) {
    authToken = loginResult.data.token;
  }
  
  console.log('\n📋 12. CLEANUP - TEST MA\'LUMOTLARINI O\'CHIRISH');
  
  // Delete test vagon
  if (testVagonId) {
    const deleteVagonResult = await makeRequest('DELETE', `/vagon/${testVagonId}`);
    logTest('Test vagonni o\'chirish', deleteVagonResult.success);
  }
  
  // Delete test client
  if (testClientId) {
    const deleteClientResult = await makeRequest('DELETE', `/client/${testClientId}`);
    logTest('Test mijozni o\'chirish', deleteClientResult.success);
  }
  
  // Final results
  console.log('\n🎯 TEST NATIJALARI:');
  console.log(`✅ Muvaffaqiyatli: ${testResults.passed}`);
  console.log(`❌ Xatolik: ${testResults.failed}`);
  console.log(`📊 Jami: ${testResults.passed + testResults.failed}`);
  console.log(`📈 Muvaffaqiyat foizi: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🔍 XATOLIKLAR TAFSILOTI:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n✨ Test yakunlandi!');
}

// Run tests
runTests().catch(console.error);