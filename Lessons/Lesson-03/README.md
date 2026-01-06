# 3. Khởi tạo dự án NestJS

## 3.1 Tạo dự án mới với NestJS CLI

Để bắt đầu tạo một dự án NestJS, bạn cần cài đặt NestJS CLI. Thực hiện theo các bước sau:

1. **Cài đặt NestJS CLI**:
   Mở terminal và chạy lệnh sau:

   ```bash
   npm install -g @nestjs/cli
   ```

2. **Tạo dự án mới**:
   Sử dụng CLI để tạo một dự án mới. Chạy lệnh sau và thay `project-name` bằng tên dự án của bạn:

   ```bash
   nest new project-name
   ```

3. **Chọn package manager**:
   Bạn sẽ được hỏi chọn package manager (npm hoặc yarn). Chọn một trong hai tùy thích.

4. **Chạy ứng dụng**:
   Sau khi tạo xong, vào thư mục dự án và chạy ứng dụng:

   ```bash
   cd project-name
   npm run start
   ```

   Mở trình duyệt và truy cập `http://localhost:3000` để xem ứng dụng hoạt động.

## 3.2 Cấu trúc thư mục và file trong dự án NestJS

Khi dự án được tạo, cấu trúc thư mục sẽ giống như sau:

```
project-name
├── src
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── test
├── node_modules
├── package.json
├── tsconfig.json
└── yarn.lock (hoặc package-lock.json)
```

- **src/**: Chứa mã nguồn chính của ứng dụng.
  - **app.controller.ts**: Định nghĩa controller chính.
  - **app.module.ts**: Module gốc của ứng dụng.
  - **app.service.ts**: Service chính để xử lý logic.
  - **main.ts**: Điểm vào của ứng dụng.

## 3.3 **Các lệnh NestJS CLI cơ bản**

NestJS CLI giúp tạo nhanh các thành phần của ứng dụng một cách dễ dàng. Dưới đây là các lệnh cơ bản thường dùng trong NestJS.  

---

### **3.3.1. Cài đặt NestJS CLI**  

Trước khi sử dụng, cần cài đặt NestJS CLI toàn cục:  

```bash
npm install -g @nestjs/cli
```

Kiểm tra phiên bản:  

```bash
nest --version
```

---

### **3.3.2. Tạo dự án NestJS mới**  

```bash
nest new my-nest-app
```

- CLI sẽ hỏi chọn **trình quản lý package** (`npm`, `yarn` hoặc `pnpm`).  
- Tạo một thư mục `my-nest-app` chứa cấu trúc dự án NestJS mặc định.  

Chạy ứng dụng:  

```bash
cd my-nest-app
npm run start
```

---

### **3.3.3. Các lệnh tạo nhanh thành phần trong NestJS**  

| Lệnh CLI                          | Mô tả |
|------------------------------------|-----------------------------------------------------------|
| `nest generate module <name>`     | Tạo một module mới. |
| `nest generate controller <name>` | Tạo một controller mới. |
| `nest generate service <name>`    | Tạo một service mới. |
| `nest generate provider <name>`   | Tạo một provider mới (thường là service, factory, helper). |
| `nest generate middleware <name>` | Tạo một middleware mới. |
| `nest generate filter <name>`     | Tạo một exception filter mới. |
| `nest generate guard <name>`      | Tạo một guard mới. |
| `nest generate interceptor <name>`| Tạo một interceptor mới. |
| `nest generate pipe <name>`       | Tạo một pipe mới. |
| `nest generate gateway <name>`    | Tạo một WebSocket gateway mới. |
| `nest generate decorator <name>`  | Tạo một custom decorator mới. |

Ví dụ:  

```bash
nest generate module users
nest generate controller users
nest generate service users
```

Lệnh trên sẽ tạo các file cần thiết trong thư mục `users/`.  

---

### **3.3.4. Chạy ứng dụng NestJS**  

```bash
npm run start          # Chạy ở chế độ phát triển
npm run start:dev      # Chạy ở chế độ phát triển với reload tự động
npm run start:prod     # Chạy ở chế độ production
npm run start --watch  # Theo dõi thay đổi file và reload tự động
```

---

### **3.3.5. Biên dịch TypeScript và chạy ứng dụng**  

```bash
npm run build   # Biên dịch TypeScript sang JavaScript
node dist/main  # Chạy file sau khi build
```

---

### **3.3.6. Quản lý ứng dụng với CLI**  

```bash
nest info     # Kiểm tra thông tin về môi trường NestJS
nest update   # Cập nhật NestJS lên phiên bản mới nhất
```

🚀 **NestJS CLI giúp bạn tiết kiệm thời gian và tổ chức code tốt hơn!**
  
---

## 3.4 **Khái niệm về Module, Controller, Service và Provider trong NestJS**  

NestJS là một framework mạnh mẽ để xây dựng ứng dụng backend với kiến trúc module hóa rõ ràng. Bốn thành phần quan trọng trong NestJS bao gồm:  

- **Module**: Đóng gói các thành phần liên quan để dễ dàng quản lý.  
- **Controller**: Xử lý các request từ client.  
- **Service**: Xử lý logic nghiệp vụ của ứng dụng.  
- **Provider**: Cung cấp các dịch vụ và chức năng chung cho toàn bộ ứng dụng.  

---

### **1. Module trong NestJS**  

#### **1.1 Khái niệm**  

- Module là cách NestJS tổ chức code thành các khối logic riêng biệt.  
- Mỗi ứng dụng NestJS **luôn có ít nhất một module chính** (`AppModule`).  
- Các **feature modules** giúp chia nhỏ ứng dụng thành các phần độc lập.  

#### **1.2 Tạo một module mới**

Sử dụng Nest CLI:  

```bash
nest generate module users
```

Hoặc tạo thủ công:  

```typescript
import { Module } from '@nestjs/common';

@Module({})
export class UsersModule {}
```

Khi tạo module, cần khai báo các **controllers, providers và exports** nếu muốn module này cung cấp dịch vụ cho các module khác.

---

### **2. Controller trong NestJS**  

#### **2.1 Khái niệm**

- Controller trong NestJS chịu trách nhiệm **xử lý các HTTP request từ client**.  
- Dùng các **HTTP decorators** như `@Get()`, `@Post()`, `@Put()`, `@Delete()`.  

### **2.2 Tạo một controller**

Sử dụng Nest CLI:  

```bash
nest generate controller users
```

Hoặc tạo thủ công:  

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  getAllUsers() {
    return 'Danh sách người dùng';
  }
}
```

- `@Controller('users')`: Định nghĩa route `/users`.  
- `@Get()`: Định nghĩa route GET `/users`.  

---

### **3. Service trong NestJS**  

#### **3.1 Khái niệm**

- **Service** chứa logic nghiệp vụ của ứng dụng.  
- Được dùng trong **Controller** để thực thi các tác vụ như truy vấn database, xử lý dữ liệu,...  

#### **3.2 Tạo một service**

Sử dụng Nest CLI:  

```bash
nest generate service users
```

Hoặc tạo thủ công:  

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getUsers() {
    return ['User 1', 'User 2'];
  }
}
```

- `@Injectable()`: Đánh dấu class này là một **Provider** có thể được Inject vào các thành phần khác.  

---

### **4. Provider trong NestJS**  

#### **4.1 Khái niệm**

- Provider là **các thành phần có thể được Inject** vào các module khác để sử dụng.  
- Bao gồm **Service, Repository, Factory functions, Values, Configurations,...**  
- Các Provider giúp **tái sử dụng code** và **tách biệt logic** trong ứng dụng.  

#### **4.2 Tạo một provider**

Bất kỳ class nào có `@Injectable()` cũng có thể trở thành Provider. Ví dụ:

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  log(message: string) {
    console.log(message);
  }
}
```

Khai báo trong `providers` của module:  

```typescript
import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
```

Inject vào một service khác:  

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class UsersService {
  constructor(private readonly loggerService: LoggerService) {}

  getUsers() {
    this.loggerService.log('Lấy danh sách người dùng');
    return ['User 1', 'User 2'];
  }
}
```

- `@Injectable()` giúp NestJS hiểu rằng class này có thể được Inject.  
- `providers: [LoggerService]` giúp đăng ký Provider vào module.  
- `exports: [LoggerService]` giúp module khác có thể sử dụng Provider này.  

---

Nhờ kiến trúc module hóa và Dependency Injection, NestJS giúp ứng dụng **dễ mở rộng và bảo trì**. 🚀

## 3.5 Cấu hình biến môi trường trong NestJS

Dưới đây là hướng dẫn chi tiết cách **cấu hình biến môi trường trong NestJS** – một bước quan trọng để bảo mật và cấu hình linh hoạt cho ứng dụng.

### 3.5.1. Cài đặt thư viện hỗ trợ `.env`

NestJS sử dụng `@nestjs/config` để hỗ trợ quản lý biến môi trường:

```bash
pnpm install @nestjs/config
```

---

### 3.5.2. Tạo file `.env`

Tạo một file `.env` ở thư mục gốc của dự án:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
```

---

### 3.5.3. Cấu hình `ConfigModule` trong `AppModule`

Mở file `app.module.ts` và thêm cấu hình:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Cấu hình để dùng toàn cục không cần import lại
      envFilePath: '.env', // Đường dẫn tới file .env
    }),
    // Các module khác
  ],
})
export class AppModule {}
```

---

### 3.5.4. Sử dụng biến môi trường trong code

**Cách 1: Dùng `process.env` trực tiếp**

```ts
console.log(process.env.PORT);
```

**Cách 2: Inject `ConfigService` (khuyên dùng)**

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getDatabaseHost(): string {
    return this.configService.get<string>('DB_HOST');
  }
}
```

---

### Cách 3: Xác thực biến môi trường (tùy chọn – tốt cho production)


#### ✅ Cài đặt `zod`

```bash
pnpm install zod
```

#### 🗂 Tạo file cấu hình `src/config/app.config.ts`

```ts
import { z } from 'zod';

export const appConfigSchema = z.object({
  PORT: z.string().transform(Number).default('3000'),
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number).default('3306'),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig = () => {
  const parsed = appConfigSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
};
```

---

#### ⚙ Sử dụng trong `AppModule`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig], // Đưa config đã validate vào hệ thống
    }),
    // Other modules...
  ],
})
export class AppModule {}
```

---

#### 📦 Inject `ConfigService` để lấy biến môi trường đã xác thực

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SomeService {
  constructor(private configService: ConfigService) {}

  getDbUser(): string {
    return this.configService.get<string>('DB_USER');
  }

  getPort(): number {
    return this.configService.get<number>('PORT');
  }
}
```

---

### 🎯 Gợi ý nâng cao

Bạn có thể chia nhỏ các file config (e.g. `db.config.ts`, `jwt.config.ts`) và combine lại nếu cần:

```ts
load: [appConfig, dbConfig, jwtConfig],
```

---

### Cách 4: Xác thực biến môi trường với `class-validator` và `class-transformer`

#### 1. 🧱 Cài đặt các package cần thiết

```bash
pnpm install class-validator class-transformer
```

---

#### 2. 🗂 Tạo class cấu hình: `src/config/env.validation.ts`

```ts

import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, Max, Min, validateSync } from 'class-validator';

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
  Provision = "provision",
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

```

---

#### 3. ⚙ Cấu hình `ConfigModule` trong `AppModule`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv, // Sử dụng class để validate
    }),
  ],
})
export class AppModule {}
```

---

#### 4. ✅ Sử dụng `ConfigService` như bình thường

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getPort(): number {
    return this.configService.get<number>('PORT');
  }
}
```

---

### ✅ Mẹo

- Không commit file `.env` lên Git – hãy thêm `.env` vào `.gitignore`.
- Với các môi trường khác nhau (dev, staging, prod), dùng các file `.env.dev`, `.env.prod`, v.v. rồi cấu hình `envFilePath` tương ứng.
- Có thể load nhiều file `.env` với `envFilePath: ['.env.local', '.env']` – ưu tiên `.env.local`.
- Log ra để biết server chạy trên PORT nào bạn sửa file `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //Lấy thông số PORT đã cấu hình
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('PORT') || 3000;

  await app.listen(PORT);
  //Log ra terminal
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
}
bootstrap();

```
