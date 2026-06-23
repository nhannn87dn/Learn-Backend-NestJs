# Lesson 16: Deployment & Security


## 1. Build Project

### 1.1 Lí do vì sao cần build project?

NestJS được viết bằng **TypeScript**, nhưng Node.js chỉ hiểu **JavaScript**. Vì vậy, trước khi deploy lên môi trường production, ta cần compile TypeScript sang JavaScript.

Ngoài ra, build project còn mang lại các lợi ích:

- **Hiệu suất cao hơn**: File JS đã được compile chạy nhanh hơn so với dùng `ts-node` ở runtime.
- **Bảo mật source code**: File build không chứa TypeScript type annotations, khó đọc hơn.
- **Giảm dependency**: Server production không cần cài `devDependencies` như `typescript`, `ts-node`.
- **Phát hiện lỗi sớm**: Quá trình build sẽ báo lỗi TypeScript trước khi deploy.
- **Tối ưu kích thước**: Chỉ ship những file cần thiết lên server.

### 1.2 Cách build project NestJS

#### Build lệnh cơ bản

```bash
# Build project (output vào thư mục dist/)
npm run build

# Tương đương với
npx nest build
```

Sau khi build, thư mục `dist/` sẽ chứa toàn bộ file JavaScript đã được compile:

```
dist/
├── main.js
├── app.module.js
├── users/
│   ├── users.controller.js
│   ├── users.service.js
│   └── ...
└── ...
```

#### Chạy project sau khi build

```bash
# Chạy file đã build (không cần TypeScript)
node dist/main.js

# Hoặc dùng script có sẵn trong package.json
npm run start:prod
```

#### Cấu hình build trong `nest-cli.json`

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["**/*.json"],
    "watchAssets": true
  }
}
```

#### Scripts trong `package.json`

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main"
  }
}
```

---

## 2. API Security

### 2.1 CORS (Cross-Origin Resource Sharing)

CORS là cơ chế bảo mật của trình duyệt, ngăn chặn các request từ domain khác truy cập vào API của bạn nếu chưa được cho phép.

#### Bật CORS cơ bản

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cho phép tất cả origin (không nên dùng ở production)
  app.enableCors();

  await app.listen(3000);
}
```

#### Cấu hình CORS chi tiết

```typescript
app.enableCors({
  origin: ['https://myapp.com', 'https://admin.myapp.com'], // Whitelist domain
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,  // Cho phép gửi cookie/token
  maxAge: 3600,       // Cache preflight request trong 1 giờ
});
```

#### CORS động (kiểm tra theo điều kiện)

```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = ['https://myapp.com', 'https://admin.myapp.com'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
});
```

---

### 2.2 Helmet

**Helmet** bảo vệ ứng dụng bằng cách tự động thiết lập các HTTP security headers, ngăn chặn các lỗ hổng phổ biến như XSS, clickjacking, MIME sniffing.

#### Cài đặt

```bash
npm install helmet
```

#### Sử dụng

```typescript
// main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  await app.listen(3000);
}
```

#### Tùy chỉnh Helmet

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Tắt nếu dùng Swagger UI
    frameguard: { action: 'deny' },   // Chặn clickjacking
  }),
);
```

Các header Helmet thiết lập mặc định:

| Header | Mục đích |
|---|---|
| `X-DNS-Prefetch-Control` | Kiểm soát DNS prefetching |
| `X-Frame-Options` | Chống clickjacking |
| `X-Content-Type-Options` | Chống MIME sniffing |
| `Strict-Transport-Security` | Bắt buộc dùng HTTPS |
| `X-XSS-Protection` | Bật filter XSS trên trình duyệt cũ |

---

### 2.3 Rate Limiting

**Rate Limiting** giới hạn số lượng request trong một khoảng thời gian, bảo vệ API khỏi DDoS, brute-force và lạm dụng.

#### Cài đặt

```bash
npm install @nestjs/throttler
```

#### Cấu hình toàn cục

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 giây
        limit: 5,    // Tối đa 5 request/giây
      },
      {
        name: 'long',
        ttl: 60000,  // 1 phút
        limit: 100,  // Tối đa 100 request/phút
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

#### Tùy chỉnh theo từng route

```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {

  // Giới hạn nghiêm ngặt hơn cho đăng nhập
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  login() { ... }

  // Bỏ qua rate limit cho health check
  @SkipThrottle()
  @Get('status')
  status() { ... }
}
```

Khi bị giới hạn, server trả về HTTP `429 Too Many Requests` kèm header:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
Retry-After: 60
```

---

### 2.4 CSRF (Cross-Site Request Forgery)

**CSRF** là kiểu tấn công khiến người dùng đã đăng nhập vô tình gửi request độc hại đến server.

> **Lưu ý**: CSRF chủ yếu ảnh hưởng đến ứng dụng dùng **cookie-based session**. Nếu API dùng **JWT trong Authorization header**, rủi ro CSRF thấp hơn đáng kể.

#### Cài đặt

```bash
npm install csurf cookie-parser
npm install @types/csurf @types/cookie-parser --save-dev
```

#### Cấu hình

```typescript
// main.ts
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.use(csurf({ cookie: true }));

  await app.listen(3000);
}
```

#### Lấy CSRF token ở client

```typescript
@Get('csrf-token')
getCsrfToken(@Req() req) {
  return { csrfToken: req.csrfToken() };
}
```

Client cần gửi token này trong header `X-CSRF-Token` với mỗi request POST/PUT/DELETE.

---

### 2.5 API Key Authentication

**API Key** là cách xác thực đơn giản, thường dùng cho server-to-server communication hoặc public API có kiểm soát truy cập.

#### Tạo API Key Guard

```typescript
// api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    if (apiKey !== process.env.API_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
```

#### Sử dụng Guard

```typescript
// Áp dụng toàn cục
app.useGlobalGuards(new ApiKeyGuard());

// Hoặc áp dụng cho từng controller
@UseGuards(ApiKeyGuard)
@Controller('webhook')
export class WebhookController { ... }
```

#### Quản lý nhiều API key từ database

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) throw new UnauthorizedException('API key is missing');

    const keyRecord = await this.apiKeyService.findByKey(apiKey);
    if (!keyRecord || !keyRecord.isActive) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    request.apiClient = keyRecord.client;
    return true;
  }
}
```

---

## 3. Health Check API

**Health Check** là endpoint cho phép monitoring tools hoặc load balancer kiểm tra trạng thái hoạt động của ứng dụng.

#### Cài đặt

```bash
npm install @nestjs/terminus
```

#### Cấu hình module

```typescript
// health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

#### Tạo Health Controller

```typescript
// health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Kiểm tra kết nối database
      () => this.db.pingCheck('database'),

      // Kiểm tra RAM heap (tối đa 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Kiểm tra dung lượng ổ đĩa (tối đa dùng 90%)
      () => this.disk.checkStorage('storage', {
        thresholdPercent: 0.9,
        path: '/',
      }),

      // Kiểm tra external service
      () => this.http.pingCheck('payment-service', 'https://payment.example.com/health'),
    ]);
  }
}
```

#### Response khi healthy (HTTP 200)

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "storage": { "status": "up" }
  },
  "error": {},
  "details": { ... }
}
```

Khi có lỗi, server trả về HTTP `503 Service Unavailable`.

---

## 4. Deploy với PM2

**PM2** là process manager cho Node.js, giúp giữ ứng dụng luôn chạy, tự động restart khi crash và quản lý logs hiệu quả.

#### Cài đặt PM2

```bash
npm install -g pm2
```

#### Khởi động ứng dụng

```bash
# Build trước
npm run build

# Khởi động với PM2
pm2 start dist/main.js --name "nestjs-app"
```

#### File cấu hình `ecosystem.config.js` (khuyến nghị)

```javascript
module.exports = {
  apps: [
    {
      name: 'nestjs-app',
      script: 'dist/main.js',
      instances: 'max',            // Số instance = số CPU core
      exec_mode: 'cluster',        // Cluster mode tận dụng đa nhân
      watch: false,
      max_memory_restart: '500M',  // Tự restart nếu dùng quá 500MB RAM
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
```

#### Khởi động và các lệnh thường dùng

```bash
# Khởi động với môi trường production
pm2 start ecosystem.config.js --env production

pm2 list                  # Xem danh sách process
pm2 logs nestjs-app       # Xem logs realtime
pm2 monit                 # Giao diện monitoring
pm2 restart nestjs-app    # Restart app
pm2 stop nestjs-app       # Dừng app
pm2 delete nestjs-app     # Xóa khỏi PM2

# Tự khởi động PM2 khi server reboot
pm2 startup
pm2 save
```

---

## 5. Dockerize NestJS

**Docker** đóng gói ứng dụng cùng toàn bộ dependencies vào một container, đảm bảo môi trường nhất quán từ dev đến production.

### Tạo `Dockerfile`

```dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

WORKDIR /app

# Chỉ cài production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy file đã build từ stage 1
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
```

> **Multi-stage build** giúp image production nhỏ gọn hơn vì không chứa source TypeScript và devDependencies.

### Tạo `.dockerignore`

```
node_modules
dist
.git
.env
*.log
coverage
```

### Tạo `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: nestjs-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    container_name: postgres-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped

volumes:
  postgres_data:
```

### Các lệnh Docker thường dùng

```bash
# Build image
docker build -t nestjs-app .

# Chạy container đơn lẻ
docker run -p 3000:3000 --env-file .env nestjs-app

# Dùng docker-compose
docker-compose up -d           # Khởi động tất cả services (nền)
docker-compose down            # Dừng và xóa containers
docker-compose logs -f app     # Xem logs realtime
docker-compose ps              # Xem trạng thái
docker-compose exec app sh     # Truy cập vào container
```

---

## 6. Deploy lên VPS / Cloud

### 6.1 Deploy lên VPS (Ubuntu) với PM2 + Nginx

#### Bước 1: Chuẩn bị server

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài Node.js qua NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20

# Cài PM2 và Nginx
npm install -g pm2
sudo apt install nginx -y
```

#### Bước 2: Deploy code

```bash
git clone https://github.com/your-org/your-app.git
cd your-app

npm ci --only=production
npm run build

cp .env.example .env
nano .env  # Điền biến môi trường thực tế
```

#### Bước 3: Khởi động với PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### Bước 4: Cấu hình Nginx làm reverse proxy

```nginx
# /etc/nginx/sites-available/nestjs-app
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nestjs-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Bước 5: Cài SSL với Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### 6.2 Deploy lên VPS dùng Docker Compose

```bash
# Cài Docker trên server
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone và deploy
git clone https://github.com/your-org/your-app.git
cd your-app
cp .env.example .env

docker-compose up -d
```

---

### 6.3 CI/CD tự động với GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/deploy/your-app
            git pull origin main
            docker-compose down
            docker-compose up -d --build
            docker image prune -f
```

---

### 6.4 Quản lý biến môi trường

Không bao giờ commit file `.env` lên Git. Luôn dùng `.env.example` làm template:

```bash
# .env.example (commit lên Git, không có giá trị thật)
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
API_KEY=your-api-key
REDIS_URL=redis://localhost:6379
```

Trên các nền tảng cloud, sử dụng secret manager của từng provider:

| Provider | Secret Manager |
|---|---|
| AWS | AWS Secrets Manager / Parameter Store |
| GCP | Google Secret Manager |
| Azure | Azure Key Vault |
| DigitalOcean | App Platform Environment Variables |

