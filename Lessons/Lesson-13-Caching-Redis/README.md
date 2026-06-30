# Lesson 13: Cache với Redis

> **Mục tiêu buổi học**
>
> * Hiểu **cache là gì** và vì sao backend cần cache
> * Biết khi nào nên dùng cache và khi nào không nên cache
> * Cấu hình được **In-Memory Cache** trong NestJS
> * Sử dụng được `CacheInterceptor` để cache route tự động
> * Áp dụng được **Cache Aside pattern** để cache dữ liệu query database
> * Hiểu **TTL**, manual invalidation và cách thiết kế cache key
> * Cài Redis bằng Docker và dùng Redis làm cache store cho NestJS qua `@keyv/redis`

---

## 1. Cache là gì?

**Cache** là lớp lưu trữ tạm thời dùng để giữ lại kết quả của những thao tác tốn thời gian, ví dụ:

* Query database
* Gọi API bên ngoài
* Tính toán dữ liệu phức tạp
* Đọc file hoặc dữ liệu cấu hình

Khi request sau cần cùng dữ liệu, server có thể đọc từ cache thay vì xử lý lại từ đầu.

```txt
Không có cache:

Client
  -> NestJS API
  -> Database
  -> Response

Mỗi request đều query database.
```

```txt
Có cache:

Request 1:
Client -> NestJS API -> Cache MISS -> Database -> Save Cache -> Response

Request 2:
Client -> NestJS API -> Cache HIT  -> Response
```

### Cache HIT và Cache MISS

| Khái niệm | Ý nghĩa |
| --- | --- |
| Cache HIT | Dữ liệu có trong cache, trả về ngay |
| Cache MISS | Dữ liệu chưa có trong cache, cần lấy từ nguồn gốc |

Ví dụ:

```txt
GET /products/1

Lần 1:
Cache chưa có product:1
-> Cache MISS
-> Query database
-> Lưu product:1 vào cache
-> Trả response

Lần 2:
Cache đã có product:1
-> Cache HIT
-> Trả response ngay
```

---

## 2. Tại sao cần cache?

### 2.1 Tăng tốc độ phản hồi

Đọc dữ liệu từ RAM thường nhanh hơn đọc từ database hoặc gọi qua network.

| Nguồn dữ liệu | Đặc điểm |
| --- | --- |
| In-memory cache | Nhanh, nằm trong RAM của application |
| Redis | Rất nhanh, chạy riêng như một cache server |
| Database | Chậm hơn vì cần query, index, I/O, network |
| External API | Chậm và không ổn định hơn vì phụ thuộc bên ngoài |

Ví dụ:

```txt
Không cache:
GET /products?page=1 -> query DB -> 120ms

Có cache:
GET /products?page=1 -> read cache -> 5ms
```

### 2.2 Giảm tải cho database

Nếu có 1000 request cùng đọc danh sách sản phẩm:

```txt
Không cache:
1000 request -> 1000 database queries

Có cache:
Request đầu tiên -> 1 database query
999 request sau -> đọc cache
```

Database sẽ nhẹ hơn, ít bị nghẽn hơn và phục vụ tốt hơn cho các thao tác quan trọng như create, update, transaction.

### 2.3 Giảm chi phí hệ thống

Khi giảm số lượng query database hoặc external API call, ta có thể:

* Giảm CPU/RAM database
* Giảm chi phí cloud
* Giảm rủi ro timeout
* Tăng khả năng chịu tải của API


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

### 2.4 Khi nào nên cache?

Nên cache:

* Dữ liệu đọc nhiều, ghi ít
* Dữ liệu không cần realtime tuyệt đối
* Dữ liệu tính toán tốn kém
* Danh mục, cấu hình, danh sách sản phẩm, thông tin public

Không nên cache hoặc cần rất cẩn thận:

* Dữ liệu thay đổi liên tục
* Dữ liệu nhạy cảm theo từng user nếu cache key không đủ rõ
* Response phụ thuộc token, quyền truy cập, session
* Dữ liệu transaction cần chính xác tức thì

---

## 3. In-Memory Cache

### 3.1 In-Memory Cache là gì?

**In-Memory Cache** là cache lưu trực tiếp trong RAM của application.

```txt
NestJS App
  ├─ Controller
  ├─ Service
  └─ In-Memory Cache
```

Ưu điểm:

* Dễ cài đặt
* Không cần Redis
* Phù hợp học tập, demo, local development
* Tốc độ nhanh vì nằm ngay trong process của app

Nhược điểm:

* App restart thì cache mất
* Nếu chạy nhiều instance, mỗi instance có cache riêng
* Không phù hợp cho production scale nhiều server

Ví dụ khi chạy 3 instance:

```txt
Instance A có cache product:1
Instance B không có cache product:1
Instance C không có cache product:1
```

Vì vậy production thường dùng Redis để cache được chia sẻ giữa nhiều app instance.

---

## 4. Cài đặt và cấu hình In-Memory Cache với NestJS

### 4.1 Cài đặt package

```bash
npm install @nestjs/cache-manager cache-manager
```

Hoặc nếu dự án dùng pnpm:

```bash
pnpm add @nestjs/cache-manager cache-manager
```

### 4.2 Cấu hình CacheModule

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // TTL mặc định 60 giây
    }),
  ],
})
export class AppModule {}
```

Giải thích:

| Option | Ý nghĩa |
| --- | --- |
| `isGlobal: true` | Dùng cache ở mọi module mà không cần import lại |
| `ttl` | Thời gian sống mặc định của cache, tính bằng milliseconds |

Ví dụ:

```ts
ttl: 60 * 1000; // 60 giây
ttl: 5 * 60 * 1000; // 5 phút
ttl: 0; // Không tự hết hạn
```

### 4.3 Inject CacheManager vào service

Sử dụng cache trong service:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}
}
```

Các method thường dùng:

```ts
await this.cacheManager.get<Product>('product:1');
await this.cacheManager.set('product:1', product, 60 * 1000);
await this.cacheManager.del('product:1');
await this.cacheManager.clear();
```

---

## 5. Sử dụng In-Memory Cache trong NestJS

### 5.1 CacheInterceptor - Cache route tự động

`CacheInterceptor` tự động cache response của route.

Phù hợp với:

* `GET` endpoint
* Dữ liệu public
* Dữ liệu ít thay đổi
* Response không phụ thuộc user hiện tại

Ví dụ:

```ts
// products.controller.ts
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('featured')
  @CacheKey('products:featured')
  @CacheTTL(30 * 1000)
  findFeatured() {
    return this.productsService.findFeatured();
  }
}
```

Giải thích:

| Thành phần | Ý nghĩa |
| --- | --- |
| `@UseInterceptors(CacheInterceptor)` | Bật auto cache cho route hoặc controller |
| `@CacheKey()` | Tự đặt cache key |
| `@CacheTTL()` | Tự đặt TTL cho route |

Lưu ý quan trọng:

* `CacheInterceptor` chỉ nên dùng cho các route đọc dữ liệu
* Không dùng cho route tạo, sửa, xóa dữ liệu
* Không nên dùng cho response phụ thuộc `Authorization` nếu chưa custom cache key
* Không dùng chung key cho dữ liệu khác nhau theo user

---

### 5.2 Manual Caching - Cache Aside

Ngoài cách tự động cache với `CacheInterceptor`, ta có thể chủ động kiểm soát cache trong service, đặc biệt khi cache dữ liệu từ database.

**Cache Aside** là pattern phổ biến nhất khi cache dữ liệu từ database.

Application sẽ tự quyết định:

* Đọc cache khi nào
* Query database khi nào
* Lưu cache khi nào
* Xóa cache khi nào

Luồng đọc dữ liệu:

```txt
1. Tạo cache key
2. Kiểm tra cache
3. Nếu cache HIT -> trả dữ liệu từ cache
4. Nếu cache MISS -> query database
5. Lưu kết quả vào cache
6. Trả dữ liệu
```

Ví dụ:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findOne(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;

    const cachedProduct = await this.cacheManager.get<Product>(cacheKey);

    if (cachedProduct) {
      console.log('Cache HIT:', cacheKey);
      return cachedProduct;
    }

    console.log('Cache MISS:', cacheKey);

    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    await this.cacheManager.set(cacheKey, product, 5 * 60 * 1000);

    return product;
  }
}
```

Ưu điểm của Cache Aside:

* Dễ hiểu
* Dễ kiểm soát
* Chỉ cache dữ liệu thật sự được request
* Phù hợp với hầu hết backend API

Nhược điểm:

* Request đầu tiên luôn chậm vì cache miss
* Cần tự xử lý invalidation khi dữ liệu thay đổi

---

### 5.3 Manual Caching cho danh sách có phân trang

Danh sách có query params cần cache key khác nhau theo từng bộ tham số.

```ts
type FindProductsQuery = {
  page?: number;
  limit?: number;
  keyword?: string;
  categoryId?: string;
};
```

Ví dụ service:

```ts
@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findAll(query: FindProductsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const keyword = query.keyword ?? '';
    const categoryId = query.categoryId ?? 'all';

    const cacheKey = [
      'products:list',
      `page:${page}`,
      `limit:${limit}`,
      `keyword:${keyword}`,
      `category:${categoryId}`,
    ].join(':');

    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.productsRepository.findAll({
      page,
      limit,
      keyword,
      categoryId: query.categoryId,
    });

    await this.cacheManager.set(cacheKey, result, 60 * 1000);

    return result;
  }
}
```

Nếu query khác nhau thì cache key phải khác nhau:

```txt
products:list:page:1:limit:10:keyword::category:all
products:list:page:2:limit:10:keyword::category:all
products:list:page:1:limit:10:keyword:iphone:category:all
products:list:page:1:limit:10:keyword::category:phone
```

---

### 5.4 Invalidation - TTL

Nếu như không có cache invalidation, cache sẽ tồn tại mãi mãi và có thể trả dữ liệu cũ.

Kiểm soát thời gian sống của cache bằng cách đặt **TTL** khi lưu cache.

**TTL** là viết tắt của **Time To Live**, nghĩa là thời gian sống của cache.

Sau khi hết TTL, cache sẽ tự hết hạn.

```ts
await this.cacheManager.set('product:1', product, 5 * 60 * 1000);
```

Ví dụ trên cache sống trong 5 phút.

Gợi ý TTL:

| Loại dữ liệu | TTL gợi ý |
| --- | --- |
| Danh mục ít đổi | 30 phút đến 24 giờ |
| Danh sách sản phẩm | 1 đến 10 phút |
| Chi tiết sản phẩm | 5 đến 30 phút |
| Thông tin user | 1 đến 5 phút |
| Dữ liệu gần realtime | 5 đến 60 giây |

TTL đơn giản nhưng có nhược điểm: dữ liệu có thể bị cũ trong lúc cache chưa hết hạn.

Ví dụ:

```txt
10:00 cache product:1 giá 100k, TTL 5 phút
10:01 admin update giá thành 120k
10:02 user đọc product:1 vẫn thấy 100k nếu chưa invalidate
10:05 cache hết hạn, lần đọc sau mới thấy 120k
```

---

### 5.5 Invalidation - Manual

**Manual invalidation** là chủ động xóa cache khi dữ liệu gốc thay đổi.

Ví dụ update product:

```ts
async update(id: string, dto: UpdateProductDto): Promise<Product> {
  const product = await this.productsRepository.update(id, dto);

  if (!product) {
    throw new NotFoundException(`Product #${id} not found`);
  }

  await this.cacheManager.del(`product:${id}`);

  return product;
}
```

Nếu update một sản phẩm, có thể cần xóa nhiều cache liên quan:

```ts
async update(id: string, dto: UpdateProductDto): Promise<Product> {
  const product = await this.productsRepository.update(id, dto);

  if (!product) {
    throw new NotFoundException(`Product #${id} not found`);
  }

  await Promise.all([
    this.cacheManager.del(`product:${id}`),
    this.cacheManager.del('products:featured'),
  ]);

  return product;
}
```

Với cache danh sách có nhiều page/filter, cách đơn giản cho bài học là xóa các key quan trọng mà mình biết chắc.

```ts
private async invalidateProductCache(id: string): Promise<void> {
  await Promise.all([
    this.cacheManager.del(`product:${id}`),
    this.cacheManager.del('products:featured'),
    this.cacheManager.del('products:list:page:1:limit:10:keyword::category:all'),
  ]);
}
```

Trong production, nếu cần xóa theo prefix như `products:list:*`, ta nên dùng Redis trực tiếp với `SCAN`, không nên dùng `KEYS *` vì có thể làm nghẽn Redis khi dữ liệu lớn.

---

### 5.6 Cache Key Design

Thiết kế cache key tốt giúp:

* Dễ đọc
* Tránh trùng key
* Dễ invalidate
* Dễ debug trên Redis

Quy ước đề xuất:

```txt
resource:identifier
resource:identifier:field
resource:list:param:value:param:value
```

Ví dụ tốt:

```ts
const productDetailKey = `product:${id}`;
const productReviewsKey = `product:${id}:reviews`;
const featuredProductsKey = 'products:featured';
const productListKey = `products:list:page:${page}:limit:${limit}`;
const userProfileKey = `user:${userId}:profile`;
```

Ví dụ nên tránh:

```ts
const key1 = id;
const key2 = 'list';
const key3 = 'data';
const key4 = JSON.stringify(query);
```

Lý do nên tránh:

* `id` dễ trùng giữa product, user, order
* `list` không biết là list gì
* `data` quá chung
* `JSON.stringify(query)` có thể khác thứ tự field và tạo key không ổn định

Helper tạo key từ query:

```ts
function buildCacheKey(prefix: string, params: Record<string, unknown>): string {
  const segments = Object.keys(params)
    .sort()
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map((key) => `${key}:${params[key]}`);

  return [prefix, ...segments].join(':');
}
```

Sử dụng:

```ts
const cacheKey = buildCacheKey('products:list', {
  page: 1,
  limit: 10,
  keyword: 'iphone',
  categoryId: 'phone',
});

// products:list:categoryId:phone:keyword:iphone:limit:10:page:1
```

---

## 6. Cache stores với Redis

### 6.1 Redis là gì?

**Redis** là một in-memory data store, nghĩa là dữ liệu được lưu chủ yếu trong RAM.

Redis thường được dùng làm:

* Cache store
* Session store
* Queue backend
* Pub/Sub message broker
* Rate limit store
* Distributed lock

Trong bài này, ta tập trung vào Redis với vai trò **cache store**.

```txt
Client
  -> NestJS API
  -> Redis Cache
  -> Database
```

Khi dùng Redis thay cho in-memory cache:

```txt
NestJS Instance A ┐
NestJS Instance B ├─> Redis
NestJS Instance C ┘
```

Tất cả instance cùng đọc/ghi vào một cache store chung.

### 6.2 Redis so với In-Memory Cache

| Tiêu chí | In-Memory Cache | Redis |
| --- | --- | --- |
| Vị trí lưu | RAM của app process | Server/process riêng |
| App restart | Mất cache | Có thể vẫn còn tùy cấu hình |
| Nhiều app instance | Không chia sẻ cache | Chia sẻ cache |
| Cài đặt | Rất dễ | Cần chạy Redis |
| Phù hợp | Local, demo, app nhỏ | Production, scale nhiều instance |

---

## 7. Cài đặt Redis bằng Docker

### 7.1 Chạy Redis container

```bash
docker run -d --name redis-local -p 6379:6379 redis:7-alpine
```

Kiểm tra container:

```bash
docker ps
```

Xem log:

```bash
docker logs redis-local
```

### 7.2 Kết nối Redis CLI

```bash
docker exec -it redis-local redis-cli
```

Một số lệnh cơ bản:

```bash
SET name "NestJS"
GET name

SET product:1 '{"id":1,"name":"Keyboard"}' EX 60
GET product:1
TTL product:1

DEL product:1
EXISTS product:1
```

Giải thích:

| Lệnh | Ý nghĩa |
| --- | --- |
| `SET key value` | Lưu dữ liệu |
| `GET key` | Đọc dữ liệu |
| `SET key value EX seconds` | Lưu dữ liệu kèm TTL tính bằng giây |
| `TTL key` | Xem key còn sống bao nhiêu giây |
| `DEL key` | Xóa key |
| `EXISTS key` | Kiểm tra key có tồn tại không |

Lưu ý:

```bash
KEYS *
```

Lệnh này tiện khi học local, nhưng không nên dùng trên production vì Redis phải quét toàn bộ key.

### 7.3 Dùng Docker Compose

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    container_name: redis-local
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

Chạy:

```bash
docker compose up -d
```

Dừng:

```bash
docker compose down
```

---

## 8. Cài đặt và cấu hình Redis với NestJS

### 8.1 Cài đặt packages

```bash
npm install @nestjs/cache-manager cache-manager @keyv/redis
```

Hoặc với pnpm:

```bash
pnpm add @nestjs/cache-manager cache-manager @keyv/redis
```

`@nestjs/cache-manager` dùng để tích hợp cache vào NestJS.

`cache-manager` là thư viện cache bên dưới.

`@keyv/redis` là Redis store adapter.

### 8.2 Cấu hình biến môi trường

```env
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL=300000
```

`CACHE_TTL=300000` nghĩa là 300000 milliseconds, tương đương 5 phút.

### 8.3 Cấu hình CacheModule dùng Redis

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<string>('REDIS_PORT', '6379');
        const cacheTtl = Number(
          configService.get<string>('CACHE_TTL', String(5 * 60 * 1000)),
        );

        return {
          ttl: cacheTtl,
          stores: [
            new KeyvRedis(`redis://${redisHost}:${redisPort}`),
          ],
        };
      },
    }),
  ],
})
export class AppModule {}
```

Sau cấu hình này, những code đang dùng `CACHE_MANAGER` vẫn giữ nguyên. Chỉ khác là dữ liệu cache được lưu vào Redis thay vì memory của app.

### 8.4 Kiểm tra cache có vào Redis không

Ví dụ service:

```ts
@Injectable()
export class ProductsService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async demoCache(): Promise<string> {
    await this.cacheManager.set('demo:message', 'Hello Redis', 60 * 1000);

    const value = await this.cacheManager.get<string>('demo:message');

    return value ?? 'No cache';
  }
}
```

Kiểm tra trong Redis CLI:

```bash
docker exec -it redis-local redis-cli
GET demo:message
TTL demo:message
```

---

## 9. Sử dụng Redis Cache trong NestJS

Khi đã cấu hình Redis làm store, cách dùng cache trong service không đổi.

### 9.1 Cache chi tiết sản phẩm

```ts
@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findOne(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;

    const cached = await this.cacheManager.get<Product>(cacheKey);

    if (cached) {
      return cached;
    }

    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    await this.cacheManager.set(cacheKey, product, 10 * 60 * 1000);

    return product;
  }
}
```

### 9.2 Invalidate khi update hoặc delete

```ts
async update(id: string, dto: UpdateProductDto): Promise<Product> {
  const product = await this.productsRepository.update(id, dto);

  if (!product) {
    throw new NotFoundException(`Product #${id} not found`);
  }

  await this.cacheManager.del(`product:${id}`);

  return product;
}

async remove(id: string): Promise<void> {
  await this.productsRepository.delete(id);

  await this.cacheManager.del(`product:${id}`);
}
```

### 9.3 Cache danh sách sản phẩm

```ts
async findAll(query: FindProductsQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const cacheKey = buildCacheKey('products:list', {
    page,
    limit,
    keyword: query.keyword ?? '',
    categoryId: query.categoryId ?? 'all',
  });

  const cached = await this.cacheManager.get(cacheKey);

  if (cached) {
    return cached;
  }

  const result = await this.productsRepository.findAll({
    page,
    limit,
    keyword: query.keyword,
    categoryId: query.categoryId,
  });

  await this.cacheManager.set(cacheKey, result, 60 * 1000);

  return result;
}
```

Helper:

```ts
function buildCacheKey(prefix: string, params: Record<string, unknown>): string {
  const segments = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`);

  return [prefix, ...segments].join(':');
}
```

### 9.4 Controller test nhanh

```ts
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: FindProductsQuery) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
```

Test luồng:

```txt
GET /products/1
-> Cache MISS
-> Query database
-> Lưu Redis key product:1

GET /products/1
-> Cache HIT
-> Trả dữ liệu từ Redis

PATCH /products/1
-> Update database
-> Delete Redis key product:1

GET /products/1
-> Cache MISS
-> Query database lại
-> Lưu cache mới
```

---

## 10. Tổng kết

Các ý cần nhớ:

* Cache giúp giảm latency, giảm tải database và tăng khả năng chịu tải
* In-memory cache dễ dùng nhưng không phù hợp khi app chạy nhiều instance
* Redis là cache store phổ biến cho production
* `CacheInterceptor` phù hợp với route `GET` đơn giản, dữ liệu public, ít thay đổi
* Manual caching với **Cache Aside** phù hợp khi cần kiểm soát cache query database
* TTL giúp cache tự hết hạn
* Manual invalidation giúp dữ liệu chính xác hơn sau khi create/update/delete
* Cache key cần rõ nghĩa, có namespace và phản ánh đủ params ảnh hưởng đến dữ liệu
* Với NestJS hiện đại, có thể dùng `@keyv/redis` để kết nối Redis làm cache store

