# Lesson Bonus

Các chủ đề nâng cao, học sau khi hoàn thành 16 buổi chính. Mỗi bài có thể học độc lập, phần "Tiên quyết" ghi rõ cần nắm bài nào trước.

| Bài | Nội dung |
|---|---|
| Bonus 01 | [Request Lifecycle & NestJS Fundamentals nâng cao](./Request-Lifecycle/README.md) |
| Bonus 02 | [Tài liệu hóa API với OpenAPI (Swagger)](./OpenAPI-Swagger/README.md) |
| Bonus 03 | [Events với EventEmitter](./Events/README.md) |
| Bonus 04 | [Queue & Task Scheduling](./Task-scheduling/README.md) |
| Bonus 05 | [Realtime với WebSockets](./Websockets/README.md) |
| Bonus 06 | [GraphQL với NestJS](./GraphQL/README.md) |
| Bonus 07 | [Microservices với NestJS](./Microservices/README.md) |
| Bonus 08 | [Tối ưu hiệu suất](./Performance/README.md) |

## Bonus 01: Request Lifecycle & NestJS Fundamentals nâng cao

> Tiên quyết: Lesson 05, 06, 08, 09, 10, 16. Các khái niệm core đã học rải rác trong khóa chính, bài này đào sâu phần nâng cao.

* Ôn lại Request Lifecycle (tổng hợp từ Lesson 16)
* Dependency Injection nâng cao
  * DI container hoạt động thế nào
  * Custom providers: `useClass`, `useValue`, `useFactory`, `useExisting`
  * Scope của Providers: Singleton, Transient, Request-scoped
* Lifecycle Events (lifecycle hooks)
  * `OnModuleInit`, `OnApplicationBootstrap`
  * `OnModuleDestroy`, `BeforeApplicationShutdown`, `OnApplicationShutdown`
  * `enableShutdownHooks()`
* ExecutionContext
  * `ArgumentsHost` vs `ExecutionContext`
  * HTTP context và switching context
  * `getHandler()` / `getClass()` kết hợp `Reflector`
* Custom Pipe
* Custom Exception
  * Thiết kế BaseException và mã lỗi chuẩn
  * Nhiều Exception Filter: AllExceptions, Database, JWT
* Custom Decorators nâng cao
  * Kết hợp nhiều decorator với `applyDecorators`
* Middleware vs Guard vs Interceptor vs Pipe: khi nào dùng cái nào?

---

## Bonus 02: Tài liệu hóa API với OpenAPI (Swagger)

> Tiên quyết: Lesson 06 (DTO), Lesson 09 (JWT)

* OpenAPI là gì?
* Swagger là gì? Mối quan hệ giữa OpenAPI và Swagger
* Cài đặt và cấu hình `@nestjs/swagger`
* Mô tả API bằng decorators
  * `@ApiTags`, `@ApiOperation`, `@ApiResponse`
  * `@ApiProperty` trên DTO
  * `@ApiBearerAuth` cho route cần JWT
* Swagger CLI plugin: tự sinh mô tả từ DTO
* Tùy chỉnh Swagger UI
* Export OpenAPI spec (JSON) cho frontend/Postman

---

## Bonus 03: Events với EventEmitter

> Tiên quyết: Lesson 05

* Event-driven là gì? Vì sao nên tách logic bằng event
* Cài đặt `@nestjs/event-emitter`
* Emit event và lắng nghe với `@OnEvent()`
* Async listener, wildcard event
* Ví dụ: user đăng ký → gửi mail chào mừng (Lesson 14)
* Giới hạn của event in-process (mất khi app restart) → dẫn tới Queue ở Bonus 04

---

## Bonus 04: Queue & Task Scheduling

> Tiên quyết: Lesson 13 (Redis), Bonus 03

* Queue là gì? Khi nào cần Queue (gửi mail, xử lý ảnh, tác vụ chạy lâu)
* Queue architecture
  * Producer
  * Consumer / Worker
  * Job
* BullMQ với NestJS (`@nestjs/bullmq`), dùng Redis làm backend
  * Tạo Queue, thêm Job
  * Processor xử lý Job
  * Job retry và backoff
  * Job delay
  * Job monitoring (Bull Board)
* Task Scheduling với `@nestjs/schedule`
  * Cron jobs (`@Cron`)
  * Interval, Timeout
  * Lưu ý khi chạy nhiều instance: job bị chạy trùng

---

## Bonus 05: Realtime với WebSockets

> Tiên quyết: Lesson 09 (JWT)

* Realtime là gì? So sánh Polling, Server-Sent Events, WebSocket
* WebSocket là gì?
* WebSocket Gateway trong NestJS (`@WebSocketGateway`)
* Socket.IO với NestJS
  * Emit và listen event (`@SubscribeMessage`)
  * Broadcast
  * Rooms
* Xác thực WebSocket bằng JWT (Guard cho Gateway)
* Chạy nhiều instance với Redis adapter

---

## Bonus 06: GraphQL với NestJS

> Tiên quyết: Lesson 06, 07

* GraphQL là gì? So sánh REST và GraphQL
* Schema, Query, Mutation
* Code-first vs Schema-first
* Cài đặt `@nestjs/graphql` với Apollo
* Resolver, `@ObjectType`, `@Field`, `@InputType`
* Query và Mutation kết hợp TypeORM
* Vấn đề N+1 trong GraphQL và DataLoader

---

## Bonus 07: Microservices với NestJS

> Tiên quyết: Lesson 13, Bonus 03, Bonus 04

* Microservices là gì? Monolith vs Microservices
* Kiến trúc Microservices (API Gateway, mỗi service một database)
* Cài đặt Microservice với `@nestjs/microservices`
* Transport giữa các service
  * TCP
  * Redis
  * NATS
  * RabbitMQ
  * gRPC
* Message patterns
  * Request-response (`@MessagePattern`)
  * Event-based (`@EventPattern`)
* ClientProxy
* Demo: API Gateway + 1 service giao tiếp qua RabbitMQ

---

## Bonus 08: Tối ưu hiệu suất

> Tiên quyết: Lesson 07, 13, 16

* Vì sao cần tối ưu? Đo trước khi tối ưu (benchmark với autocannon/k6)
* Ôn nhanh các kỹ thuật đã học
  * Database: Index, N+1, Pagination, Lazy vs Eager (Lesson 07)
  * Caching với Redis (Lesson 13)
* Connection Pooling với TypeORM
* Nén response (compression)
* Dùng Fastify adapter thay cho Express
* Chạy nhiều process với PM2 cluster mode
* Xử lý bất đồng bộ trong business logic: `Promise.all`, đẩy tác vụ nặng sang Queue (Bonus 04)
* Đo thời gian xử lý bằng Interceptor, structured logging
