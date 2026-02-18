# Design Document: Performance Optimization

## Overview

This design document outlines the technical approach for optimizing critical performance bottlenecks in the Node.js/Express backend system. The optimization strategy focuses on five main areas: eliminating N+1 queries through aggregation pipelines, deferring blocking operations, implementing strategic database indexes, adding a caching layer, and moving long-running operations to background jobs.

The design maintains backward compatibility while introducing significant performance improvements. All optimizations preserve data consistency through proper transaction handling and cache invalidation strategies.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Query (Optimized Caching)                     │  │
│  │  - staleTime: 5 minutes                              │  │
│  │  - cacheTime: 10 minutes                             │  │
│  │  - Smart invalidation on mutations                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js/Express)                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Route Layer (Optimized Endpoints)                   │  │
│  │  - Aggregation pipelines instead of populate         │  │
│  │  - Pagination with parallel count                    │  │
│  │  - Query performance monitoring                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                                 │
│                             ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cache Layer (Redis/In-Memory)                       │  │
│  │  - Balance cache (60s TTL)                           │  │
│  │  - Exchange rate cache (1h TTL)                      │  │
│  │  - Smart invalidation on mutations                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                                 │
│                             ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                │  │
│  │  - Debounced vagon totals updates                    │  │
│  │  - Cached currency conversion                        │  │
│  │  - Background job scheduling                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                                 │
│                             ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Background Job Queue (Optional: Bull/BullMQ)        │  │
│  │  - Vagon totals recalculation                        │  │
│  │  - Client debt synchronization                       │  │
│  │  - Retry logic with exponential backoff              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   MongoDB (with Indexes)                     │
│                                                               │
│  Collections:                                                │
│  - vagonsales (indexed: sale_date, client, vagon)           │
│  - cashes (indexed: transaction_date, type, currency)       │
│  - vagonlots (indexed: vagon, createdAt)                    │
│  - clients (indexed: isDeleted)                             │
│  - vagons (indexed: status, createdAt)                      │
└─────────────────────────────────────────────────────────────┘
```

### Optimization Strategy Overview

1. **Query Optimization**: Replace N+1 queries with aggregation pipelines
2. **Caching Strategy**: Implement multi-tier caching with smart invalidation
3. **Async Processing**: Move blocking operations to background jobs
4. **Index Strategy**: Add compound indexes for common query patterns
5. **Debouncing**: Batch frequent updates to reduce database load

## Components and Interfaces

### 1. Aggregation Pipeline Builder

**Purpose**: Centralized utility for building optimized MongoDB aggregation pipelines

**Location**: `server/utils/aggregationBuilder.js`

**Interface**:
```javascript
class AggregationBuilder {
  /**
   * Build VagonSale aggregation pipeline with populated fields
   * @param {Object} filter - Match filter
   * @param {Object} options - Pagination and sort options
   * @returns {Array} Aggregation pipeline stages
   */
  static buildVagonSalePipeline(filter, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    
    return [
      { $match: filter },
      
      // Lookup vagon (only needed fields)
      {
        $lookup: {
          from: 'vagons',
          localField: 'vagon',
          foreignField: '_id',
          as: 'vagonInfo',
          pipeline: [
            { $project: { vagonCode: 1, month: 1, status: 1 } }
          ]
        }
      },
      { $unwind: { path: '$vagonInfo', preserveNullAndEmptyArrays: true } },
      
      // Lookup client (only needed fields)
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo',
          pipeline: [
            { $project: { name: 1, phone: 1 } }
          ]
        }
      },
      { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
      
      // Lookup lot (for cost calculation)
      {
        $lookup: {
          from: 'vagonlots',
          localField: 'lot',
          foreignField: '_id',
          as: 'lotInfo',
          pipeline: [
            { $project: { dimensions: 1, cost_per_m3: 1 } }
          ]
        }
      },
      { $unwind: { path: '$lotInfo', preserveNullAndEmptyArrays: true } },
      
      // Sort
      { $sort: sort },
      
      // Pagination
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];
  }
  
  /**
   * Build Cash aggregation pipeline with populated fields
   */
  static buildCashPipeline(filter, options = {}) { /* ... */ }
  
  /**
   * Build Client aggregation pipeline with populated fields
   */
  static buildClientPipeline(filter, options = {}) { /* ... */ }
}
```

### 2. Cache Manager

**Purpose**: Unified caching interface with TTL and smart invalidation

**Location**: `server/utils/cacheManager.js`

**Interface**:
```javascript
class CacheManager {
  constructor(options = {}) {
    this.useRedis = options.useRedis || false;
    this.defaultTTL = options.defaultTTL || 60; // seconds
    
    if (this.useRedis) {
      this.redis = require('redis').createClient(options.redis);
    } else {
      this.memoryCache = new Map();
    }
  }
  
  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    if (this.useRedis) {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      const cached = this.memoryCache.get(key);
      if (cached && Date.now() < cached.expiry) {
        return cached.value;
      }
      this.memoryCache.delete(key);
      return null;
    }
  }
  
  /**
   * Set cached value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (this.useRedis) {
      await this.redis.setEx(key, ttl, JSON.stringify(value));
    } else {
      this.memoryCache.set(key, {
        value,
        expiry: Date.now() + (ttl * 1000)
      });
    }
  }
  
  /**
   * Invalidate cache by key or pattern
   * @param {string|RegExp} keyOrPattern - Key or pattern to invalidate
   */
  async invalidate(keyOrPattern) {
    if (typeof keyOrPattern === 'string') {
      if (this.useRedis) {
        await this.redis.del(keyOrPattern);
      } else {
        this.memoryCache.delete(keyOrPattern);
      }
    } else {
      // Pattern matching for bulk invalidation
      if (this.useRedis) {
        const keys = await this.redis.keys(keyOrPattern.source);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        for (const key of this.memoryCache.keys()) {
          if (keyOrPattern.test(key)) {
            this.memoryCache.delete(key);
          }
        }
      }
    }
  }
  
  /**
   * Get or compute cached value
   * @param {string} key - Cache key
   * @param {Function} computeFn - Function to compute value if not cached
   * @param {number} ttl - Time to live in seconds
   */
  async getOrCompute(key, computeFn, ttl = this.defaultTTL) {
    let value = await this.get(key);
    if (value === null) {
      value = await computeFn();
      await this.set(key, value, ttl);
    }
    return value;
  }
}

// Singleton instance
const cacheManager = new CacheManager({
  useRedis: process.env.REDIS_URL ? true : false,
  redis: { url: process.env.REDIS_URL },
  defaultTTL: 60
});

module.exports = cacheManager;
```

### 3. Smart Cache Invalidation

**Purpose**: Automatically invalidate related cache entries on data mutations

**Location**: `server/utils/smartInvalidation.js`

**Interface**:
```javascript
class SmartInvalidation {
  /**
   * Invalidate cache after VagonSale creation/update
   * @param {Object} sale - VagonSale document
   */
  static async onVagonSaleChange(sale) {
    const patterns = [
      `balance:${sale.sale_currency}`,
      `client:${sale.client}:balance`,
      `vagon:${sale.vagon}:totals`,
      `vagonsales:list:*` // Invalidate all list caches
    ];
    
    for (const pattern of patterns) {
      await cacheManager.invalidate(new RegExp(pattern));
    }
  }
  
  /**
   * Invalidate cache after Cash creation/update
   * @param {Object} cash - Cash document
   */
  static async onCashChange(cash) {
    const patterns = [
      `balance:${cash.currency}`,
      `client:${cash.client}:balance`,
      `cash:list:*`
    ];
    
    for (const pattern of patterns) {
      await cacheManager.invalidate(new RegExp(pattern));
    }
  }
  
  /**
   * Invalidate cache after VagonLot update
   * @param {Object} lot - VagonLot document
   */
  static async onVagonLotChange(lot) {
    await cacheManager.invalidate(`vagon:${lot.vagon}:totals`);
    await cacheManager.invalidate(new RegExp(`vagonlots:list:.*vagon=${lot.vagon}`));
  }
}

module.exports = SmartInvalidation;
```

### 4. Debounced Update Manager

**Purpose**: Batch and debounce frequent update operations

**Location**: `server/utils/debouncedUpdates.js`

**Interface**:
```javascript
class DebouncedUpdateManager {
  constructor() {
    this.pendingUpdates = new Map(); // vagonId -> timeout
    this.debounceDelay = 5000; // 5 seconds
  }
  
  /**
   * Schedule debounced vagon totals update
   * @param {ObjectId} vagonId - Vagon ID to update
   */
  scheduleVagonTotalsUpdate(vagonId) {
    const key = vagonId.toString();
    
    // Clear existing timeout
    if (this.pendingUpdates.has(key)) {
      clearTimeout(this.pendingUpdates.get(key));
    }
    
    // Schedule new update
    const timeout = setTimeout(async () => {
      try {
        await this.executeVagonTotalsUpdate(vagonId);
        this.pendingUpdates.delete(key);
      } catch (error) {
        logger.error(`Debounced vagon totals update failed: ${error.message}`);
      }
    }, this.debounceDelay);
    
    this.pendingUpdates.set(key, timeout);
  }
  
  /**
   * Execute vagon totals update
   * @param {ObjectId} vagonId - Vagon ID
   */
  async executeVagonTotalsUpdate(vagonId) {
    const { recalculateVagonTotals } = require('./vagonTotalsSync');
    await recalculateVagonTotals(vagonId);
    
    // Invalidate cache
    await cacheManager.invalidate(`vagon:${vagonId}:totals`);
  }
  
  /**
   * Force immediate update (bypass debounce)
   * @param {ObjectId} vagonId - Vagon ID
   */
  async forceVagonTotalsUpdate(vagonId) {
    const key = vagonId.toString();
    
    // Clear pending timeout
    if (this.pendingUpdates.has(key)) {
      clearTimeout(this.pendingUpdates.get(key));
      this.pendingUpdates.delete(key);
    }
    
    await this.executeVagonTotalsUpdate(vagonId);
  }
}

// Singleton instance
const debouncedUpdateManager = new DebouncedUpdateManager();

module.exports = debouncedUpdateManager;
```

### 5. Cached Balance Calculator

**Purpose**: Fast balance calculations with caching

**Location**: `server/utils/cachedBalanceCalculator.js`

**Interface**:
```javascript
class CachedBalanceCalculator {
  /**
   * Get balance by currency (cached)
   * @param {string} currency - Currency code (USD, RUB)
   * @returns {Promise<Object>} Balance object
   */
  static async getBalanceByCurrency(currency) {
    const cacheKey = `balance:${currency}`;
    
    return await cacheManager.getOrCompute(
      cacheKey,
      async () => {
        return await this.calculateBalanceByCurrency(currency);
      },
      60 // 60 second TTL
    );
  }
  
  /**
   * Calculate balance by currency (uncached)
   * @param {string} currency - Currency code
   * @returns {Promise<Object>} Balance object
   */
  static async calculateBalanceByCurrency(currency) {
    const Cash = require('../models/Cash');
    
    const result = await Cash.aggregate([
      {
        $match: {
          currency,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Process results
    const balanceMap = {};
    result.forEach(item => {
      balanceMap[item._id] = item.total;
    });
    
    const income = (balanceMap.client_payment || 0) + (balanceMap.debt_payment || 0);
    const expense = (balanceMap.expense || 0) + (balanceMap.vagon_expense || 0);
    const debt = balanceMap.debt_sale || 0;
    
    return {
      currency,
      income,
      expense,
      debt,
      balance: income - expense,
      calculatedAt: new Date()
    };
  }
  
  /**
   * Get all balances (USD and RUB) in parallel
   * @returns {Promise<Object>} All balances
   */
  static async getAllBalances() {
    const [usdBalance, rubBalance] = await Promise.all([
      this.getBalanceByCurrency('USD'),
      this.getBalanceByCurrency('RUB')
    ]);
    
    return { USD: usdBalance, RUB: rubBalance };
  }
}

module.exports = CachedBalanceCalculator;
```

### 6. Exchange Rate Cache

**Purpose**: Cache exchange rates to avoid blocking API calls

**Location**: `server/utils/exchangeRateCache.js`

**Interface**:
```javascript
class ExchangeRateCache {
  /**
   * Get exchange rate (cached)
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<number>} Exchange rate
   */
  static async getRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1.0;
    
    const cacheKey = `exchange_rate:${fromCurrency}:${toCurrency}`;
    
    return await cacheManager.getOrCompute(
      cacheKey,
      async () => {
        return await this.fetchRate(fromCurrency, toCurrency);
      },
      3600 // 1 hour TTL
    );
  }
  
  /**
   * Fetch exchange rate from database or API
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<number>} Exchange rate
   */
  static async fetchRate(fromCurrency, toCurrency) {
    const ExchangeRate = require('../models/ExchangeRate');
    
    // Try to get from database first
    const rate = await ExchangeRate.findOne({
      from_currency: fromCurrency,
      to_currency: toCurrency,
      isDeleted: false
    }).sort({ effective_date: -1 });
    
    if (rate) {
      return rate.rate;
    }
    
    // Fallback to default rates
    const defaultRates = {
      'RUB:USD': 0.011,
      'USD:RUB': 90.0
    };
    
    const key = `${fromCurrency}:${toCurrency}`;
    return defaultRates[key] || 1.0;
  }
  
  /**
   * Convert amount with cached rate
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<Object>} Converted amount and rate
   */
  static async convert(amount, fromCurrency, toCurrency) {
    const rate = await this.getRate(fromCurrency, toCurrency);
    return {
      amount: amount * rate,
      rate,
      fromCurrency,
      toCurrency
    };
  }
}

module.exports = ExchangeRateCache;
```

### 7. Query Performance Monitor

**Purpose**: Log and monitor slow database queries

**Location**: `server/middleware/queryMonitor.js`

**Interface**:
```javascript
class QueryPerformanceMonitor {
  constructor() {
    this.slowQueryThreshold = 500; // ms
  }
  
  /**
   * Wrap mongoose query with performance monitoring
   * @param {Function} queryFn - Query function to monitor
   * @param {string} queryName - Name for logging
   * @returns {Promise<any>} Query result
   */
  async monitorQuery(queryFn, queryName) {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      if (duration > this.slowQueryThreshold) {
        logger.warn(`Slow query detected: ${queryName}`, {
          duration: `${duration}ms`,
          threshold: `${this.slowQueryThreshold}ms`,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Query failed: ${queryName}`, {
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Enable MongoDB profiling for slow queries
   */
  static async enableMongoDBProfiling() {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Set profiling level to 1 (log slow operations)
    await db.command({
      profile: 1,
      slowms: 500 // Log queries slower than 500ms
    });
    
    logger.info('MongoDB profiling enabled for queries > 500ms');
  }
}

const queryMonitor = new QueryPerformanceMonitor();

module.exports = queryMonitor;
```

### 8. Background Job Queue (Optional)

**Purpose**: Process long-running operations asynchronously

**Location**: `server/queues/jobQueue.js`

**Interface**:
```javascript
// Using Bull for job queue (optional enhancement)
const Queue = require('bull');

class JobQueue {
  constructor() {
    this.queues = {};
    
    if (process.env.REDIS_URL) {
      this.queues.vagonTotals = new Queue('vagon-totals', process.env.REDIS_URL);
      this.queues.clientDebt = new Queue('client-debt', process.env.REDIS_URL);
      
      this.setupProcessors();
    }
  }
  
  setupProcessors() {
    // Vagon totals processor
    this.queues.vagonTotals.process(async (job) => {
      const { vagonId } = job.data;
      const { recalculateVagonTotals } = require('../utils/vagonTotalsSync');
      await recalculateVagonTotals(vagonId);
    });
    
    // Client debt processor
    this.queues.clientDebt.process(async (job) => {
      const { clientId } = job.data;
      // Implement client debt recalculation
    });
  }
  
  /**
   * Enqueue vagon totals update
   * @param {ObjectId} vagonId - Vagon ID
   */
  async enqueueVagonTotalsUpdate(vagonId) {
    if (this.queues.vagonTotals) {
      await this.queues.vagonTotals.add(
        { vagonId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      );
    } else {
      // Fallback to immediate execution if Redis not available
      const debouncedUpdateManager = require('../utils/debouncedUpdates');
      debouncedUpdateManager.scheduleVagonTotalsUpdate(vagonId);
    }
  }
}

const jobQueue = new JobQueue();

module.exports = jobQueue;
```

## Data Models

### Index Additions

**VagonSale Model** (`server/models/VagonSale.js`):
```javascript
// Add compound indexes for common query patterns
vagonSaleSchema.index({ sale_date: -1, client: 1 });
vagonSaleSchema.index({ sale_date: -1, status: 1 });
vagonSaleSchema.index({ client: 1, sale_date: -1 });
vagonSaleSchema.index({ vagon: 1, createdAt: -1 });
vagonSaleSchema.index({ sale_currency: 1, sale_date: -1 });
```

**Cash Model** (`server/models/Cash.js`):
```javascript
// Add compound indexes for balance calculations
cashSchema.index({ transaction_date: -1, type: 1 });
cashSchema.index({ client: 1, transaction_date: -1 });
cashSchema.index({ currency: 1, type: 1 });
cashSchema.index({ currency: 1, isDeleted: 1 });
cashSchema.index({ vagon: 1, transaction_date: -1 });
```

**VagonLot Model** (`server/models/VagonLot.js`):
```javascript
// Add indexes for vagon queries
vagonLotSchema.index({ vagon: 1, createdAt: -1 });
vagonLotSchema.index({ vagon: 1, isDeleted: 1 });
vagonLotSchema.index({ dimensions: 1 });
```

**Client Model** (`server/models/Client.js`):
```javascript
// Add indexes for client queries
clientSchema.index({ isDeleted: 1 });
clientSchema.index({ name: 1 });
clientSchema.index({ createdAt: -1 });
```

### Model Hook Optimizations

**VagonLot Pre-Save Hook** (Modified):
```javascript
// BEFORE: Blocking currency conversion
vagonLotSchema.pre('save', async function(next) {
  const investmentInBase = await SystemSettings.convertToBaseCurrency(
    this.total_investment, 
    this.purchase_currency
  ); // BLOCKS for 200-500ms
  // ...
});

// AFTER: Cached currency conversion
vagonLotSchema.pre('save', async function(next) {
  try {
    const ExchangeRateCache = require('../utils/exchangeRateCache');
    const converted = await ExchangeRateCache.convert(
      this.total_investment,
      this.purchase_currency,
      'USD'
    ); // Returns in < 10ms from cache
    
    this.base_currency_total_investment = converted.amount;
    // ... rest of calculations
    
    next();
  } catch (error) {
    // Fallback: use original currency values
    this.base_currency_total_investment = this.total_investment;
    next();
  }
});
```

**VagonLot Post-Save Hook** (Modified):
```javascript
// BEFORE: Blocking vagon totals update
vagonLotSchema.post('save', async function(doc) {
  await autoUpdateVagonTotals(doc.vagon); // BLOCKS for 500ms-1s
});

// AFTER: Debounced update
vagonLotSchema.post('save', async function(doc) {
  const debouncedUpdateManager = require('../utils/debouncedUpdates');
  debouncedUpdateManager.scheduleVagonTotalsUpdate(doc.vagon);
  // Returns immediately, update happens after 5s debounce
});
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Aggregation Pipeline Performance
*For any* query fetching up to 100 records with related data using aggregation pipelines, the query execution time should be less than 500ms.
**Validates: Requirements 1.5, 8.5**

### Property 2: VagonLot Save Performance
*For any* VagonLot save operation, the operation should complete in under 200ms including all pre-save hooks.
**Validates: Requirements 2.5**

### Property 3: Exchange Rate Fallback Resilience
*For any* currency conversion request, if the exchange rate fetching fails, the system should return a valid fallback rate without throwing an error.
**Validates: Requirements 2.4**

### Property 4: Debouncing Effectiveness
*For any* sequence of N VagonLot saves for the same vagon within 5 seconds, exactly one vagon totals update should be executed after the debounce period.
**Validates: Requirements 3.3**

### Property 5: Non-Blocking Save Operations
*For any* VagonLot save operation, other concurrent save operations should not be blocked and should complete within their normal time bounds.
**Validates: Requirements 3.5**

### Property 6: Vagon Totals Update Performance
*For any* vagon totals recalculation operation, the operation should complete within 1 second.
**Validates: Requirements 3.7**

### Property 7: Cached Balance Performance
*For any* balance calculation request when data is in cache and not stale, the response time should be under 100ms.
**Validates: Requirements 5.2, 6.5**

### Property 8: Cached Exchange Rate Performance
*For any* exchange rate request when the rate is in cache and not stale, the response time should be under 10ms.
**Validates: Requirements 5.5**

### Property 9: Cache Invalidation Correctness
*For any* data modification operation (VagonSale creation, Cash creation, VagonLot update), all related cache entries should be invalidated, ensuring subsequent reads fetch fresh data.
**Validates: Requirements 5.7, 6.3, 11.1, 11.2, 11.3**

### Property 10: Cache Failure Fallback
*For any* cache operation failure, the system should fall back to direct database queries and return correct results without throwing errors.
**Validates: Requirements 5.8**

### Property 11: Request Deduplication
*For any* N simultaneous identical balance calculation requests, only one database aggregation should be executed, with all requests receiving the same result.
**Validates: Requirements 6.4**

### Property 12: Uncached Balance Performance
*For any* balance calculation request when cache is empty or stale, the aggregation and caching should complete in under 500ms.
**Validates: Requirements 6.6**

### Property 13: Background Job Immediate Response
*For any* operation that enqueues a background job, the API response should return immediately without waiting for job completion.
**Validates: Requirements 7.3**

### Property 14: Background Job Retry Logic
*For any* background job that fails, the system should retry up to 3 times with exponential backoff before marking as permanently failed.
**Validates: Requirements 7.5**

### Property 15: Pagination Limit Enforcement
*For any* paginated request with limit parameter greater than 100, the system should return at most 100 items.
**Validates: Requirements 8.1**

### Property 16: Pagination Error Handling
*For any* paginated request with invalid parameters (negative page, non-numeric limit), the system should return an appropriate error message.
**Validates: Requirements 8.4**

### Property 17: Pagination Performance
*For any* paginated query requesting any page, the query should complete in under 500ms.
**Validates: Requirements 8.5**

### Property 18: Pagination Metadata Completeness
*For any* paginated response, the response should include currentPage, totalPages, and hasNextPage metadata fields.
**Validates: Requirements 8.7**

### Property 19: React Query No-Refetch Behavior
*For any* window focus change or network reconnection event, React Query should not automatically trigger data refetch requests.
**Validates: Requirements 10.3, 10.4**

### Property 20: React Query Cache Rendering
*For any* component render when cached data is available, the component should render immediately without showing loading state.
**Validates: Requirements 10.5**

### Property 21: React Query Targeted Invalidation
*For any* mutation operation, only the affected query caches should be invalidated, leaving unrelated caches intact.
**Validates: Requirements 10.6**

### Property 22: Cache Invalidation Targeting
*For any* cache invalidation operation, only specific cache keys matching the affected data should be cleared, not the entire cache.
**Validates: Requirements 11.4**

### Property 23: Cache Invalidation Resilience
*For any* cache invalidation failure, the main data modification operation should complete successfully and the failure should be logged.
**Validates: Requirements 11.6**

### Property 24: Transaction Performance
*For any* database transaction, the transaction should commit or rollback within 2 seconds.
**Validates: Requirements 12.4**

### Property 25: Transaction Rollback on Error
*For any* transaction that encounters an error, all changes should be rolled back and the system should return a clear error message.
**Validates: Requirements 12.5**

## Error Handling

### Cache Errors

**Strategy**: Graceful degradation with fallback to database

**Implementation**:
```javascript
async function getCachedData(key, computeFn) {
  try {
    // Try cache first
    const cached = await cacheManager.get(key);
    if (cached) return cached;
    
    // Compute and cache
    const data = await computeFn();
    await cacheManager.set(key, data);
    return data;
  } catch (cacheError) {
    // Log but don't fail
    logger.error('Cache operation failed, falling back to direct query', {
      key,
      error: cacheError.message
    });
    
    // Fallback to direct computation
    return await computeFn();
  }
}
```

### Exchange Rate Errors

**Strategy**: Use fallback rates with warning logs

**Implementation**:
```javascript
async function getExchangeRate(from, to) {
  try {
    return await ExchangeRateCache.getRate(from, to);
  } catch (error) {
    logger.warn('Exchange rate fetch failed, using fallback', {
      from,
      to,
      error: error.message
    });
    
    // Fallback rates
    const fallbackRates = {
      'RUB:USD': 0.011,
      'USD:RUB': 90.0
    };
    
    return fallbackRates[`${from}:${to}`] || 1.0;
  }
}
```

### Background Job Errors

**Strategy**: Retry with exponential backoff, then log and alert

**Implementation**:
```javascript
// Using Bull queue
queue.process(async (job) => {
  try {
    await processJob(job.data);
  } catch (error) {
    logger.error('Background job failed', {
      jobId: job.id,
      attempt: job.attemptsMade,
      error: error.message
    });
    
    if (job.attemptsMade >= 3) {
      // Alert administrators
      logger.error('Background job permanently failed after 3 retries', {
        jobId: job.id,
        data: job.data
      });
    }
    
    throw error; // Trigger retry
  }
});
```

### Transaction Errors

**Strategy**: Automatic rollback with clear error messages

**Implementation**:
```javascript
async function executeTransaction(operations) {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Execute operations
    const results = await operations(session);
    
    // Commit
    await session.commitTransaction();
    return results;
    
  } catch (error) {
    // Rollback on any error
    await session.abortTransaction();
    
    logger.error('Transaction failed and rolled back', {
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(`Transaction failed: ${error.message}`);
    
  } finally {
    session.endSession();
  }
}
```

### Query Timeout Errors

**Strategy**: Log slow queries and return timeout error

**Implementation**:
```javascript
async function executeQueryWithTimeout(queryFn, timeoutMs = 5000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
  });
  
  try {
    return await Promise.race([queryFn(), timeoutPromise]);
  } catch (error) {
    if (error.message === 'Query timeout') {
      logger.error('Query exceeded timeout', {
        timeout: timeoutMs,
        timestamp: new Date().toISOString()
      });
    }
    throw error;
  }
}
```

## Testing Strategy

### Dual Testing Approach

The performance optimization will be validated through both unit tests and property-based tests:

**Unit Tests**: Focus on specific scenarios, edge cases, and error conditions
- Cache hit/miss scenarios
- Specific debounce timing tests
- Error handling paths
- Integration between components

**Property-Based Tests**: Verify universal properties across all inputs
- Performance properties (execution time bounds)
- Cache invalidation correctness
- Debouncing effectiveness
- Transaction atomicity

### Property-Based Testing Configuration

**Library**: Use `fast-check` for JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: performance-optimization, Property N: [property text]`

**Example Property Test**:
```javascript
const fc = require('fast-check');

describe('Performance Optimization Properties', () => {
  // Feature: performance-optimization, Property 1: Aggregation Pipeline Performance
  it('should complete aggregation queries in under 500ms for up to 100 records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          vagon: fc.string(),
          client: fc.string(),
          amount: fc.float({ min: 0, max: 10000 })
        }), { minLength: 1, maxLength: 100 }),
        async (salesData) => {
          // Setup: Insert test data
          await VagonSale.insertMany(salesData);
          
          // Execute: Run aggregation query
          const startTime = Date.now();
          const result = await VagonSale.aggregate([
            { $match: { isDeleted: false } },
            { $lookup: { from: 'vagons', localField: 'vagon', foreignField: '_id', as: 'vagonInfo' } },
            { $lookup: { from: 'clients', localField: 'client', foreignField: '_id', as: 'clientInfo' } }
          ]);
          const duration = Date.now() - startTime;
          
          // Assert: Should complete in under 500ms
          expect(duration).toBeLessThan(500);
          
          // Cleanup
          await VagonSale.deleteMany({ _id: { $in: salesData.map(s => s._id) } });
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: performance-optimization, Property 9: Cache Invalidation Correctness
  it('should invalidate related caches when data is modified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          vagon: fc.string(),
          client: fc.string(),
          amount: fc.float({ min: 0, max: 10000 }),
          currency: fc.constantFrom('USD', 'RUB')
        }),
        async (saleData) => {
          // Setup: Populate cache
          const cacheKey = `balance:${saleData.currency}`;
          await cacheManager.set(cacheKey, { balance: 1000 });
          
          // Verify cache exists
          const cachedBefore = await cacheManager.get(cacheKey);
          expect(cachedBefore).not.toBeNull();
          
          // Execute: Create VagonSale (should invalidate cache)
          await VagonSale.create(saleData);
          
          // Assert: Cache should be invalidated
          const cachedAfter = await cacheManager.get(cacheKey);
          expect(cachedAfter).toBeNull();
          
          // Cleanup
          await VagonSale.deleteOne({ _id: saleData._id });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Examples

**Cache Manager Tests**:
```javascript
describe('CacheManager', () => {
  it('should return cached value within TTL', async () => {
    await cacheManager.set('test-key', { value: 123 }, 60);
    const result = await cacheManager.get('test-key');
    expect(result).toEqual({ value: 123 });
  });
  
  it('should return null for expired cache', async () => {
    await cacheManager.set('test-key', { value: 123 }, 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const result = await cacheManager.get('test-key');
    expect(result).toBeNull();
  });
  
  it('should invalidate cache by pattern', async () => {
    await cacheManager.set('balance:USD', { value: 100 });
    await cacheManager.set('balance:RUB', { value: 200 });
    await cacheManager.set('other:key', { value: 300 });
    
    await cacheManager.invalidate(/^balance:/);
    
    expect(await cacheManager.get('balance:USD')).toBeNull();
    expect(await cacheManager.get('balance:RUB')).toBeNull();
    expect(await cacheManager.get('other:key')).not.toBeNull();
  });
});
```

**Debounced Update Tests**:
```javascript
describe('DebouncedUpdateManager', () => {
  it('should debounce multiple updates to single execution', async () => {
    const updateSpy = jest.spyOn(debouncedUpdateManager, 'executeVagonTotalsUpdate');
    const vagonId = new mongoose.Types.ObjectId();
    
    // Schedule 5 updates within debounce window
    for (let i = 0; i < 5; i++) {
      debouncedUpdateManager.scheduleVagonTotalsUpdate(vagonId);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait for debounce period
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Should execute only once
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });
});
```

### Performance Benchmarking

**Baseline Measurement**:
```javascript
describe('Performance Benchmarks', () => {
  it('should measure baseline performance before optimization', async () => {
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await VagonSale.find({ isDeleted: false })
        .populate('vagon')
        .populate('client')
        .populate('lot')
        .limit(100);
      times.push(Date.now() - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    console.log(`Baseline average: ${avgTime}ms`);
    
    // Document baseline for comparison
    expect(avgTime).toBeGreaterThan(0);
  });
  
  it('should measure optimized performance after changes', async () => {
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await VagonSale.aggregate([
        { $match: { isDeleted: false } },
        { $lookup: { from: 'vagons', localField: 'vagon', foreignField: '_id', as: 'vagonInfo' } },
        { $lookup: { from: 'clients', localField: 'client', foreignField: '_id', as: 'clientInfo' } },
        { $lookup: { from: 'vagonlots', localField: 'lot', foreignField: '_id', as: 'lotInfo' } },
        { $limit: 100 }
      ]);
      times.push(Date.now() - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    console.log(`Optimized average: ${avgTime}ms`);
    
    // Should be under 500ms
    expect(avgTime).toBeLessThan(500);
  });
});
```

### Integration Testing

**End-to-End Performance Tests**:
```javascript
describe('E2E Performance Tests', () => {
  it('should handle complete VagonSale creation flow within performance bounds', async () => {
    const startTime = Date.now();
    
    // Create sale (triggers cache invalidation, debounced updates, etc.)
    const sale = await request(app)
      .post('/api/vagon-sale')
      .send({
        vagon: testVagonId,
        lot: testLotId,
        client: testClientId,
        warehouse_dispatched_volume_m3: 10,
        price_per_m3: 100,
        sale_currency: 'USD'
      });
    
    const duration = Date.now() - startTime;
    
    expect(sale.status).toBe(201);
    expect(duration).toBeLessThan(1000); // Complete flow under 1 second
  });
});
```

### Monitoring and Alerting

**Slow Query Logging**:
- All queries exceeding 500ms are logged with full details
- Logs include: collection, filter, execution plan, duration
- Aggregated daily reports of slow queries

**Performance Metrics**:
- P50, P95, P99 response times for all endpoints
- Cache hit/miss rates
- Background job success/failure rates
- Database connection pool utilization

**Alerts**:
- Alert when P95 response time exceeds 1 second
- Alert when cache hit rate drops below 70%
- Alert when background jobs fail more than 10% of the time
- Alert when database connection pool is exhausted

## Migration Strategy

### Phase 1: Add Indexes (Low Risk)
1. Add compound indexes to all models
2. Verify index usage with explain plans
3. Monitor query performance improvement
4. No code changes required

### Phase 2: Implement Caching (Medium Risk)
1. Deploy cache manager utility
2. Add caching to balance calculations
3. Add caching to exchange rates
4. Implement cache invalidation hooks
5. Monitor cache hit rates
6. Rollback plan: Disable caching, fall back to direct queries

### Phase 3: Optimize Queries (Medium Risk)
1. Replace populate() with aggregation in VagonSale routes
2. Replace populate() with aggregation in Cash routes
3. Replace populate() with aggregation in Client routes
4. A/B test performance improvements
5. Rollback plan: Revert to populate() queries

### Phase 4: Debounce Updates (Low Risk)
1. Deploy debounced update manager
2. Modify VagonLot post-save hooks
3. Modify VagonSale post-save hooks
4. Monitor update frequency reduction
5. Rollback plan: Remove debouncing, revert to immediate updates

### Phase 5: Background Jobs (Optional, High Value)
1. Set up Redis if not available
2. Deploy Bull queue infrastructure
3. Move vagon totals updates to queue
4. Move client debt updates to queue
5. Monitor job processing
6. Rollback plan: Process synchronously if queue fails

### Backward Compatibility

All optimizations maintain backward compatibility:
- API responses remain unchanged
- Database schema unchanged (only indexes added)
- Existing code continues to work
- Gradual rollout possible (feature flags)

### Feature Flags

```javascript
const FEATURE_FLAGS = {
  USE_AGGREGATION_PIPELINES: process.env.USE_AGGREGATION === 'true',
  USE_CACHING: process.env.USE_CACHING === 'true',
  USE_DEBOUNCED_UPDATES: process.env.USE_DEBOUNCED_UPDATES === 'true',
  USE_BACKGROUND_JOBS: process.env.USE_BACKGROUND_JOBS === 'true'
};

// Example usage
async function getVagonSales(filter) {
  if (FEATURE_FLAGS.USE_AGGREGATION_PIPELINES) {
    return await getVagonSalesWithAggregation(filter);
  } else {
    return await getVagonSalesWithPopulate(filter);
  }
}
```

## Performance Targets Summary

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| VagonSale list (100 items) | 3-5s | <500ms | 6-10x |
| Cash balance calculation | 1-2s | <100ms | 10-20x |
| Client list (100 items) | 1-2s | <400ms | 3-5x |
| Vagon details with lots | 2-4s | <800ms | 3-5x |
| VagonLot save with hooks | 2-5s | <200ms | 10-25x |
| **Overall API P95** | **5-10s** | **<500ms** | **10-20x** |

## Success Criteria

1. **Performance**: 90% of API requests complete in under 500ms
2. **Reliability**: 99.9% uptime maintained during and after optimization
3. **Cache Effectiveness**: Cache hit rate above 80% for frequently accessed data
4. **Query Efficiency**: Zero COLLSCAN operations on indexed fields
5. **Background Processing**: All long-running operations moved to background jobs
6. **Monitoring**: Comprehensive performance metrics and alerting in place
7. **User Experience**: No user-facing bugs or data inconsistencies introduced
