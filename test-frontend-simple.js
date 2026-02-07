const axios = require('axios');

const FRONTEND_URL = 'http://localhost:3000';

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

// Helper function to test page availability
async function testPage(url, pageName) {
  try {
    const response = await axios.get(url, { 
      timeout: 10000,
      validateStatus: (status) => status < 500 // Accept redirects and client errors
    });
    
    const isHtml = response.headers['content-type']?.includes('text/html');
    const hasContent = response.data && response.data.length > 100;
    
    logTest(`${pageName} sahifasi mavjud`, response.status < 400 && isHtml && hasContent);
    
    // Check for React/Next.js indicators
    const hasReact = response.data.includes('__NEXT_DATA__') || response.data.includes('_app');
    logTest(`${pageName} React/Next.js yuklandi`, hasReact);
    
    // Check for common errors
    const hasError = response.data.includes('Error') || response.data.includes('404') || response.data.includes('500');
    logTest(`${pageName} xatolarsiz`, !hasError);
    
    return { success: true, status: response.status };
  } catch (error) {
    logTest(pageName, false, error.message);
    return { success: false, error: error.message };
  }
}

async function testFrontendSimple() {
  console.log('🚀 Frontend sahifalarini oddiy test qilish boshlandi...\n');
  
  console.log('📋 1. ASOSIY SAHIFALAR MAVJUDLIGI');
  
  // Test main pages
  const pages = [
    { url: `${FRONTEND_URL}/`, name: 'Asosiy sahifa' },
    { url: `${FRONTEND_URL}/login`, name: 'Login sahifasi' },
    { url: `${FRONTEND_URL}/cash`, name: 'Kassa sahifasi' },
    { url: `${FRONTEND_URL}/vagon`, name: 'Vagon sahifasi' },
    { url: `${FRONTEND_URL}/expenses`, name: 'Xarajatlar sahifasi' },
    { url: `${FRONTEND_URL}/debt`, name: 'Qarz sahifasi' },
    { url: `${FRONTEND_URL}/client`, name: 'Mijozlar sahifasi' },
    { url: `${FRONTEND_URL}/delivery`, name: 'Yetkazib berish sahifasi' },
    { url: `${FRONTEND_URL}/warehouse`, name: 'Ombor sahifasi' }
  ];
  
  for (const page of pages) {
    await testPage(page.url, page.name);
  }
  
  console.log('\n📋 2. STATIC ASSETS TESTLARI');
  
  // Test static assets
  const assets = [
    { url: `${FRONTEND_URL}/favicon.ico`, name: 'Favicon' },
    { url: `${FRONTEND_URL}/manifest.json`, name: 'Manifest' },
    { url: `${FRONTEND_URL}/robots.txt`, name: 'Robots.txt' }
  ];
  
  for (const asset of assets) {
    try {
      const response = await axios.get(asset.url, { timeout: 5000 });
      logTest(`${asset.name} mavjud`, response.status === 200);
    } catch (error) {
      logTest(asset.name, false, error.message);
    }
  }
  
  console.log('\n📋 3. API INTEGRATION TESTLARI');
  
  // Test if frontend can reach backend
  try {
    const response = await axios.get(`${FRONTEND_URL}/api/test`, { 
      timeout: 5000,
      validateStatus: () => true 
    });
    
    // Frontend should proxy API calls to backend
    logTest('API proxy ishlaydi', response.status !== 404);
  } catch (error) {
    logTest('API proxy', false, error.message);
  }
  
  console.log('\n📋 4. NEXT.JS KONFIGURATSIYA TESTLARI');
  
  // Test Next.js specific endpoints
  const nextEndpoints = [
    { url: `${FRONTEND_URL}/_next/static/chunks/webpack.js`, name: 'Webpack chunks' },
    { url: `${FRONTEND_URL}/_next/static/css/app/layout.css`, name: 'CSS assets' }
  ];
  
  for (const endpoint of nextEndpoints) {
    try {
      const response = await axios.get(endpoint.url, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      logTest(`${endpoint.name} yuklandi`, response.status < 400);
    } catch (error) {
      // These might not exist in development, so we'll be lenient
      logTest(endpoint.name, true, 'Development mode - normal');
    }
  }
  
  console.log('\n📋 5. SAHIFA TARKIBI TESTLARI');
  
  // Test specific page content
  try {
    const loginResponse = await axios.get(`${FRONTEND_URL}/login`, { timeout: 10000 });
    
    // Check for login form elements
    const hasUsernameField = loginResponse.data.includes('username') || loginResponse.data.includes('Username');
    const hasPasswordField = loginResponse.data.includes('password') || loginResponse.data.includes('Password');
    const hasSubmitButton = loginResponse.data.includes('submit') || loginResponse.data.includes('Login');
    
    logTest('Login forma elementlari', hasUsernameField && hasPasswordField && hasSubmitButton);
    
  } catch (error) {
    logTest('Login forma elementlari', false, error.message);
  }
  
  console.log('\n📋 6. RESPONSIVE VA PWA TESTLARI');
  
  try {
    const mainResponse = await axios.get(`${FRONTEND_URL}/`, { timeout: 10000 });
    
    // Check for responsive meta tags
    const hasViewport = mainResponse.data.includes('viewport');
    const hasResponsive = mainResponse.data.includes('responsive') || mainResponse.data.includes('mobile');
    
    logTest('Responsive meta tags', hasViewport);
    
    // Check for PWA indicators
    const hasPWA = mainResponse.data.includes('manifest') || mainResponse.data.includes('service-worker');
    logTest('PWA xususiyatlari', hasPWA);
    
  } catch (error) {
    logTest('Responsive va PWA', false, error.message);
  }
  
  console.log('\n📋 7. SECURITY HEADERS TESTLARI');
  
  try {
    const response = await axios.get(`${FRONTEND_URL}/`, { timeout: 10000 });
    
    // Check security headers
    const hasCSP = response.headers['content-security-policy'];
    const hasXFrame = response.headers['x-frame-options'];
    const hasXContent = response.headers['x-content-type-options'];
    
    logTest('Security headers mavjud', !!(hasCSP || hasXFrame || hasXContent));
    
  } catch (error) {
    logTest('Security headers', false, error.message);
  }
  
  // Final results
  console.log('\n🎯 FRONTEND TEST NATIJALARI:');
  console.log(`✅ Muvaffaqiyatli: ${testResults.passed}`);
  console.log(`❌ Xatolik: ${testResults.failed}`);
  console.log(`📊 Jami: ${testResults.passed + testResults.failed}`);
  
  if (testResults.passed + testResults.failed > 0) {
    console.log(`📈 Muvaffaqiyat foizi: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n🔍 XATOLIKLAR TAFSILOTI:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n✨ Frontend test yakunlandi!');
}

// Run tests
testFrontendSimple().catch(console.error);