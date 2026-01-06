# **Xử lý Exceptions, Monitoring và Logging trong NestJS**  

## **1. Giới thiệu**  

NestJS cung cấp các công cụ mạnh mẽ để **xử lý lỗi (Exception Handling)**, **giám sát ứng dụng (Monitoring)** và **ghi log (Logging)** giúp việc debug và bảo trì hệ thống trở nên dễ dàng hơn.  

**Các nội dung chính:**  
- Xử lý Exceptions với **Exception Filters**  
- Ghi log với **Logger**  
- Giám sát ứng dụng với **Interceptors và Middleware**  

---

## **2. Xử lý Exceptions với Exception Filters**  

### **📌 Cơ chế xử lý lỗi mặc định trong NestJS**  

Mặc định, NestJS sẽ tự động bắt lỗi trong các **request handlers** và trả về **HTTP response phù hợp**. Ví dụ:  

```typescript
@Get()
getData() {
  throw new Error('Lỗi xảy ra!');
}
```

✅ NestJS sẽ trả về **500 Internal Server Error** với message `"Internal Server Error"`.  

Nhưng nếu bạn muốn **tùy chỉnh phản hồi lỗi**, bạn cần sử dụng **Exception Filters**.  

---

### **📌 Sử dụng Exception Filters tùy chỉnh**  

📌 **Tạo file `http-exception.filter.ts`**  

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch(HttpException) // Chỉ bắt lỗi HttpException
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.message || 'Có lỗi xảy ra';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

📌 **Cách sử dụng trong Controller**  

```typescript
import { Controller, Get, UseFilters } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

@Controller('users')
@UseFilters(HttpExceptionFilter) // Áp dụng filter cho toàn bộ controller
export class UserController {
  @Get()
  getData() {
    throw new HttpException('User not found', 404);
  }
}
```

📌 **Hoặc đăng ký toàn cục trong `main.ts`**  

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
bootstrap();
```

---

## **3. Logging trong NestJS**  

### **📌 Sử dụng Logger mặc định của NestJS**  

NestJS cung cấp **Logger** có thể sử dụng trực tiếp trong các **Service, Controller** để ghi log.  

📌 **Sử dụng Logger trong Service**  

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    this.logger.log('Gọi API getHello()'); // Log mức độ thông tin
    this.logger.warn('Cảnh báo!'); // Log cảnh báo
    this.logger.error('Lỗi xảy ra!'); // Log lỗi
    return 'Hello NestJS!';
  }
}
```

📌 **Mức độ log có thể sử dụng:**  
- `log()` → Thông tin chung  
- `warn()` → Cảnh báo  
- `error()` → Lỗi  
- `debug()` → Log debug  
- `verbose()` → Log chi tiết  

---

### **📌 Tạo Custom Logger**  

Bạn có thể tạo **Logger tùy chỉnh** bằng cách kế thừa `LoggerService`.  

📌 **Tạo `custom-logger.service.ts`**  

```typescript
import { LoggerService, Injectable } from '@nestjs/common';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }
  error(message: string, trace: string) {
    console.error(`[ERROR]: ${message}`, trace);
  }
  warn(message: string) {
    console.warn(`[WARN]: ${message}`);
  }
  debug(message: string) {
    console.debug(`[DEBUG]: ${message}`);
  }
  verbose(message: string) {
    console.info(`[VERBOSE]: ${message}`);
  }
}
```

📌 **Sử dụng Custom Logger trong AppModule**  

```typescript
import { Module } from '@nestjs/common';
import { CustomLogger } from './custom-logger.service';

@Module({
  providers: [CustomLogger],
  exports: [CustomLogger],
})
export class LoggerModule {}
```

📌 **Đăng ký trong `main.ts`**  

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLogger } from './custom-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(new CustomLogger()); // Đăng ký Logger tùy chỉnh
  await app.listen(3000);
}
bootstrap();
```

---

## **4. Monitoring và Logging nâng cao**  

### **📌 Sử dụng Interceptor để log thời gian thực thi**  

Bạn có thể sử dụng **Interceptor** để log **thời gian xử lý request**.  

📌 **Tạo file `logging.interceptor.ts`**  

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Request bắt đầu...');
    const start = Date.now();
    
    return next.handle().pipe(
      tap(() => console.log(`Hoàn thành sau ${Date.now() - start}ms`)),
    );
  }
}
```

📌 **Sử dụng trong `main.ts`**  

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.listen(3000);
}
bootstrap();
```

✅ Khi có request, hệ thống sẽ log thời gian thực thi.  

---

## **Tổng kết**  

| **Tính năng** | **Công cụ sử dụng** |
|--------------|----------------|
| **Xử lý lỗi** | Exception Filters (`@Catch()`) |
| **Ghi log** | `Logger`, `CustomLogger` |
| **Giám sát** | `Interceptors` để log thời gian thực thi |

✅ NestJS cung cấp đầy đủ công cụ để **xử lý exceptions**, **giám sát ứng dụng**, và **ghi log**, giúp việc phát triển và bảo trì ứng dụng hiệu quả hơn. 🚀

✅ Xem thêm về xây dựng hệ thống giám sát log [Grafana Loki](./Grafana-Loki.md)