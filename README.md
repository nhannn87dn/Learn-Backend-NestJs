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

---

## Lesson 03: Build RESTful API với NestJS

* Restful API là gì?
* REST API Design Principles

  * Resource vs Endpoint
  * HTTP Methods
  * HTTP Status Codes

* Modules và Mục đích sử dụng

  * Module là gì?
  * Root module vs Feature module
  * @Module: imports, controllers, providers, exports

* Controller và Routing trong NestJS

* Service và Business Logic

* REST API Best Practices
  * Naming convention cho API
  * API Versioning

---

## Lesson 04: NestJS Fundamental Concepts

* Decorators trong NestJS
  * Decorators là gì
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
* Repository Pattern
* Validation và Transformation với DTO
  * Data Transfer Object (DTO)
    * DTO là gì?
    * Tại sao cần DTO?
  * Validation trong NestJS
    * class-validator
    * class-transformer
    * ValidationPipe
    * Global Validation Pipe
* Thực hành CRUD cơ bản



---

## Lesson 06: TypeORM Advanced

* Quan hệ dữ liệu
  * One-to-One
  * One-to-Many
  * Many-to-Many
  * Cascade, eager, lazy

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
* Migrations
  * Migrations là gì?
  * Tạo và chạy Migrations với TypeORM


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

* Chuẩn hóa response format
  * Tại sao cần chuẩn hóa response format?
  * Success response
  * Error response

---

## Lesson 08: Authentication (Jwt, 2FA)

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
* Authorization với Guards
  * Tạo AuthGuard
  * Sử dụng Guards trong Controllers
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

## Lesson 13: Upload and Send mail với NestJS

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

## Lesson 14: Tài liệu hóa API với OpenAPI (Swagger)

* OpenAPI là gì?
* Swagger là gì?
* Cài đặt và cấu hình Swagger với NestJS
* Tạo tài liệu API với Swagger
  * Sử dụng decorators để mô tả API
  * Tạo API documentation
  * Tùy chỉnh Swagger UI
  
---

## Lesson 15: Testing API với Jest

* Unit Testing
* Integration Testing
* E2E Testing
* Testing Controller
* Testing Service
* Supertest test API

---

## Lesson 16: Deployment & Security

* Build project
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
