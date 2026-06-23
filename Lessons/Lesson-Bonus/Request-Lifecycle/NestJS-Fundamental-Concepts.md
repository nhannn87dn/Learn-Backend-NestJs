# Lesson 04: NestJS Fundamental Concepts

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
