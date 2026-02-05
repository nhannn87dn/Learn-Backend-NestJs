# Lesson 14 - Optimization & Task Scheduling

## Phần 1: Performance Optimization Foundations

### 1.1 Giới thiệu về Performance Optimization

* Tại sao cần tối ưu hiệu suất?
* Các metrics đo lường hiệu suất
  * Response Time
  * Throughput
  * Resource Utilization
  * Error Rate
* Công cụ đo lường và profiling
  * Chrome DevTools
  * Fastify metrics
  * APM tools (Application Performance Monitoring)

### 1.2 Database Query Optimization

* **Query Analysis và Optimization**
  * Sử dụng EXPLAIN/EXPLAIN ANALYZE trong PostgreSQL
  * Phát hiện slow queries
  * Query planning và execution
  
* **Indexing Strategies**
  * B-tree indexes
  * Partial indexes
  * Composite indexes
  * Index best practices
  * Khi nào nên/không nên dùng index

* **TypeORM Query Optimization**
  * Query Builder vs Repository
  * Select specific fields
  * Eager vs Lazy loading
  * Pagination best practices (limit/offset vs cursor-based)
  * Avoiding N+1 queries problem
  
* **Connection Pool Configuration**
  * Pool size optimization
  * Connection timeout settings
  * Idle connection management

### 1.3 Application-Level Optimization

* **Response Compression**
  * Gzip compression trong Fastify
  * Compression strategies
  * When to compress

* **Request Validation Optimization**
  * ValidationPipe performance
  * Schema caching
  * Whitelist và transform strategies

* **Serialization Optimization**
  * Class-transformer performance
  * Custom serializers
  * Exclude unnecessary fields

---

## Phần 2: Caching Strategies & Redis

### 2.1 Giới thiệu về Caching

* **Caching là gì?**
  * Định nghĩa và khái niệm
  * Lợi ích của caching
  * Trade-offs khi sử dụng cache

* **Khi nào nên sử dụng cache?**
  * Data ít thay đổi
  * Expensive operations
  * High-read, low-write data
  * Computed results

### 2.2 Caching Patterns

* **Cache-Aside (Lazy Loading)**
  * Flow: Check cache → Miss → Load from DB → Update cache
  * Use cases
  * Implementation

* **Read-Through Cache**
  * Automatic cache population
  * Comparison with Cache-Aside

* **Write-Through Cache**
  * Write to cache and DB simultaneously
  * Data consistency benefits

* **Write-Behind (Write-Back) Cache**
  * Async write to database
  * Performance benefits và risks

* **Cache Invalidation Strategies**
  * Time-based (TTL)
  * Event-based invalidation
  * Manual invalidation
  * Cache stampede problem và giải pháp

### 2.3 Giới thiệu Redis

* **Redis là gì?**
  * In-memory data structure store
  * Key-value database
  * Use cases: Cache, Session, Queue, Pub/Sub

* **Tại sao chọn Redis?**
  * Performance (sub-millisecond latency)
  * Rich data structures
  * Persistence options
  * Scalability

* **Redis Data Structures**
  * Strings (simple key-value)
  * Hashes (objects)
  * Lists (queues, stacks)
  * Sets (unique collections)
  * Sorted Sets (leaderboards, rankings)
  * HyperLogLog, Bitmap, Geospatial

### 2.4 Cài đặt và Cấu hình Redis

* **Installation**
  * Local installation
  * Docker setup
  * Cloud Redis (AWS ElastiCache, Redis Cloud)

* **Redis Configuration**
  * Memory policies (maxmemory-policy)
  * Eviction strategies (LRU, LFU, TTL)
  * Persistence options (RDB, AOF)
  * Security (authentication, encryption)

### 2.5 Caching trong NestJS với Redis

* **Cài đặt Dependencies**

  ```bash
  npm install @nestjs/cache-manager cache-manager
  npm install cache-manager-redis-yet redis
  ```

* **Cấu hình CacheModule với Redis**
  * Global cache module
  * Redis connection setup
  * TTL configuration
  * Environment-based config

* **Basic Cache Usage**
  * Cache decorator (@UseInterceptors(CacheInterceptor))
  * CacheKey decorator
  * CacheTTL decorator
  * Manual cache operations (get, set, del, reset)

* **Advanced Caching Techniques**
  * Custom cache keys
  * Conditional caching
  * Cache per user/role
  * Multi-level caching

### 2.6 Custom Cache Interceptor

* **Tạo Cache Interceptor**
  * Implement NestInterceptor
  * Custom cache key generation
  * Response caching logic
  * Error handling

* **Cache Key Design Patterns**
  * Naming conventions
  * Hierarchical keys (user:123:profile)
  * Versioning keys
  * Wildcard patterns for deletion

* **Practical Examples**
  * Cache API responses
  * Cache database queries
  * Cache computed results
  * Cache third-party API calls

### 2.7 Cache Monitoring & Debugging

* **Performance Metrics**
  * Cache hit ratio
  * Cache miss ratio
  * Memory usage
  * Key expiration monitoring

* **Redis Monitoring Tools**
  * Redis CLI
  * RedisInsight
  * Monitoring commands (INFO, MONITOR)

* **Best Practices**
  * Avoid storing large objects
  * Set appropriate TTL
  * Handle cache failures gracefully
  * Cache warming strategies
  * Distributed caching considerations

---

## Phần 3: Background Jobs & Task Scheduling

### 3.1 Background Jobs Overview

* **Background Jobs là gì?**
  * Định nghĩa và use cases
  * Synchronous vs Asynchronous processing
  * When to use background jobs

* **Common Use Cases**
  * Email sending
  * Image/Video processing
  * PDF generation
  * Data imports/exports
  * Report generation
  * Batch processing
  * Data synchronization
  * Cleanup tasks

### 3.2 Native NestJS Scheduling

* **@nestjs/schedule Package**
  * Installation và setup
  * ScheduleModule configuration

* **Cron Jobs**
  * Cron syntax
  * @Cron() decorator
  * Cron expressions examples
  * Timezone handling

* **Intervals**
  * @Interval() decorator
  * Fixed-rate execution
  * Use cases

* **Timeouts**
  * @Timeout() decorator
  * One-time delayed execution

* **Dynamic Scheduling**
  * SchedulerRegistry
  * Add/remove jobs at runtime
  * Dynamic cron jobs

### 3.3 Giới thiệu BullMQ

* **BullMQ là gì?**
  * Redis-based queue system
  * Built on top of Redis
  * Modern rewrite of Bull

* **Tại sao chọn BullMQ?**
  * Robust và production-ready
  * Advanced features (flows, priority)
  * Better TypeScript support
  * Active maintenance
  * Scalability

* **BullMQ vs Alternatives**
  * Bull vs BullMQ
  * RabbitMQ
  * Apache Kafka
  * When to use each

### 3.4 Cài đặt và Cấu hình BullMQ

* **Installation**

  ```bash
  npm install @nestjs/bullmq bullmq
  ```

* **BullMQ Module Setup**
  * Register BullMQ module
  * Redis connection configuration
  * Global queue options

* **Queue Configuration**
  * Default job options
  * Retry strategies
  * Backoff strategies
  * Rate limiting

### 3.5 Working with Queues

* **Creating Queues**
  * Queue registration
  * Multiple queues
  * Queue naming conventions

* **Adding Jobs to Queue**
  * Simple jobs
  * Jobs with data
  * Job options (priority, delay, attempts)
  * Bulk jobs

* **Job Processors**
  * @Processor() decorator
  * @Process() decorator
  * Named processors
  * Concurrent processing
  * Sandboxed processors

* **Job Lifecycle**
  * Job states (waiting, active, completed, failed)
  * Job events
  * Job progress tracking

### 3.6 Advanced BullMQ Features

* **Job Priority**
  * Priority queue configuration
  * Setting job priority
  * Use cases

* **Delayed Jobs**
  * Schedule jobs for future execution
  * Delay vs Repeat
  * Use cases

* **Repeatable Jobs**
  * Cron-based repeatable jobs
  * Every interval
  * Repeat options
  * Managing repeatable jobs

* **Job Flows & Dependencies**
  * Parent-child relationships
  * Job dependencies
  * FlowProducer
  * Complex workflows

* **Rate Limiting**
  * Limit jobs per time window
  * Max concurrent jobs
  * Group-based rate limiting

### 3.7 Error Handling & Retry Logic

* **Retry Mechanisms**
  * Automatic retries
  * Retry configuration
  * Exponential backoff
  * Custom backoff strategies

* **Failed Job Handling**
  * Failed job queue
  * Error logging
  * Alerting on failures
  * Manual retry

* **Dead Letter Queue**
  * Concept và implementation
  * Moving failed jobs
  * Reprocessing strategies

### 3.8 Queue Events & Listeners

* **Queue Events**
  * Job events (completed, failed, progress)
  * Queue events (cleaned, drained)
  * Global events

* **Event Listeners**
  * @OnQueueEvent() decorator
  * Custom event handlers
  * Logging và monitoring

* **Webhooks & Notifications**
  * Notify on job completion
  * Integration with external systems


