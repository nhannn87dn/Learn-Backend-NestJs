# Bonus 01: Request Lifecycle & NestJS Fundamentals nâng cao

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
