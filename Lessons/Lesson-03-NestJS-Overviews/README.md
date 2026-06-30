# Lesson 03 – Tìm hiểu về NestJS 

> **Mục tiêu buổi học**
>
> * Hiểu **NestJS là gì và vì sao nên dùng**
> * Nắm được **kiến trúc cốt lõi của NestJS**
> * Tự **cài đặt môi trường và tạo project NestJS đầu tiên**
> * Hiểu rõ **cấu trúc project NestJS**
> * Biết cách **quản lý biến môi trường (Config & Environment)** đúng chuẩn backend
> * Biết cách **chuẩn định dạng hóa mã nguồn** với Prettier & ESLint hoặc Biome
---

## 1. NestJS là gì?

### 1.1 NestJS giải quyết vấn đề gì?

Trước khi có NestJS, đa số backend Node.js được xây dựng bằng **Express** hoặc **Fastify**.

Vấn đề thường gặp:

* Code **khó mở rộng** khi dự án lớn
* Logic bị trộn lẫn (route – business – database)
* Không có chuẩn kiến trúc rõ ràng
* Khó test, khó bảo trì

👉 **NestJS ra đời để giải quyết các vấn đề**:

* NestJS giúp quản lý các ứng dụng quy mô lớn vốn thường gặp khó khăn nếu thiếu cấu trúc mã nguồn chặt chẽ. 
* Nó giải quyết sự thiếu nhất quán trong các dự án bằng cách áp dụng các mẫu thiết kế như SOLID và Dependency Injection. Framework này giúp tránh tình trạng "tê liệt quyết định" (decision paralysis) bằng cách cung cấp một kiến trúc mô-đun chuẩn hóa ngay từ đầu. 
* Nhờ cấu trúc này, tính toàn vẹn của kiến trúc được duy trì theo thời gian, giúp các nhà phát triển mới dễ dàng hiểu mã nguồn nhanh chóng. Ngoài ra, nó tạo ra môi trường phát triển nhất quán, dễ kiểm thử và bảo trì cho các ứng dụng backend phức tạp.

---

### 1.2 NestJS là gì?

NestJS là một framework mã nguồn mở tiến bộ dành cho Node.js, được thiết kế để xây dựng các ứng dụng phía máy chủ (server-side) hiệu quả, đáng tin cậy và có khả năng mở rộng cao. Framework này được viết bằng TypeScript nhưng vẫn hỗ trợ hoàn toàn JavaScript thuần túy, cho phép lập trình viên tận dụng các tính năng mới nhất của ECMAScript và hệ thống kiểu mạnh mẽ.

Dưới đây là những đặc điểm cốt lõi định nghĩa NestJS:

* **Nền tảng và Công nghệ**: NestJS kết hợp các yếu tố của Lập trình hướng đối tượng (OOP), Lập trình chức năng (FP) và Lập trình phản ứng chức năng (FRP). Nó hoạt động như một lớp bao bọc (wrapper) phía trên các thư viện HTTP server mạnh mẽ như Express (mặc định) hoặc Fastify để cung cấp một kiến trúc chuẩn hóa.

* **Kiến trúc lấy cảm hứng từ Angular**: Người sáng lập NestJS đã mượn các mẫu thiết kế từ Angular để mang lên backend, bao gồm việc sử dụng các mô-đun, dịch vụ (services), và hệ thống Dependency Injection (DI) mạnh mẽ. Điều này tạo ra một môi trường phát triển quen thuộc cho các lập trình viên đã biết Angular

NestJS sử dụng:

* **TypeScript**
* **Express** (mặc định) hoặc **Fastify**

NestJS cung cấp:

* Kiến trúc rõ ràng
* Dependency Injection (DI)
* Decorator mạnh mẽ
* Dễ test, dễ mở rộng

👉 NestJS **không thay thế Express**, mà **xây dựng phía trên Express**.

---

### 1.3 So sánh NestJS vs Express

| Tiêu chí             | Express        | NestJS    |
| -------------------- | -------------- | --------- |
| Kiến trúc            | Tự do          | Chuẩn hóa |
| TypeScript           | Không bắt buộc | Bắt buộc  |
| Dependency Injection | Không          | Có        |
| Quy mô dự án         | Nhỏ – vừa      | Vừa – lớn |
| Dễ bảo trì           | Khó dần        | Dễ        |

👉 **Express phù hợp học nhanh**, NestJS **phù hợp làm dự án thật**.

---

### 1.4 Kiến trúc MVC + Dependency Injection

NestJS kết hợp:

* **MVC (Controller – Service)**
* **Dependency Injection (DI)**

Ví dụ luồng request:

```
Client → Controller → Service → Database
```

Ba trụ cột chính:

1. **Modules**: Là các đơn vị tổ chức cơ bản, đóng vai trò ranh giới logic để nhóm các thành phần liên quan như controller và provider.
2. **Controllers**: Chịu trách nhiệm tiếp nhận các yêu cầu HTTP đến, xử lý đầu vào và gửi lại phản hồi cho client.
3. **Providers (Services)**: Nơi chứa các logic nghiệp vụ (business logic) hoặc tương tác cơ sở dữ liệu, có thể được "tiêm" vào các controller thông qua hệ thống DI

👉 Đây là kiến trúc chuẩn của backend hiện đại.

---

### 1.5 NestJS được dùng trong dự án nào?

NestJS rất linh hoạt và phù hợp cho nhiều loại dự án khác nhau, đặc biệt là các hệ thống cần độ tin cậy cao:

*   **API Doanh nghiệp**: Xây dựng các RESTful API và GraphQL endpoint có cấu trúc chặt chẽ, dễ bảo trì cho các hệ thống quy mô lớn.
*   **Kiến trúc Microservices**: Thiết kế các dịch vụ nhỏ lẻ, độc lập nhờ khả năng hỗ trợ nhiều lớp truyền tải thông điệp khác nhau.
*   **Ứng dụng thời gian thực**: Phù hợp cho các dự án như ứng dụng chat, bảng điều khiển (dashboard) trực tiếp nhờ hỗ trợ mạnh mẽ cho WebSockets.
*   **Ứng dụng Streaming**: Xử lý và truyền phát dữ liệu hiệu quả thông qua cơ chế xử lý dữ liệu không đồng bộ.
*   **Hệ thống hướng sự kiện**: Kết nối tốt với các trình môi giới tin nhắn (message brokers) như RabbitMQ hoặc Kafka.


Nhiều công ty dùng NestJS vì:

* Code rõ ràng
* Dễ onboarding developer mới
* Dễ test & maintain

---

## 2. Cài đặt môi trường và tạo dự án NestJS

### 2.1 Cài Node.js & npm

Kiểm tra Node.js:

```bash
node -v
npm -v
```

Tải và cài đặt NodeJs: https://nodejs.org/en/download

👉 Khuyến nghị **Node.js >= 18**

---

### 2.2 Cài NestJS CLI

Nest CLI giúp:

* Tạo project nhanh
* Generate module, controller, service

Cài đặt:

```bash
npm install -g @nestjs/cli
```

Kiểm tra:

```bash
nest --version
```

---

### 2.3 Tạo project NestJS đầu tiên

```bash
nest new nestjs-basic
```

Chọn:

* Package manager: **npm / pnpm / yarn**

Sau khi xong:

```bash
cd nestjs-basic
npm run start:dev
```

---

### 2.4 Hello World với NestJS

Mở trình duyệt:

```
http://localhost:3000
```

Kết quả:

```
Hello World!
```

👉 Đây là API đầu tiên của bạn 🎉

---

## 3. Tìm hiểu cấu trúc project NestJS

### 3.1 Cấu trúc thư mục mặc định

```
src/
 ├── app.controller.ts
 ├── app.service.ts
 ├── app.module.ts
 └── main.ts
```

---

### 3.2 main.ts – Entry point

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

Giải thích:

* `bootstrap()` → hàm khởi động app
* `NestFactory.create()` → tạo ứng dụng
* `app.listen()` → mở server

Nếu bạn muốn sử dụng `fastify` thay vì `express`:

```ts

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  await app.listen(process.env.PORT ?? 3000);
}
```

Bạn cần cài thêm package `@nestjs/platform-fastify` và `fastify` để sử dụng Fastify làm nền tảng cho ứng dụng NestJS của mình.

```bash
npm i --save @nestjs/platform-fastify
```

Xem thêm tài liệu chính thức về [Fastify với NestJS](https://docs.nestjs.com/techniques/performance#fastify).


---

### 3.3 AppModule – Module gốc

```ts
@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

👉 Mọi module khác đều được import vào đây.

---

### 3.4 Core Concepts Overview

Concept chính của NestJS gồm 3 khái niệm:

**Controller**:

```ts
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

Trong NestJS, Controller đóng vai trò là tầng xử lý các yêu cầu (requests) đến và trả về phản hồi (responses) cho client. Dưới đây là các vai trò cụ thể:

*   **Cổng giao tiếp (Gateway):** Controller đóng vai trò là tầng "C" trong mô hình MVC, hoạt động như một điểm tiếp nhận trung gian giữa client và server.
*   **Điều hướng và trích xuất dữ liệu:** Controller xác định các lộ trình (routes) và trích xuất thông tin từ yêu cầu như body, headers, query parameters hoặc các tham số lộ trình (params).
*   **Điều phối xử lý:** Sau khi nhận dữ liệu, Controller sẽ chuyển giao các chi tiết yêu cầu cho tầng Service (Provider) để thực hiện logic nghiệp vụ.
*   **Nguyên tắc "Thin Controller":** Một Controller tốt nên được giữ "mỏng", chỉ tập trung vào việc tiếp nhận và định dạng dữ liệu đầu ra mà không chứa các logic nghiệp vụ hay logic dữ liệu phức tạp.



**Service**:

```ts
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

Trong kiến trúc NestJS, **Service** (một dạng Provider) đóng vai trò là xương sống xử lý các tác vụ logic của ứng dụng. Dưới đây là các vai trò chi tiết:

*   **Đóng gói logic nghiệp vụ (Business Logic):** Service là nơi tập trung thực hiện các quy tắc, tính toán và logic chính của ứng dụng. Thay vì để Controller xử lý các logic phức tạp, Service đảm nhận vai trò này để đảm bảo mã nguồn có cấu trúc chặt chẽ và dễ quản lý.
*   **Giao tiếp và quản lý dữ liệu:** Service hoạt động như một cầu nối (liaison) giữa Controller và cơ sở dữ liệu. Nó chịu trách nhiệm thực hiện các thao tác CRUD, truy xuất dữ liệu từ database thông qua các Repository hoặc Model và định dạng lại dữ liệu trước khi phản hồi.
*   **Thực thi nguyên tắc Đơn trách nhiệm (Single Responsibility):** Việc đưa logic vào Service giúp tuân thủ các nguyên tắc thiết kế phần mềm như **SOLID**. Điều này giúp giữ cho Controller luôn "mỏng" (thin controller), chỉ tập trung vào việc tiếp nhận yêu cầu HTTP và trả về phản hồi, trong khi Service tập trung hoàn toàn vào xử lý nghiệp vụ.
*   **Tận dụng hệ thống Dependency Injection (DI):** Các Service được đánh dấu bằng decorator `@Injectable()`, cho phép chúng được quản lý bởi container Inversion of Control (IoC) của NestJS. Nhờ DI, Service có thể được "tiêm" vào Controller hoặc các Service khác, giúp các thành phần tương tác với nhau một cách lỏng lẻo (loosely coupled).
*   **Tăng khả năng kiểm thử (Testability):** Do logic được tách biệt khỏi tầng HTTP, các Service rất thuận tiện cho việc viết **Unit Test**. Lập trình viên có thể dễ dàng tạo các bản giả (mock) của Service để kiểm tra các thành phần khác mà không cần phụ thuộc vào cơ sở dữ liệu thực tế.
*   **Tái sử dụng mã nguồn và tính mô-đun:** Một Service được định nghĩa trong một Module có thể được xuất khẩu (export) để sử dụng lại ở nhiều Module khác nhau trong toàn bộ ứng dụng, giúp giảm thiểu việc lặp lại mã (DRY).


👉 Controller gọi Service thông qua **Dependency Injection**.



**Module**:

```ts
@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

Trong NestJS, **Module** đóng vai trò là đơn vị tổ chức cơ bản và là nền tảng để xây dựng cấu trúc ứng dụng. Dưới đây là các vai trò chính của nó:

*   **Nhóm logic theo tính năng:** Module giúp gom nhóm các thành phần liên quan như Controllers, Providers (Services), và các thành phần chức năng khác vào một khối thống nhất (thường là theo từng tính năng như `UsersModule`, `AuthModule`).
*   **Quản lý Dependency Injection (DI):** Module đóng vai trò là "container" để đăng ký các Provider và giúp hệ thống DI của NestJS phân giải các phụ thuộc giữa các thành phần bên trong.
*   **Thiết lập ranh giới và đóng gói:** Nó tạo ra các ranh giới logic rõ ràng, giúp cô lập các tính năng để mã nguồn dễ bảo trì, kiểm thử và mở rộng khi dự án lớn dần.
*   **Tái sử dụng mã nguồn:** Thông qua thuộc tính `exports`, một Module có thể chia sẻ các Provider của mình để các Module khác có thể sử dụng lại, giúp tránh lặp lại mã (DRY).
*   **Điểm khởi đầu (Root Module):** Mọi ứng dụng NestJS đều có ít nhất một Module gốc (`AppModule`), đóng vai trò là điểm bắt đầu để khởi tạo cây phụ thuộc của toàn bộ ứng dụng.


### 3.5 Cấu trúc thư mục đề xuất

Dưới đây là cấu trúc thư mục đề xuất cho một dự án NestJS quy mô vừa đến lớn, giúp tổ chức mã nguồn một cách rõ ràng và dễ bảo trì:

```
src/
├── common/
│   ├── configs/
│   ├── constants/
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   ├── pipes/
│   ├── providers/
│   └── utils/
│
├── modules/
│   ├── users/
│   │   ├── controllers/
│   │   │   ├── admin-users.controller.ts (Dành cho admin)
│   │   │   ├── public-users.controller.ts (Dành cho public)
│   │   │
│   │   ├── services/
│   │   │   ├── users.service.ts
│   │   │
│   │   ├── dto/
│   │   │   ├── request/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │
│   │   │   ├── response/
│   │   │       ├── admin-user.response.dto.ts
│   │   │       ├── public-user.response.dto.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── users.repository.ts
│   │   │
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │
│   │   ├── users.module.ts
│   │
│   ├── auth/
│   │   ├── controllers/
│   │   │   ├── admin-auth.controller.ts 
│   │   │   ├── public-auth.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │
│   │   ├── dto/
│   │   │   ├── request/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │
│   │   │   ├── response/
│   │   │       ├── auth.response.dto.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── auth.repository.ts
│   │   │
│   │   ├── entities/
│   │   │   ├── (optional)
│   │   │
│   │   ├── auth.module.ts
│   └──shared
|       ├── dto/
|       ├── interfaces/
|       └── services/
│
├── app.module.ts
└── main.ts
```

Giải thích:
*   **common/**: Chứa các thành phần dùng chung như cấu hình, hằng số, decorator, guard, filter, interceptor, pipe, provider và các tiện ích (utils) mà có thể được sử dụng lại ở nhiều nơi trong ứng dụng.
*   **modules/**: Chứa các module chính của ứng dụng, mỗi module đại diện
cho một tính năng hoặc một phần chức năng cụ thể. Mỗi module có thể có cấu trúc con riêng để tổ chức controllers, services, DTOs, repositories và entities liên quan đến tính năng đó.
*   **app.module.ts**: Module gốc của ứng dụng, nơi tất cả các module khác được import vào.
*   **main.ts**: Điểm khởi đầu của ứng dụng, nơi ứng dụng được khởi tạo và server được lắng nghe.
* **shared/**: Chứa các thành phần dùng chung giữa các module, như DTOs, interfaces, hoặc các service dùng chung.

---

## 4. Config & Environment (Cấu hình ứng dụng)

### 4.1 Tại sao cần quản lý cấu hình?

Nếu không quản lý cấu hình đúng cách, ứng dụng sẽ khó deploy, kém bảo mật và khó mở rộng.

**1. Tránh hard-code giá trị quan trọng trong source code**

Ví dụ:

```ts
const PORT = 3000;
const DB_URL = 'mongodb://localhost:27017/app';
const JWT_SECRET = 'my-secret-key';
```

Vấn đề:

* Không đổi được khi deploy
* Lộ thông tin nhạy cảm
* Phải sửa code mỗi lần đổi môi trường

👉 Hard-code = technical debt

👉 Cần tách riêng cấu hình nhạy cảm ra khỏi source code.


**2. Một ứng dụng – nhiều môi trường (multi-environment)**

Một ứng dụng Node.js **không bao giờ chỉ chạy 1 môi trường**.

| Môi trường  | Mục đích               |
| ----------- | ---------------------- |
| development | Dev local              |
| staging     | Test trước khi release |
| production  | Chạy thật              |

Ví dụ cấu hình khác nhau

| Biến      | Dev       | Prod        |
| --------- | --------- | ----------- |
| DB_URL    | localhost | server thật |
| LOG_LEVEL | debug     | error       |
| PORT      | 3000      | 80          |

👉 **Không thể dùng chung một cấu hình cho tất cả**.



### 4.2 Cài ConfigModule

```bash
npm install @nestjs/config
```

Xem thêm tài liệu chính thức về [ConfigModule](https://docs.nestjs.com/techniques/configuration).

---

### 4.3 Tạo file .env

```env
PORT=3000
NODE_ENV=development
```

---

### 4.4 Sử dụng ConfigModule

```ts
//src/app.module.ts

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

---

### 4.5 Sử dụng biến môi trường

Trong các service hoặc controller:

```ts
constructor(private configService: ConfigService) {}

const port = this.configService.get<number>('PORT');
```

Trong `main.ts`:

```ts
const configService = app.get(ConfigService);
const port = configService.get<number>('PORT') || 3000;
await app.listen(port, () => {
    console.log(`Application running at http://localhost:${port}`);
  });
```

---

### 4.6 Multi environment (dev / prod)

```env
.env.development
.env.production
```

```ts
ConfigModule.forRoot({
  // Đọc file .env tương ứng với NODE_ENV
  envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
});
```

---

### 4.6 Tách cấu hình theo file

Việc tách cấu hình theo file giúp:

* Quản lý cấu hình dễ dàng hơn
* Tái sử dụng cấu hình

Cách làm:



```ts
//src/common/configs/database.config.ts
export default () => ({
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
  },
});

//src/common/configs/jwt.config.ts
export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
});

//src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, jwtConfig],
      global: true,
      cache: true,
    }),
  ],
});
```

---

### 4.7 Validation biến môi trường

Vì sao cần validation?

* Tránh thiếu biến môi trường quan trọng
* Đảm bảo biến môi trường đúng định dạng


Cấu trúc thư mục đề xuất:

```
src/
 ├── config/
 │    ├── app.config.ts
 │    ├── database.config.ts
 │    └── validation.schema.ts
 ├── app.module.ts
 └── main.ts
```


Vai dụ sử dụng `Joi` để validate:

```bash
npm install joi
```

Nội dung `config/app.config.ts`:

```ts 
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export default registerAs('app', () => ({
  port: Number(process.env.PORT),
  env: process.env.NODE_ENV,
}));

export const appSchema = {
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
};
```

Nội dung `config/database.config.ts`:

```ts
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const databaseSchema = {
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
};

export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  name: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
}));

```

Nội dung file `config/validation.schema.ts`:

```ts
import * as Joi from 'joi';
import { appSchema } from './app.config';
import { databaseSchema } from './database.config';
export const validationSchema = Joi.object({
  ...appSchema,
  ...databaseSchema,
});
```

Nội dung file `app.module.ts`:

```ts   
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,           // dùng ở mọi module
      load: [appConfig, databaseConfig],
      validationSchema,         // Joi validate
    }),
  ],
})
export class AppModule {}
```

Nâng cao: Tìm hiểu về cách cấu hình từng phần cho module khi nó được load với `Partial registration` tại dây: [ConfigModule - Partial Registration](https://docs.nestjs.com/techniques/configuration#partial-registration).


Hoặc sử dụng `Zod` để validate (Khuyến nghị) xem tại đây: [Zod validation](./zod-validation.md)



---

## 5. Chuẩn định dạng hóa mã nguồn với Prettier & ESLint hoặc Biome


### 5.1 Tại sao cần chuẩn định dạng hóa mã nguồn?

Định dạng hóa mã nguồn giúp:

* Giữ code nhất quán trong team
* Dễ đọc, dễ bảo trì
* Giảm xung đột khi làm việc nhóm
* Tăng năng suất phát triển

### 5.2 Công cụ định dạng hóa mã nguồn phổ biến

- Cách triển khai với Prettier & ESLint [xem ở đây](./eslint-prettier.md)
- Cách triển khai với Biome [xem ở đây](./biomejs.md)
