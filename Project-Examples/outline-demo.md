# Lộ Trình Học Backend RESTful API với NestJs

## Lesson 01: Tổng quan về Backend với NodeJs

* Backend là gì?
* Node.js là gì?
  * Giới thiệu về Node.js
  * Event Loop
  * Event-driven, Non-blocking I/O
* JavaScript ES6+
* TypeScript cơ bản
* NPM vs Yarn vs PNPM
* Package.json và dependency management

---

## Lesson 02: Tổng quan về NestJS

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

* Project Architecture Best Practices

  * Feature-based architecture
  * Layered architecture
  * Module organization

---

## Lesson 03: Build RESTful API với NestJS

* Restful API là gì?
* REST API Design Principles

  * Resource vs Endpoint
  * HTTP Methods
  * Idempotent là gì?
  * HTTP Status Codes

* Modules và Mục đích sử dụng

  * Module là gì?
  * Root module vs Feature module
  * @Module: imports, controllers, providers, exports

* Controller và Routing trong NestJS

* Service và Business Logic

* Validation trong NestJS
  * class-validator
  * class-transformer
  * ValidationPipe
  * Global Validation Pipe

* REST API Best Practices
  * Naming convention cho API
  * API Versioning
  * Pagination
  * Filtering
  * Sorting

---

## Lesson 04: NestJS Fundamental Concepts

* Decorators trong NestJS
  * Decorators là gì
  * Decorators trong Typescript
  * Các loại Decorators trong NestJs
    * Class decorator
    * Method decorator
    * Parameter decorator
* Dependency Injection trong NestJS
  * Dependency Injection là gì?
  * DI container trong NestJS
  * Providers
  * `@Injectable()`
  * Inject Service vào Controller
  * Scope của Providers
    * Singleton
    * Transient
    * Request-scoped
* Request Lifecycle
  * Tổng quan Request Lifecycle
  * Flow xử lý request trong NestJS
* Middleware
  * Middleware là gì?
  * Use case của Middleware
  * Tạo custom middleware
  * Áp dụng middleware cho route/module
* Guards
  * Guards là gì?
  * Guards hoạt động khi nào?
  * Tạo custom guard
  * Sử dụng guard để bảo vệ route
* Pipes
  * Pipes là gì?
  * Use case của Pipes
  * Built-in pipes trong NestJS
    * `ValidationPipe`
    * `ParseIntPipe`
    * `ParseUUIDPipe`
  * Tạo custom pipe
* Interceptors
  * Interceptors là gì?
  * Use case của Interceptors
  * Tạo custom interceptor
  * Sử dụng interceptor để log request/response, transform response, handle errors
* Exception filters
  * Exception Filters là gì?
  * Xử lý lỗi trong NestJS
  * Built-in HTTP Exceptions
* ExecutionContext
  * ExecutionContext là gì?
  * HTTP context
  * Switching context
  * Sử dụng ExecutionContext trong Guards và Interceptors

---

## Lesson 05: Làm việc với Database (Prisma/TypeORM)

* Database trong Backend ?
  * Vai trò Database trong Backend
  * Các loại Database phổ biến
    * Relational Database (PostgreSQL, MySQL)
    * NoSQL Database (MongoDB, Redis)
* ORM là gì?
  * ORM (Object Relational Mapping) là gì?
  * Lợi ích của ORM
  * So sánh Prisma và TypeORM
* Cài đặt và cấu hình Database với NestJS
  * Cài đặt TypeORM
  * Kết nối database
  * Cấu hình .env
* Tạo Entity/Model với Prisma/TypeORM
  * Entity trong TypeORM
    * Tables
    * Colums
    * Primary Key
  * Cấu hình tùy chỉnh cho Entity/Model
    * Column types
    * Default values
    * Validations
* Repository Pattern
* Data Transfer Object (DTO)
  * DTO là gì?
  * Tại sao cần DTO?
  * Tạo DTO với class-validator
  * Sử dụng DTO trong Controller
* Thực hành CRUD cơ bản

---

## Lesson 06: TypeORM Advanced

* Quan hệ dữ liệu
  * One-to-One
  * One-to-Many
  * Many-to-Many
  * Cascade, eager, lazy

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
* Migrations
  * Migrations là gì?
  * Tạo và chạy Migrations với TypeORM
* Seeding Database với TypeORM
  * Seeding là gì?
  * Tạo và chạy Seeder với TypeORM

---

## Lesson 07: Build CRUD complete with ReactJS

* Init dự án ReactJS

* Kết nối ReactJS với API NestJS

* Tạo giao diện CRUD với ReactJS

  * Tạo danh sách hiển thị dữ liệu
  * Tạo form thêm mới dữ liệu
  * Tạo form chỉnh sửa dữ liệu
  * Xóa dữ liệu
  * Tích hợp Alert, Notification

---

## Lesson 08: Authentication (Jwt, 2FA)

* Tổng quan về Authentication
* Các phương thức Authentication trong Backend
  * Session-based authentication
  * Token-based authentication
* Password Hashing
  * Hash là gì?
  * Hash & Encryption
  * bcrypt
  * argon2
  * salt
* Authentication Flow
  * Login
  * Register
  * Logout
* JWT Authentication
  * JWT là gì?
  * Cấu trúc JWT
  * Tạo JWT với NestJS
  * Xác thực JWT với Guards
  * Access Token vs Refresh Token
* PassportJS Authentication
  * PassportJS là gì?
  * Cài đặt và cấu hình PassportJS với NestJS
  * Local Strategy
  * JWT Strategy
* Protect API với Guards
  * AuthGuard
  * Protect routes
* Refresh Token
  * Refresh Token Flow
  * Token rotation
* Advanced Authentication`
  * Social Authentication (Google, Facebook, GitHub)
  * Two Factor Authentication (2FA)

---

## Lesson 09: Authorization với NestJS

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
  * Casbin Authorization
* Authorization với Guards
  * Guard là gì ?
  * RolesGuard
  * PermissionsGuard
  * OwnershipGuard
  * Reflector
  * Metadata
* Custom Decorators cho Authorization
  * @Roles
  * @Permissions
  * @Owner
* Protecting APIs với RBAC
  * Protect API với Role
  * Protect API với Permission
  * Protect API với Ownership
* Advanced Authorization
  * Attribute-based access control (ABAC)
  * Policy-based authorization

---

## Lesson 10: Implement Dashboard with ReactJS

* Init dự án ReactJS
* Kết nối ReactJS với API NestJS
* Tạo giao diện Dashboard với ReactJS
* Protected Route với React Router
* Display User Profile
* Logout

---

## Lesson 11: Làm việc với MongoDB và Mongoose

* Tổng quan về NoSQL
* MongoDB là gì?
* Mongoose là gì?
* Cài đặt và cấu hình MongoDB với NestJS
* Tạo Schema với Mongoose
  * Embedded Document
  * Reference Document
* CRUD cơ bản với Mongoose
* Truy vấn nâng cao với Mongoose
  * Population
  * Pagination
  * Filtering
  * Sorting

---

## Lesson 12: Cache với Redis

* Cache là gì?
* Redis là gì?
* Cài đặt và cấu hình Redis với NestJS
* Sử dụng Redis Cache trong NestJS
  * Cache API responses
  * Cache database queries
  * Cache with TTL
* Redis lock
  * Distributed lock là gì?
  * Implement distributed lock với Redis 

---

## Lesson 13: Xử lý File Upload Multer

* File Upload là gì?
* Multer là gì?
* Cài đặt và cấu hình Multer với NestJS
* Tạo API File Upload với Multer
* Lưu trữ file với Multer
* Validation cho file upload
* Upload lên Cloud Storage
  * AWS S3
  * Cloudinary

---

## Lesson 14: Tài liệu hóa API với OpenAPI (Swagger)

* OpenAPI là gì?
* Swagger là gì?
* Cài đặt và cấu hình Swagger với NestJS

* Swagger decorators
  * @ApiTags
  * @ApiOperation
  * @ApiResponse

* Document request  
  * Request body
  * Query parameters
  * Path parameters
* DTO documentation
  * @ApiProperty
  * @ApiPropertyOptional
  * Enum

* API Error Response Standard
* Pagination documentation

---

## Lesson 15: Xử lý lỗi nâng cao

* Cách lỗi xảy ra trong NestJS
  * Validation
  * Authentication
  * Database
  * Business logic
* NestJS Built-in Exceptions
  * HttpException
  * BadRequestException
  * UnauthorizedException
  * NotFoundException
  * ConflictException
  * InternalServerErrorException
* Exception Filters nâng cao
  * Global Exception Filter
  * Custom Exception Filter

* Chuẩn hóa response formart
  * Tại sao cần chuẩn hóa response formart?
  * Success response
  * Error response
* Error handling best practices
  * Log lỗi
  * Không trả về lỗi chi tiết cho client
  * Sử dụng mã lỗi tùy chỉnh

---

## Lesson 16: Microservices với NestJS

* Microservices là gì?
* Monolith vs Microservices
* Kiến trúc Microservices
* Cài đặt Microservices với NestJS
* Giao tiếp giữa services
  * TCP
  * Redis
  * NATS
  * gRPC
* Message Patterns
* Client Proxy
* Event-based communication
* Demo Microservice với RabbitMQ

---

## Lesson 17: Realtime

* Realtime là gì?
* WebSocket là gì?
* Cài đặt WebSocket với NestJS
* Websocket gateway
* Tạo API Realtime với WebSocket
* Sử dụng Socket.IO với NestJS
  * Emit event
  * Listen event
  * Broadcast
  * Rooms

---

## Lesson 18: Queue & Task schedule

* Queue là gì?
* Task Scheduling là gì?
* Queue architecture
  * Producer
  * Consumer
  * Worker
  * Job
* Redis backend cho BullJS
* Cài đặt BullJS với NestJS
* Tạo Queue
* Job retry
* Job delay
* Job monitoring
* Task scheduling
  * Cron jobs
  * @nestjs/schedule

---

## Lesson 19: Tối ưu hóa hiệu suất trong NestJS

* Vì sao cần tối ưu hóa hiệu suất?
* Tối ưu hóa với Interceptors
* Tối ưu hóa với Caching (Redis)
* Tối ưu hóa Database
  * Indexes
  * Query Optimization
  * Connection Pooling
  * N +1 Problem
  * Pagination
  * Lazy vs Eager Loading
* Tối ưu hóa Business Logic

---

## 🆕 Lesson 20: Testing API với Jest

* Unit Testing
* Integration Testing
* E2E Testing
* Testing Controller
* Testing Service
* Supertest test API

---

## 🆕 Lesson 21: Deployment & Security

* Build project

```bash
npm run build
```

* Environment variables
* API Security
  * CORS
  * Helmet
  * Rate Limiting
  * CSRF
  * API Key Authentication
* Deploy với PM2
* Dockerize NestJS
* Deploy lên VPS / Cloud
