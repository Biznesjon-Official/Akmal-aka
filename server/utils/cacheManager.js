/**
 * Cache Manager - Avtomatik cache invalidation bilan
 */

const NodeCache = require('node-cache');

// Cache instances
const queryCache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Better performance
});

const aggregationCache = new NodeCache({ 
  stdTTL: 600, // 10 minutes for heavy aggregations
  checkperiod: 120,
  useClones: false
});

/**
 * Cache key generator
 */
function generateCacheKey(prefix, params) {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  return `${prefix}:${JSON.stringify(sortedParams)}`;
}

/**
 * Query cache with automatic invalidation
 */
class QueryCache {
  static get(key) {
    const cached = queryCache.get(key);
    if (cached) {
      console.log(`🎯 Cache hit: ${key}`);
      return cached;
    }
    console.log(`❌ Cache miss: ${key}`);
    return null;
  }
  
  static set(key, data, ttl = 300) {
    queryCache.set(key, data, ttl);
    console.log(`💾 Cache set: ${key} (TTL: ${ttl}s)`);
  }
  
  static invalidatePattern(pattern) {
    const keys = queryCache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => {
      queryCache.del(key);
      console.log(`🗑️ Cache invalidated: ${key}`);
    });
    
    return matchingKeys.length;
  }
  
  static clear() {
    queryCache.flushAll();
    console.log('🧹 All query cache cleared');
  }
  
  static getStats() {
    return queryCache.getStats();
  }
}

/**
 * Aggregation cache for heavy operations
 */
class AggregationCache {
  static get(key) {
    const cached = aggregationCache.get(key);
    if (cached) {
      console.log(`🎯 Aggregation cache hit: ${key}`);
      return cached;
    }
    console.log(`❌ Aggregation cache miss: ${key}`);
    return null;
  }
  
  static set(key, data, ttl = 600) {
    aggregationCache.set(key, data, ttl);
    console.log(`💾 Aggregation cache set: ${key} (TTL: ${ttl}s)`);
  }
  
  static invalidatePattern(pattern) {
    const keys = aggregationCache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => {
      aggregationCache.del(key);
      console.log(`🗑️ Aggregation cache invalidated: ${key}`);
    });
    
    return matchingKeys.length;
  }
  
  static clear() {
    aggregationCache.flushAll();
    console.log('🧹 All aggregation cache cleared');
  }
  
  static getStats() {
    return aggregationCache.getStats();
  }
}

/**
 * Smart cache invalidation based on data changes
 */
class SmartInvalidation {
  static onVagonChange(vagonId) {
    QueryCache.invalidatePattern(`vagon:${vagonId}`);
    QueryCache.invalidatePattern('vagons:list');
    QueryCache.invalidatePattern('/'); // Invalidate vagon list cache keys
    AggregationCache.invalidatePattern('vagon');
    console.log(`🔄 Smart invalidation: vagon ${vagonId}`);
  }
  
  static onVagonLotChange(vagonId, lotId) {
    QueryCache.invalidatePattern(`vagon:${vagonId}`);
    QueryCache.invalidatePattern(`lot:${lotId}`);
    QueryCache.invalidatePattern('vagons:list');
    QueryCache.invalidatePattern('/'); // Invalidate vagon list cache keys
    AggregationCache.invalidatePattern('vagon');
    console.log(`🔄 Smart invalidation: vagon lot ${lotId}`);
  }
  
  static onVagonSaleChange(vagonId, clientId, saleId) {
    QueryCache.invalidatePattern(`vagon:${vagonId}`);
    QueryCache.invalidatePattern(`client:${clientId}`);
    QueryCache.invalidatePattern(`sale:${saleId}`);
    QueryCache.invalidatePattern('sales:list');
    QueryCache.invalidatePattern('vagons:list');
    QueryCache.invalidatePattern('/'); // Vagon va sale list cache keys
    AggregationCache.invalidatePattern('sales');
    AggregationCache.invalidatePattern('clients');
    AggregationCache.invalidatePattern('vagon');
    console.log(`🔄 Smart invalidation: sale ${saleId}, vagon ${vagonId}`);
  }
  
  static onClientChange(clientId) {
    QueryCache.invalidatePattern(`client:${clientId}`);
    QueryCache.invalidatePattern('clients:list');
    AggregationCache.invalidatePattern('clients');
    console.log(`🔄 Smart invalidation: client ${clientId}`);
  }
  
  static onCashChange(clientId, vagonSaleId) {
    QueryCache.invalidatePattern(`client:${clientId}`);
    QueryCache.invalidatePattern(`sale:${vagonSaleId}`);
    QueryCache.invalidatePattern('cash:list');
    QueryCache.invalidatePattern('/'); // Kassa list cache keys
    AggregationCache.invalidatePattern('cash');
    AggregationCache.invalidatePattern('kassa');
    console.log(`🔄 Smart invalidation: cash transaction`);
  }
}

/**
 * Cache middleware for Express routes
 */
function cacheMiddleware(ttl = 300) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // CRITICAL FIX: Include isDeleted filter in cache key for vagon routes
    const cacheParams = { ...req.query };
    if (req.path.includes('/vagon')) {
      cacheParams._includeDeleted = 'false'; // Add deleted filter to cache key
    }
    
    const cacheKey = generateCacheKey(req.path, cacheParams);
    const cached = QueryCache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      QueryCache.set(cacheKey, data, ttl);
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Cache statistics and monitoring
 */
function getCacheStats() {
  return {
    query: QueryCache.getStats(),
    aggregation: AggregationCache.getStats(),
    timestamp: new Date().toISOString()
  };
}

// Cache statistics logging every 10 minutes
setInterval(() => {
  const stats = getCacheStats();
  console.log('📊 Cache Statistics:', {
    query_hits: stats.query.hits,
    query_misses: stats.query.misses,
    query_keys: stats.query.keys,
    aggregation_hits: stats.aggregation.hits,
    aggregation_misses: stats.aggregation.misses,
    aggregation_keys: stats.aggregation.keys
  });
}, 10 * 60 * 1000);

module.exports = {
  QueryCache,
  AggregationCache,
  SmartInvalidation,
  cacheMiddleware,
  generateCacheKey,
  getCacheStats
};