/**
 * Query Performance Monitor Middleware
 * 
 * Tracks database query execution times and logs slow queries (>500ms)
 * Provides performance metrics collection for monitoring
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

const logger = require('../utils/logger');
const mongoose = require('mongoose');

class QueryPerformanceMonitor {
  constructor() {
    this.slowQueryThreshold = 500; // ms
    this.queryMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      totalExecutionTime: 0,
      queryTypes: {},
      slowQueryLog: []
    };
    this.maxSlowQueryLogSize = 100; // Keep last 100 slow queries
  }

  /**
   * Initialize MongoDB query monitoring
   * Sets up mongoose debug mode to track all queries
   */
  initialize() {
    // Enable mongoose debug mode for query tracking
    mongoose.set('debug', (collectionName, methodName, ...methodArgs) => {
      const startTime = Date.now();
      
      // Track query execution
      this.trackQuery(collectionName, methodName, methodArgs, startTime);
    });

    logger.info('Query performance monitoring initialized');
  }

  /**
   * Track individual query execution
   * @param {string} collectionName - MongoDB collection name
   * @param {string} methodName - Query method (find, aggregate, etc.)
   * @param {Array} methodArgs - Query arguments
   * @param {number} startTime - Query start timestamp
   */
  trackQuery(collectionName, methodName, methodArgs, startTime) {
    const duration = Date.now() - startTime;
    
    // Update metrics
    this.queryMetrics.totalQueries++;
    this.queryMetrics.totalExecutionTime += duration;
    
    // Track by query type
    const queryType = `${collectionName}.${methodName}`;
    if (!this.queryMetrics.queryTypes[queryType]) {
      this.queryMetrics.queryTypes[queryType] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        slowCount: 0
      };
    }
    
    this.queryMetrics.queryTypes[queryType].count++;
    this.queryMetrics.queryTypes[queryType].totalTime += duration;
    this.queryMetrics.queryTypes[queryType].avgTime = 
      this.queryMetrics.queryTypes[queryType].totalTime / 
      this.queryMetrics.queryTypes[queryType].count;
    
    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      this.logSlowQuery(collectionName, methodName, methodArgs, duration);
      this.queryMetrics.slowQueries++;
      this.queryMetrics.queryTypes[queryType].slowCount++;
    }
  }

  /**
   * Log slow query details
   * @param {string} collectionName - MongoDB collection name
   * @param {string} methodName - Query method
   * @param {Array} methodArgs - Query arguments
   * @param {number} duration - Query execution time in ms
   */
  logSlowQuery(collectionName, methodName, methodArgs, duration) {
    const slowQueryInfo = {
      timestamp: new Date().toISOString(),
      collection: collectionName,
      method: methodName,
      duration: `${duration}ms`,
      threshold: `${this.slowQueryThreshold}ms`,
      filter: this.sanitizeQueryArgs(methodArgs[0]),
      options: this.sanitizeQueryArgs(methodArgs[1])
    };

    // Add to slow query log (keep only last N entries)
    this.queryMetrics.slowQueryLog.push(slowQueryInfo);
    if (this.queryMetrics.slowQueryLog.length > this.maxSlowQueryLogSize) {
      this.queryMetrics.slowQueryLog.shift();
    }

    // Log warning
    logger.warn('Slow query detected', slowQueryInfo);
  }

  /**
   * Sanitize query arguments for logging (remove sensitive data, limit size)
   * @param {any} args - Query arguments
   * @returns {any} Sanitized arguments
   */
  sanitizeQueryArgs(args) {
    if (!args) return null;
    
    try {
      const stringified = JSON.stringify(args);
      // Limit size to prevent huge logs
      if (stringified.length > 500) {
        return stringified.substring(0, 500) + '... (truncated)';
      }
      return args;
    } catch (error) {
      return '[Unable to serialize]';
    }
  }

  /**
   * Wrap a query function with performance monitoring
   * @param {Function} queryFn - Query function to monitor
   * @param {string} queryName - Name for logging
   * @returns {Promise<any>} Query result
   */
  async monitorQuery(queryFn, queryName) {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      // Log if slow
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
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const avgQueryTime = this.queryMetrics.totalQueries > 0
      ? this.queryMetrics.totalExecutionTime / this.queryMetrics.totalQueries
      : 0;

    return {
      ...this.queryMetrics,
      avgQueryTime: Math.round(avgQueryTime * 100) / 100,
      slowQueryPercentage: this.queryMetrics.totalQueries > 0
        ? Math.round((this.queryMetrics.slowQueries / this.queryMetrics.totalQueries) * 10000) / 100
        : 0
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.queryMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      totalExecutionTime: 0,
      queryTypes: {},
      slowQueryLog: []
    };
    logger.info('Query performance metrics reset');
  }

  /**
   * Get slow query log
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Recent slow queries
   */
  getSlowQueryLog(limit = 50) {
    return this.queryMetrics.slowQueryLog.slice(-limit);
  }

  /**
   * Enable MongoDB profiling for slow queries
   * This sets MongoDB's built-in profiler to log slow operations
   */
  static async enableMongoDBProfiling() {
    try {
      const db = mongoose.connection.db;
      
      // Set profiling level to 1 (log slow operations)
      await db.command({
        profile: 1,
        slowms: 500 // Log queries slower than 500ms
      });
      
      logger.info('MongoDB profiling enabled for queries > 500ms');
    } catch (error) {
      logger.error('Failed to enable MongoDB profiling', {
        error: error.message
      });
    }
  }

  /**
   * Express middleware for tracking request-level query performance
   * @returns {Function} Express middleware
   */
  requestMonitorMiddleware() {
    return (req, res, next) => {
      const requestStart = Date.now();
      const originalJson = res.json;
      
      // Track queries during this request
      req.queryMetrics = {
        startTime: requestStart,
        queryCount: 0,
        totalQueryTime: 0
      };

      // Override res.json to capture response time
      res.json = function(data) {
        const requestDuration = Date.now() - requestStart;
        
        // Log slow requests
        if (requestDuration > 500) {
          logger.warn('Slow request detected', {
            method: req.method,
            path: req.path,
            duration: `${requestDuration}ms`,
            queryCount: req.queryMetrics.queryCount,
            user: req.user?.username || 'anonymous',
            timestamp: new Date().toISOString()
          });
        }
        
        // Add performance headers (useful for debugging)
        res.set('X-Response-Time', `${requestDuration}ms`);
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  }
}

// Singleton instance
const queryMonitor = new QueryPerformanceMonitor();

// Export both the instance and the class
module.exports = queryMonitor;
module.exports.QueryPerformanceMonitor = QueryPerformanceMonitor;
