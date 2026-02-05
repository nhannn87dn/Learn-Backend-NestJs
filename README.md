# Lộ Trình Học Backend RESTful API với NestJs

## Lesson 01 - Getting Started

* Node.js là gì?
  * Giới thiệu về Node.js
  * Event Loop
  * Event-driven, Non-blocking I/O

* JavaScript ES6+
  * Let, Const
  * Arrow function
  * Destructuring
  * Spread and Rest Operators
* TypeScript cơ bản
  * type, interface
  * class, access modifier
  * generics
* RESTful API là gì
* HTTP, Request / Response, Status Code

---

## Lesson 02 - Intro NestJS

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

---

## Lesson 03 - Build RESTful API

* Modules và Mục đích sử dụng
  * Module là gì?
  * Root module vs Feature module
  * @Module: imports, controllers, providers, exports
* Controller
  * Controller là gì?
  * Routing trong NestJS
* Service & Provider
  * Service là gì?
  * Provider là gì?
  * Injectable
  * Inject service vào controller
* Quản lý phiên bản API (API Versioning)
  * Tại sao cần versioning cho API?
  * Cách cấu hình versioning trong NestJS
  * Các chiến lược versioning: URI Versioning, Header Versioning


---

## Lesson 04 - Request Lifecycle and Data Flow

* Lifecycle trong NestJS
  * Request Lifecycle Overview
  * Các giai đoạn trong lifecycle
    * Incoming Request
    * Middleware
    * Guards
    * Interceptors (Before)
    * Pipes
    * Controller
    * Service
    * Interceptors (After)
    * Exception Filters
    * Outgoing Response
* Data Flow trong NestJS
* Execution Context
  * Execution Context là gì?
  * Các phương thức quan trọng: switchToHttp(), getRequest(), getHandler(), getClass()
  * Sử dụng Execution Context trong Middleware, Guard, Interceptor
* Validation và Transformation với DTO
  * DTO là gì?
  * Pipe là gì?
  * Class-validator và class-transformer
  * Sử dụng ValidationPipe
  * Custom Validation Pipe
* Error Handling
  * Exception Filters
  * Built-in HTTP Exceptions
  * Custom Exception Filter
* Handling Responses
  * Transform response
  * Custom response format
  
---

## Lesson 05 - Connect Database

* ORM là gì?
* Giới thiệu TypeORM / Prisma
* Cấu hình kết nối database (MySQL / PostgreSQL)
* Entity & Repository
  * Entity là gì?
  * Column, Primary Key, Data Types
  * Repository pattern
* CRUD cơ bản
* DTO Response vs Entity
* Data Mapper Pattern
* Cấu hình multi database connection

---

## Lesson 06 - TypeORM Advanced

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
  * Transaction là gì?
  * Sử dụng Transactions với TypeORM
* Indexes và Tối ưu hiệu suất truy vấn
  * Indexes là gì?
  * Tạo Indexes với TypeORM
  * Tối ưu hiệu suất truy vấn với Indexes

---

## Lesson 07 - Build CURD complete with ReactJS
  
* Init dự án ReactJS
* Kết nối ReactJS với API NestJS
* Tạo giao diện CRUD với ReactJS
  * Tạo danh sách hiển thị dữ liệu
  * Tạo form thêm mới dữ liệu
  * Tạo form chỉnh sửa dữ liệu
  * Xóa dữ liệu
  * Tích hợp Alert, Notification

## Lesson 08 - Database Migration and Seeding

* Migration là gì và tại sao cần migration?
* Tạo migration với TypeORM / Prisma
* Chạy migration
* Seeding dữ liệu ban đầu cho database
* Quản lý migration trong dự án thực tế
* Tích hợp nhiều Database trong NestJS

---

## Lesson 09 - Authentication, Authorization

* Tổng quan về Authentication & Authorization
* Authentication với JWT + Passport
* Quản lý Access Token & Refresh Token
* Authorization với Guards (RBAC)
* Các best practice & lưu ý thực tế

---

## Lesson 10 - Build a Dashboard with ReactJS
  
* Build login page
* Build dashboard layout
* Build protected routes
* Integrate with NestJS Authentication API
* Display user profile
* Logout functionality

---

## Lesson 11 - NoSQL with MongoDB 

* Giới thiệu NoSQL và MongoDB
* Cài đặt MongoDB và kết nối với NestJS
* Sử dụng Mongoose với NestJS
* Tạo Schema và Model với Mongoose
* CRUD cơ bản với Mongoose
* Quan hệ dữ liệu trong MongoDB
  * Embedded Documents
  * References

## Lesson 12 - MongoDB Advanced

* Truy vấn nâng cao với Mongoose
  * Populate
  * Pagination
  * Filtering
  * Sorting
  * Aggregation Pipeline
* Transactions trong MongoDB
* Indexes và Tối ưu hiệu suất truy vấn trong MongoDB
* Migration & Data Seeding
* Best Practices & Common Pitfalls

---


## Lesson 13 - Upload & Streaming Files & Send Email NestJS

* Upload file với Multer
* Cấu hình Upload trong NestJS
* Lưu file lên server
* Upload lên Cloud Storage (AWS S3 / Cloudinary)
* Streaming file dung lượng lớn
* Gửi email với NestJS

---


## Lesson 14 - Optimization & Caching with Redis

* Giới thiệu về Caching và Redis
* Tại sao cần caching?
* CacheModule
* Sử dụng Redis làm cache store
* Caching với Interceptor
* **Tích hợp: Task Scheduling với BullJS** (giới thiệu background jobs, setup BullJS với Redis cho queueing tasks như cron jobs).

---


## Lesson 15 - Documentation with Swagger

* Tại sao cần tài liệu API?
* Cài đặt Swagger Module
* Tạo tài liệu API tự động
* Sử dụng Swagger UI
* Tùy chỉnh tài liệu API
* Bảo mật tài liệu API

---


## Lesson 16 - Testing in NestJS

* Unit Test
  * Jest trong NestJS
  * Test service
  * Mock dependency
* E2E Test
  * Supertest
  * Test API end-to-end

---

## Lesson 17 - Build & Deploy

* Build NestJS
* CORS
* Helmet
* Rate limiting
* Logging and Monitoring
* PM2
* Docker (basic)
* Deploy lên VPS
* Định hướng mở rộng:
  * Websockets với NestJS
  * Microservices với NestJS
  * GraphQL với NestJS
  * CQRS pattern
  * Event Sourcing
