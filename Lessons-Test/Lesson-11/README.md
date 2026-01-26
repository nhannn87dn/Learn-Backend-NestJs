# Triển khai và Bảo trì

Dưới đây là hướng dẫn đầy đủ về **Tối ưu hóa và bảo trì ứng dụng NestJS**, bao gồm: quá trình triển khai, giám sát, gỡ lỗi và các thực hành tốt giúp hệ thống ổn định, dễ mở rộng và dễ bảo trì.


## 🛠 1. Tối ưu hóa hiệu năng

### ✅ Sử dụng cấu trúc module rõ ràng
- Chia nhỏ thành các module riêng biệt: `AuthModule`, `UserModule`, `ProductModule`, `MailModule`,…
- Dùng `SharedModule` nếu có các service được sử dụng nhiều nơi.

### ✅ Dùng cache (ví dụ: Redis)
```ts
// main.ts
import { CacheModule } from '@nestjs/cache-manager';
CacheModule.register({
  isGlobal: true,
  store: redisStore,
  url: 'redis://localhost:6379',
});
```

Trong controller/service:
```ts
constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

await this.cacheManager.set('key', value, 60); // TTL 60s
```

### ✅ Pagination và Limit query
```ts
@Get()
findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
  return this.service.paginate({ page, limit });
}
```

### ✅ Logging có kiểm soát (sử dụng `Logger` của NestJS)
```ts
import { Logger } from '@nestjs/common';

private readonly logger = new Logger(MyService.name);
this.logger.log('Something happened');
```

---

## 🚀 2. Quá trình triển khai (Deployment)

### ✅ Biên dịch production
```bash
npm run build
```
- Output sẽ vào thư mục `dist/`

### ✅ Cấu hình biến môi trường `.env.production`
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=...
```

> Trong `main.ts` hoặc `ConfigService` cần đọc đúng `process.env.NODE_ENV` để load biến tương ứng.

---

### ✅ Chạy ứng dụng với Node

```bash
NODE_ENV=production node dist/main
```

Hoặc dùng [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start dist/main.js --name my-app
pm2 startup
pm2 save
```

> PM2 tự khởi động lại app khi server restart + log management

---

### ✅ Docker hóa NestJS (optional)

**Dockerfile:**

```Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

CMD ["node", "dist/main"]
```

**Build & Run:**
```bash
docker build -t nestjs-app .
docker run -p 3000:3000 nestjs-app
```

---

## 📊 3. Giám sát (Monitoring)

### ✅ Logging
- Dùng `Logger` của NestJS hoặc tích hợp thư viện như `Winston`, `Pino` để log ra file hoặc gửi lên dịch vụ như Logtail, Datadog.

```ts
import { WinstonModule } from 'nest-winston';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [new transports.Console(), new transports.File({ filename: 'log.log' })],
    }),
  ],
})
```

---

### ✅ Health Check API
```bash
npm install @nestjs/terminus
```

```ts
// health.controller.ts
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService, private db: TypeOrmHealthIndicator) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.db.pingCheck('database', { timeout: 300 }),
    ]);
  }
}
```

---

### ✅ Metrics & Monitoring Tools
- **Prometheus + Grafana**: Dùng `@willsoto/nestjs-prometheus`
- **Sentry**: Theo dõi lỗi realtime

```bash
npm install @ntegral/nestjs-sentry @sentry/node
```

```ts
SentryModule.forRoot({
  dsn: process.env.SENTRY_DSN,
  debug: true,
});
```

---

## 🧪 4. Gỡ lỗi (Debugging)

### ✅ Dùng `--inspect` để debug trong VSCode
```bash
node --inspect-brk dist/main.js
```

Kết nối với Chrome DevTools hoặc VSCode debug tab.

---

### ✅ Dùng `nestjs-logger`, `console.log`, hoặc `DebuggerService` cho môi trường dev.

---

### ✅ Bắt lỗi toàn cục (Global Exception Filter)

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    response.status(status).json({
      success: false,
      message: exception.message || 'Internal Server Error',
    });
  }
}
```

Kích hoạt trong `main.ts`:
```ts
app.useGlobalFilters(new AllExceptionsFilter());
```

---

## 💡 Tips nâng cao

| Mục tiêu                        | Cách làm ngắn gọn                              |
|-------------------------------|------------------------------------------------|
| Gửi email lỗi tới admin        | Tích hợp Sentry, hoặc gửi bằng MailService     |
| Tự động restart khi lỗi        | Dùng PM2 với cấu hình `restart` và `watch`     |
| Phân chia env rõ ràng          | `.env.development`, `.env.production`          |
| Test API khi deploy            | Dùng Postman/Newman hoặc GitLab CI/CD          |
| Đa môi trường                  | Docker + dotenv hoặc `@nestjs/config`          |

---

## ✅ Tổng kết

| Hạng mục         | Công cụ / Kỹ thuật                                         |
|------------------|-------------------------------------------------------------|
| Tối ưu hiệu năng | Cache, Pagination, Logger, phân module rõ ràng             |
| Triển khai       | Build production, PM2, Docker, Env separation               |
| Giám sát         | Health Check, Prometheus, Winston Logger, Sentry           |
| Gỡ lỗi           | Global Exception Filter, Debugger, VSCode Inspect           |
| Duy trì lâu dài  | Logging + Monitoring + Alerting + Tự động hóa qua CI/CD    |

---

## 📘 Tài liệu hóa API với OpenAPI (Swagger) trong NestJS

Dưới đây là  hướng dẫn đầy đủ về **tài liệu hóa API với OpenAPI (Swagger) trong NestJS** – giúp bạn dễ dàng công bố API cho frontend/dev team, viết docs tự động, và test API trực tiếp trên giao diện đẹp mắt.


### 🧠 Swagger là gì?

- **Swagger / OpenAPI** là tiêu chuẩn mô tả REST API.
- Cho phép tạo giao diện trực quan test API, xuất docs dạng JSON/YAML, hỗ trợ phân quyền, và tự sinh schema từ code TypeScript.
- NestJS hỗ trợ trực tiếp thông qua package `@nestjs/swagger`.

---

### ✅ Bước 1: Cài đặt thư viện Swagger

```bash
npm install --save @nestjs/swagger swagger-ui-express
```

---

### ✅ Bước 2: Tích hợp Swagger vào `main.ts`

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('Tài liệu API cho backend ứng dụng')
    .setVersion('1.0')
    .addBearerAuth() // Nếu dùng JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

> 🔗 Sau khi chạy, truy cập `http://localhost:3000/api-docs` để xem tài liệu.

---

### ✅ Bước 3: Ghi chú endpoint bằng decorators

```ts
// user.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users') // Gộp vào group "Users"
@Controller('users')
export class UserController {
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách user' })
  getUsers() {
    return ['Alice', 'Bob'];
  }
}
```

---

### ✅ Bước 4: Tài liệu hóa DTO

```ts
// dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'alice@example.com' })
  email: string;

  @ApiProperty({ example: 'secret123' })
  password: string;
}
```

Sử dụng trong controller:

```ts
@Post()
@ApiBody({ type: CreateUserDto })
create(@Body() dto: CreateUserDto) {
  return this.userService.create(dto);
}
```

> ✅ NestJS sẽ **tự sinh schema** từ DTO này lên giao diện Swagger.

---

### ✅ Bước 5: Thêm xác thực JWT

```ts
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Get('profile')
getProfile(@Request() req) {
  return req.user;
}
```

---

### 🧪 Swagger UI: test API trực tiếp

- Giao diện Swagger cho phép nhập token, test POST, PUT, GET, DELETE ngay trên trình duyệt.
- Tự điền schema body dựa vào DTO.
- Hiện lỗi trả về rõ ràng (400, 401, 500...)

---

### 📦 Xuất file JSON OpenAPI

Nếu muốn build docs tĩnh:

```ts
import * as fs from 'fs';

const document = SwaggerModule.createDocument(app, config);
fs.writeFileSync('./swagger.json', JSON.stringify(document));
```

Dùng `swagger.json` để xuất file YAML, tích hợp vào Postman, Stoplight, Redoc v.v.

---

### 🎯 Tips nâng cao

| Tính năng                          | Cách làm                                               |
|------------------------------------|--------------------------------------------------------|
| Group API theo module              | Dùng `@ApiTags()`                                      |
| Thêm mô tả request, response       | `@ApiOperation()`, `@ApiResponse()`                   |
| Upload file                        | `@ApiConsumes('multipart/form-data')`                 |
| Tự động sinh docs cho tất cả DTOs | Dùng `@ApiProperty()` trong DTOs                      |
| Phân quyền bằng Bearer Token       | `@ApiBearerAuth()` + cấu hình `.addBearerAuth()`      |

---

### 🧼 Clean code & tự động hoá

- Tạo `swagger.ts` để gom Swagger config:

```ts
// swagger.ts
export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('RESTful API Docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
};
```

Trong `main.ts`:
```ts
setupSwagger(app);
```

---

### 📚 Tổng kết

| Việc cần làm                         | Công cụ                                             |
|-------------------------------------|------------------------------------------------------|
| Tích hợp Swagger                    | `@nestjs/swagger` + `swagger-ui-express`             |
| Viết mô tả endpoint                 | `@ApiOperation()`, `@ApiTags()`, `@ApiResponse()`    |
| Ghi chú DTO                         | `@ApiProperty()`                                     |
| Bảo mật Bearer Token                | `.addBearerAuth()` + `@ApiBearerAuth()`              |
| Giao diện test API                  | `http://localhost:3000/api-docs`                     |
| Xuất file OpenAPI                   | `SwaggerModule.createDocument()`                     |

---
