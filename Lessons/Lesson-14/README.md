# Lesson 14 — Optimization & Task Scheduling


**Phần 1: Performance Optimization Foundations**

## 1.1 Giới thiệu về Performance Optimization

### Tại sao cần tối ưu hiệu suất?

Hãy tưởng tượng bạn xây một cửa hàng trực tuyến. Ban đầu chỉ có 10 người dùng — mọi thứ chạy mượt. Nhưng sau khi quảng cáo viral, 10.000 người đổ vào cùng lúc. Server quá tải, trang web treo, đơn hàng thất bại. Đây là lý do **Performance Optimization** tồn tại.

Performance Optimization là quá trình **xác định bottleneck (điểm nghẽn)** trong ứng dụng và tìm cách cải thiện, để hệ thống xử lý được nhiều yêu cầu hơn, nhanh hơn, tiêu tốn ít tài nguyên hơn.

> 💡 **Quy tắc 80/20**: 80% vấn đề performance thường đến từ 20% code — thường là database queries, N+1 problems, và thiếu caching. **Hãy đo lường trước khi tối ưu, đừng đoán mò.**

### Các Metrics đo lường hiệu suất

Bạn không thể cải thiện thứ bạn không đo được. Dưới đây là 4 metrics cốt lõi:

| Metric | Định nghĩa | Đơn vị | Mục tiêu |
|--------|-----------|--------|----------|
| **Response Time** | Thời gian từ lúc gửi request đến nhận response | ms | < 200ms (p95) |
| **Throughput** | Số requests xử lý được mỗi giây | req/s (RPS) | Càng cao càng tốt |
| **Resource Utilization** | Mức độ sử dụng CPU, RAM, Disk, Network | % | CPU < 70%, RAM < 80% |
| **Error Rate** | Tỷ lệ requests bị lỗi (5xx) | % | < 0.1% |

> 📝 **Lưu ý về p95**: p95 (percentile 95) có nghĩa là 95% requests hoàn thành trong thời gian đó. Đây là metric thực tế hơn average vì average bị outlier kéo lệch.

### Công cụ đo lường và Profiling

- **Chrome DevTools** — Network tab, Performance tab: đo thời gian từ phía browser
- **Fastify metrics** — Built-in hooks để đo response time trong code
- **APM Tools** — Application Performance Monitoring: New Relic, Datadog, Elastic APM
- **k6 / Artillery** — Load testing: giả lập 1000 user cùng lúc để tìm điểm vỡ

---

## 1.2 Database Query Optimization

### Tại sao Database thường là bottleneck?

Trong hầu hết các web application, database là thành phần chậm nhất. Một API call thường tốn < 1ms để xử lý logic nhưng lại tốn 50–200ms để query database. Nếu một API call trigger 10 queries (N+1 problem), bạn đã lãng phí hàng trăm milliseconds vô ích.

### EXPLAIN / EXPLAIN ANALYZE trong PostgreSQL

Đây là công cụ mạnh nhất để hiểu PostgreSQL đang làm gì với query của bạn.

```sql
-- Xem query plan (không thực thi)
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

-- Xem query plan + thực thi thật + thời gian thực tế
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

-- Output ví dụ (KHÔNG có index):
-- Seq Scan on users  (cost=0.00..2500.00 rows=1 width=200)
--                    (actual time=45.123..45.130 rows=1 loops=1)

-- Output ví dụ (CÓ index):
-- Index Scan using idx_users_email on users
--                    (actual time=0.043..0.045 rows=1 loops=1)
```

> 💡 **Đọc kết quả EXPLAIN**:
> - `Seq Scan` = quét toàn bộ bảng → **BAD** nếu bảng lớn. Cần thêm index.
> - `Index Scan` = dùng index → **GOOD**. Nhanh hơn Seq Scan nhiều lần.
> - `cost=X..Y` = ước tính chi phí; `actual time=A..B` = thời gian thực tế (ms).

### Indexing Strategies

Index là một **cấu trúc dữ liệu phụ** (thường là B-tree) giúp database tìm dữ liệu nhanh hơn, tương tự như mục lục trong sách. Thay vì đọc toàn bộ 1 triệu dòng, database chỉ cần đọc vài chục dòng.

```sql
-- B-tree Index (mặc định) — dùng cho equality và range queries
CREATE INDEX idx_users_email ON users(email);

-- Partial Index — chỉ index một subset of data (tiết kiệm space)
-- Ví dụ: chỉ index user active, bỏ qua deleted users
CREATE INDEX idx_active_users ON users(email)
  WHERE deleted_at IS NULL;

-- Composite Index — index nhiều cột
-- Thứ tự cột RẤT QUAN TRỌNG: cột có selectivity cao nhất lên trước
CREATE INDEX idx_orders_user_status ON orders(user_id, status, created_at);

-- Query hưởng lợi từ composite index trên:
SELECT * FROM orders
  WHERE user_id = 123 AND status = 'pending'
  ORDER BY created_at DESC;
```

| Loại Index | Dùng khi nào | Ví dụ |
|-----------|-------------|-------|
| **B-tree** (default) | Equality (`=`), Range (`<`, `>`, `BETWEEN`), `ORDER BY` | `WHERE email = '...'` |
| **Partial Index** | Chỉ query subset of rows | `WHERE deleted_at IS NULL` |
| **Composite Index** | Query lọc nhiều cột cùng lúc | `WHERE user_id=1 AND status='active'` |
| **GIN Index** | Full-text search, JSONB, Arrays | `WHERE tags @> ARRAY['nestjs']` |

> ⚠️ **Đừng index tất cả mọi thứ!** Mỗi index tốn thêm disk space và làm **chậm** các thao tác `INSERT`/`UPDATE`/`DELETE`. Chỉ thêm index khi: (1) cột xuất hiện thường xuyên trong `WHERE`/`JOIN`, (2) bảng có nhiều rows (> 10.000), (3) query đang chạy chậm.

### TypeORM Query Optimization

**Query Builder vs Repository**: Với queries đơn giản, dùng Repository API. Với queries phức tạp (JOIN nhiều bảng, subqueries), dùng Query Builder để kiểm soát SQL được tạo ra.

```typescript
// ❌ BAD: Select tất cả columns, load cả relations không cần thiết
const users = await this.userRepo.find({
  relations: ['posts', 'comments', 'orders'],
});

// ✅ GOOD: Chỉ select fields cần thiết
const users = await this.userRepo.find({
  select: ['id', 'name', 'email'],
  where: { isActive: true },
  take: 20,  // LIMIT
  skip: 0,   // OFFSET
});

// ✅ GOOD: Query Builder với JOIN cụ thể
const users = await this.userRepo
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post', 'post.published = :pub', { pub: true })
  .select(['user.id', 'user.name', 'post.title'])
  .where('user.isActive = :active', { active: true })
  .getMany();
```

### The N+1 Problem — Kẻ thù lớn nhất của ORM

N+1 là vấn đề phổ biến nhất khi dùng ORM: thay vì 1 query lấy tất cả data, code trigger thêm N queries bổ sung — một query cho mỗi row.

```typescript
// ❌ N+1 Problem: 1 query lấy users + N queries lấy posts
const users = await this.userRepo.find(); // Query 1: SELECT * FROM users (100 users)
for (const user of users) {
  // Query 2, 3, 4...101: SELECT * FROM posts WHERE user_id = ?
  const posts = await this.postRepo.find({ where: { userId: user.id } });
  user.posts = posts;
}
// Tổng: 101 queries! 😱

// ✅ SOLUTION: Dùng eager loading với JOIN
const users = await this.userRepo.find({
  relations: { posts: true }, // Chỉ 1 query với JOIN
});

// ✅ SOLUTION: Query Builder với explicit join
const users = await this.userRepo
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post')
  .getMany();
```

### Pagination: Offset vs Cursor-based

**Offset Pagination** (truyền thống):
- ✓ Dễ implement, cho phép nhảy đến trang bất kỳ
- ✗ Chậm khi OFFSET lớn (DB phải skip qua hàng nghìn rows)
- ✗ Data có thể bị duplicate/missing khi có insert trong lúc đang phân trang
- Dùng cho: Admin panels, báo cáo tĩnh

**Cursor-based Pagination**:
- ✓ Hiệu năng ổn định dù trang rất lớn
- ✓ Không bị duplicate khi có insert mới
- ✗ Không nhảy được đến trang bất kỳ
- Dùng cho: Infinite scroll, social feeds, realtime data

```typescript
// Offset Pagination (truyền thống)
async findAll(page: number, limit: number) {
  return this.userRepo.findAndCount({
    skip: (page - 1) * limit,  // ← DB phải skip qua hàng nghìn rows
    take: limit,
    order: { createdAt: 'DESC' },
  });
}

// Cursor-based Pagination (hiệu năng cao)
async findAll(cursor?: string, limit = 20) {
  const qb = this.userRepo
    .createQueryBuilder('user')
    .orderBy('user.id', 'DESC')
    .take(limit + 1); // lấy thêm 1 để biết có trang tiếp không

  if (cursor) {
    qb.where('user.id < :cursor', { cursor: parseInt(cursor) });
  }

  const users = await qb.getMany();
  const hasNextPage = users.length > limit;
  const items = hasNextPage ? users.slice(0, -1) : users;
  const nextCursor = hasNextPage ? items[items.length - 1].id.toString() : null;

  return { items, nextCursor, hasNextPage };
}
```

### Connection Pool Configuration

```typescript
// data-source.ts hoặc TypeORM config
{
  type: 'postgres',
  // ...
  extra: {
    // Pool size: số connections tối đa đến DB
    // Rule of thumb: (2 * số CPU cores) + số disk spindles
    max: 10,
    min: 2,
    // Timeout nếu không lấy được connection từ pool
    acquireTimeoutMillis: 30_000,
    // Đóng connection idle sau 10 phút
    idleTimeoutMillis: 600_000,
  },
}
```

---

## 1.3 Application-Level Optimization

### Response Compression với Gzip

Compression giảm kích thước response xuống 60–80%, tiết kiệm bandwidth và tăng tốc độ truyền tải — đặc biệt quan trọng với mobile users.

```bash
npm install @fastify/compress
```

```typescript
// main.ts
import compression from '@fastify/compress';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(compression, {
    encodings: ['gzip', 'deflate'],
    threshold: 1024,  // Chỉ compress response > 1KB
  });

  await app.listen(3000);
}
```

> 📝 **Khi nào KHÔNG dùng Compression?**
> - Đừng compress: ảnh JPEG/PNG (đã nén sẵn), video, file PDF
> - Đừng compress response nhỏ < 1KB (overhead của compression > lợi ích)
> - Nếu dùng CDN (CloudFront, Cloudflare), để CDN handle compression thay app server

### Request Validation & Serialization Optimization

```typescript
// main.ts — Tối ưu ValidationPipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,        // Loại bỏ fields không có trong DTO (giảm processing)
  transform: true,        // Auto-transform types (tránh manual casting)
  forbidNonWhitelisted: false,
  // Bật cache schema để không recompile mỗi request
  // (tự động trong NestJS 9+)
}));

// Serialization: chỉ trả về fields cần thiết
// users.entity.ts
@Entity()
export class User {
  @Column()
  name: string;

  @Exclude() // Không bao giờ trả ra ngoài
  password: string;

  @Expose({ groups: ['admin'] }) // Chỉ trả về khi role = admin
  internalNotes: string;
}
```

---

**Phần 2: Caching Strategies & Redis**

## 2.1 Giới thiệu về Caching

### Caching là gì? — Analogy thực tế

Hãy tưởng tượng bạn là nhân viên ngân hàng. Mỗi khi khách hỏi *"lãi suất hôm nay?"*, bạn phải vào kho tra tài liệu (mất 5 phút). Nếu có **tờ giấy note trên bàn** ghi lãi suất cập nhật buổi sáng, bạn trả lời ngay lập tức (mất 1 giây). Tờ giấy note đó chính là **cache**.

Trong phần mềm: thay vì query database (chậm, tốn I/O) mỗi lần, bạn lưu kết quả vào **bộ nhớ tạm (cache)** như Redis (nhanh, in-memory). Các request tiếp theo đọc từ cache — nhanh hơn 100–1000 lần.

### Trade-offs của Caching

Caching không phải là viên đạn bạc. Nó giải quyết một vấn đề nhưng tạo ra vấn đề mới:

| Lợi ích | Rủi ro / Trade-off |
|---------|-------------------|
| Tăng tốc độ response 10x–1000x | Data có thể **stale** (cũ, không còn chính xác) |
| Giảm tải database (ít queries hơn) | Phức tạp hóa hệ thống (thêm dependency) |
| Giảm chi phí infrastructure | Cache invalidation — *"one of 2 hard problems in CS"* |
| Xử lý traffic spike tốt hơn | Memory consumption, cần quản lý eviction |

### Khi nào nên dùng Cache?

- **Data ít thay đổi**: product catalog, config settings, exchange rates (update theo giờ)
- **Expensive operations**: complex SQL joins, machine learning inference, rendering reports
- **High-read / Low-write**: trang chủ hiển thị 1M lần/ngày nhưng chỉ update 1 lần/ngày
- **Computed results**: leaderboard rankings, aggregated statistics, recommendations

---

## 2.2 Caching Patterns

### Cache-Aside (Lazy Loading) — Pattern phổ biến nhất

Ứng dụng tự quản lý cache. Khi cần data, kiểm tra cache trước; nếu miss thì mới query DB và cập nhật cache.

```
Request → Check Cache
              ↓ HIT          ↓ MISS
         Return data    Query Database
                              ↓
                        Store in Cache
                              ↓
                         Return data
```

```typescript
async getUser(id: number): Promise<User> {
  const cacheKey = `user:${id}`;

  // 1. Check cache
  const cached = await this.cacheManager.get<User>(cacheKey);
  if (cached) {
    return cached; // Cache HIT → trả về ngay, không query DB
  }

  // 2. Cache MISS → Query database
  const user = await this.userRepo.findOneBy({ id });
  if (!user) throw new NotFoundException();

  // 3. Store in cache với TTL 5 phút
  await this.cacheManager.set(cacheKey, user, 300_000);

  return user;
}

// Khi update user: invalidate cache
async updateUser(id: number, dto: UpdateUserDto) {
  const user = await this.userRepo.save({ id, ...dto });
  await this.cacheManager.del(`user:${id}`); // Xóa cache cũ
  return user;
}
```

### So sánh các Caching Patterns

| Pattern | Mô tả | Ưu điểm | Nhược điểm | Use case |
|---------|-------|---------|-----------|---------|
| **Cache-Aside** | App tự check & populate cache | Đơn giản, linh hoạt | Cache miss đầu tiên chậm | Most use cases |
| **Read-Through** | Cache tự fetch từ DB khi miss | Logic cache tách biệt | Cần cache layer hỗ trợ | DAX (DynamoDB) |
| **Write-Through** | Write đồng thời cache + DB | Luôn consistent | Write chậm hơn | Dữ liệu quan trọng |
| **Write-Behind** | Write cache trước, async write DB | Write rất nhanh | Risk mất data nếu crash | High-write workloads |

### Cache Invalidation — Bài toán khó nhất

> *"There are only 2 hard things in Computer Science: cache invalidation and naming things."* — Phil Karlton

- **Time-based (TTL)**: Đơn giản nhất. Set TTL = 5 phút, cache tự expire. Nhược điểm: data có thể stale tới 5 phút.
- **Event-based**: Khi data thay đổi, trigger event để xóa cache tương ứng. Phức tạp hơn nhưng real-time.
- **Cache Stampede**: Khi cache expire, hàng trăm requests đồng thời hit DB. Giải pháp: Mutex lock hoặc probabilistic early expiration.

```typescript
// Cache Stampede Prevention — dùng mutex lock
async getUserWithLock(id: number): Promise<User> {
  const cacheKey = `user:${id}`;
  const lockKey = `lock:user:${id}`;

  const cached = await this.cache.get<User>(cacheKey);
  if (cached) return cached;

  // Chỉ cho 1 request vào DB cùng lúc
  const lock = await this.cache.get(lockKey);
  if (lock) {
    // Đợi 100ms rồi thử lại từ cache
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getUserWithLock(id);
  }

  await this.cache.set(lockKey, '1', 5000); // Lock 5 giây
  try {
    const user = await this.userRepo.findOneBy({ id });
    await this.cache.set(cacheKey, user, 300_000);
    return user;
  } finally {
    await this.cache.del(lockKey); // Luôn release lock
  }
}
```

---

## 2.3 Giới thiệu Redis

### Redis là gì?

**Redis** (REmote DIctionary Server) là một **in-memory data structure store** — toàn bộ data lưu trong RAM, không phải disk. Điều này khiến Redis nhanh hơn database thông thường 100–1000 lần (latency sub-millisecond).

### Redis Data Structures

```redis
# String — đơn giản nhất
SET user:1:name "Nguyen Van A"
GET user:1:name          # => "Nguyen Van A"
SETEX session:abc 3600 "user_data"  # Với TTL 1 giờ

# Hash — lưu object (hiệu quả hơn lưu JSON string)
HSET user:1 name "Nguyen Van A" email "a@email.com" age 25
HGET user:1 name         # => "Nguyen Van A"
HGETALL user:1           # => {name, email, age}

# List — queue/stack
RPUSH tasks "send_email" "generate_pdf"  # Enqueue vào cuối
LPOP tasks               # Dequeue từ đầu => "send_email"

# Set — unique collection
SADD online_users 123 456 789
SISMEMBER online_users 123  # => 1 (true)

# Sorted Set — leaderboard, rankings
ZADD leaderboard 1500 "player1"
ZADD leaderboard 2000 "player2"
ZREVRANGE leaderboard 0 9 WITHSCORES  # Top 10 với điểm
```

### Redis Use Cases trong NestJS

| Use Case | Mô tả |
|---------|-------|
| **Cache** | Lưu kết quả query DB, API response, computed results |
| **Session Store** | Lưu user session (thay thế cookie-based session) |
| **Job Queue** | BullMQ dùng Redis làm storage backend |
| **Pub/Sub** | Real-time messaging giữa các microservices |
| **Rate Limiting** | Đếm số requests/IP trong sliding window |
| **Distributed Lock** | Đảm bảo chỉ 1 instance xử lý một task cùng lúc |

---

## 2.4 Cài đặt và Cấu hình Redis

```bash
# Cách 1: Docker (khuyến nghị cho development)
docker run -d \
  --name redis-dev \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine \
  redis-server --appendonly yes

# Kiểm tra Redis đang chạy
docker exec -it redis-dev redis-cli ping  # => PONG
```

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

volumes:
  redis_data:
```

### Memory Eviction Policies

Khi Redis đầy bộ nhớ, nó cần quyết định key nào bị xóa:

| Policy | Behavior | Dùng khi nào |
|--------|---------|-------------|
| `noeviction` (default) | Trả lỗi khi full, không xóa gì | Không nên dùng cho cache |
| `allkeys-lru` | Xóa key ít dùng gần đây nhất | **General-purpose cache** ✓ |
| `volatile-lru` | Xóa key có TTL ít dùng nhất | Mix cache + persistent data |
| `allkeys-lfu` | Xóa key ít được access nhất (frequency) | Skewed access pattern |
| `volatile-ttl` | Xóa key sắp hết hạn nhất | Khi TTL phản ánh priority |

```bash
# Cấu hình trong redis.conf hoặc command line
redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## 2.5 Caching trong NestJS với Redis

### Cài đặt Dependencies

```bash
npm install @nestjs/cache-manager cache-manager
npm install cache-manager-redis-yet redis
```

### Cấu hình CacheModule

```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,  // Không cần import lại trong từng module
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
          },
          password: process.env.REDIS_PASSWORD,
        }),
        ttl: 5 * 60 * 1000,  // Default TTL: 5 phút (milliseconds)
      }),
    }),
  ],
})
export class AppModule {}
```

### Sử dụng Cache Interceptor (tự động)

```typescript
// users.controller.ts
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('users')
@UseInterceptors(CacheInterceptor) // Cache tất cả GET endpoints
export class UsersController {

  // Cache tự động với key = URL path
  @Get()
  @CacheTTL(60_000)  // Override TTL: 1 phút
  findAll() { ... }

  // Custom cache key
  @Get('featured')
  @CacheKey('featured-users')
  @CacheTTL(10 * 60_000)  // 10 phút
  getFeatured() { ... }
}
```

### Manual Cache Operations

```typescript
// users.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UsersService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private userRepo: UserRepository,
  ) {}

  async getUser(id: number) {
    const key = `user:${id}`;

    // GET
    const cached = await this.cache.get<User>(key);
    if (cached) return cached;

    const user = await this.userRepo.findOneBy({ id });

    // SET với TTL 5 phút (milliseconds)
    await this.cache.set(key, user, 300_000);
    return user;
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.save({ id, ...dto });
    await this.cache.del(`user:${id}`); // Xóa cache sau update
    return user;
  }

  async deleteUser(id: number) {
    await this.userRepo.delete(id);
    await this.cache.del(`user:${id}`);
  }

  // Xóa tất cả cache (dùng cẩn thận trên production!)
  async clearAllCache() {
    await this.cache.reset();
  }
}
```

---

## 2.6 Custom Cache Interceptor

Đôi khi bạn cần logic cache phức tạp hơn: cache theo user, cache theo role, hoặc custom key generation.

```typescript
// user-cache.interceptor.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Injectable()
export class UserCacheInterceptor extends CacheInterceptor {

  // Override để tạo cache key bao gồm user ID
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const url = request.url;

    // Nếu chưa login: không cache (trả về undefined)
    if (!userId) return undefined;

    // Cache key = "user:123:/api/profile"
    return `user:${userId}:${url}`;
  }
}
```

### Cache Key Design Patterns

```
// Naming Convention: entity:id:field
user:123:profile
user:123:settings
product:456:reviews

// Module:version:key (dễ invalidate khi deploy)
catalog:v2:categories
catalog:v2:featured-products

// Action-based
products:featured
users:top-rated
reports:monthly:2024-01
```

> 💡 **Best Practices cho Cache Keys**:
> - Dùng dấu `:` để phân cấp: `user:123:settings`
> - Include version khi cần: `cache:v2:products` (dễ invalidate toàn bộ khi deploy)
> - Tránh key quá dài (> 100 chars) — Redis vẫn hỗ trợ nhưng tốn memory
> - Dùng consistent naming: `entity:id:field` cho tất cả team

---

## 2.7 Cache Monitoring & Best Practices

### Redis CLI Monitoring

```bash
# Xem thống kê tổng quan
redis-cli INFO stats
# keyspace_hits: Số lần cache hit
# keyspace_misses: Số lần cache miss
# Hit ratio = hits / (hits + misses) → mục tiêu > 80%

# Xem keys theo pattern (KHÔNG dùng KEYS * trên production!)
redis-cli SCAN 0 MATCH "user:*" COUNT 100

# Xem TTL của key
redis-cli TTL user:123   # Seconds còn lại, -1 = không có TTL, -2 = không tồn tại

# Memory usage
redis-cli INFO memory
redis-cli MEMORY USAGE user:123  # Bytes cho 1 key cụ thể

# Real-time monitoring (chỉ dùng debug, tốn performance)
redis-cli MONITOR
```

### Best Practices Checklist

- ✅ Set TTL phù hợp — không cache mãi mãi trừ data thực sự tĩnh
- ✅ Handle cache failures gracefully — app phải hoạt động ngay cả khi Redis down
- ✅ Tránh lưu object quá lớn (> 100KB) trong cache
- ✅ Dùng `allkeys-lru` eviction policy cho cache
- ✅ Monitor hit ratio — nếu < 50% thì cache đang không hiệu quả
- ✅ Cache warming: preload data vào cache khi app khởi động
- ✅ Không cache sensitive data (passwords, tokens) hoặc encrypt trước khi cache

```typescript
// Graceful cache fallback — app không crash khi Redis down
async getUser(id: number): Promise<User> {
  try {
    const cached = await this.cache.get<User>(`user:${id}`);
    if (cached) return cached;
  } catch (error) {
    // Redis down → bỏ qua cache, query DB trực tiếp
    this.logger.warn('Cache unavailable, falling back to DB', error.message);
  }

  return this.userRepo.findOneBy({ id });
}
```

---

**Phần 3: Background Jobs & Task Scheduling**

## 3.1 Background Jobs Overview

### Synchronous vs Asynchronous Processing

Hãy nghĩ về một nhà hàng:

**❌ Synchronous (chặn người dùng)**:
1. Khách order pizza
2. Nhân viên vào bếp, **đứng đợi 30 phút**
3. Mang pizza ra cho khách
→ Khách phải ngồi chờ cả quá trình! API trả về sau 30 phút.

**✅ Asynchronous (Background Job)**:
1. Khách order pizza
2. Nhân viên đưa **số order**, khách tự do làm việc khác
3. Bếp làm xong → gọi tên khách
→ API trả về ngay lập tức, pizza được làm trong background.

### Common Use Cases

| Use Case | Tại sao cần background? | Ví dụ |
|---------|------------------------|-------|
| **Email sending** | SMTP có thể mất 2–5s | Welcome email, OTP, notifications |
| **Image/Video processing** | Encode video mất nhiều phút | Avatar resize, video transcoding |
| **PDF generation** | Render phức tạp mất 1–10s | Hóa đơn, báo cáo, certificates |
| **Data import/export** | File CSV lớn mất vài phút | Import 100k records từ Excel |
| **Batch processing** | Xử lý hàng loạt hiệu quả hơn | Monthly billing, aggregations |
| **Cleanup tasks** | Định kỳ dọn dẹp data cũ | Xóa sessions hết hạn, temp files |

---

## 3.2 Native NestJS Scheduling

### Setup

```bash
npm install @nestjs/schedule
```

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
})
export class AppModule {}
```

### Cron Syntax

```
# SECOND  MINUTE  HOUR  DAY_OF_MONTH  MONTH  DAY_OF_WEEK
#  0-59    0-59   0-23      1-31       1-12      0-7

# Ký hiệu:
# *    = mọi giá trị
# */n  = mỗi n đơn vị
# n,m  = tại n hoặc m
# n-m  = từ n đến m

# Ví dụ:
'0 0 * * * *'        # Mỗi đầu giờ
'0 0 9 * * 1-5'      # 9:00 AM, thứ 2 đến thứ 6
'0 */30 * * * *'     # Mỗi 30 phút
'0 0 0 1 * *'        # Ngày 1 mỗi tháng lúc 00:00
'0 0 0 * * 0'        # Chủ nhật lúc 00:00
```

### @Cron, @Interval, @Timeout

```typescript
// tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  // @Cron — chạy theo lịch cụ thể
  @Cron('0 0 9 * * 1-5', {
    name: 'morning-report',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async sendMorningReport() {
    this.logger.log('Sending morning report...');
    await this.reportsService.generate();
  }

  // Sử dụng CronExpression enum (dễ đọc hơn)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredSessions() {
    const deleted = await this.sessionRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    this.logger.log(`Deleted ${deleted.affected} expired sessions`);
  }

  // @Interval — chạy mỗi N milliseconds, đếm từ khi app start
  @Interval(30_000)  // mỗi 30 giây
  async syncExchangeRates() {
    this.logger.log('Syncing exchange rates...');
    await this.ratesService.fetchAndUpdate();
  }

  // @Timeout — chạy MỘT LẦN sau N ms kể từ khi start
  @Timeout(5_000)  // 5 giây sau khi app start
  async warmupCache() {
    this.logger.log('Warming up cache...');
    await this.cacheService.preloadCommonData();
  }
}
```

### Dynamic Scheduling với SchedulerRegistry

Đôi khi bạn cần add/remove/pause job tại runtime — ví dụ, user tạo scheduled report với lịch tùy chỉnh:

```typescript
// dynamic-tasks.service.ts
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class DynamicTasksService {
  constructor(private schedulerRegistry: SchedulerRegistry) {}

  // Thêm cron job động
  addCronJob(name: string, cronTime: string, callback: () => void) {
    const job = new CronJob(cronTime, callback);
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
    this.logger.log(`Job "${name}" added with schedule: ${cronTime}`);
  }

  removeCronJob(name: string) {
    this.schedulerRegistry.deleteCronJob(name);
  }

  pauseJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.stop();
  }

  resumeJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.start();
  }

  listAllJobs() {
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((value, key) => {
      const next = value.nextDate();
      this.logger.log(`Job: ${key} → Next run: ${next}`);
    });
  }
}
```

> ⚠️ **Giới hạn của @nestjs/schedule**: Nếu chạy nhiều instances (horizontal scaling), mỗi instance sẽ chạy job riêng → job bị thực thi nhiều lần. Dùng BullMQ khi cần distributed scheduling.

---

## 3.3 Giới thiệu BullMQ

### Tại sao cần BullMQ? @nestjs/schedule không đủ sao?

`@nestjs/schedule` tốt cho các task đơn giản. Nhưng nó có giới hạn:

- **Không có retry**: nếu task fail, nó không tự thử lại
- **Không có queue**: mọi job chạy ngay, không thể rate-limit hay prioritize
- **Không scale**: nếu chạy 3 instances (horizontal scaling), job chạy 3 lần
- **Không có visibility**: không biết job đang ở trạng thái gì (failed, running, waiting)

**BullMQ** giải quyết tất cả những vấn đề trên. Nó là một **job queue system** built on Redis, thiết kế cho production workloads.

```
Producer (API)          Queue (Redis)          Worker (Processor)
    │                       │                         │
    │──── add job ─────────►│                         │
    │                       │──── dispatch job ──────►│
    │                       │                         │── process ──►
    │                       │                         │   (retry if fail)
    │                       │◄─── job completed ──────│
```

### BullMQ vs Alternatives

| Tool | Storage | Ưu điểm | Nhược điểm | Dùng khi |
|------|---------|---------|-----------|---------|
| **@nestjs/schedule** | In-memory | Đơn giản, built-in | Không retry, không scale | Simple periodic tasks |
| **BullMQ** | Redis | Robust, TypeScript first, flows | Cần Redis | **Most production use cases** |
| **RabbitMQ** | AMQP broker | Enterprise messaging, routing | Phức tạp hơn | Complex message routing |
| **Kafka** | Distributed log | Throughput cực cao, replay | Overkill cho app nhỏ | Event sourcing, big data |

---

## 3.4 Cài đặt và Cấu hình BullMQ

```bash
npm install @nestjs/bullmq bullmq
```

```typescript
// app.module.ts — Register BullMQ globally
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,            // Thử lại 3 lần nếu fail
        backoff: {
          type: 'exponential',  // Chờ 2s, 4s, 8s...
          delay: 2000,
        },
        removeOnComplete: 100,  // Giữ 100 completed jobs gần nhất
        removeOnFail: 200,      // Giữ 200 failed jobs để debug
      },
    }),
  ],
})
export class AppModule {}
```

### Job Lifecycle trong BullMQ

```
                    ┌─────────────────────────────────────────┐
                    │                Queue                     │
  add() ──────────► │  waiting → active → completed           │
                    │               ↓                         │
                    │          failed (retry?) → failed       │
                    │               ↓                         │
                    │          delayed (backoff)              │
                    └─────────────────────────────────────────┘

States:
- waiting    : Đang chờ worker xử lý
- active     : Đang được worker xử lý
- completed  : Đã xử lý thành công
- failed     : Thất bại sau tất cả lần retry
- delayed    : Đang chờ delay/backoff trước khi retry
- paused     : Queue bị tạm dừng
```

---

## 3.5 Working with Queues

### Tạo Queue và Producer

```typescript
// email.module.ts — Register queue
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',             // Tên queue = Redis key prefix
    }),
    BullModule.registerQueue({
      name: 'image-processing',
    }),
  ],
  providers: [EmailService, EmailProcessor],
})
export class EmailModule {}
```

```typescript
// email.service.ts — Producer: thêm jobs vào queue
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  // Gửi email đơn giản
  async sendWelcomeEmail(userId: number) {
    await this.emailQueue.add('welcome', {
      userId,
      timestamp: Date.now(),
    });
    // Return ngay lập tức — email sẽ được gửi trong background
  }

  // Job với options cụ thể
  async sendOrderConfirmation(orderId: number) {
    await this.emailQueue.add('order-confirmation', { orderId }, {
      priority: 1,              // Priority cao (số nhỏ = ưu tiên cao hơn)
      delay: 5000,              // Delay 5 giây trước khi process
      attempts: 5,              // Override: thử lại 5 lần
      jobId: `order-${orderId}`, // Custom ID để tránh duplicate jobs
    });
  }

  // Bulk jobs — thêm nhiều jobs cùng lúc (hiệu quả hơn)
  async sendMarketingEmails(userIds: number[]) {
    const jobs = userIds.map(userId => ({
      name: 'marketing',
      data: { userId },
    }));
    await this.emailQueue.addBulk(jobs);
  }

  // Lấy thông tin queue
  async getQueueStats() {
    return {
      waiting: await this.emailQueue.getWaitingCount(),
      active: await this.emailQueue.getActiveCount(),
      completed: await this.emailQueue.getCompletedCount(),
      failed: await this.emailQueue.getFailedCount(),
    };
  }
}
```

### Job Processor — Xử lý Jobs

```typescript
// email.processor.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('email', {
  concurrency: 5,  // Xử lý tối đa 5 jobs cùng lúc
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  // process() nhận TẤT CẢ jobs trong queue
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'welcome':
        return this.handleWelcomeEmail(job);
      case 'order-confirmation':
        return this.handleOrderConfirmation(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleWelcomeEmail(job: Job) {
    const { userId } = job.data;

    // Cập nhật progress để tracking
    await job.updateProgress(10);

    const user = await this.userService.findById(userId);
    await job.updateProgress(50);

    await this.mailerService.send({
      to: user.email,
      subject: 'Welcome to our platform!',
      template: 'welcome',
      context: { name: user.name },
    });

    await job.updateProgress(100);
    return { sent: true, to: user.email };
  }

  // Worker lifecycle events
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    const duration = job.processedOn! - job.timestamp;
    this.logger.log(`✓ Job ${job.id} completed in ${duration}ms`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`✗ Job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`→ Job ${job.id} started processing`);
  }
}
```

---

## 3.6 Advanced BullMQ Features

### Delayed Jobs

Đặt lịch job chạy trong tương lai:

```typescript
// Gửi reminder 24 giờ sau khi user đăng ký
async scheduleOnboardingReminder(userId: number) {
  await this.emailQueue.add(
    'onboarding-reminder',
    { userId },
    {
      delay: 24 * 60 * 60 * 1000, // 24 giờ (ms)
      jobId: `onboarding-reminder-${userId}`, // Unique ID
    },
  );
}

// Hủy reminder nếu user đã complete onboarding
async cancelOnboardingReminder(userId: number) {
  await this.emailQueue.remove(`onboarding-reminder-${userId}`);
}
```

### Repeatable Jobs

```typescript
// Tạo repeatable job chạy theo cron schedule
async setupWeeklyReport() {
  await this.reportsQueue.add(
    'weekly-report',
    { reportType: 'sales' },
    {
      repeat: {
        pattern: '0 9 * * 1',       // Mỗi thứ 2, 9:00 AM
        tz: 'Asia/Ho_Chi_Minh',
      },
    },
  );
}

// Repeatable job theo interval
await this.syncQueue.add(
  'sync-rates',
  {},
  { repeat: { every: 30_000 } }, // Mỗi 30 giây
);

// Quản lý repeatable jobs
const jobs = await this.reportsQueue.getRepeatableJobs();
console.log(jobs); // [{ key, name, cron, next }]

// Xóa repeatable job
await this.reportsQueue.removeRepeatableByKey(jobs[0].key);
```

### Job Flows & Dependencies

BullMQ Flows cho phép tạo workflow phức tạp — job cha chỉ complete khi tất cả jobs con hoàn thành:

```typescript
// Ví dụ: Xử lý đơn hàng
// charge + reserve phải xong trước → mới gửi notify
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer({ connection: redisConnection });

await flow.add({
  name: 'notify-customer',        // Job cha — chạy cuối cùng
  queueName: 'notifications',
  data: { orderId },
  children: [
    {
      name: 'charge-payment',     // Con 1 — chạy song song
      queueName: 'payments',
      data: { orderId, amount },
    },
    {
      name: 'reserve-inventory',  // Con 2 — chạy song song
      queueName: 'inventory',
      data: { orderId, items },
    },
  ],
});

// Flow:
// charge-payment ──┐
//                  ├── (cả 2 xong) ──► notify-customer
// reserve-inventory┘
```

### Rate Limiting

```typescript
// Giới hạn tốc độ xử lý jobs — ví dụ: chỉ gửi 100 emails/phút
BullModule.registerQueue({
  name: 'email',
  limiter: {
    max: 100,     // Tối đa 100 jobs
    duration: 60_000, // Trong 60 giây
  },
})
```

---

## 3.7 Error Handling & Retry Logic

### Exponential Backoff — Tại sao lại "chờ lâu hơn" sau mỗi lần fail?

Nếu một service (ví dụ email server) đang quá tải và bạn retry ngay lập tức liên tục, bạn đang **làm nặng hơn** tình trạng đã tệ. Exponential backoff cho server thời gian phục hồi:

```
Retry 1: ngay sau khi fail (0ms)
Retry 2: chờ 2 giây
Retry 3: chờ 4 giây
Retry 4: chờ 8 giây
Retry 5: chờ 16 giây
```

```typescript
// Cấu hình retry trong BullMQ
const jobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000, // Base delay 2s → 2s, 4s, 8s, 16s, 32s
  },
};

// Custom backoff với jitter (tránh thundering herd problem)
// Thundering herd: tất cả jobs cùng retry đúng 1 thời điểm → DDoS chính mình
{
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      const base = Math.pow(2, attemptsMade) * 1000; // 2s, 4s, 8s...
      const jitter = Math.random() * 1000;           // random 0-1s
      return Math.min(base + jitter, 60_000);         // Max 60s
    },
  },
}
```

### Xử lý Failed Jobs

```typescript
// Trong processor: throw error để trigger retry
async process(job: Job) {
  try {
    await this.sendEmail(job.data);
  } catch (error) {
    if (error instanceof TemporaryNetworkError) {
      // Throw để BullMQ retry
      throw error;
    }
    // Lỗi permanent (invalid email) → không nên retry
    // Log và return (không throw) để đánh dấu là "completed with error"
    this.logger.error(`Permanent failure for job ${job.id}:`, error);
    return { success: false, reason: error.message };
  }
}
```

### Dead Letter Queue (DLQ)

Sau khi job thất bại hết số lần retry, BullMQ chuyển nó vào "failed" state. Đây chính là DLQ — nơi lưu các jobs không xử lý được để debug và reprocess thủ công.

```typescript
// Xem failed jobs
const failedJobs = await this.emailQueue.getFailed(0, 49); // 50 jobs đầu

for (const job of failedJobs) {
  console.log({
    id: job.id,
    name: job.name,
    data: job.data,
    failedReason: job.failedReason,  // Error message
    attemptsMade: job.attemptsMade,  // Đã thử bao nhiêu lần
    stacktrace: job.stacktrace,      // Stack trace để debug
  });
}

// Retry thủ công một job cụ thể
await failedJob.retry();

// Retry tất cả failed jobs
await this.emailQueue.retryJobs({ state: 'failed' });

// Di chuyển sang delayed để thử lại sau 1 giờ
await failedJob.moveToDelayed(Date.now() + 3_600_000);
```

---

## 3.8 Queue Events & Monitoring

### Queue Event Listeners

```typescript
// email-queue-events.listener.ts
import { QueueEventsHost, QueueEventsListener, OnQueueEvent } from '@nestjs/bullmq';

@QueueEventsListener('email')
export class EmailQueueEventsListener extends QueueEventsHost {

  @OnQueueEvent('completed')
  onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: string }) {
    this.logger.log(`Email job ${jobId} completed`);
  }

  @OnQueueEvent('failed')
  onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }) {
    this.logger.error(`Email job ${jobId} failed: ${failedReason}`);
    // Gửi alert đến Slack/PagerDuty
    this.alertService.notify(`Job ${jobId} failed: ${failedReason}`);
  }

  @OnQueueEvent('progress')
  onProgress({ jobId, data }: { jobId: string; data: number }) {
    // Cập nhật WebSocket để show progress bar cho user
    this.gateway.sendProgress(jobId, data);
  }

  @OnQueueEvent('stalled')
  onStalled({ jobId }: { jobId: string }) {
    // Job bị "stalled" = worker bị crash khi đang xử lý
    // BullMQ tự động reschedule, nhưng nên log để điều tra
    this.logger.warn(`Job ${jobId} stalled and will be reprocessed`);
  }

  @OnQueueEvent('drained')
  onDrained() {
    // Queue đã xử lý hết tất cả jobs
    this.logger.log('Email queue is now empty');
  }
}
```

### Bull Board — Dashboard giám sát Queue

```bash
npm install @bull-board/api @bull-board/nestjs @bull-board/express
```

```typescript
// app.module.ts
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'email',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'image-processing',
      adapter: BullMQAdapter,
    }),
  ],
})

// Truy cập: http://localhost:3000/admin/queues
// → Xem: waiting, active, completed, failed jobs
// → Retry / delete jobs thủ công
// → Real-time job monitoring với auto-refresh
```

### Graceful Shutdown

```typescript
// main.ts — Đảm bảo complete job hiện tại trước khi stop
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bật shutdown hooks để BullMQ workers complete job đang chạy
  app.enableShutdownHooks();

  await app.listen(3000);
}
```

> 💡 **Production Checklist cho BullMQ**:
> - ✅ Cấu hình Redis với persistence (`appendonly yes`) — không mất jobs khi restart
> - ✅ Set `removeOnComplete` để tránh Redis đầy bộ nhớ
> - ✅ Monitor queue depth — nếu backlog tăng liên tục, cần scale thêm workers
> - ✅ Alert khi có jobs failed — thường là dấu hiệu của external service issue
> - ✅ `app.enableShutdownHooks()` để graceful shutdown
> - ✅ Đặt `jobId` unique cho jobs không được phép chạy duplicate

