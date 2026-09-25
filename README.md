# Lộ Trình Học Backend RESTful API với NestJs

## Lesson 01: Tổng quan về Backend với NodeJs

* Backend là gì?
* Node.js là gì?
  * Giới thiệu về Node.js
  * Event Loop
  * Event-driven, Non-blocking I/O
* JavaScript ES6+
* NPM vs Yarn vs PNPM
* Package.json và dependency management

---

## Lesson 02: TypeScript cho NestJS

* Cài đặt và cấu hình TypeScript
  * TypeScript là gì? Vì sao NestJS dùng TypeScript?
  * Cài đặt `typescript`, chạy code với `tsc` và `tsx`
  * `tsconfig.json` và chế độ `strict`
* Kiểu dữ liệu cơ bản
  * `string`, `number`, `boolean`, `null`, `undefined`
  * Array và Tuple
  * `any` vs `unknown` vs `never`
  * Type inference (suy luận kiểu)
* Kết hợp kiểu dữ liệu
  * Union và Literal types
  * Type narrowing (`typeof`, `in`, `instanceof`)
  * Type alias vs Interface
  * Optional (`?`) và `readonly`
* Function trong TypeScript
  * Kiểu cho tham số và giá trị trả về
  * Tham số optional và default
  * Async function và `Promise<T>`
* Enum
  * Enum vs Union literal
* Generics
  * Generics là gì? (`Array<T>`, `Promise<T>`)
  * Viết function và interface generic
* Utility Types
  * `Partial`, `Required`, `Pick`, `Omit`, `Record`
* Module: `import` / `export`
* Class trong TypeScript (đủ dùng cho NestJS)
  * Class, Constructor, Properties, Methods
  * Access Modifier: `public`, `private`, `protected`, `readonly`
  * Parameter properties: `constructor(private readonly service: Service)`
  * `implements` interface
  * `extends` và `super` (kế thừa cơ bản)
  * `abstract` và `static` (giới thiệu)
  * Definite assignment (`!`) với `strictPropertyInitialization`
  * Vì sao NestJS dùng class: interface bị xóa khi compile, class tồn tại lúc runtime
* Decorators
  * Decorator là gì?
  * Class, Method, Property, Parameter decorator
  * Tự viết một decorator đơn giản
  * `experimentalDecorators`, `emitDecoratorMetadata` và `reflect-metadata`
  * Decorator trong NestJS: `@Controller`, `@Injectable`, `@Get`, `@IsString`

## Lesson 03: Tổng quan về NestJS

* NestJS là gì?
  * NestJS giải quyết vấn đề gì?
  * So sánh NestJS vs Express
  * Kiến trúc **MVC + Dependency Injection**
  * NestJS dùng trong dự án nào?

* Cài đặt môi trường và cài đặt dự án

  * Cài Node.js, npm
  * Cài Nest CLI
  * Tạo project NestJS đầu tiên
  * Hello world với NestJS

* Tìm hiểu về cấu trúc NestJs

  * main.ts
  * AppModule
  * Bootstrap là gì?
  * Core Concepts Overview

* Config & Environment

  * Cấu hình với ConfigModule
  * Sử dụng biến môi trường (.env)
  * Cấu hình theo môi trường (development, production)
  * Validation cho biến môi trường

* Chuẩn hóa code với Prettier & ESLint hoặc Biome

  * Tại sao cần chuẩn hóa code?
  * Cài đặt Prettier & ESLint hoặc Biome
  * Cấu hình Prettier & ESLint hoặc Biome

---

## Lesson 04: Build RESTful API với NestJS - Part 1

* Restful API là gì?
* REST API Design Principles

  * Resource vs Endpoint
  * HTTP Methods
  * HTTP Status Codes

* Tạo Controller trong NestJS
  * Routing trong NestJS
  * Route Parameters
  * Query Parameters
  * Request Body
  * Request Headers

* Response trong NestJS
  * Response Object
  * Response Status Codes
  * Response Headers
  * Response Body


* REST API Best Practices
  * Naming convention cho API
  * API Versioning


## Lesson 05: Build RESTful API với NestJS - Part 2

* Service và Business Logic

* Providers và Dependency Injection

  * Provider là gì?
  * `@Injectable()` và DI container
  * Inject service vào controller qua constructor

* Modules và Mục đích sử dụng

  * Module là gì?
  * Root module vs Feature module
  * @Module: imports, controllers, providers, exports

* Xử lý lỗi với Built-in HTTP Exceptions

  * `NotFoundException`, `BadRequestException`, `ConflictException`...
  * Throw exception từ service


---


## Lesson 06: Làm việc với Database (TypeORM)

* Database trong Backend ?
  * Vai trò Database trong Backend
  * Các loại Database phổ biến
    * Relational Database (PostgreSQL, MySQL)
    * NoSQL Database (MongoDB, Redis)
* ORM là gì?
  * ORM (Object Relational Mapping) là gì?
  * Lợi ích của ORM
* Cài đặt và cấu hình Database với NestJS
  * Cài đặt TypeORM
  * Kết nối database
  * Cấu hình .env
* Tạo Entity với TypeORM
  * Entity trong TypeORM
    * Tables
    * Columns
    * Primary Key
  * Cấu hình tùy chỉnh cho Entity
    * Column types
    * Default values
* Repository Pattern
* Validation và Transformation với DTO
  * Data Transfer Object (DTO)
    * DTO là gì?
    * Tại sao cần DTO?
  * Pipes trong NestJS
    * Pipe là gì? (transformation vs validation)
    * Built-in pipes: `ParseIntPipe`, `ParseUUIDPipe`...
  * Validation trong NestJS
    * class-validator
    * class-transformer
    * ValidationPipe
    * Global Validation Pipe
* Thực hành CRUD cơ bản



---

## Lesson 07: TypeORM Advanced

* Quan hệ dữ liệu
  * One-to-One
  * One-to-Many
  * Many-to-Many
  * Cascade, eager, lazy

* Migrations
  * Migrations là gì? Vì sao không dùng `synchronize: true` ở production?
  * Tạo và chạy Migrations với TypeORM

* Seeding Database với TypeORM
  * Seeding là gì?
  * Tạo và chạy Seeder với TypeORM

* Truy vấn nâng cao
  * Relations
  * Pagination
  * Filtering
  * Sorting

* Query Builder
* Transactions
* Indexes và Tối ưu hiệu suất truy vấn
  * Indexes là gì?
  * Tạo Indexes với TypeORM
  * Tối ưu hiệu suất truy vấn với Indexes


---

## Lesson 08: Mini Project - Build CRUD complete với ReactJS

> Mini project: vận dụng API đã xây dựng (Lesson 04-07) vào frontend

* Chuẩn hóa response format
  * Tại sao cần chuẩn hóa response format?
  * Interceptor là gì?
  * Success response với Interceptor
  * Exception Filter là gì?
  * Error response với Exception Filter

* Init dự án ReactJS

* Kết nối ReactJS với API NestJS

* Tạo giao diện CRUD với ReactJS

  * Tạo danh sách hiển thị dữ liệu
  * Tạo form thêm mới dữ liệu
  * Tạo form chỉnh sửa dữ liệu
  * Xóa dữ liệu
  * Tích hợp Alert, Notification

---

## Lesson 09: Authentication (Jwt, 2FA)

* Tổng quan về Authentication
* Các phương thức Authentication trong Backend
  * Session-based authentication
  * Token-based authentication
* Authentication Flow
  * JWT là gì?
  * Cấu trúc JWT
  * Tạo User và Hash Password
  * Login and tạo Tokens
* Protect API với Guard và PassportJS JWT
  * Guard là gì?
  * AuthGuard
  * Protect routes
  * Lấy user hiện tại với custom decorator `@CurrentUser()`
* Refresh Token
  * Refresh Token Flow
  * Token rotation
* Advanced Authentication
  * Social Authentication (Google, Facebook, GitHub)
  * Two Factor Authentication (2FA)

---

## Lesson 10: Authorization với NestJS

* Authorization là gì?
* Authentication vs Authorization
* Các Mô hình Authorization trong Backend
  * Role-based access control (RBAC)
  * Permission-based authorization
  * Ownership-based authorization
* RBAC Implementation
  * Tạo Role và Permission
  * Gán Role cho User
  * Gán Permission cho Role
  * Kiểm tra quyền truy cập với Guards
* Authorization với Guards
  * Custom decorator `@Roles()` với `SetMetadata` và `Reflector`
  * Tạo RolesGuard
  * Sử dụng Guards trong Controllers
* Advanced Authorization
  * Attribute-based access control (ABAC)
  * Policy-based authorization

---

## Lesson 11: Mini Project - Implement Dashboard với ReactJS

> Mini project: vận dụng Authentication & Authorization (Lesson 09-10) vào frontend

* Init dự án ReactJS
* Kết nối ReactJS với API NestJS
* Tạo giao diện Dashboard với ReactJS
* Protected Route với React Router
* Display User Profile
* Logout

---

## Lesson 12: Làm việc với MongoDB và Mongoose

* Tổng quan về NoSQL
  * Khái niệm
  * Tại sao ra đời NoSQL?
  * CAP Theorem
* Các loại cơ sở dữ liệu NoSQL
  * Document Store (MongoDB, CouchDB)
  * Key-Value Store (Redis, DynamoDB)
  * Column-Family (Cassandra, HBase)
  * Graph Database (Neo4j)
* MongoDB là gì?
  * Cấu trúc dữ liệu trong MongoDB
  * Các lệnh cơ bản với MongoDB
  * MongoDB Atlas - dịch vụ MongoDB trên Cloud
* Mongoose là gì?
  * Khái niệm 
  * Tại sao cần Mongoose? (vs MongoDB Native Driver)
* Cài đặt và cấu hình MongoDB với NestJS
* Tạo Schema với Mongoose
  * Embedded Document
  * Reference Document
  * Best practices cho Schema design
* Validation và Middleware trong Mongoose
  * Validation
  * Pre/Post Hooks
* CRUD cơ bản với Mongoose
  * Tạo document mới
  * Đọc dữ liệu
  * Cập nhật dữ liệu
  * Xóa dữ liệu
* Truy vấn nâng cao với Mongoose
  * Population
  * Pagination
  * Filtering
  * Sorting

---

## Lesson 13: Cache với Redis

* Cache là gì?
* Tại sao cần Cache?
* In-Memory Cache
  * Cài đặt và cấu hình In-Memory Cache với NestJS
  * Sử dụng In-Memory Cache trong NestJS
    * CacheInterceptor (cache route tự động)
    * Manual caching - Cache Aside (cache query DB)
    * Invalidation (TTL + Manual)
    * Cache Key Design
* Cache stores với Redis
  * Redis là gì?
  * Cài đặt Redis bằng Docker
  * Cài đặt và cấu hình Redis với NestJS (@keyv/redis)
  * Sử dụng Redis Cache trong NestJS

---

## Lesson 14: Upload and Send mail với NestJS

* File Upload là gì?
* Multer là gì?
* Cài đặt và cấu hình Multer với NestJS
* Tạo API File Upload với Multer
  * Upload single file
  * Upload multiple files
  * Upload file với field name
  * No file upload
* Cấu hình static file serving trong NestJS
* Custom Upload with Interceptor
  * Custom storage engine
  * Custom file naming
  * Custom file filter
* File validation (size, type)
* Advanced
  * Upload lên Cloud Storage
    * AWS S3
    * Cloudinary
  * Streaming file upload
* Send mail với NestJS
  * Tại sao cần gửi mail trong Backend?
  * Cài đặt và cấu hình Nodemailer với NestJS
    * SMTP là gì?
    * Cấu hình SMTP server
    * Cấu hình email provider (Gmail, SendGrid, Mailgun)
    * Tạo module MailModule
  * Tạo API gửi email
    * Gửi mail với text plains
    * Gửi mail với HTML
    * Gửi mail với attachments

---

## Lesson 15: Testing API với Jest

* Unit Testing ?
* Integration Testing ?
* E2E Testing ?
* UnitTest for Service
* E2E Test for Controller

---

## Lesson 16: Deployment & Security

* Build project
* Middleware trong NestJS
  * Middleware là gì?
  * Functional middleware vs Class middleware
  * Tổng hợp Request Lifecycle: Middleware → Guard → Interceptor → Pipe → Handler → Exception Filter
* API Security
  * CORS
  * Helmet
  * Rate Limiting
  * CSRF
  * API Key Authentication
* Health Check API
* Deploy với PM2
* Dockerize NestJS
* Deploy lên VPS / Cloud
