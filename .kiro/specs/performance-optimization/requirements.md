# Requirements Document: Performance Optimization

## Introduction

This document specifies the requirements for optimizing critical performance bottlenecks in a Node.js/Express backend with MongoDB database serving a Next.js frontend. The system currently experiences 3-10 second delays in various operations due to inefficient database queries, synchronous blocking operations, missing indexes, and lack of caching. The optimization will reduce response times to under 500ms while maintaining data consistency and system reliability.

## Glossary

- **System**: The complete Node.js/Express backend application with MongoDB database
- **N+1_Query**: A database anti-pattern where one query is executed to fetch a list, followed by N additional queries to fetch related data for each item
- **Aggregation_Pipeline**: MongoDB's framework for data aggregation operations that process data records and return computed results
- **COLLSCAN**: Collection scan - MongoDB operation that scans every document in a collection (slow, should be avoided with indexes)
- **Populate**: Mongoose method that automatically replaces specified paths in a document with documents from other collections
- **Hook**: Mongoose middleware function that executes before or after certain operations (pre-save, post-save, etc.)
- **Session**: MongoDB transaction session that ensures atomicity across multiple operations
- **Cache**: Temporary storage layer (Redis or in-memory) for frequently accessed data
- **Background_Job**: Asynchronous task executed outside the main request-response cycle
- **Debounce**: Technique to delay execution until after a specified time has passed since the last invocation
- **Index**: Database structure that improves query performance by allowing faster data retrieval
- **Compound_Index**: Database index on multiple fields to optimize queries filtering on those fields
- **VagonSale**: Sales transaction entity linking vagons, lots, and clients
- **VagonLot**: Inventory lot entity containing wood products
- **Cash**: Financial transaction entity tracking payments and debts
- **Client**: Customer entity with debt and payment tracking
- **Vagon**: Railway car entity containing multiple lots

## Requirements

### Requirement 1: Eliminate N+1 Query Problem

**User Story:** As a system administrator, I want database queries to use efficient aggregation pipelines instead of multiple populate calls, so that route response times are reduced from 3-5 seconds to under 500ms.

#### Acceptance Criteria

1. WHEN fetching VagonSale records with related data, THE System SHALL use aggregation pipeline with $lookup stages instead of populate() calls
2. WHEN fetching Cash records with related data, THE System SHALL use aggregation pipeline with $lookup stages instead of populate() calls
3. WHEN fetching Client records with related data, THE System SHALL use aggregation pipeline with $lookup stages instead of populate() calls
4. WHEN using $lookup stages, THE System SHALL project only required fields to minimize data transfer
5. WHEN aggregation pipelines are executed, THE System SHALL complete in under 500ms for up to 100 records
6. WHEN search filters are applied, THE System SHALL apply them within the aggregation pipeline before lookup operations
7. FOR ALL routes using populate(), THE System SHALL replace them with equivalent aggregation pipelines

### Requirement 2: Optimize Synchronous Hook Operations

**User Story:** As a developer, I want blocking operations in Mongoose hooks to be asynchronous or deferred, so that save operations complete quickly without waiting for external API calls or heavy calculations.

#### Acceptance Criteria

1. WHEN a VagonLot is saved, THE System SHALL NOT perform synchronous currency conversion in the pre-save hook
2. WHEN currency conversion is needed, THE System SHALL use cached exchange rates with TTL-based invalidation
3. WHEN exchange rates are not in cache, THE System SHALL fetch them asynchronously and cache for future use
4. IF exchange rate fetching fails, THEN THE System SHALL use fallback rates and log a warning
5. WHEN VagonLot save operations execute, THE System SHALL complete in under 200ms
6. WHEN multiple VagonLots are saved in batch, THE System SHALL perform currency conversion once for all lots
7. FOR ALL pre-save hooks with blocking operations, THE System SHALL refactor to use cached data or defer to background jobs

### Requirement 3: Defer Vagon Totals Updates

**User Story:** As a system user, I want vagon total calculations to be deferred and batched, so that lot save operations don't block waiting for total recalculation.

#### Acceptance Criteria

1. WHEN a VagonLot is saved, THE System SHALL NOT immediately recalculate vagon totals synchronously
2. WHEN vagon totals need updating, THE System SHALL schedule a debounced update with 5-second delay
3. WHEN multiple lots for the same vagon are saved within 5 seconds, THE System SHALL perform only one total update
4. WHEN the debounced update executes, THE System SHALL recalculate all vagon totals in a single operation
5. WHEN vagon totals are being updated, THE System SHALL NOT block other save operations
6. WHEN a VagonSale is created, THE System SHALL schedule vagon totals update in background
7. FOR ALL vagon total updates, THE System SHALL complete within 1 second

### Requirement 4: Implement Strategic Database Indexes

**User Story:** As a database administrator, I want strategic indexes on frequently queried fields, so that aggregation pipelines use index scans instead of collection scans and complete in under 500ms.

#### Acceptance Criteria

1. WHEN querying VagonSale by sale_date, THE System SHALL use an index on sale_date field
2. WHEN querying VagonSale by client and date range, THE System SHALL use a compound index on (client, sale_date)
3. WHEN querying Cash by transaction_date and type, THE System SHALL use a compound index on (transaction_date, type)
4. WHEN querying Cash by currency and type, THE System SHALL use a compound index on (currency, type)
5. WHEN querying VagonLot by vagon, THE System SHALL use an index on vagon field
6. WHEN querying Client records, THE System SHALL use an index on isDeleted field
7. WHEN aggregation pipelines execute, THE System SHALL use IXSCAN (index scan) instead of COLLSCAN
8. FOR ALL frequently queried fields, THE System SHALL have appropriate single or compound indexes

### Requirement 5: Implement Caching Layer

**User Story:** As a system architect, I want frequently accessed data to be cached with appropriate TTL, so that repeated calculations are avoided and response times are reduced from 1-2 seconds to under 100ms.

#### Acceptance Criteria

1. WHEN balance calculations are requested, THE System SHALL check cache before performing aggregation
2. WHEN cached balance data exists and is not stale, THE System SHALL return cached data within 50ms
3. WHEN cached balance data is stale or missing, THE System SHALL calculate balance and cache with 60-second TTL
4. WHEN exchange rates are requested, THE System SHALL check cache before fetching from external API
5. WHEN cached exchange rates exist and are not stale, THE System SHALL return cached rates within 10ms
6. WHEN cached exchange rates are stale or missing, THE System SHALL fetch from API and cache with 1-hour TTL
7. WHEN Cash or VagonSale records are created/updated/deleted, THE System SHALL invalidate related balance cache entries
8. WHEN cache operations fail, THE System SHALL fall back to direct database queries and log the error
9. FOR ALL cache entries, THE System SHALL implement appropriate TTL based on data volatility

### Requirement 6: Optimize Balance Calculations

**User Story:** As a frontend developer, I want balance calculations to be fast and cached, so that the header balance display loads in under 100ms instead of 1-2 seconds.

#### Acceptance Criteria

1. WHEN balance by currency is requested, THE System SHALL use cached aggregation results if available
2. WHEN balance cache is empty, THE System SHALL perform aggregation and cache results for 60 seconds
3. WHEN Cash records are modified, THE System SHALL invalidate balance cache for affected currencies
4. WHEN multiple balance requests occur simultaneously, THE System SHALL deduplicate and execute only one aggregation
5. WHEN balance calculations execute, THE System SHALL complete in under 100ms for cached data
6. WHEN balance calculations execute, THE System SHALL complete in under 500ms for uncached data
7. FOR ALL balance endpoints, THE System SHALL return cached data when available

### Requirement 7: Implement Background Job Queue

**User Story:** As a system architect, I want long-running operations to execute in background jobs, so that API responses are immediate and heavy processing doesn't block user requests.

#### Acceptance Criteria

1. WHEN vagon totals need updating, THE System SHALL enqueue a background job instead of blocking
2. WHEN client debt needs recalculation, THE System SHALL enqueue a background job instead of blocking
3. WHEN background jobs are enqueued, THE System SHALL return API response immediately
4. WHEN background jobs execute, THE System SHALL process them asynchronously outside request cycle
5. WHEN background jobs fail, THE System SHALL retry up to 3 times with exponential backoff
6. WHEN background jobs fail after retries, THE System SHALL log error and alert administrators
7. FOR ALL operations taking longer than 500ms, THE System SHALL consider moving to background jobs

### Requirement 8: Optimize Pagination Performance

**User Story:** As a user, I want paginated lists to load quickly, so that I can navigate through large datasets without experiencing delays.

#### Acceptance Criteria

1. WHEN paginated results are requested, THE System SHALL limit page size to maximum 100 items
2. WHEN pagination is applied, THE System SHALL use skip and limit within aggregation pipeline
3. WHEN total count is needed, THE System SHALL execute count aggregation in parallel with data fetch
4. WHEN pagination parameters are invalid, THE System SHALL return appropriate error message
5. WHEN paginated queries execute, THE System SHALL complete in under 500ms for any page
6. WHEN users request first page, THE System SHALL prioritize speed over total count accuracy
7. FOR ALL paginated endpoints, THE System SHALL return pagination metadata (currentPage, totalPages, hasNextPage)

### Requirement 9: Implement Query Performance Monitoring

**User Story:** As a system administrator, I want slow queries to be logged and monitored, so that I can identify and fix performance issues proactively.

#### Acceptance Criteria

1. WHEN database queries execute, THE System SHALL measure execution time
2. WHEN query execution time exceeds 500ms, THE System SHALL log query details and execution plan
3. WHEN slow queries are detected, THE System SHALL include collection name, filter, and duration in logs
4. WHEN aggregation pipelines execute, THE System SHALL log pipeline stages and execution time
5. WHEN query performance degrades, THE System SHALL alert administrators via logging system
6. WHEN performance logs are generated, THE System SHALL include timestamp, user, and endpoint information
7. FOR ALL database operations, THE System SHALL track and log performance metrics

### Requirement 10: Optimize Frontend Caching Strategy

**User Story:** As a frontend developer, I want React Query to cache data appropriately, so that unnecessary network requests are avoided and page transitions are instant.

#### Acceptance Criteria

1. WHEN React Query is configured, THE System SHALL set staleTime to 5 minutes for list data
2. WHEN React Query is configured, THE System SHALL set cacheTime to 10 minutes for all queries
3. WHEN window focus changes, THE System SHALL NOT automatically refetch data
4. WHEN network reconnects, THE System SHALL NOT automatically refetch data
5. WHEN cached data is available, THE System SHALL render immediately without loading state
6. WHEN mutations occur, THE System SHALL invalidate only affected query caches
7. FOR ALL React Query configurations, THE System SHALL optimize for reduced network traffic

### Requirement 11: Implement Smart Cache Invalidation

**User Story:** As a system architect, I want cache invalidation to be intelligent and targeted, so that stale data is avoided while maintaining cache effectiveness.

#### Acceptance Criteria

1. WHEN a VagonSale is created, THE System SHALL invalidate cache for affected vagon, client, and balance
2. WHEN a Cash record is created, THE System SHALL invalidate cache for affected client balance
3. WHEN a VagonLot is updated, THE System SHALL invalidate cache for affected vagon totals
4. WHEN cache invalidation occurs, THE System SHALL target specific cache keys instead of clearing all cache
5. WHEN multiple related records are updated in transaction, THE System SHALL batch cache invalidations
6. WHEN cache invalidation fails, THE System SHALL log error but not fail the main operation
7. FOR ALL data modifications, THE System SHALL invalidate related cache entries

### Requirement 12: Optimize Transaction Performance

**User Story:** As a developer, I want database transactions to be fast and efficient, so that multi-step operations complete quickly without sacrificing data consistency.

#### Acceptance Criteria

1. WHEN transactions are started, THE System SHALL use read preference 'primary' for consistency
2. WHEN transactions execute, THE System SHALL minimize the number of database round trips
3. WHEN transactions include multiple operations, THE System SHALL batch them where possible
4. WHEN transactions complete, THE System SHALL commit or rollback within 2 seconds
5. WHEN transaction errors occur, THE System SHALL rollback all changes and return clear error message
6. WHEN transactions are long-running, THE System SHALL log warning after 1 second
7. FOR ALL transactional operations, THE System SHALL maintain ACID properties while optimizing performance

## Performance Targets

### Current Performance (Baseline)
- VagonSale list (100 items): 3-5 seconds
- Cash balance calculation: 1-2 seconds
- Client list (100 items): 1-2 seconds
- Vagon details with lots: 2-4 seconds
- VagonLot save with hooks: 2-5 seconds

### Target Performance (After Optimization)
- VagonSale list (100 items): < 500ms (6-10x improvement)
- Cash balance calculation: < 100ms (10-20x improvement)
- Client list (100 items): < 400ms (3-5x improvement)
- Vagon details with lots: < 800ms (3-5x improvement)
- VagonLot save with hooks: < 200ms (10-25x improvement)

### Overall Target
- 90% of API requests complete in under 500ms
- 99% of API requests complete in under 1 second
- Zero blocking operations in request handlers
- Cache hit rate above 80% for frequently accessed data
