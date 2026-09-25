# Bonus 08: Tối ưu hiệu suất

> Tiên quyết: Lesson 07 (TypeORM Advanced), Lesson 13 (Redis), Lesson 16 (PM2, Docker). Nên đọc thêm Bonus 04 (Queue) trước mục 7.

## Mục tiêu bài học

Sau bài này, học viên:

- **Giải thích được** sự khác nhau giữa latency và throughput, và vì sao phải nhìn p95/p99 thay vì chỉ nhìn giá trị trung bình.
- **Chạy được** benchmark bằng `autocannon` và `k6`, **đọc được** kết quả và so sánh trước/sau một thay đổi.
- **Cấu hình được** connection pool của TypeORM, và **tính được** tổng số connection khi chạy nhiều instance.
- **Bật được** nén response bằng `compression` (Express) hoặc `@fastify/compress` (Fastify), và **biết** khi nào nên để Nginx làm việc này.
- **Chuyển được** một app từ Express sang Fastify adapter và **liệt kê được** những đoạn code phải sửa.
- **Chạy được** PM2 cluster mode và **nêu được** các hệ quả với cache, rate limit, cron.
- **Viết được** code bất đồng bộ đúng cách với `Promise.all`, và **biết** khi nào đẩy việc nặng sang Queue.
- **Viết được** `TimingInterceptor` đo thời gian xử lý và **cấu hình được** structured logging với `nestjs-pino`.

## Ôn tập nhanh

Ở Lesson 07, chúng ta đã học các kỹ thuật tối ưu ngay tại tầng database: tạo index, đọc `EXPLAIN`, tránh N+1 bằng `relations` hoặc `leftJoinAndSelect`, phân trang bằng `skip/take` hoặc cursor, và cân nhắc eager/lazy loading. Lesson 13 thêm một lớp cache (Cache Aside, TTL, invalidation) với Redis chạy trong Docker để các instance dùng chung. Lesson 16 dùng PM2 giữ app luôn chạy, đóng gói bằng Docker và đặt Nginx làm reverse proxy phía trước. Bài này không dạy lại những thứ đó, mà trả lời câu hỏi: **làm sao biết app chậm ở đâu, và thay đổi nào thực sự giúp app nhanh hơn?**

---

## 1. Vì sao cần tối ưu? Đo trước khi tối ưu

### 1.1 Tối ưu để làm gì

API chậm gây ra ba vấn đề: người dùng chờ lâu và bỏ đi; server phải chạy nhiều máy hơn để chịu cùng lượng tải, tốn tiền; và khi có đợt traffic tăng đột biến (khuyến mãi, tuyển sinh), hệ thống sập. Nhưng tối ưu cũng có giá: code phức tạp hơn, thêm hạ tầng, thêm chỗ để lỗi. Vì vậy ta chỉ tối ưu **khi có số liệu cho thấy cần**, và tối ưu **đúng chỗ đang nghẽn** (bottleneck).

Kinh nghiệm thực tế: phần lớn thời gian của một request CRUD nằm ở database và network, không nằm ở framework. Đổi Express sang Fastify để tiết kiệm 1ms trong khi query mất 200ms vì thiếu index là tối ưu sai chỗ.

### 1.2 Latency, throughput và percentile

- **Latency** (độ trễ): thời gian để **một** request đi từ lúc gửi tới lúc nhận xong response, đơn vị ms.
- **Throughput** (thông lượng): số request server xử lý được **mỗi giây** (req/s).
- **Concurrency**: số request đang được xử lý cùng lúc.

Ba đại lượng liên hệ với nhau gần đúng theo công thức: `concurrency ≈ throughput × latency`. Với 100 kết nối đồng thời và latency trung bình 80ms, throughput tối đa khoảng `100 / 0.08 = 1250 req/s`. Muốn tăng throughput mà không đổi concurrency thì phải giảm latency, hoặc thêm tài nguyên để xử lý song song nhiều hơn.

Tại sao không nhìn giá trị **trung bình**? Giả sử 1000 request, 980 request mất 20ms, 20 request mất 2000ms:

| Chỉ số | Giá trị | Ý nghĩa |
|---|---|---|
| Average | 59.6 ms | Trông ổn, nhưng không request nào thật sự mất 59.6ms |
| p50 (median) | 20 ms | 50% request nhanh hơn mức này |
| p95 | 20 ms | 95% request nhanh hơn mức này |
| p99 | 2000 ms | 1% request chậm nhất phải chờ tới 2 giây |

**Percentile** p95 = 95% request có latency nhỏ hơn hoặc bằng giá trị đó. Phần đuôi (p99) rất quan trọng: một trang dashboard gọi 10 API, xác suất gặp ít nhất một request chậm là `1 - 0.98^10 ≈ 18%`, tức gần 1/5 lượt tải trang bị chậm. Mục tiêu hiệu năng vì thế thường viết dạng **"p95 < 300ms ở 200 req/s"**, không viết "trung bình 50ms".

### 1.3 Quy trình: đo, đổi một thứ, đo lại

```text
┌────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────┐
│ 1. Đặt mục │──▶│ 2. Baseline  │──▶│ 3. Tìm       │──▶│ 4. Đổi MỘT   │──▶│ 5. Đo lại│
│ tiêu (p95) │   │ (đo hiện tại)│   │ bottleneck   │   │ thứ duy nhất │   │ cùng điều│
└────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   │ kiện     │
                        ▲                                                  └────┬─────┘
                        └────────── giữ thay đổi nếu tốt hơn, revert nếu không ◀┘
```

Nếu đổi ba thứ cùng lúc (thêm index, bật cache, đổi adapter), bạn sẽ không biết thứ nào có tác dụng, thứ nào vô ích hay thậm chí làm chậm đi. Để kết quả benchmark có ý nghĩa:

- Chạy bản **production build** (`npm run build && node dist/main`), không chạy `start:dev` (watch mode, source map).
- Tắt query logging của TypeORM (`logging: false`) trong lúc đo, vì log mỗi query cũng tốn thời gian.
- Dữ liệu phải thực tế: bảng 10.000 dòng (dùng seeder ở Lesson 07), không phải 5 dòng.
- **Warm up** một lần trước (lần chạy đầu có JIT, cache còn trống), sau đó chạy 2-3 lần lấy kết quả ổn định.
- Tạm tắt rate limit (`@SkipThrottle()`, Lesson 16), nếu không bạn đang đo tốc độ trả về `429`.
- Nếu có thể, chạy công cụ benchmark ở máy khác, vì công cụ cũng tranh CPU với app.
- Không benchmark hệ thống production khi chưa được phép.

### 1.4 Benchmark nhanh với autocannon

`autocannon` là công cụ HTTP benchmark viết bằng Node.js, chạy qua `npx` không cần cài.

```bash
# Build và chạy app ở chế độ production
npm run build && node dist/main

# Terminal khác: 100 kết nối đồng thời (-c), chạy trong 10 giây (-d)
npx autocannon -c 100 -d 10 http://localhost:3000/books
```

Kết quả (số liệu minh họa):

```text
# Output của autocannon
Running 10s test @ http://localhost:3000/books
100 connections

┌─────────┬───────┬───────┬────────┬────────┬─────────┬─────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5%  │ 99%    │ Avg     │ Stdev   │ Max    │
├─────────┼───────┼───────┼────────┼────────┼─────────┼─────────┼────────┤
│ Latency │ 38 ms │ 71 ms │ 160 ms │ 210 ms │ 76.4 ms │ 30.1 ms │ 480 ms │
└─────────┴───────┴───────┴────────┴────────┴─────────┴─────────┴────────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 1,020  │ 1,020  │ 1,310  │ 1,420  │ 1,295.4 │ 110.2  │ 1,020  │
│ Bytes/Sec │ 2.1 MB │ 2.1 MB │ 2.7 MB │ 2.9 MB │ 2.66 MB │ 226 kB │ 2.1 MB │
└───────────┴────────┴────────┴────────┴────────┴─────────┴────────┴────────┘

13k requests in 10.03s, 26.6 MB read
```

Cách đọc:

- Bảng **Latency**: cột `50%` là median, `97.5%` và `99%` là phần đuôi, `Max` là request chậm nhất. Ở đây p99 = 210ms.
- Bảng **Req/Sec**: throughput theo từng giây; `Avg` ≈ 1295 req/s. Để ý rằng `100 / 0.0764 ≈ 1309`, khớp với công thức ở mục 1.2.
- **Bytes/Sec**: lượng dữ liệu trả về; con số này giảm rõ khi bật compression (mục 4).
- Nếu có dòng `X non 2xx responses`, nghĩa là có request bị lỗi (500, 429...). Kết quả khi đó **không hợp lệ**, cần sửa lỗi trước.

Ghi baseline vào một bảng (endpoint, p50, p99, req/s) để so sánh sau mỗi thay đổi.

### 1.5 Kịch bản tải với k6

`autocannon` phù hợp để "bắn" nhanh một endpoint. Khi cần **kịch bản** (nhiều bước, nhiều endpoint, đặt ngưỡng đạt/không đạt để chạy trong CI), dùng **k6**. k6 là một chương trình riêng (cài qua winget/brew/choco theo hướng dẫn trên trang k6, hoặc chạy bằng Docker), script viết bằng JavaScript.

```javascript
// load-tests/books.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,          // 50 virtual users chạy song song
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<300'], // mục tiêu: p95 dưới 300ms
    http_req_failed: ['rate<0.01'],   // dưới 1% request lỗi
  },
};

export default function () {
  const res = http.get('http://localhost:3000/books?page=1&limit=20');
  check(res, { 'status là 200': (r) => r.status === 200 });
  sleep(1); // mỗi user "nghỉ" 1 giây giữa hai lần gọi, giống người dùng thật
}
```

```bash
# Chạy k6 (đã cài) ở thư mục gốc project
k6 run load-tests/books.js

# Hoặc bằng Docker: trong container, localhost là container, nên đổi URL thành host.docker.internal
docker run --rm -i grafana/k6 run - < load-tests/books.js
```

Phần kết quả quan trọng (định dạng có thể khác chút tùy phiên bản):

```text
# Trích output của k6
  THRESHOLDS
    http_req_duration  ✓ 'p(95)<300'  p(95)=118.4ms
    http_req_failed    ✓ 'rate<0.01'  rate=0.00%

  http_req_duration..: avg=46.2ms min=4.8ms med=39.7ms max=391ms p(90)=87.1ms p(95)=118.4ms
  http_reqs..........: 1452   48.2/s
  checks.............: 100.00% ✓ 1452  ✗ 0
```

Dấu ✓/✗ cạnh threshold cho biết đạt mục tiêu hay không; khi có threshold fail, `k6` trả exit code khác 0, nên có thể đưa vào pipeline CI để chặn merge code làm chậm API.

---

## 2. Ôn nhanh các kỹ thuật đã học

Đây là những kỹ thuật thường mang lại hiệu quả **lớn nhất**, nên kiểm tra chúng **trước** khi nghĩ tới adapter hay cluster. Bảng dưới là checklist để đối chiếu, chi tiết xem lại bài gốc.

| Kỹ thuật | Giải quyết vấn đề gì | Dấu hiệu cần dùng | Xem lại |
|---|---|---|---|
| Index | Query `WHERE`/`ORDER BY` chậm trên bảng lớn | `EXPLAIN` hiện `Seq Scan` trên bảng hàng nghìn dòng | Lesson 07, mục 9.1-9.3 |
| Tránh N+1 | Một request sinh ra 1 + N query | Bật log query thấy cùng một câu `SELECT` lặp lại N lần | Lesson 07, mục 9.4 |
| Pagination | Trả toàn bộ bảng trong một response | Response vài MB, RAM tăng khi gọi list | Lesson 07, mục 4.3 |
| Select đúng cột | Lấy thừa cột (text dài, password) | Bytes/Sec cao dù ít dòng | Lesson 07, mục 9.5 |
| Lazy vs Eager | Eager load relation không cần; lazy gây N+1 ngầm | Query có JOIN thừa, hoặc query phát sinh khi truy cập property | Lesson 07, mục 1.5 |
| Slow query log | Không biết query nào chậm | Cần tìm bottleneck | Lesson 07, mục 9.6 (`maxQueryExecutionTime`) |
| Cache với Redis | Đọc nhiều, ghi ít, query tốn kém | Cùng một dữ liệu được đọc liên tục | Lesson 13 (Cache Aside, TTL, invalidation) |

---

## 3. Connection Pooling với TypeORM

### 3.1 Pool là gì

Mở một connection tới PostgreSQL tốn khá nhiều thời gian: bắt tay TCP, xác thực, PostgreSQL tạo một process mới cho connection đó. Nếu mỗi request mở rồi đóng một connection, phần lớn thời gian sẽ dành cho việc kết nối chứ không phải chạy query.

**Connection pool** là một nhóm connection được mở sẵn và **tái sử dụng**. Khi service cần chạy query, nó "mượn" một connection rảnh trong pool, chạy xong thì "trả lại". TypeORM với driver `pg` đã có pool sẵn (mặc định tối đa 10 connection), bạn chỉ cần hiểu và chỉnh cho phù hợp.

```text
                    NestJS process
 request 1 ──┐   ┌──────────────────────────┐
 request 2 ──┼──▶│  Pool (max = 10)          │        ┌────────────┐
 request 3 ──┤   │  [c1][c2][c3] ... [c10]   │═══════▶│ PostgreSQL │
   ...       │   │  bận  bận  rảnh     rảnh  │        └────────────┘
 request 50 ─┘   │  hàng chờ: request 11..50 │
                 └──────────────────────────┘
```

Khi cả 10 connection đều bận, request thứ 11 phải **xếp hàng chờ**. Lúc này latency tăng dù database không hề chậm, và đây là một bottleneck hay bị bỏ qua.

### 3.2 Cấu hình pool

Các option của pool được truyền qua `extra`, TypeORM chuyển thẳng xuống `pg`.

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // production dùng migration (Lesson 07)
        logging: false,     // tắt khi benchmark
        extra: {
          max: Number(config.get<string>('DB_POOL_MAX', '10')), // số connection tối đa MỖI process
          idleTimeoutMillis: 30_000,     // connection rảnh quá 30s thì đóng bớt
          connectionTimeoutMillis: 5_000, // chờ mượn connection quá 5s thì báo lỗi, không treo mãi
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### 3.3 Pool size × số instance < `max_connections`

PostgreSQL giới hạn tổng số connection bằng `max_connections` (mặc định thường là 100, trong đó vài connection được giữ lại cho superuser). **Mỗi process** NestJS có pool riêng, nên:

```text
Tổng connection = DB_POOL_MAX × số instance (PM2 cluster, container...) + migration, psql, tool quản trị
```

Ví dụ: chạy PM2 cluster 8 instance (mục 6) với `DB_POOL_MAX=20` thì cần tới 160 connection, vượt 100, và app sẽ gặp lỗi `sorry, too many clients already` đúng lúc tải cao. Với 4 instance × 10 = 40 connection thì an toàn.

```sql
-- Chạy trong psql (docker exec -it postgres-db psql -U postgres)
SHOW max_connections;
SELECT count(*) FROM pg_stat_activity WHERE datname = 'books_db'; -- số connection đang mở
```

Pool lớn hơn **không có nghĩa** là nhanh hơn. Mỗi connection là một process của PostgreSQL, tốn RAM; quá nhiều query chạy cùng lúc sẽ tranh CPU và disk, làm mọi query cùng chậm. Hãy bắt đầu với giá trị mặc định, benchmark, rồi tăng dần. Khi số instance lớn (nhiều server, nhiều container), người ta đặt thêm **PgBouncer** ở giữa để gom connection, nhưng đó là chủ đề vận hành nằm ngoài bài này.

---

## 4. Nén response (compression)

### 4.1 Nén để làm gì

Response JSON có nhiều chữ lặp lại (`"title"`, `"author"`...), nên nén gzip/brotli thường giảm kích thước 70-90%. Client (trình duyệt, axios) gửi header `Accept-Encoding: gzip, br`, server nén rồi trả header `Content-Encoding: gzip`, client tự giải nén. Lợi ích lớn nhất là với **response lớn** và **mạng chậm** (mobile 4G). Cái giá là **CPU**: nén response 200 byte thì tốn công mà gần như không lợi gì, nên luôn đặt ngưỡng tối thiểu.

### 4.2 Express: middleware `compression`

```bash
# Ở thư mục gốc project
npm install compression
npm install -D @types/compression
```

```typescript
// src/main.ts (Express)
import { NestFactory } from '@nestjs/core';
import compression from 'compression'; // default import, cần esModuleInterop (có sẵn trong project Nest mới)
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(compression({ threshold: 1024 })); // chỉ nén response lớn hơn 1KB
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Kiểm tra bằng curl, so sánh số byte tải về:

```bash
# Không yêu cầu nén
curl -s -o /dev/null -w "%{size_download}\n" http://localhost:3000/books
# Yêu cầu nén gzip
curl -s -o /dev/null -w "%{size_download}\n" -H "Accept-Encoding: gzip" http://localhost:3000/books
```

### 4.3 Fastify: `@fastify/compress`

Nếu dùng Fastify adapter (mục 5), middleware Express không dùng được, thay bằng plugin:

```typescript
// src/main.ts (Fastify, trích)
import compress from '@fastify/compress';

await app.register(compress, { threshold: 1024 });
```

### 4.4 Thường nên để Nginx nén

Ở Lesson 16, Nginx đứng trước app làm reverse proxy. Nginx nén bằng C, rất nhanh, và giải phóng CPU của Node.js cho logic nghiệp vụ. Vì vậy trong production, **cách phổ biến là bật gzip ở Nginx và không bật compression trong app**. Chỉ bật trong app khi không có reverse proxy (ví dụ chạy thẳng container ra ngoài). Không nên bật ở cả hai nơi.

```nginx
# /etc/nginx/sites-available/nestjs-app (trích, thêm vào block server)
gzip on;
gzip_types application/json text/plain;
gzip_min_length 1024;
```

---

## 5. Dùng Fastify adapter thay cho Express

### 5.1 Vì sao Fastify nhanh hơn

NestJS không tự xử lý HTTP mà chạy trên một **HTTP adapter**; mặc định là Express. Fastify là một framework HTTP khác, được thiết kế cho tốc độ: routing nhanh hơn, serialize JSON nhanh hơn, overhead mỗi request thấp hơn. Trên endpoint "nhẹ" (trả về từ cache, health check), throughput có thể tăng đáng kể. Nhưng với endpoint mất 100ms chờ database, phần framework chỉ chiếm vài phần trăm, nên đổi adapter gần như không thay đổi gì. **Benchmark trước và sau** để biết app của bạn thuộc loại nào.

### 5.2 Chuyển đổi

```bash
# Ở thư mục gốc project
npm install @nestjs/platform-fastify
```

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  // Fastify mặc định chỉ nghe localhost; trong Docker phải nghe '0.0.0.0' thì bên ngoài mới gọi được
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
```

Controller, service, DTO, `ValidationPipe`, guard JWT (Lesson 09), `CacheInterceptor` (Lesson 13) vẫn chạy bình thường, vì chúng làm việc với abstraction của Nest chứ không phụ thuộc Express.

### 5.3 Những gì phải sửa

Code nào **chạm trực tiếp vào Express** thì không chạy nguyên vẹn:

| Đang dùng (Express) | Học ở | Thay bằng (Fastify) |
|---|---|---|
| `helmet` | Lesson 16 | `@fastify/helmet` (đăng ký bằng `app.register`) |
| `compression` | Mục 4 bài này | `@fastify/compress` |
| `cookie-parser`, `csurf` | Lesson 16 | `@fastify/cookie`, `@fastify/csrf-protection` |
| `FileInterceptor` (Multer) | Lesson 14 | `@fastify/multipart`, xử lý file theo cách của Fastify |
| `useStaticAssets` | Lesson 14 | vẫn có, nhưng cần cài `@fastify/static` |
| `@Res() res: Response` + `res.status().json()` | Lesson 04 | `@Res() reply: FastifyReply` + `reply.status().send()` |
| Exception filter gọi `response.status(...).json(...)` | Lesson 08 | `HttpAdapterHost` để không phụ thuộc adapter (bên dưới) |
| Middleware Express bên thứ ba qua `app.use()` | Lesson 16 | tìm plugin Fastify tương đương |

`HttpExceptionFilter` của Lesson 08 dùng `response.status(status).json(...)`, là API của Express. Viết lại bằng `HttpAdapterHost` để filter chạy được với **cả hai** adapter:

```typescript
// src/common/filters/http-exception.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost; // Express hoặc Fastify, Nest tự chọn
    const statusCode = exception.getStatus();
    httpAdapter.reply(
      host.switchToHttp().getResponse(),
      { success: false, statusCode, message: exception.message }, // format Lesson 08
      statusCode,
    );
  }
}

// src/main.ts: app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
```

Lời khuyên: dự án mới cần hiệu năng cao thì chọn Fastify từ đầu; dự án đang chạy ổn với Express thì chỉ chuyển khi benchmark cho thấy framework thật sự là bottleneck.

---

## 6. Chạy nhiều process với PM2 cluster mode

### 6.1 Vì sao cần nhiều process

Node.js chạy JavaScript trên **một thread** (event loop, Lesson 01). Server 4 core chạy `node dist/main` thì chỉ tận dụng khoảng 1 core cho code của bạn. **Cluster mode** chạy N bản sao (worker) của app, PM2 nhận kết nối ở cổng 3000 và chia lần lượt cho các worker.

```text
                           ┌──▶ worker 0  (RAM riêng, pool DB riêng: 10)
 request :3000 ──▶ PM2 ────┼──▶ worker 1  (RAM riêng, pool DB riêng: 10)
                (cân bằng  ├──▶ worker 2  (RAM riêng, pool DB riêng: 10)
                 tải)      └──▶ worker 3  (RAM riêng, pool DB riêng: 10)
                                     │                        │
                                     ▼                        ▼
                          Redis (cache, dùng chung)   PostgreSQL (tổng 40 connection)
```

### 6.2 Chạy cluster

Lesson 16 đã có `ecosystem.config.js` với `instances: 'max'` và `exec_mode: 'cluster'`. Chạy nhanh bằng dòng lệnh:

```bash
# -i max: số worker = số CPU core; có thể ghi số cụ thể, ví dụ -i 4
pm2 start dist/main.js -i max --name books-api

# Reload lần lượt từng worker: không downtime khi deploy bản mới
pm2 reload books-api
```

```javascript
// ecosystem.config.js (trích, bổ sung cho bản ở Lesson 16)
module.exports = {
  apps: [
    {
      name: 'books-api',
      script: 'dist/main.js',
      instances: 4,          // ghi rõ số lượng để tính được tổng connection DB
      exec_mode: 'cluster',
      env_production: { NODE_ENV: 'production', DB_POOL_MAX: 10 }, // 4 × 10 = 40 connection
    },
  ],
};
```

Nếu PostgreSQL và Redis chạy chung máy, đừng dùng hết core cho Node.js. Chạy benchmark với 1, 2, 4 instance để thấy throughput tăng tới đâu thì dừng.

### 6.3 Hệ quả: mỗi worker là một process riêng

Các worker **không chia sẻ bộ nhớ**. Mọi thứ đang lưu trong RAM của app đều bị nhân bản N lần:

| Thứ đang để trong RAM | Vấn đề khi chạy N worker | Cách xử lý |
|---|---|---|
| In-memory cache (`CacheModule` mặc định, Lesson 13) | Mỗi worker một cache, tỉ lệ hit giảm; `del()` chỉ xóa ở một worker nên worker khác trả dữ liệu cũ | Dùng Redis store (`@keyv/redis`, Lesson 13) |
| Rate limit của `@nestjs/throttler` (Lesson 16) | Bộ đếm riêng từng worker, giới hạn thực tế thành `limit × N` | Dùng throttler storage bằng Redis (ví dụ `@nest-lab/throttler-storage-redis`) |
| `@Cron()` của `@nestjs/schedule` (Bonus 04) | Cron chạy **N lần** cùng lúc: gửi N email báo cáo, trừ tiền N lần | Chạy scheduler ở process riêng (`instances: 1`), hoặc chỉ chạy khi `process.env.NODE_APP_INSTANCE === '0'`, hoặc dùng BullMQ repeatable job (Bonus 04) |
| Biến đếm, `Map` lưu session, trạng thái tạm | Mỗi worker thấy một giá trị khác | Lưu vào Redis hoặc database |
| WebSocket (Bonus 05) | Client nối vào worker A không nhận được event phát ở worker B | Redis adapter cho Socket.IO |
| Connection pool DB | Nhân N lần | Tính lại theo mục 3.3 |

> **Docker/Kubernetes**: khi chạy trong container, thông lệ là **một process mỗi container** và scale bằng cách tăng số container (`replicas`), thay vì chạy PM2 cluster bên trong container. Mọi hệ quả ở bảng trên vẫn đúng y nguyên, vì mỗi container cũng là một process riêng.

---

## 7. Xử lý bất đồng bộ trong business logic

### 7.1 `await` tuần tự và `Promise.all`

Mỗi `await` bắt code dừng lại chờ kết quả. Nếu các thao tác **độc lập với nhau** (kết quả cái này không làm đầu vào cho cái kia), chờ lần lượt là lãng phí.

```typescript
// src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Book) private readonly booksRepository: Repository<Book>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  // Tuần tự: tổng thời gian ≈ 40 + 60 + 30 = 130ms
  async getStatsSequential() {
    const totalBooks = await this.booksRepository.count();
    const totalUsers = await this.usersRepository.count();
    const latestBooks = await this.booksRepository.find({ order: { createdAt: 'DESC' }, take: 5 });
    return { totalBooks, totalUsers, latestBooks };
  }

  // Song song: tổng thời gian ≈ max(40, 60, 30) = 60ms
  async getStats() {
    const [totalBooks, totalUsers, latestBooks] = await Promise.all([
      this.booksRepository.count(),
      this.usersRepository.count(),
      this.booksRepository.find({ order: { createdAt: 'DESC' }, take: 5 }),
    ]);
    return { totalBooks, totalUsers, latestBooks }; // TypeScript tự suy ra kiểu từng phần tử
  }
}
```

Những lưu ý khi dùng `Promise.all`:

- **Chỉ dùng khi độc lập**: tạo order rồi mới dùng `order.id` để tạo order items thì bắt buộc tuần tự.
- **Fail fast**: một promise reject thì cả `Promise.all` reject. Nếu chấp nhận thiếu một phần (ví dụ widget phụ lỗi vẫn hiển thị phần còn lại), dùng `Promise.allSettled`.
- **Mỗi query song song mượn một connection** trong pool. 100 request × 3 query song song = 300 lượt mượn trên pool 10 connection. Song song giúp từng request nhanh hơn, nhưng dưới tải cao có thể làm hàng chờ pool dài ra. Benchmark để kiểm chứng.
- **Không `Promise.all` một mảng không giới hạn**: `Promise.all(ids.map((id) => this.repo.findOneBy({ id })))` với 5000 id là 5000 query cùng lúc, và thực chất vẫn là N+1. Dùng một query `In(ids)` (Lesson 07), hoặc chia thành từng lô nhỏ.
- **Trong transaction** (Lesson 07), mọi query đi qua cùng một connection của `QueryRunner`, nên chạy song song không nhanh hơn và dễ gây lỗi. Giữ tuần tự.

### 7.2 Đừng chặn event loop

Code **CPU nặng chạy đồng bộ** (vòng lặp lớn, `bcrypt.hashSync`, `JSON.stringify` object hàng chục MB, xử lý ảnh) làm event loop đứng yên, và **mọi request khác** trên worker đó phải chờ, kể cả health check. Dùng phiên bản async (`bcrypt.hash`), chuyển sang worker thread, hoặc tốt nhất là đẩy sang Queue.

### 7.3 Đẩy tác vụ nặng sang Queue

Có những việc user **không cần chờ** kết quả ngay trong request: gửi email chào mừng (SMTP mất 1-3 giây, Lesson 14), resize ảnh, xuất báo cáo Excel. Làm trong request thì latency tăng vọt, và nếu SMTP lỗi thì cả request đăng ký lỗi theo. Thay vào đó, request chỉ lưu dữ liệu, đẩy một **job** vào queue (BullMQ, Bonus 04) rồi trả về ngay; worker xử lý job sau, có retry khi lỗi.

```typescript
// src/modules/users/users.service.ts (trích)
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectQueue('mail') private readonly mailQueue: Queue, // queue đã đăng ký ở Bonus 04
  ) {}

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.save(this.usersRepository.create(dto));

    // Chỉ tốn vài ms để ghi job vào Redis, không chờ gửi mail
    await this.mailQueue.add(
      'welcome',
      { userId: user.id, email: user.email },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }, // retry khi SMTP lỗi
    );

    return UserResponseDto.fromEntity(user);
  }
}
```

Tránh kiểu "fire-and-forget" bằng cách gọi `this.mailService.send(...)` mà không `await`: lỗi trở thành unhandled rejection không ai bắt, và nếu app restart thì việc đó biến mất. Queue lưu job trong Redis nên không mất.

Với tác vụ rất lâu (xuất báo cáo), trả về `202 Accepted` kèm `jobId`, client gọi một endpoint khác để hỏi trạng thái.

---

## 8. Đo thời gian xử lý bằng Interceptor, structured logging

### 8.1 `TimingInterceptor`

Benchmark cho biết endpoint nào chậm khi thử nghiệm; còn khi app chạy thật, ta cần **ghi lại thời gian xử lý của từng request** để phát hiện handler chậm. Interceptor (Lesson 08) bao quanh handler nên rất hợp để đo: ghi thời điểm bắt đầu, chờ handler xong, tính chênh lệch.

Để gom số liệu theo **route** thay vì theo URL (`/books/1`, `/books/2` là cùng một route), ta dùng tên controller và handler lấy từ `ExecutionContext` (Bonus 01). Cách này chạy được với cả Express và Fastify.

```typescript
// src/common/interceptors/timing.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Timing');
  private readonly slowThresholdMs = 500; // quá ngưỡng thì log mức warn

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = performance.now();
    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string; url: string }>();
    const response = http.getResponse<{ statusCode: number }>();
    const handler = `${context.getClass().name}.${context.getHandler().name}`; // vd: BooksController.findAll

    const record = (statusCode: number): void => {
      const durationMs = Math.round((performance.now() - start) * 10) / 10;
      const entry = { handler, method: request.method, url: request.url, statusCode, durationMs };
      if (durationMs > this.slowThresholdMs) {
        this.logger.warn({ msg: 'slow request', ...entry });
      } else {
        this.logger.log({ msg: 'request timing', ...entry });
      }
    };

    return next.handle().pipe(
      tap({
        next: () => record(response.statusCode), // status đã được Nest gán trước khi handler chạy
        error: (err: unknown) => record(err instanceof HttpException ? err.getStatus() : 500),
      }),
    );
  }
}
```

```typescript
// src/main.ts (trích)
// Interceptor khai báo trước sẽ bọc ngoài, nên TimingInterceptor đo cả phần TransformInterceptor
app.useGlobalInterceptors(new TimingInterceptor(), new TransformInterceptor());
```

Lưu ý phạm vi đo: theo Request Lifecycle (Lesson 16), middleware và guard chạy **trước** interceptor, còn việc serialize và gửi response diễn ra **sau**. Vì vậy con số này là thời gian của pipe + handler + interceptor, chưa phải toàn bộ thời gian request. Thời gian đầy đủ thì lấy từ `pino-http` ở mục dưới (field `responseTime`) hoặc từ access log của Nginx.

### 8.2 Structured logging với `nestjs-pino`

`console.log('Lấy sách mất ' + ms + 'ms')` ổn khi học, nhưng ở production nó bộc lộ nhiều điểm yếu:

- Không có **level** (debug/info/warn/error), không tắt được log debug khi deploy.
- Là chuỗi tự do, công cụ tập trung log (Grafana Loki, ELK, CloudWatch) không lọc được kiểu "mọi request có `durationMs > 500` của `BooksController.findAll`".
- Không có **request id** để nối các dòng log của cùng một request, nhất là khi 4 worker PM2 ghi xen kẽ vào cùng một file.
- Dễ vô tình in ra token, password.
- Trong một số môi trường, ghi ra stdout là thao tác đồng bộ và có thể làm chậm event loop khi log nhiều.

**Structured logging** ghi mỗi dòng log là một object JSON có field cố định. `pino` là logger JSON rất nhanh của Node.js, `nestjs-pino` tích hợp nó vào NestJS và tự log mỗi HTTP request (method, url, statusCode, responseTime, request id).

```bash
# Ở thư mục gốc project
npm install nestjs-pino pino-http
npm install -D pino-pretty   # chỉ để log dễ đọc khi dev
```

```typescript
// src/app.module.ts (trích)
import { LoggerModule } from 'nestjs-pino';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: isProduction ? 'info' : 'debug',
        // Dev: in đẹp, có màu. Production: JSON thuần một dòng mỗi log
        transport: isProduction ? undefined : { target: 'pino-pretty' },
        // Che các field nhạy cảm trước khi ghi log
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    // ...các module khác
  ],
})
export class AppModule {}
```

```typescript
// src/main.ts (trích)
import { Logger } from 'nestjs-pino';

const app = await NestFactory.create(AppModule, { bufferLogs: true }); // giữ log lúc khởi động
app.useLogger(app.get(Logger)); // thay logger mặc định của Nest bằng pino
```

Sau khi thay logger, mọi chỗ đang dùng `new Logger(...)` từ `@nestjs/common` (như `TimingInterceptor` ở trên) **không cần sửa**, log tự đi qua pino. Ở production một dòng log trông như sau:

```text
# stdout (minh họa, một dòng JSON mỗi log)
{"level":30,"time":1758790800000,"pid":4121,"req":{"id":17,"method":"GET","url":"/books?page=1"},"context":"Timing","handler":"BooksController.findAll","statusCode":200,"durationMs":42.7,"msg":"request timing"}
```

Giờ có thể lọc theo `handler`, sắp xếp theo `durationMs`, nối các dòng bằng `req.id`, và biết log đến từ worker nào qua `pid`.

> Nếu chưa muốn thêm thư viện, NestJS v11 có sẵn chế độ JSON cho logger mặc định: `NestFactory.create(AppModule, { logger: new ConsoleLogger({ json: true }) })`. Nó không có request id tự động hay redact như pino, nhưng đã là structured log.

---

## Common mistakes

1. **Tối ưu theo cảm tính, hoặc benchmark sai điều kiện.**
   Tại sao sai: đổi nhiều thứ cùng lúc thì không biết thứ nào có tác dụng; đo trên `start:dev` với query logging bật và bảng 5 dòng thì con số không phản ánh production.
   Cách sửa: build production, dữ liệu thực tế, warm up, lấy baseline, mỗi lần chỉ đổi một thứ rồi đo lại cùng điều kiện.

2. **Chỉ nhìn latency trung bình.**
   Tại sao sai: trung bình che mất phần đuôi; 2% request mất 2 giây vẫn cho ra con số trung bình trông đẹp.
   Cách sửa: đặt mục tiêu và so sánh theo p95/p99 (cột `97.5%`, `99%` của autocannon, `p(95)` của k6).

3. **Tăng pool hoặc số instance mà không tính tổng connection.**
   Tại sao sai: `DB_POOL_MAX=20` × 8 worker = 160 connection, vượt `max_connections` của PostgreSQL, dẫn tới lỗi `too many clients already` đúng lúc tải cao nhất.
   Cách sửa: luôn tính `pool × instance + dự phòng < max_connections`, ghi số instance cụ thể trong ecosystem, kiểm tra bằng `pg_stat_activity`.

4. **Bật PM2 cluster nhưng vẫn giữ state trong RAM.**
   Tại sao sai: in-memory cache trả dữ liệu cũ ở worker chưa bị invalidate, rate limit bị nhân N, cron gửi N email.
   Cách sửa: chuyển cache và throttler storage sang Redis, tách cron ra process riêng hoặc dùng BullMQ repeatable job.

5. **Dùng `Promise.all` sai chỗ.**
   Tại sao sai: song song hóa các bước phụ thuộc nhau gây lỗi logic; `Promise.all` trên mảng hàng nghìn phần tử làm cạn pool, và vẫn là N+1.
   Cách sửa: chỉ song song các thao tác độc lập, với danh sách thì dùng một query `In()` hoặc chia lô, trong transaction thì giữ tuần tự.

---

## Bài tập thực hành trên lớp

**Đề bài:** Dùng project Books API của các bài trước (PostgreSQL + TypeORM, Redis trong Docker).

1. Seed 10.000 cuốn sách bằng seeder (Lesson 07).
2. Đo **baseline** cho `GET /books?page=1&limit=50` và `GET /books/:id` bằng autocannon (`-c 100 -d 10`), ghi p50, p99, req/s, Bytes/Sec vào bảng.
3. Áp dụng **lần lượt từng** thay đổi, đo lại sau mỗi bước: (a) thêm index cho cột dùng để sort/filter, (b) Cache Aside bằng Redis cho `GET /books/:id`, (c) bật `compression`, (d) chạy PM2 cluster 2 instance.
4. Thêm `TimingInterceptor` và chỉ ra handler chậm nhất trong log.

**Gợi ý hướng giải:**

- Kẻ bảng kết quả trước khi bắt đầu: cột là các chỉ số, hàng là "Baseline", "+ Index", "+ Cache"... Mỗi hàng chỉ khác hàng trước đúng một thay đổi.
- Dùng `EXPLAIN` (Lesson 07) để xác nhận index được dùng, trước khi kỳ vọng latency giảm.
- Với cache, chạy benchmark hai lần: lần đầu có cache miss, lần sau mới thấy hiệu quả thật.
- Compression sẽ thấy rõ ở cột Bytes/Sec, latency có thể gần như không đổi khi chạy trên localhost, vì không có mạng chậm. Đây cũng là một kết luận đáng ghi lại.
- Khi chạy PM2 cluster, kiểm tra lại số connection bằng `pg_stat_activity`.

---

## Homework

- [ ] Hoàn thành bảng benchmark của bài tập trên lớp, viết 3-5 câu kết luận: thay đổi nào hiệu quả nhất, thay đổi nào gần như không có tác dụng, vì sao.
- [ ] Viết script k6 cho kịch bản "xem danh sách → xem chi tiết 3 cuốn → tìm kiếm" với threshold `p(95)<300` và `http_req_failed rate<0.01`; chạy và chụp kết quả.
- [ ] Tích hợp `nestjs-pino`: dev dùng `pino-pretty`, production ghi JSON; redact header `authorization`; `TimingInterceptor` log `warn` khi vượt 500ms.
- [ ] Tìm trong project một service có ít nhất 2 `await` độc lập, chuyển sang `Promise.all`, đo trước/sau. Chuyển việc gửi mail khi đăng ký (Lesson 14) sang BullMQ (Bonus 04).
- [ ] Chuyển project sang Fastify adapter: thay `helmet`, `compression` bằng plugin Fastify, viết lại `HttpExceptionFilter` bằng `HttpAdapterHost`, benchmark so sánh với Express trên cùng endpoint có cache.
- [ ] (Nâng cao) Chạy PM2 cluster 4 instance kèm một `@Cron()` in log mỗi phút. Chứng minh cron chạy 4 lần, sau đó sửa sao cho chỉ chạy 1 lần (process riêng hoặc `NODE_APP_INSTANCE`), đồng thời chuyển `@nestjs/throttler` sang Redis storage và kiểm chứng giới hạn không còn bị nhân 4.

---

## Câu hỏi ôn tập

1. Phân biệt latency và throughput. Vì sao mục tiêu hiệu năng nên viết theo p95/p99 thay vì trung bình?
2. Mô tả quy trình "đo trước khi tối ưu". Vì sao mỗi lần chỉ nên thay đổi một thứ?
3. Connection pool giải quyết vấn đề gì? Chạy 6 instance với `max: 15` trên PostgreSQL có `max_connections = 100` thì có vấn đề gì, nên sửa thế nào?
4. Khi chuyển từ Express sang Fastify, những loại code nào phải sửa? Trong trường hợp nào việc chuyển adapter gần như không cải thiện hiệu năng?
5. Khi chạy PM2 cluster mode, in-memory cache và `@Cron()` gặp vấn đề gì, và cách khắc phục là gì?
