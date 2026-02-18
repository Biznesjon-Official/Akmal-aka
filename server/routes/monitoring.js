const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getCacheStats } = require('../utils/cacheManager');
const { memoryMonitor, dbConnectionMonitor } = require('../middleware/autoOptimization');
const queryMonitor = require('../middleware/queryMonitor');

// System monitoring endpoint
router.get('/system', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    const systemInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: memoryMonitor(),
      database: dbConnectionMonitor(),
      cache: getCacheStats(),
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json(systemInfo);
  } catch (error) {
    console.error('System monitoring error:', error);
    res.status(500).json({ message: 'System monitoring xatosi' });
  }
});

// Performance metrics
router.get('/performance', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Database statistics
    const dbStats = await db.stats();
    
    // Collection statistics
    const collections = ['vagons', 'vagonlots', 'vagonsales', 'clients', 'cashes'];
    const collectionStats = {};
    
    for (const collectionName of collections) {
      try {
        const stats = await db.collection(collectionName).stats();
        collectionStats[collectionName] = {
          count: stats.count,
          size: Math.round(stats.size / 1024 / 1024 * 100) / 100, // MB
          avgObjSize: Math.round(stats.avgObjSize),
          indexes: stats.nindexes,
          indexSize: Math.round(stats.totalIndexSize / 1024 / 1024 * 100) / 100 // MB
        };
      } catch (error) {
        collectionStats[collectionName] = { error: error.message };
      }
    }
    
    const performanceMetrics = {
      timestamp: new Date().toISOString(),
      database: {
        totalSize: Math.round(dbStats.dataSize / 1024 / 1024 * 100) / 100, // MB
        indexSize: Math.round(dbStats.indexSize / 1024 / 1024 * 100) / 100, // MB
        collections: dbStats.collections,
        objects: dbStats.objects
      },
      collections: collectionStats,
      cache: getCacheStats(),
      memory: memoryMonitor(),
      queries: queryMonitor.getMetrics() // Add query performance metrics
    };
    
    res.json(performanceMetrics);
  } catch (error) {
    console.error('Performance monitoring error:', error);
    res.status(500).json({ message: 'Performance monitoring xatosi' });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isDbConnected = mongoose.connection.readyState === 1;
    
    const health = {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: isDbConnected,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      }
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cache management
router.post('/cache/clear', auth, async (req, res) => {
  try {
    const { QueryCache, AggregationCache } = require('../utils/cacheManager');
    
    QueryCache.clear();
    AggregationCache.clear();
    
    res.json({ 
      message: 'Cache successfully cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ message: 'Cache tozalashda xatolik' });
  }
});

// Database optimization suggestions
router.get('/optimization-suggestions', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const suggestions = [];
    
    // Check for missing indexes
    const collections = ['vagons', 'vagonlots', 'vagonsales', 'clients', 'cashes'];
    
    for (const collectionName of collections) {
      try {
        const stats = await db.collection(collectionName).stats();
        const indexes = await db.collection(collectionName).indexes();
        
        // Large collection without enough indexes
        if (stats.count > 1000 && indexes.length < 3) {
          suggestions.push({
            type: 'index',
            collection: collectionName,
            message: `${collectionName} collection has ${stats.count} documents but only ${indexes.length} indexes. Consider adding more indexes for better performance.`,
            priority: 'high'
          });
        }
        
        // Large average object size
        if (stats.avgObjSize > 10000) { // 10KB
          suggestions.push({
            type: 'schema',
            collection: collectionName,
            message: `${collectionName} has large average object size (${Math.round(stats.avgObjSize / 1024)}KB). Consider schema optimization.`,
            priority: 'medium'
          });
        }
        
      } catch (error) {
        // Collection might not exist
      }
    }
    
    // Memory usage suggestions
    const memory = memoryMonitor();
    if (memory.heapUsed > 300) {
      suggestions.push({
        type: 'memory',
        message: `High memory usage detected (${memory.heapUsed}MB). Consider implementing pagination or caching.`,
        priority: 'high'
      });
    }
    
    // Cache hit rate suggestions
    const cacheStats = getCacheStats();
    const queryHitRate = cacheStats.query.hits / (cacheStats.query.hits + cacheStats.query.misses) * 100;
    
    if (queryHitRate < 50 && cacheStats.query.hits + cacheStats.query.misses > 100) {
      suggestions.push({
        type: 'cache',
        message: `Low cache hit rate (${Math.round(queryHitRate)}%). Consider optimizing cache strategy.`,
        priority: 'medium'
      });
    }
    
    res.json({
      suggestions,
      timestamp: new Date().toISOString(),
      total: suggestions.length
    });
    
  } catch (error) {
    console.error('Optimization suggestions error:', error);
    res.status(500).json({ message: 'Optimization suggestions xatosi' });
  }
});

// Query performance metrics endpoint
router.get('/query-performance', auth, async (req, res) => {
  try {
    const metrics = queryMonitor.getMetrics();
    
    res.json({
      ...metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Query performance error:', error);
    res.status(500).json({ message: 'Query performance metrics xatosi' });
  }
});

// Slow query log endpoint
router.get('/slow-queries', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const slowQueries = queryMonitor.getSlowQueryLog(limit);
    
    res.json({
      slowQueries,
      count: slowQueries.length,
      threshold: '500ms',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Slow queries error:', error);
    res.status(500).json({ message: 'Slow queries xatosi' });
  }
});

// Reset query metrics endpoint (for testing/debugging)
router.post('/query-performance/reset', auth, async (req, res) => {
  try {
    queryMonitor.resetMetrics();
    
    res.json({
      message: 'Query performance metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reset metrics error:', error);
    res.status(500).json({ message: 'Metrics reset xatosi' });
  }
});

module.exports = router;