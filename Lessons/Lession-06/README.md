# **Middleware, Pipes và Interceptors trong NestJS**  

Trong NestJS, **Middleware, Pipes và Interceptors** là các thành phần giúp **xử lý dữ liệu và yêu cầu** theo từng giai đoạn khác nhau trong vòng đời xử lý request.  

| Thành phần      | Vị trí trong vòng đời request  | Chức năng chính  |
|---------------|--------------------------|----------------|
| **Middleware** | Xử lý trước khi request vào Controller | Xử lý request, authentication, logging... |
| **Pipes**      | Xử lý trước khi dữ liệu được truyền vào Controller | Validation, chuyển đổi kiểu dữ liệu |
| **Interceptors** | Xử lý trước và sau khi Controller xử lý request | Biến đổi response, logging, caching... |

---

## **1. Middleware trong NestJS**  

### **1.1. Giới thiệu về Middleware**  

Middleware là các hàm được thực thi **trước khi request đến Controller**. Middleware thường dùng để:  

✔ **Xác thực (Authentication & Authorization)**  
✔ **Ghi log request**  
✔ **Thay đổi hoặc gán dữ liệu vào request**  
✔ **Cấu hình CORS, bảo vệ API**  

---

### **1.2. Cách tạo Middleware trong NestJS**  

Dưới đây là phần **1.2. Cách tạo Middleware trong NestJS** được trình bày chi tiết hơn, bao gồm các loại Middleware: **Class-based Middleware** và **Function-based Middleware**.  

---

## **1.2. Cách tạo Middleware trong NestJS**  

NestJS hỗ trợ hai cách tạo Middleware chính:  

| Loại Middleware | Cách triển khai | Khi nào nên dùng? |
|---------------|------------------|----------------|
| **Class-based Middleware** | Implement `NestMiddleware` trong một class | Khi cần inject dependencies |
| **Function-based Middleware** | Một hàm đơn thuần xử lý `req, res, next` | Khi middleware đơn giản, không cần inject dependencies |

---

### **1.2.1. Class-based Middleware**  

#### **📌 Định nghĩa Middleware dưới dạng Class**  

Một Middleware dạng Class cần implement `NestMiddleware` và có phương thức `use(req, res, next)`.  

**Ví dụ: LoggerMiddleware – Ghi log request**  

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[Request] ${req.method} - ${req.url}`);
    next(); // Chuyển request sang middleware hoặc controller tiếp theo
  }
}
```

#### **📌 Khi nào nên dùng Middleware dạng Class?**  

✔ Khi cần **inject dependencies** (ví dụ: truy cập database, gọi service khác).  
✔ Khi middleware **có logic phức tạp**, cần tách riêng thành file/class riêng.  

---

### **1.2.2. Function-based Middleware**  

Middleware cũng có thể được định nghĩa dưới dạng một **hàm đơn giản**, tương tự như middleware trong Express.js.  

**Ví dụ: LoggerMiddleware dưới dạng hàm**  

```typescript
import { Request, Response, NextFunction } from 'express';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log(`[Request] ${req.method} - ${req.url}`);
  next(); // Chuyển request sang middleware hoặc controller tiếp theo
}
```

#### **📌 Khi nào nên dùng Middleware dạng hàm?**  

✔ Khi middleware **đơn giản**, không cần inject dependencies.  
✔ Khi cần **viết middleware nhanh chóng** cho các tác vụ nhỏ như **ghi log, chỉnh sửa request body**.  

---

### **1.2.3. Middleware có thể inject dependencies không?**  

- **Class-based Middleware** có thể **inject dependencies** bằng cách sử dụng `@Injectable()`.  
- **Function-based Middleware** **không thể** inject dependencies trực tiếp (vì nó chỉ là một hàm đơn thuần).  

**Ví dụ: Middleware dạng Class sử dụng Service**  

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.loggerService.log(`[Request] ${req.method} - ${req.url}`);
    next();
  }
}
```

📌 **Lưu ý:** Function-based Middleware không thể inject `LoggerService`, chỉ Class-based Middleware có thể làm điều này.

---

### **1.2.4. Middleware có thể trả về response không?**  

Middleware có thể **chặn request và trả về response ngay lập tức** mà không cần chuyển đến Controller.  

**Ví dụ: Middleware chặn request nếu không có token**  

```typescript
import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}
```

📌 **Lưu ý:**  

- Middleware này kiểm tra nếu request **không có token** thì trả về HTTP `401 Unauthorized`.  
- Nếu request hợp lệ, nó gọi `next()` để tiếp tục đến Controller.  

---

### **1.3. Đăng ký Middleware trong Module**  

#### **1.3.1. Đăng ký Middleware trong toàn bộ ứng dụng**  

Để áp dụng middleware cho **toàn bộ ứng dụng**, bạn cần đăng ký nó trong `AppModule` bằng cách sử dụng phương thức `configure()` trong `AppModule`.  

**Ví dụ: Đăng ký LoggerMiddleware cho toàn bộ ứng dụng**  

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './logger.middleware';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*'); // Áp dụng cho toàn bộ ứng dụng
  }
}
```

📌 **Lưu ý:**  

- `forRoutes('*')` áp dụng middleware cho **tất cả các route trong ứng dụng**.  
- Middleware được gọi **trước tất cả các request** đến ứng dụng.  

---

#### **1.3.2. Đăng ký Middleware trong một Module cụ thể**  

Nếu bạn muốn middleware chỉ áp dụng cho một **module cụ thể**, bạn có thể đăng ký nó trong file `module.ts` của module đó.  

**Ví dụ: Áp dụng LoggerMiddleware cho `UsersModule`**  

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './logger.middleware';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(UsersController); // Chỉ áp dụng cho UsersController
  }
}
```

📌 **Lưu ý:**  

- Middleware này **chỉ áp dụng cho module Users** và **không ảnh hưởng đến module khác**.  

---

#### **1.3.3. Đăng ký Middleware cho một Route cụ thể**  

Bạn có thể áp dụng Middleware chỉ cho **một hoặc một số route nhất định** bằng cách chỉ định đường dẫn trong `forRoutes()`.  

**Ví dụ: Middleware chỉ áp dụng cho route `/users`**  

```typescript
consumer.apply(LoggerMiddleware).forRoutes('users');
```

Hoặc chỉ áp dụng cho các phương thức cụ thể như `GET` hoặc `POST`:  

```typescript
import { RequestMethod } from '@nestjs/common';

consumer.apply(LoggerMiddleware).forRoutes({
  path: 'users',
  method: RequestMethod.GET, // Chỉ áp dụng cho GET /users
});
```

📌 **Lưu ý:**  

- `RequestMethod` có thể là `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `ALL`.  
- Cách này giúp bạn kiểm soát Middleware tốt hơn, tránh áp dụng cho toàn bộ hệ thống nếu không cần thiết.  

---

#### **1.3.4. Đăng ký nhiều Middleware cùng lúc**  

Bạn cũng có thể áp dụng nhiều Middleware cùng lúc bằng cách sử dụng `.apply()` nhiều lần hoặc truyền vào một danh sách middleware.  

**Ví dụ: Áp dụng `LoggerMiddleware` và `AuthMiddleware` cùng lúc**  

```typescript
consumer.apply(LoggerMiddleware, AuthMiddleware).forRoutes(UsersController);
```

Hoặc dùng `.apply()` nhiều lần:  

```typescript
consumer.apply(LoggerMiddleware).apply(AuthMiddleware).forRoutes(UsersController);
```

📌 **Lưu ý:** Middleware được thực thi **theo thứ tự khai báo**.  

---

## **2. Pipes trong NestJS**  

### **2.1. Giới thiệu về Pipes**  

Pipes được sử dụng để **chuyển đổi và xác thực dữ liệu đầu vào** trước khi nó đến Controller.  

✔ **Validation (Kiểm tra dữ liệu hợp lệ)**  
✔ **Transformation (Chuyển đổi dữ liệu)**  

---

### **2.2. Built-in pipes**

- ValidationPipe
- ParseIntPipe
- ParseFloatPipe
- ParseBoolPipe
- ParseArrayPipe
- ParseUUIDPipe
- ParseEnumPipe
- DefaultValuePipe
- ParseFilePipe
- ParseDatePipe

Bạn có thể desctructuring từ `@nestjs/common`

### **2.3. Cách tạo Pipes trong NestJS**  

Pipes đơn giản là các class implement `PipeTransform` và định nghĩa phương thức `transform(value, metadata)`.  

**Ví dụ: Pipe chuyển đổi giá trị thành số**  

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform {
  transform(value: string) {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed: Not a number');
    }
    return val;
  }
}
```

---

### **2.4. Sử dụng Pipes trong Controller**  

NestJS hỗ trợ sử dụng Pipes ở nhiều cấp độ:  

#### **Áp dụng Pipe trên một tham số cụ thể**  

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { ParseIntPipe } from './parse-int.pipe';

@Controller('users')
export class UsersController {
  @Get(':id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return `User ID: ${id}`;
  }
}
```

#### **Áp dụng Pipe toàn cục (Global Pipe)**  

```typescript
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe());
```

### **2.5. DefaultValuePipe trong NestJS**  

`DefaultValuePipe` là một **pipe** có sẵn trong NestJS, giúp cung cấp giá trị mặc định cho một tham số nếu không có giá trị nào được truyền vào request. Điều này hữu ích khi bạn muốn đảm bảo một tham số có giá trị hợp lệ mà không cần kiểm tra thủ công trong Controller.  

---

**1. Cách sử dụng `DefaultValuePipe`**  

Bạn có thể sử dụng `DefaultValuePipe` để đặt giá trị mặc định cho các **query parameters**, **route parameters**, hoặc **body data**.  

**Ví dụ: Đặt giá trị mặc định cho query parameter**  

```typescript
import { Controller, Get, Query, DefaultValuePipe } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  getUsers(
    @Query('page', new DefaultValuePipe(1)) page: number, // Mặc định page = 1 nếu không có giá trị
  ) {
    return `Fetching users - Page: ${page}`;
  }
}
```

🔹 **Giải thích:**  

- Nếu request không có `page`, giá trị mặc định là `1`.  
- Nếu request có `?page=5`, giá trị sẽ là `5`.  

📝 **Ví dụ request và kết quả:**  

| Request | Kết quả |
|---------|--------|
| `GET /users` | `"Fetching users - Page: 1"` |
| `GET /users?page=3` | `"Fetching users - Page: 3"` |

---

**2. Áp dụng `DefaultValuePipe` cho Route Parameters**  

Bạn cũng có thể sử dụng `DefaultValuePipe` để đặt giá trị mặc định cho **route parameters**.  

```typescript
import { Controller, Get, Param, DefaultValuePipe } from '@nestjs/common';

@Controller('products')
export class ProductsController {
  @Get(':id')
  getProduct(@Param('id', new DefaultValuePipe(0)) id: number) {
    return `Product ID: ${id}`;
  }
}
```

🔹 **Giải thích:**  

- Nếu `id` không được cung cấp, giá trị mặc định là `0`.  

---

**3. Kết hợp `DefaultValuePipe` với ValidationPipe**  

Bạn có thể kết hợp `DefaultValuePipe` với `ParseIntPipe` hoặc các pipes khác để kiểm tra kiểu dữ liệu.  

```typescript
import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  @Get()
  getOrders(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return `Fetching ${limit} orders`;
  }
}
```

🔹 **Giải thích:**  

- `DefaultValuePipe(10)`: Nếu không có `limit`, mặc định là `10`.  
- `ParseIntPipe`: Chuyển đổi giá trị `limit` sang số nguyên.  

📝 **Ví dụ request và kết quả:**  

| Request | Kết quả |
|---------|--------|
| `GET /orders` | `"Fetching 10 orders"` |
| `GET /orders?limit=5` | `"Fetching 5 orders"` |

---

**4. Lợi ích của `DefaultValuePipe`**  

✅ **Tránh kiểm tra thủ công**: Không cần viết `if (!param) { param = default }`.  
✅ **Cải thiện readability**: Code gọn gàng, dễ đọc hơn.  
✅ **Kết hợp dễ dàng với các pipes khác**: Có thể kết hợp với `ParseIntPipe`, `ValidationPipe` để kiểm tra kiểu dữ liệu.  
✅ **Hữu ích trong API pagination, filters**: Thường dùng để đặt giá trị mặc định cho `page`, `limit`, `sort`, v.v.  

---

## **3. Request Validation trong NestJS**

Request Validation là một phần quan trọng trong NestJS giúp đảm bảo dữ liệu đầu vào từ request hợp lệ trước khi được xử lý. NestJS hỗ trợ Schema-based validation và Class-based validation để kiểm tra dữ liệu request.

### **3.1. Schema-based Validation với Zod**  

Zod là một thư viện mạnh mẽ giúp xác thực dữ liệu bằng cách định nghĩa schema. Đây là một lựa chọn thay thế linh hoạt hơn so với Joi.  

#### **📌 Cài đặt Zod**  

```bash
npm install zod @nestjs/zod
```

#### **📌 Định nghĩa Schema Validation với Zod**  

```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3, 'Username phải có ít nhất 3 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  age: z.number().int().min(18, 'Tuổi phải lớn hơn hoặc bằng 18').optional(),
});
```

#### **📌 Tạo Custom Pipe để Validate với Zod**  

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.errors);
    }
    return result.data;
  }
}
```

#### **📌 Sử dụng Zod Validation trong Controller**  

```typescript
import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { createUserSchema } from '../schemas/user.schema';

@Controller('users')
export class UsersController {
  @Post()
  @UsePipes(new ZodValidationPipe(createUserSchema))
  createUser(@Body() userData) {
    return `User created: ${JSON.stringify(userData)}`;
  }
}
```

📌 **Lợi ích của Zod:**  

- **Dễ sử dụng**: Không cần định nghĩa DTO riêng, có thể tái sử dụng schemas.  
- **Thông báo lỗi chi tiết**: Zod cung cấp lỗi rõ ràng khi dữ liệu không hợp lệ.  
- **Hỗ trợ mạnh mẽ**: Làm việc tốt với TypeScript và có khả năng kiểm tra dữ liệu linh hoạt hơn Joi.  

---

### **3.2. Class-based Validation với `class-validator`**  

Cách tiếp cận này tận dụng decorators TypeScript để kiểm tra dữ liệu request.  

#### **📌 Cài đặt `class-validator` và `class-transformer`**  

```bash
npm install class-validator class-transformer
```

#### **📌 Định nghĩa DTO với Validation Decorators**  

```typescript
import { IsString, IsEmail, MinLength, IsOptional, IsInt, Min } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3, { message: 'Username phải có ít nhất 3 ký tự' })
  username: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsOptional()
  @IsInt()
  @Min(18, { message: 'Tuổi phải lớn hơn hoặc bằng 18' })
  age?: number;
}
```

#### **📌 Áp dụng DTO trong Controller với `ValidationPipe`**  

```typescript
import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  @Post()
  @UsePipes(new ValidationPipe())
  createUser(@Body() userData: CreateUserDto) {
    return `User created: ${JSON.stringify(userData)}`;
  }
}
```

📌 **Lưu ý:**  

- Nếu dữ liệu không hợp lệ, `ValidationPipe` sẽ tự động trả về lỗi 400 với thông tin chi tiết.  

---

### **3.3. Kết hợp Zod và class-validator**  

NestJS cho phép sử dụng cả hai phương pháp:  

- **Zod**: Linh hoạt, dễ tái sử dụng schema.  
- **Class-validator**: Rõ ràng khi dùng TypeScript với decorators.  

#### **📌 Ví dụ kết hợp cả hai**  

```typescript
import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { createUserSchema } from '../schemas/user.schema';

@Controller('users')
export class UsersController {
  @Post('class-validator')
  @UsePipes(new ValidationPipe()) // Sử dụng class-validator
  createUserWithClassValidator(@Body() userData: CreateUserDto) {
    return `User created (class-validator): ${JSON.stringify(userData)}`;
  }

  @Post('zod')
  @UsePipes(new ZodValidationPipe(createUserSchema)) // Sử dụng Zod
  createUserWithZod(@Body() userData) {
    return `User created (Zod): ${JSON.stringify(userData)}`;
  }
}
```

📌 **So sánh Zod và class-validator**  

| Tiêu chí | Zod | class-validator |
|----------|-----|----------------|
| **Cách sử dụng** | Schema-based | Decorators TypeScript |
| **Tái sử dụng** | Dễ tái sử dụng schemas | DTO thường được dùng riêng |
| **Khả năng mở rộng** | Hỗ trợ validation nâng cao | Hạn chế hơn |
| **Performance** | Nhanh hơn khi parse dữ liệu | Chậm hơn do decorators |
| **Hỗ trợ kiểu dữ liệu** | Rất mạnh mẽ | Hạn chế hơn |

---

### **3.4. Cấu hình nâng cao cho `ValidationPipe`**  

NestJS cho phép tùy chỉnh `ValidationPipe` để phù hợp với nhu cầu.  

```typescript
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Loại bỏ các thuộc tính không khai báo trong DTO
    forbidNonWhitelisted: true, // Ném lỗi nếu có thuộc tính không hợp lệ
    transform: true, // Chuyển đổi kiểu dữ liệu theo DTO
  }),
);
```

📌 **Giải thích:**  

- `whitelist: true`: Bỏ qua các fields không khai báo trong DTO.  
- `forbidNonWhitelisted: true`: Ném lỗi nếu có fields không hợp lệ.  
- `transform: true`: Chuyển đổi kiểu dữ liệu (ví dụ: query string → number).  

---

### **3.5 Tổng kết**  

| Loại validation | Công nghệ | Khi nào sử dụng? |
|---------------|----------|----------------|
| **Schema-based** | Zod | Khi cần validation linh hoạt, không dùng DTO |
| **Class-based** | class-validator | Khi dùng TypeScript, muốn tận dụng decorators |
| **Kết hợp cả hai** | Zod + class-validator | Khi cần kiểm tra mạnh mẽ hơn |

Zod giúp validation dễ dàng hơn, mạnh mẽ hơn, trong khi class-validator phù hợp nếu bạn thích sử dụng decorators TypeScript. Bạn có thể chọn cách phù hợp nhất cho dự án của mình! 🚀

## **4. Interceptors trong NestJS**  

### **4.1. Giới thiệu về Interceptors**  

Interceptors hoạt động **trước và sau khi request được xử lý trong Controller**. Chúng được sử dụng để:  

✔ **Logging request/response**  
✔ **Caching response**  
✔ **Biến đổi response trước khi gửi về client**  

Xem thêm: <https://docs.nestjs.com/interceptors#interceptors>

### **4.2. Cách tạo Interceptor trong NestJS**  

Một Interceptor implement `NestInterceptor` và có phương thức `intercept()`.  

**Ví dụ: Logging Interceptor**  

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before request is handled...');
    return next.handle().pipe(
      tap(() => console.log('After response is sent...')),
    );
  }
}
```

---

### **4.3. Sử dụng Interceptor trong Controller**  

#### **Áp dụng Interceptor cho một route cụ thể**  

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';

@Controller('users')
export class UsersController {
  @Get()
  @UseInterceptors(LoggingInterceptor)
  getUsers() {
    return [{ id: 1, name: 'John Doe' }];
  }
}
```

#### **Áp dụng Interceptor toàn cục**  

```typescript
import { LoggingInterceptor } from './logging.interceptor';

app.useGlobalInterceptors(new LoggingInterceptor());
```

📌 **Lưu ý:**  

- Interceptor có thể **chặn và thay đổi response** trước khi trả về client.  
- Interceptor có thể kết hợp với **RxJS** để thực hiện các tác vụ bất đồng bộ.  

---

## **5. Decorators trong NestJS**

Tuyệt! Dưới đây là phần **giới thiệu Decorators dành cho người mới bắt đầu**, đặc biệt hữu ích nếu bạn đang làm quen với **NestJS**, **TypeScript**, hoặc các framework hiện đại như Angular.

---

## 🧠 Decorators là gì?

Decorators (trong TypeScript) là **hàm đặc biệt** dùng để **gắn metadata** hoặc **can thiệp hành vi** của class, method, property, parameter, v.v.

> 🎯 Hiểu đơn giản: Decorator là một “cái nhãn” bạn dán vào class hoặc hàm để nói "hãy làm gì đó đặc biệt với nó".

---

## ✨ Cú pháp Decorator

```ts
@DecoratorName()
class MyClass {}
```

Nó thực chất là một **hàm** chạy lúc chương trình khởi tạo class.

---

## 🎯 Ví dụ đơn giản

```ts
function LogClass(constructor: Function) {
  console.log(`Class created: ${constructor.name}`);
}

@LogClass
class Hello {}
```

> Khi bạn định nghĩa class `Hello`, nó sẽ **log tên class** ra console.

---

## 🔥 Các loại Decorators trong TypeScript / NestJS

| Loại | Mục tiêu | Ví dụ |
|------|----------|-------|
| Class Decorator | Gắn cho class | `@Controller()`, `@Injectable()` |
| Method Decorator | Gắn cho method | `@Get()`, `@Post()`, `@UseGuards()` |
| Property Decorator | Gắn cho thuộc tính | `@Inject()`, `@Prop()` (Mongoose) |
| Parameter Decorator | Gắn cho tham số | `@Param()`, `@Body()`, `@Query()` |

---

## 📦 Trong NestJS

NestJS heavily sử dụng decorators để định nghĩa:

### ✅ Controller

```ts
@Controller('users')
export class UsersController {
  @Get()
  getAllUsers() {
    return ['Alice', 'Bob'];
  }
}
```

### ✅ Service

```ts
@Injectable()
export class UsersService {
  getUsers() {
    return ['User A'];
  }
}
```

### ✅ Request parameters

```ts
@Get(':id')
getUser(@Param('id') userId: string) {
  return `User with ID: ${userId}`;
}
```

---

## 🤔 Tại sao nên dùng Decorators?

- 📚 Code rõ ràng, khai báo thay vì cấu hình (`declarative over imperative`)
- 🔁 Dễ tái sử dụng logic (VD: tạo decorator `@Roles('admin')`)
- 🔧 Dễ mở rộng framework (NestJS bản chất là dựa trên decorators)

---

## 🧪 Decorator tự tạo

```ts
function LogMessage(message: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = function (...args: any[]) {
      console.log(`[LOG]: ${message}`);
      return original.apply(this, args);
    };
  };
}

class Demo {
  @LogMessage('Gọi hàm hello')
  hello() {
    console.log('Xin chào');
  }
}
```

---

Trong NestJS, bạn có thể tự tạo **Custom Decorators** rất dễ dàng, để:

- Gắn thêm logic như **check quyền**, **log**, **gán metadata**…
- Đọc hoặc ghi dữ liệu vào context (request)
- Viết ngắn gọn và tái sử dụng

---

## ✅ Các dạng Custom Decorators phổ biến

| Dạng Decorator | Dùng để | Ví dụ |
|----------------|--------|--------|
| Parameter      | Đọc thông tin từ request | `@User()`, `@Ip()` |
| Method         | Gắn middleware logic | `@Roles()`, `@Log()` |
| Class          | Gắn logic cho cả controller | `@Public()` |

---

## 🔧 Ví dụ 1: Custom Parameter Decorator – `@User()`

### 🧑 Mục tiêu: Lấy `req.user` (đã set bởi Guard hoặc Middleware)

```ts
// user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

### ✅ Sử dụng

```ts
@Get('profile')
getProfile(@User() user: any) {
  return user;
}

@Get('username')
getUsername(@User('username') username: string) {
  return `Hello ${username}`;
}
```

---

## 🔧 Ví dụ 2: Custom Method Decorator – `@Roles()`

### 👮 Mục tiêu: Đánh dấu route cần quyền truy cập

```ts
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

### ✅ Dùng chung với Guard

```ts
@Roles('admin')
@Get('admin-only')
getSecret() {
  return 'Secret content';
}
```

Và trong `RolesGuard`:

```ts
const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
```

---

## 🔧 Ví dụ 3: Custom Class Decorator – `@Public()`

### 🔓 Mục tiêu: Cho phép route không cần auth

```ts
// public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);
```

Sau đó dùng trong `AuthGuard`:

```ts
const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
if (isPublic) return true;
```

---

## 🔧 Ví dụ 4: Log Method Decorator – `@LogExecutionTime()`

```ts
// log.decorator.ts
export function LogExecutionTime(): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const result = await method.apply(this, args);
      const duration = Date.now() - start;
      console.log(`⏱️ ${String(propertyKey)} took ${duration}ms`);
      return result;
    };
  };
}
```

```ts
@LogExecutionTime()
@Get()
getSomething() {
  //...
}
```

---

## 📦 Tổng kết

| Tên Decorator     | Dùng cho           | Công cụ |
|------------------|--------------------|---------|
| `@createParamDecorator()` | Lấy param từ request | ✅ |
| `@SetMetadata()` | Gắn metadata cho route | ✅ |
| Method Decorator | Log, validate, đo thời gian | `descriptor.value` |

---

Bạn muốn mình tạo sẵn bộ `@Roles()`, `@Public()`, `@User()` và `AuthGuard` mẫu để bạn áp dụng cho dự án không? Mình có thể scaffold sẵn nhé.
