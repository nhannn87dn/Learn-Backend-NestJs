# Lesson 12: Cache & Redis trong NestJS

---

## 1. Cache là gì & tại sao cần?

### Cache là gì?

**Cache** là một lớp lưu trữ tạm thời, giữ lại kết quả của các thao tác tốn kém (query database, gọi API bên ngoài, tính toán phức tạp) để lần sau trả về ngay mà không cần thực hiện lại.

```
Không có cache:
Client → Request → Server → Query DB → Trả kết quả (500ms)
Client → Request → Server → Query DB → Trả kết quả (500ms)  ← Lặp lại y chang!

Có cache:
Client → Request → Server → Query DB → Lưu vào Cache → Trả kết quả (500ms)
Client → Request → Server → Đọc Cache → Trả kết quả (5ms)  ← Nhanh hơn 100 lần!
```

### Tại sao cần cache?

**1. Giảm thời gian phản hồi (Latency)**

Đọc từ RAM nhanh hơn đọc từ database hàng trăm lần:

| Nguồn dữ liệu | Thời gian đọc |
|---|---|
| RAM (Redis) | ~0.1ms |
| SSD (Database local) | ~1–10ms |
| HDD | ~10–100ms |
| Network DB call | ~50–500ms |

**2. Giảm tải cho Database**

Khi có 1000 request/giây cùng query một dữ liệu, không có cache thì database nhận 1000 queries. Có cache thì database chỉ nhận 1 query, 999 request còn lại đọc từ cache.

**3. Tiết kiệm chi phí**

Ít query database hơn → database instance nhỏ hơn → chi phí thấp hơn. Quan trọng với các dịch vụ cloud tính phí theo lượng read/write.

### Cache nằm ở đâu trong system design?

```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   NestJS    │
                    │   Server    │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │    Redis    │  │  PostgreSQL  │  │  External   │
   │   (Cache)   │  │  (Database)  │  │     API     │
   └─────────────┘  └─────────────┘  └─────────────┘

Thứ tự ưu tiên đọc dữ liệu:
1. Kiểm tra Redis trước
2. Nếu không có → Query Database
3. Lưu kết quả vào Redis
4. Trả về cho Client
```

---

## 2. Cache Strategies

### Cache Aside (Lazy Loading)

Đây là strategy phổ biến nhất, dễ hiểu và dễ implement. Ứng dụng tự quản lý cache — **chỉ cache khi có người hỏi**.

**Luồng hoạt động:**

```
READ:
1. App kiểm tra cache
2. Cache HIT  → Trả về ngay ✓
   Cache MISS → Query DB → Lưu vào cache → Trả về

WRITE/UPDATE:
1. Update Database
2. Xóa cache (invalidate) → Lần sau đọc sẽ tự cache lại
```

```typescript
// Ví dụ Cache Aside pattern
async getProduct(id: string) {
  const cacheKey = `product:${id}`;

  // Bước 1: Kiểm tra cache
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached); // Cache HIT ✓
  }

  // Bước 2: Cache MISS → Query DB
  const product = await this.productModel.findById(id);

  // Bước 3: Lưu vào cache (TTL 5 phút)
  await this.redis.set(cacheKey, JSON.stringify(product), 'EX', 300);

  return product;
}
```

- **Ưu điểm:** Cache chỉ chứa data thực sự được dùng, không lãng phí bộ nhớ.
- **Nhược điểm:** Request đầu tiên luôn chậm (cache miss).

### Các strategies khác (Ít phổ biến hơn)

| Strategy | Mô tả ngắn | Dùng khi nào |
|---|---|---|
| **Write Through** | Ghi vào cache và DB cùng lúc | Dữ liệu hay đọc, ít ghi |
| **Write Behind** | Ghi vào cache trước, DB sau (async) | Cần write performance cực cao |
| **Refresh Ahead** | Tự động làm mới cache trước khi hết hạn | Dữ liệu quan trọng, không được phép miss |

> Với người mới, **Cache Aside là đủ dùng** cho 90% trường hợp thực tế.

---

## 3. Cache Invalidation

Cache Invalidation là quá trình **xóa hoặc làm mới cache** khi dữ liệu gốc thay đổi. Đây là vấn đề khó nhất của caching:

> *"There are only two hard things in Computer Science: cache invalidation and naming things."* — Phil Karlton

### TTL (Time To Live)

Cache tự động hết hạn sau một khoảng thời gian. Đơn giản nhất, không cần xử lý gì thêm.

```typescript
// Cache hết hạn sau 5 phút
await this.redis.set('key', value, 'EX', 300); // EX = seconds

// Cache hết hạn sau 1 giờ
await this.redis.set('key', value, 'EX', 3600);
```

**Chọn TTL bao nhiêu?**

| Loại dữ liệu | TTL gợi ý |
|---|---|
| Thông tin cấu hình, danh mục | 1–24 giờ |
| Danh sách sản phẩm | 5–30 phút |
| Thông tin user | 5–15 phút |
| Dữ liệu realtime (giá, stock) | 10–60 giây |

### Manual Invalidation

Chủ động xóa cache ngay khi dữ liệu thay đổi — chính xác hơn TTL.

```typescript
// Khi update sản phẩm → xóa cache ngay
async updateProduct(id: string, dto: UpdateProductDto) {
  const product = await this.productModel.findByIdAndUpdate(id, dto, { new: true });

  // Xóa cache của sản phẩm này
  await this.redis.del(`product:${id}`);

  // Xóa cả cache danh sách (vì có thể bị stale)
  await this.redis.del('products:list');

  return product;
}
```

---

## 4. Redis là gì?

### Redis là gì?

**Redis** (Remote Dictionary Server) là một **in-memory database** — lưu dữ liệu trực tiếp trên RAM thay vì đĩa cứng. Đây là lý do Redis cực kỳ nhanh.

Redis không chỉ là cache — nó còn được dùng làm message broker, session store, rate limiter, và nhiều thứ khác. Nhưng trong lesson này ta tập trung vào **cache**.

### Cài Redis bằng Docker

Cách nhanh nhất để chạy Redis local:

```bash
# Chạy Redis container
docker run -d \
  --name redis-local \
  -p 6379:6379 \
  redis:7-alpine

# Kiểm tra Redis đang chạy
docker ps
```

Hoặc dùng `docker-compose.yml` để quản lý cùng với app:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data  # Persist data khi restart

volumes:
  redis_data:
```

```bash
docker-compose up -d
```

### Thử với Redis CLI

```bash
# Kết nối vào Redis container
docker exec -it redis-local redis-cli

# Các lệnh cơ bản
SET name "John"          # Lưu string
GET name                 # Đọc → "John"
SET age 25 EX 60         # Lưu với TTL 60 giây
TTL age                  # Xem còn bao nhiêu giây
DEL name                 # Xóa key
EXISTS name              # Kiểm tra tồn tại (0 hoặc 1)
KEYS *                   # Xem tất cả keys (dùng trong dev, không dùng production!)
FLUSHALL                 # Xóa tất cả (cẩn thận!)
```

Ngoài Redis CLI, có thể dùng **RedisInsight** (GUI miễn phí của Redis) để xem dữ liệu trực quan hơn.

### Data Structures cơ bản

**String** — Kiểu dữ liệu dùng nhiều nhất, dùng để cache JSON:

```bash
SET product:1 '{"id":1,"name":"iPhone","price":999}'
GET product:1
```

**Hash** — Lưu object dạng field-value, tiết kiệm bộ nhớ hơn String khi có nhiều fields:

```bash
HSET user:1 name "John" email "john@example.com" role "admin"
HGET user:1 name          # Lấy 1 field → "John"
HGETALL user:1            # Lấy tất cả fields
HSET user:1 role "user"   # Update 1 field, không ảnh hưởng fields khác
```

> Trong NestJS cache context, **String là đủ dùng** cho hầu hết trường hợp. Hash hữu ích khi cần update từng field riêng lẻ mà không muốn overwrite cả object.

---

## 5. Setup Redis với NestJS

### Cài đặt dependencies

```bash
npm install @nestjs/cache-manager cache-manager ioredis cache-manager-ioredis-yet
```

> **Lưu ý version:** `cache-manager` v5+ có breaking changes so với v4. Serie này dùng **v5** (hiện tại). Nếu thấy tutorial dùng `CacheModule.register()` mà không có `import` thì đó là v4 cũ.

### Cấu hình trong AppModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    CacheModule.registerAsync({
      isGlobal: true, // Dùng được ở tất cả modules mà không cần import lại
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        stores: [
          createKeyv(
            `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`,
          ),
        ],
        ttl: 5 * 60 * 1000, // TTL mặc định: 5 phút (milliseconds trong v5)
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

**File `.env`:**

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Inject Cache vào Service

```typescript
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
}
```

---

## 6. Sử dụng Cache trong NestJS

### 6.1 CacheInterceptor — Cache route tự động

`CacheInterceptor` tự động cache response của một route mà không cần viết thêm logic. Phù hợp cho các **GET endpoint trả về dữ liệu ít thay đổi**.

```typescript
// products.controller.ts
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('products')
@UseInterceptors(CacheInterceptor) // Áp dụng cho toàn controller
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Cache key tự động = URL của request: "products"
  // TTL theo config mặc định (5 phút)
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // Tùy chỉnh cache key và TTL cho từng route
  @Get('featured')
  @CacheKey('products:featured')   // Key tùy chỉnh
  @CacheTTL(60 * 1000)             // TTL riêng: 1 phút (ms)
  getFeatured() {
    return this.productsService.getFeatured();
  }
}
```

**Khi nào dùng CacheInterceptor?**

- Route GET công khai, không phụ thuộc vào user
- Dữ liệu ít thay đổi (danh mục, cấu hình, featured products)
- Không cần kiểm soát chi tiết cache key

**Lưu ý:** CacheInterceptor chỉ cache GET request và chỉ hoạt động tốt với các route không có dynamic user context.

### 6.2 Manual Caching — Cache Database Query

Kiểm soát hoàn toàn khi nào cache, cache gì, và invalidate lúc nào.

```typescript
// products.service.ts
@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findOne(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;

    // Bước 1: Đọc cache
    const cached = await this.cacheManager.get<Product>(cacheKey);
    if (cached) {
      console.log('Cache HIT:', cacheKey);
      return cached;
    }

    // Bước 2: Cache MISS → Query DB
    console.log('Cache MISS:', cacheKey);
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException(`Product #${id} not found`);

    // Bước 3: Lưu vào cache (TTL 10 phút)
    await this.cacheManager.set(cacheKey, product, 10 * 60 * 1000);

    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .exec();

    if (!product) throw new NotFoundException(`Product #${id} not found`);

    // Invalidate cache sau khi update
    await this.cacheManager.del(`product:${id}`);

    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Product #${id} not found`);

    // Invalidate cache sau khi xóa
    await this.cacheManager.del(`product:${id}`);
  }
}
```

### 6.3 Cache Key Design

Đặt tên cache key nhất quán giúp dễ quản lý và tránh conflict.

**Naming convention:** `resource:identifier:variant`

```typescript
// ✅ Tốt — rõ ràng, có namespace
`product:${id}`                    // product:abc123
`products:list:page:1:limit:10`    // products:list:page:1:limit:10
`user:${userId}:profile`           // user:xyz:profile
`category:${slug}:products`        // category:electronics:products

// ❌ Tránh — không rõ nguồn gốc, dễ conflict
`${id}`                            // abc123
`list`                             // list
`data`                             // data
```

**Composite key cho query có filter/pagination:**

```typescript
// Tạo cache key từ query params
private buildCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort() // Sort để cùng params nhưng khác thứ tự vẫn ra cùng key
    .filter(key => params[key] !== undefined)
    .map(key => `${key}:${params[key]}`)
    .join(':');

  return `${prefix}:${sortedParams}`;
}

// Sử dụng
const cacheKey = this.buildCacheKey('products:list', {
  page: 1,
  limit: 10,
  category: 'electronics',
});
// → "products:list:category:electronics:limit:10:page:1"
```

### 6.4 Ví dụ End-to-End: Cache danh sách sản phẩm

Ví dụ hoàn chỉnh từ setup đến cache và invalidate:

```typescript
// products.service.ts
@Injectable()
export class ProductsService {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 phút

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Lấy danh sách có cache
  async findAll(page: number = 1, limit: number = 10) {
    const cacheKey = `products:list:page:${page}:limit:${limit}`;

    // 1. Đọc cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // 2. Query DB
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.productModel.find().skip(skip).limit(limit).exec(),
      this.productModel.countDocuments(),
    ]);

    const result = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // 3. Lưu cache
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  // Tạo sản phẩm mới → xóa cache danh sách
  async create(dto: CreateProductDto): Promise<Product> {
    const product = await this.productModel.create(dto);
    await this.invalidateListCache();
    return product;
  }

  // Update → xóa cache của product đó + danh sách
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();

    if (!product) throw new NotFoundException(`Product #${id} not found`);

    await Promise.all([
      this.cacheManager.del(`product:${id}`),
      this.invalidateListCache(),
    ]);

    return product;
  }

  // Xóa tất cả cache danh sách (vì có nhiều pages)
  private async invalidateListCache(): Promise<void> {
    // Lấy tất cả keys có prefix "products:list"
    const store = this.cacheManager.stores[0]; // ioredis instance
    const keys = await store.keys('products:list:*');
    if (keys.length > 0) {
      await Promise.all(keys.map(key => this.cacheManager.del(key)));
    }
  }
}
```

```typescript
// products.controller.ts
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.productsService.findAll(+page, +limit);
  }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }
}
```

**Kiểm tra kết quả:**

```bash
# Request 1: Cache MISS → chậm (~50ms, query DB)
GET /products?page=1&limit=10

# Request 2: Cache HIT → nhanh (~2ms, đọc Redis)
GET /products?page=1&limit=10

# Sau khi tạo/update sản phẩm → cache bị xóa
POST /products
GET /products?page=1&limit=10  # Cache MISS lại, query DB mới nhất
```

---

## 7. Cache Fallback — Redis down thì sao?

Trong production, Redis có thể bị down tạm thời. Nếu không xử lý, toàn bộ app sẽ crash theo. Giải pháp: **try/catch và fallback về DB**.

```typescript
// utils/cache.helper.ts
import { Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

export async function getOrSetCache<T>(
  cacheManager: Cache,
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>,
  logger?: Logger,
): Promise<T> {
  // Bước 1: Thử đọc cache
  try {
    const cached = await cacheManager.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }
  } catch (error) {
    // Redis lỗi → log cảnh báo, không crash app
    logger?.warn(`Cache GET failed for key "${key}": ${error.message}`);
  }

  // Bước 2: Fallback — gọi hàm lấy dữ liệu gốc (DB, API...)
  const data = await fetchFn();

  // Bước 3: Thử lưu cache (nếu Redis vẫn lỗi thì bỏ qua)
  try {
    await cacheManager.set(key, data, ttl);
  } catch (error) {
    logger?.warn(`Cache SET failed for key "${key}": ${error.message}`);
  }

  return data;
}
```

Sử dụng helper trong service:

```typescript
// products.service.ts
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  async findOne(id: string): Promise<Product> {
    return getOrSetCache(
      this.cacheManager,
      `product:${id}`,
      10 * 60 * 1000,
      async () => {
        const product = await this.productModel.findById(id).exec();
        if (!product) throw new NotFoundException(`Product #${id} not found`);
        return product;
      },
      this.logger,
    );
  }
}
```

**Kết quả:** Redis down → app vẫn chạy bình thường, chỉ chậm hơn (query thẳng DB). Redis phục hồi → tự động cache lại.

---

## 8. Bonus: Cache Penetration & Cache Breakdown

### 8.1 Cache Penetration

Khi có nhiều request truy vấn dữ liệu không tồn tại → cache miss liên tục → tải nặng cho DB. Giải pháp: Cache cả kết quả "null" với TTL ngắn.

```typescript
const data = await this.productModel.findById(id).exec();
if (!data) {
  // Cache giá trị null để tránh cache penetration
  await this.cacheManager.set(cacheKey, null, 60 * 1000); // TTL ngắn: 1 phút
  throw new NotFoundException(`Product #${id} not found`);
}
```

### 8.2 Cache Breakdown (Thundering Herd)

Khi cache hết hạn → nhiều request cùng lúc truy vấn DB → quá tải. Giải pháp: Sử dụng **mutex lock** để chỉ cho phép 1 request query DB, các request khác chờ hoặc trả về stale cache.

```typescript
async getProduct(id: string) {
  const cacheKey = `product:${id}`;
  const lockKey = `lock:${cacheKey}`;

  // Thử đọc cache
  const cached = await this.cacheManager.get<Product>(cacheKey);
  if (cached) return cached;

  // Thử lấy lock
  const gotLock = await this.cacheManager.set(lockKey, 'locked', 'NX', 'EX', 30);
  if (!gotLock) {
    // Không lấy được lock → có request khác đang query DB → chờ hoặc trả về stale cache
    await new Promise(resolve => setTimeout(resolve, 100)); // Chờ 100ms
    return this.getProduct(id); // Thử lại (có thể trả về stale cache nếu vẫn chưa xong)
  }

  try {
    // Cache MISS → Query DB
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException(`Product #${id} not found`);

    // Lưu vào cache
    await this.cacheManager.set(cacheKey, product, 10 * 60 * 1000);
    return product;
  } finally {
    // Giải phóng lock
    await this.cacheManager.del(lockKey);
  }
}
```

### 8.3 Redis Lock

Để tránh cache breakdown, có thể dùng Redis lock để đảm bảo chỉ 1 request được phép query DB khi cache miss. Các request khác sẽ chờ hoặc trả về stale cache.

```typescript
const lockKey = `lock:${cacheKey}`;
const gotLock = await this.cacheManager.set(lockKey, 'locked', 'NX', 'EX', 30);
if (!gotLock) {
  // Không lấy được lock → có request khác đang query DB → chờ hoặc trả về stale cache
  await new Promise(resolve => setTimeout(resolve, 100)); // Chờ 100ms
  return this.getProduct(id); // Thử lại (có thể trả về stale cache nếu vẫn chưa xong)
}
```

helper for redis lock:

```typescript
// utils/redis-lock.helper.ts
import { Cache } from 'cache-manager';

// Đặt lock với TTL, trả về true nếu lấy được lock, false nếu đã có lock
async function acquireLock(cacheManager: Cache, lockKey: string, ttl: number): Promise<boolean> {
  return await cacheManager.set(lockKey, 'locked', 'NX', 'EX', ttl);
}

// Giải phóng lock
async function releaseLock(cacheManager: Cache, lockKey: string): Promise<void> {
  await cacheManager.del(lockKey);
}
```

Cách sử dụng

```typescript
const lockKey = `lock:${cacheKey}`;
const gotLock = await acquireLock(this.cacheManager, lockKey, 30);
if (!gotLock) {
  // Không lấy được lock → có request khác đang query DB → chờ hoặc trả về stale cache
  await new Promise(resolve => setTimeout(resolve, 100)); // Chờ 100ms
  return this.getProduct(id); // Thử lại (có thể trả về stale cache nếu vẫn chưa xong)
}
try {
  // Cache MISS → Query DB
  const product = await this.productModel.findById(id).exec();
  if (!product) throw new NotFoundException(`Product #${id} not found`);

  // Lưu vào cache
  await this.cacheManager.set(cacheKey, product, 10 * 60 * 1000);
  return product;
} finally {
  // Giải phóng lock
  await releaseLock(this.cacheManager, lockKey);
}
```


