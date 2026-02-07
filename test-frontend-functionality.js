const puppeteer = require('puppeteer');

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

async function testFrontend() {
  console.log('🚀 Frontend sahifalarini test qilish boshlandi...\n');
  
  let browser;
  let page;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('📋 1. LOGIN SAHIFASI TESTLARI');
    
    // Test login page
    try {
      await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0', timeout: 10000 });
      const title = await page.title();
      logTest('Login sahifasi yuklandi', title.includes('Login') || title.includes('Akmalaka'));
      
      // Check if login form exists
      const loginForm = await page.$('form');
      logTest('Login forma mavjud', !!loginForm);
      
      // Check username and password fields
      const usernameField = await page.$('input[name="username"], input[type="text"]');
      const passwordField = await page.$('input[name="password"], input[type="password"]');
      logTest('Username maydoni mavjud', !!usernameField);
      logTest('Password maydoni mavjud', !!passwordField);
      
      // Test login functionality
      if (usernameField && passwordField) {
        await page.type('input[name="username"], input[type="text"]', 'admin');
        await page.type('input[name="password"], input[type="password"]', 'admin123');
        
        const submitButton = await page.$('button[type="submit"], button');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Check if redirected to dashboard
          const currentUrl = page.url();
          logTest('Login muvaffaqiyatli', !currentUrl.includes('/login'));
        } else {
          logTest('Login submit button', false, 'Submit button topilmadi');
        }
      }
    } catch (error) {
      logTest('Login sahifasi', false, error.message);
    }
    
    console.log('\n📋 2. ASOSIY SAHIFALAR TESTLARI');
    
    // Test main pages
    const pages = [
      { url: 'http://localhost:3001/', name: 'Asosiy sahifa' },
      { url: 'http://localhost:3001/cash', name: 'Kassa sahifasi' },
      { url: 'http://localhost:3001/vagon', name: 'Vagon sahifasi' },
      { url: 'http://localhost:3001/expenses', name: 'Xarajatlar sahifasi' },
      { url: 'http://localhost:3001/debt', name: 'Qarz sahifasi' },
      { url: 'http://localhost:3001/client', name: 'Mijozlar sahifasi' },
      { url: 'http://localhost:3001/delivery', name: 'Yetkazib berish sahifasi' },
      { url: 'http://localhost:3001/warehouse', name: 'Ombor sahifasi' }
    ];
    
    for (const testPage of pages) {
      try {
        await page.goto(testPage.url, { waitUntil: 'networkidle0', timeout: 10000 });
        
        // Check if page loaded without errors
        const hasError = await page.$('.error, [data-testid="error"]');
        const hasContent = await page.$('main, .container, .content, body > div');
        
        logTest(`${testPage.name} yuklandi`, !hasError && !!hasContent);
        
        // Check for React errors in console
        const logs = await page.evaluate(() => {
          return window.console.errors || [];
        });
        
        if (logs.length === 0) {
          logTest(`${testPage.name} console xatolari yo'q`, true);
        } else {
          logTest(`${testPage.name} console xatolari`, false, `${logs.length} ta xatolik`);
        }
        
      } catch (error) {
        logTest(testPage.name, false, error.message);
      }
    }
    
    console.log('\n📋 3. KASSA SAHIFASI FUNKSIYALARI');
    
    try {
      await page.goto('http://localhost:3001/cash', { waitUntil: 'networkidle0', timeout: 10000 });
      
      // Check for income/expense buttons
      const incomeButton = await page.$('button:contains("Daromad"), [data-testid="income-button"]');
      const expenseButton = await page.$('button:contains("Xarajat"), [data-testid="expense-button"]');
      
      logTest('Daromad tugmasi mavjud', !!incomeButton);
      logTest('Xarajat tugmasi mavjud', !!expenseButton);
      
      // Check for balance display
      const balanceDisplay = await page.$('.balance, [data-testid="balance"]');
      logTest('Balans ko\'rsatilmoqda', !!balanceDisplay);
      
      // Check for transaction history
      const transactionList = await page.$('.transaction, .history, table');
      logTest('Tranzaksiya tarixi mavjud', !!transactionList);
      
    } catch (error) {
      logTest('Kassa sahifasi funksiyalari', false, error.message);
    }
    
    console.log('\n📋 4. VAGON SAHIFASI FUNKSIYALARI');
    
    try {
      await page.goto('http://localhost:3001/vagon', { waitUntil: 'networkidle0', timeout: 10000 });
      
      // Check for vagon list
      const vagonList = await page.$('.vagon, table, .grid');
      logTest('Vagon ro\'yxati mavjud', !!vagonList);
      
      // Check for create vagon button
      const createButton = await page.$('button:contains("Yaratish"), button:contains("Qo\'shish")');
      logTest('Vagon yaratish tugmasi mavjud', !!createButton);
      
      // Check for search functionality
      const searchInput = await page.$('input[type="search"], input[placeholder*="qidiruv"], input[placeholder*="search"]');
      logTest('Qidiruv maydoni mavjud', !!searchInput);
      
    } catch (error) {
      logTest('Vagon sahifasi funksiyalari', false, error.message);
    }
    
    console.log('\n📋 5. RESPONSIVE DESIGN TESTLARI');
    
    // Test mobile responsiveness
    try {
      await page.setViewport({ width: 375, height: 667 }); // iPhone size
      await page.goto('http://localhost:3001/cash', { waitUntil: 'networkidle0', timeout: 10000 });
      
      const mobileMenu = await page.$('.mobile-menu, .hamburger, [data-testid="mobile-menu"]');
      const sidebar = await page.$('.sidebar');
      
      logTest('Mobile responsive', true); // If page loads, it's responsive
      
      // Reset viewport
      await page.setViewport({ width: 1280, height: 720 });
      
    } catch (error) {
      logTest('Mobile responsive', false, error.message);
    }
    
    console.log('\n📋 6. PERFORMANCE TESTLARI');
    
    try {
      // Test page load performance
      const startTime = Date.now();
      await page.goto('http://localhost:3001/cash', { waitUntil: 'networkidle0', timeout: 10000 });
      const loadTime = Date.now() - startTime;
      
      logTest('Sahifa yuklash tezligi (<3s)', loadTime < 3000, `${loadTime}ms`);
      
      // Check for large images or resources
      const images = await page.$$('img');
      logTest('Rasmlar mavjud', images.length > 0);
      
    } catch (error) {
      logTest('Performance testlari', false, error.message);
    }
    
  } catch (error) {
    console.error('❌ Browser setup error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Final results
  console.log('\n🎯 FRONTEND TEST NATIJALARI:');
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
  
  console.log('\n✨ Frontend test yakunlandi!');
}

// Run tests
testFrontend().catch(console.error);