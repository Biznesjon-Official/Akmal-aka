/**
 * Avtomatik optimizatsiya middleware
 * Yangi ma'lumotlar qo'shilganda avtomatik optimizatsiyalarni ishga tushiradi
 */

const { updateVagonTotals } = require('../utils/vagonHelpers');
const { updateClientDebt } = require('../utils/clientHelpers');

// Cache for preventing duplicate operations
const operationCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Vagon bog'liq ma'lumotlar o'zgarganda avtomatik yangilash
 */
async function autoUpdateVagonTotals(vagonId, session = null) {
  if (!vagonId) return;
  
  const cacheKey = `vagon_${vagonId}`;
  const now = Date.now();
  
  // Cache check - bir xil operatsiyani 5 soniya ichida takrorlamaslik
  if (operationCache.has(cacheKey)) {
    const lastUpdate = operationCache.get(cacheKey);
    if (now - lastUpdate < CACHE_DURATION) {
      console.log(`⏭️ Vagon ${vagonId} yangilanishi cache'dan o'tkazildi`);
      return;
    }
  }
  
  try {
    console.log(`🔄 Auto-updating vagon totals: ${vagonId}`);
    await updateVagonTotals(vagonId, session);
    operationCache.set(cacheKey, now);
    
    // Cache cleanup after 1 minute
    setTimeout(() => {
      operationCache.delete(cacheKey);
    }, 60000);
    
  } catch (error) {
    console.error(`❌ Auto vagon update error for ${vagonId}:`, error.message);
  }
}

/**
 * Mijoz bog'liq ma'lumotlar o'zgarganda avtomatik yangilash
 */
async function autoUpdateClientDebt(clientId, session = null) {
  if (!clientId) return;
  
  const cacheKey = `client_${clientId}`;
  const now = Date.now();
  
  // Cache check
  if (operationCache.has(cacheKey)) {
    const lastUpdate = operationCache.get(cacheKey);
    if (now - lastUpdate < CACHE_DURATION) {
      console.log(`⏭️ Client ${clientId} yangilanishi cache'dan o'tkazildi`);
      return;
    }
  }
  
  try {
    console.log(`🔄 Auto-updating client debt: ${clientId}`);
    await updateClientDebt(clientId, session);
    operationCache.set(cacheKey, now);
    
    // Cache cleanup after 1 minute
    setTimeout(() => {
      operationCache.delete(cacheKey);
    }, 60000);
    
  } catch (error) {
    console.error(`❌ Auto client update error for ${clientId}:`, error.message);
  }
}

/**
 * Yangi index kerak bo'lgan field'larni avtomatik aniqlash
 */
async function autoCreateIndexes(collectionName, document) {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Yangi field'lar uchun index yaratish logikasi
    const indexableFields = [
      'status', 'type', 'category', 'currency', 'client', 'vagon', 
      'lot', 'sale_date', 'transaction_date', 'expense_date', 
      'createdAt', 'updatedAt', 'isDeleted'
    ];
    
    const newIndexes = [];
    
    for (const field of indexableFields) {
      if (document[field] !== undefined) {
        // Check if index already exists
        const existingIndexes = await db.collection(collectionName).indexes();
        const hasIndex = existingIndexes.some(index => 
          index.key[field] !== undefined || 
          index.key[`${field}, isDeleted`] !== undefined
        );
        
        if (!hasIndex) {
          newIndexes.push({ [field]: 1, isDeleted: 1 });
        }
      }
    }
    
    // Create new indexes if needed
    if (newIndexes.length > 0) {
      console.log(`🔍 Creating auto-indexes for ${collectionName}:`, newIndexes);
      for (const indexSpec of newIndexes) {
        try {
          await db.collection(collectionName).createIndex(indexSpec);
          console.log(`✅ Auto-index created: ${Object.keys(indexSpec).join(', ')}`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error(`❌ Auto-index creation failed:`, error.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Auto-index creation error for ${collectionName}:`, error.message);
  }
}

/**
 * Performance monitoring va avtomatik optimizatsiya
 */
function performanceMonitor(req, res, next) {
  const startTime = Date.now();
  
  // Response tugagandan keyin performance'ni tekshirish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Sekin so'rovlarni log qilish (2 soniyadan ko'p)
    if (duration > 2000) {
      console.warn(`🐌 Slow request detected: ${req.method} ${req.path} - ${duration}ms`);
      
      // Sekin so'rovlar uchun cache strategiyasini taklif qilish
      if (req.method === 'GET' && duration > 5000) {
        console.log(`💡 Consider adding caching for: ${req.path}`);
      }
    }
    
    // Juda tez so'rovlar uchun ham log (cache ishlayotganini ko'rsatish)
    if (duration < 50 && req.method === 'GET') {
      console.log(`⚡ Fast response: ${req.method} ${req.path} - ${duration}ms (likely cached)`);
    }
  });
  
  next();
}

/**
 * Memory usage monitoring
 */
function memoryMonitor() {
  const used = process.memoryUsage();
  const usage = {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(used.external / 1024 / 1024 * 100) / 100
  };
  
  // Memory usage 500MB dan oshsa ogohlantirish
  if (usage.heapUsed > 500) {
    console.warn(`🧠 High memory usage detected: ${usage.heapUsed}MB`);
    console.log('💡 Consider implementing data pagination or caching strategies');
  }
  
  return usage;
}

// Memory monitoring har 5 daqiqada
setInterval(() => {
  const usage = memoryMonitor();
  console.log(`📊 Memory usage: ${usage.heapUsed}MB / ${usage.heapTotal}MB`);
}, 5 * 60 * 1000);

/**
 * Database connection monitoring
 */
function dbConnectionMonitor() {
  const mongoose = require('mongoose');
  const connection = mongoose.connection;
  
  return {
    readyState: connection.readyState,
    host: connection.host,
    port: connection.port,
    name: connection.name,
    collections: Object.keys(connection.collections).length
  };
}

module.exports = {
  autoUpdateVagonTotals,
  autoUpdateClientDebt,
  autoCreateIndexes,
  performanceMonitor,
  memoryMonitor,
  dbConnectionMonitor
};