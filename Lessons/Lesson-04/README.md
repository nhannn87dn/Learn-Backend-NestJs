# Lesson 04 - Request Lifecycle and Data Flow

## Mục tiêu bài học

- Hiểu về Decorators và cách chúng hoạt động trong NestJS
- Hiểu về vòng đời của một request trong NestJS
- Tìm hiểu về Validation và Transformation với DTO
- Quản lý lỗi và Serialization trong NestJS
- Chuẩn hóa Responses
- Hiểu về Execution Context và Metadata với Decorators

---

## 1. Decorators trong NestJS

### 1.1. Decorators là gì?

**Decorators** là một tính năng của TypeScript cho phép bạn thêm metadata vào các class, method, property, hoặc parameter. Trong NestJS, decorators được sử dụng rộng rãi để định nghĩa các thành phần của ứng dụng như controllers, services, modules, và để cấu hình routing, validation, guards, interceptors, v.v.

### 1.2. Các loại Decorators trong NestJS:

#### 1.2.1. Class Decorators

**Class decorators** được áp dụng cho class và thường dùng để định nghĩa controllers, services, modules, v.v.

Danh sách một số class decorators phổ biến:

| Decorator | Mục đích | Ví dụ |
|-----------|----------|-------|
| `@Controller()` | Định nghĩa một controller | `@Controller('books')` |
| `@Injectable()` | Định nghĩa một service có thể inject được | `@Injectable()` |
| `@Module()` | Định nghĩa một module | `@Module({ imports: [], controllers: [], providers: [] })` |
| `@Catch()` | Định nghĩa một exception filter | `@Catch(HttpException)` |
| `@UseGuards()` | Áp dụng guards cho class | `@UseGuards(AuthGuard)` |
| `@UseInterceptors()` | Áp dụng interceptors cho class | `@UseInterceptors(LoggingInterceptor)` |
| `@UsePipes()` | Áp dụng pipes cho class | `@UsePipes(ValidationPipe)` |
| `@UseFilters()` | Áp dụng exception filters cho class | `@UseFilters(HttpExceptionFilter)` |
| `@Global()` | Định nghĩa một global module | `@Global()` |

Ví dụ:

```typescript
import { Controller, Get } from '@nestjs/common';
//Đây là một class decorator, nó đánh dấu BooksController là một controller và định nghĩa route prefix là 'books'
@Controller('books')
export class BooksController {
  @Get()
  findAll() {
    return 'This action returns all books';
  }
}
```

#### 1.2.2. Method Decorators

**Method Decorators** là các decorators được áp dụng cho các phương thức trong class, thường dùng để định nghĩa các route handlers trong controllers.

Danh sách một số method decorators phổ biến:

| Decorator | Mục đích | Ví dụ |
|-----------|----------|-------|
| `@Get()` | Định nghĩa route handler cho GET requests | `@Get('all')` |
| `@Post()` | Định nghĩa route handler cho POST requests | `@Post('create')` |
| `@Put()` | Định nghĩa route handler cho PUT requests | `@Put('update')` |
| `@Delete()` | Định nghĩa route handler cho DELETE requests | `@Delete('delete')` |
| `@Patch()` | Định nghĩa route handler cho PATCH requests | `@Patch('partial-update')` |
| `@Options()` | Định nghĩa route handler cho OPTIONS requests | `@Options('options')` |
| `@Head()` | Định nghĩa route handler cho HEAD requests | `@Head('head')` |

Ví dụ:

```typescript
import { Controller, Get } from '@nestjs/common';
@Controller('books')
export class BooksController {
  @Get() // Đây là một method decorator, nó đánh dấu phương thức findAll là một route handler cho GET requests tại route '/books'
  findAll() {
    return 'This action returns all books';
  }
}
```

#### 1.2.3. Parameter Decorators

**Parameter Decorators** là các decorators được áp dụng cho các tham số của phương thức, thường dùng để lấy dữ liệu từ request như body, query, params, headers, v.v.

Danh sách một số parameter decorators phổ biến:
| Decorator | Mục đích | Ví dụ |
|-----------|----------|-------|
| `@Body()` | Lấy dữ liệu từ request body | `create(@Body() createBookDto: CreateBookDto)` |
| `@Query()` | Lấy dữ liệu từ query parameters | `findAll(@Query() filterDto: FilterBooksDto)` |
| `@Param()` | Lấy dữ liệu từ route parameters | `findOne(@Param('id') id: string)` |
| `@Headers()` | Lấy dữ liệu từ request headers | `getHeader(@Headers('authorization') auth: string)` |


Ví dụ:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
@Controller('books')
export class BooksController {
  @Get(':id') // Đây là một method decorator, nó đánh dấu phương thức findOne là một route handler cho GET requests tại route '/books/:id'
  findOne(@Param('id') id: string) { // Đây là một parameter decorator, nó đánh dấu tham số id sẽ lấy giá trị từ route parameter 'id'
    return `This action returns a book with id ${id}`;
  }
}
```

---

## 2. Dependency Injection trong NestJS

### 2.1. Dependency Injection là gì?

**Dependency Injection (DI)** là một design pattern giúp quản lý dependencies giữa các class một cách hiệu quả. Thay vì tự tạo instance của dependencies, class sẽ nhận chúng từ bên ngoài thông qua constructor hoặc setter methods.

**Gốc của vấn đề xuất phát từ ví dụ dưới đây:**

**Khi không sử dụng DI**: chúng ta phải tự tạo instance của `BooksService` trong `BooksController`

```typescript
export class BooksController {
  private booksService: BooksService;

  constructor() {
    this.booksService = new BooksService(); // Tạo instance thủ công
  }

  @Get()
  findAll() {
    return this.booksService.findAll();
  }
}
```

Điều này gây ra nhiều vấn đề:

- Khó kiểm soát lifecycle của dependencies
- Không thể dễ dàng mock dependencies trong testing
- Tăng coupling giữa các class

**Khi sử dụng DI**: NestJS sẽ tự động inject instance của `BooksService` vào `BooksController`

```typescript
import { Controller, Get } from '@nestjs/common';
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {} // Dependency được inject qua constructor

  @Get()
  findAll() {
    return this.booksService.findAll();
  }
}
```

### 2.2 DI container trong NestJS là gì

**DI Container** là một thành phần của framework chịu trách nhiệm quản lý lifecycle và dependencies của các class trong ứng dụng. Nó cho phép bạn đăng ký các providers (services, repositories, v.v.) và tự động inject chúng vào các class khác khi cần thiết.

Trong NestJS, DI container được tích hợp sẵn và hoạt động dựa trên các decorators như `@Injectable()`, `@Module()`, v.v. Khi bạn đánh dấu một class là `@Injectable()`, NestJS sẽ biết rằng class đó có thể được inject vào các class khác.

### 2.3. Tổng quan về Providers

### 2.3.1. Providers là gì?

**Providers** là các class có thể được inject vào các class khác thông qua DI container. Chúng thường được sử dụng để chứa business logic, truy cập database, hoặc thực hiện các tác vụ khác.

Bất kỳ class nào có thể được **inject** vào class khác đều là provider.

**Các loại Provider phổ biến:**

- Service
- Repository
- Factory
- Helper

### 2.3.2. `@Injectable()` Decorator

Để một class có thể được inject, bạn cần đánh dấu nó bằng `@Injectable()` decorator. Điều này cho phép NestJS biết rằng class đó có thể được quản lý bởi DI container.


```typescript
import { Injectable } from '@nestjs/common';

// Service Provider
@Injectable()
export class BooksService {}

// Repository Provider
@Injectable()
export class BooksRepository {}

// Helper Provider
@Injectable()
export class StringHelper {}
```


### 2.3.3 Inject Service vào Controller

NestJS sử dụng **Constructor Injection** để inject dependencies.

```typescript
// src/books/books.controller.ts
import { Controller, Get } from '@nestjs/common';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  // Inject BooksService vào controller
  constructor(private readonly booksService: BooksService) {}
  
  @Get()
  findAll() {
    // Sử dụng service đã được inject
    return this.booksService.findAll();
  }
}
```

**Giải thích:**

```typescript
constructor(private readonly booksService: BooksService) {}
```

- `private`: Tạo property private cho class
- `readonly`: Không thể thay đổi sau khi khởi tạo
- `booksService`: Tên biến
- `BooksService`: Type (NestJS dùng type này để inject đúng service)

**Tương đương với:**

```typescript
private readonly booksService: BooksService;

constructor(booksService: BooksService) {
  this.booksService = booksService;
}
```

**Ví dụ inject nhiều service:**

```typescript
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly booksService: BooksService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    // Sử dụng nhiều service
    const book = await this.booksService.findOne(createOrderDto.bookId);
    const user = await this.usersService.findOne(createOrderDto.userId);
    const order = await this.ordersService.create(createOrderDto);
    await this.emailService.sendOrderConfirmation(user.email, order);
    
    return order;
  }
}
```

### 2.3.4. Đăng ký Providers trong Module

Để một provider có thể được inject, bạn cần đăng ký nó trong module. Bạn có thể đăng ký providers trong `providers` array của module.

```typescript
// src/books/books.module.ts
import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
@Module({
  controllers: [BooksController],
  providers: [BooksService], // Đăng ký BooksService như một provider
})
export class BooksModule {}
```

### 2.3.5. Scope của Providers

Mặc định, các provider trong NestJS có scope là **Singleton**, nghĩa là chỉ có một instance duy nhất được tạo ra và chia sẻ trong toàn bộ ứng dụng. Tuy nhiên, bạn cũng có thể cấu hình scope của provider thành **Request** hoặc **Transient** nếu cần.

- **Singleton**: Một instance duy nhất cho toàn bộ ứng dụng (mặc định)

Ví dụ:

```typescript
@Injectable({ scope: Scope.DEFAULT }) // Hoặc không cần khai báo vì đây là mặc định
export class BooksService {}
```

- **Request**: Một instance mới được tạo cho mỗi request

```typescript
@Injectable({ scope: Scope.REQUEST })
export class BooksService {}
```

- **Transient**: Một instance mới được tạo mỗi khi provider được inject

```typescript
@Injectable({ scope: Scope.TRANSIENT })
export class BooksService {}
```

**Khi nào thì nên dùng loại nào?**

- **Singleton**: Phù hợp cho hầu hết các service, đặc biệt là những service không giữ state hoặc có thể chia sẻ state giữa các request.

- **Request**: Phù hợp cho các service cần giữ state riêng biệt cho mỗi request, ví dụ như service quản lý session hoặc request-specific data.

- **Transient**: Phù hợp cho các service cần tạo instance mới mỗi khi được sử dụng, ví dụ như service thực hiện các tác vụ ngắn hạn hoặc có thể gây ra side effects nếu chia sẻ instance.


---

## 3. Lifecycle trong NestJS

### 3.1. Vòng đời của một Request

Khi một request đến NestJS application, nó sẽ đi qua các bước sau theo thứ tự:

```
Incoming Request
    ↓
1. Middleware
    ↓
2. Guards
    ↓
3. Interceptors (before)
    ↓
4. Pipes
    ↓
5. Controller/Route Handler
    ↓
6. Service (Business Logic)
    ↓
7. Interceptors (after)
    ↓
8. Exception Filters
    ↓
Outgoing Response
```

![NestJS Request Lifecycle](./img/lifecycle-nestjs.png)

**Giải thích chi tiết từng bước:**

- **Middleware**: Xử lý trước khi request đến router (logging, CORS, authentication setup)
- **Guards**: Kiểm tra quyền truy cập, xác thực (authentication/authorization)
- **Interceptors (before)**: Biến đổi request, thêm logic trước khi xử lý
- **Pipes**: Validate và transform dữ liệu đầu vào
- **Controller**: Nhận request và gọi service
- **Service**: Xử lý business logic
- **Interceptors (after)**: Biến đổi response, thêm logic sau khi xử lý
- **Exception Filters**: Bắt và xử lý lỗi

### 3.2. Ví dụ minh họa Request Lifecycle

Dưới đây là ví dụ minh họa về cách các thành phần trong `lifecycle` hoạt động cùng nhau.
Để bạn nắm được `Data Flow` và thứ tự thực thi của từng thành phần.

**Tạo Middleware để log thông tin request:**

```typescript
// src/common/middleware/logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    console.log('1. Middleware: Logging request');

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} - ${responseTime}ms`
      );
    });

    next();
  }
}
```

**Đăng ký Middleware trong Module:**

```typescript
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { BooksModule } from './books/books.module';

@Module({
  imports: [BooksModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // Áp dụng cho tất cả routes
  }
}
```

**Tạo Guard để kiểm tra authentication:**

```typescript
// src/common/guards/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    console.log('2. Guard: Checking authentication');
    
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  private validateRequest(request: any): boolean {
    // Kiểm tra token hoặc session
    const token = request.headers.authorization;
    
    if (!token) {
      throw new UnauthorizedException('No authorization token provided');
    }
    
    // Giả lập validate token
    if (!token.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token format');
    }
    
    return true;
  }
}
```

**Tạo Interceptor để log và transform response:**

```typescript
// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('3. Interceptor (before): Before handling request');
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        console.log(`7. Interceptor (after): After handling request - ${Date.now() - now}ms`);
      })
    );
  }
}
```

**Sử dụng trong Controller:**

```typescript
// src/books/books.controller.ts
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { BooksService } from './books.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

@Controller('books')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll() {
    console.log('5. Controller: Handling request');
    return this.booksService.findAll();
  }
}
```

**Flow khi gọi API:**

```
GET /books
Header: Authorization: Bearer token123

Console output:
1. Middleware: Logging request
2. Guard: Checking authentication
3. Interceptor (before): Before handling request
4. Pipe: Validating and transforming data (nếu có)
5. Controller: Handling request
6. Service: Processing business logic
7. Interceptor (after): After handling request - 15ms
HTTP GET /books 200 - 15ms
```

### 3.3. Lifecycle Events

Xem chi tiết [Lifecycle Events trong NestJS](./lifecycle-event.md)

NestJS cung cấp các lifecycle hooks cho modules, services, và controllers:

```typescript
// src/books/books.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class BooksService implements OnModuleInit, OnModuleDestroy {
  private books = [];

  // Được gọi khi module được khởi tạo
  onModuleInit() {
    console.log('BooksService initialized');
    // Khởi tạo dữ liệu, kết nối database, etc.
    this.loadInitialData();
  }

  // Được gọi khi module bị hủy
  onModuleDestroy() {
    console.log('BooksService destroyed');
    // Cleanup: đóng kết nối, giải phóng resources
    this.cleanup();
  }

  private loadInitialData() {
    this.books = [
      { id: 1, title: 'Clean Code', description: 'A handbook of agile software craftsmanship', pages: 464, genres: ['Programming', 'Software Engineering'] },
      { id: 2, title: 'The Pragmatic Programmer', description: 'Your journey to mastery', pages: 352, genres: ['Programming'] },
    ];
  }

  private cleanup() {
    this.books = [];
  }

  findAll() {
    console.log('6. Service: Processing business logic');
    return this.books;
  }
}
```

**Các Lifecycle Hooks:**

| Hook | Mô tả | Thời điểm gọi |
|------|-------|---------------|
| `onModuleInit()` | Được gọi sau khi dependencies đã được resolved | Khởi tạo module |
| `onApplicationBootstrap()` | Được gọi sau khi tất cả modules đã init | App sẵn sàng |
| `onModuleDestroy()` | Được gọi trước khi module bị destroy | Cleanup trước khi tắt |
| `beforeApplicationShutdown()` | Được gọi trước khi app shutdown | Trước shutdown |
| `onApplicationShutdown()` | Được gọi khi app shutdown | Trong quá trình shutdown |

Tài liệu chính thức: [Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)


### 3.4. Tổng quan các thành phần trong Lifecycle

#### 3.4.1 Middleware

**Middleware là gì?**

Middleware là các hàm được thực thi trước khi request đến controller. Chúng có thể thao tác với request và response objects, hoặc kết thúc chuỗi request-response.

**Cách tạo một Middleware**

Dưới đây là ví dụ về một Middleware đơn giản để log thông tin request:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`Request... ${req.method} ${req.originalUrl}`);
    next();
  }
}
```

**Khi nào sử dụng Middleware?**

- Logging requests
- Xử lý CORS
- Xác thực (authentication setup)
- Thêm headers chung

#### 3.4.2 Guards

**Guard là gì?**

Guard là các lớp dùng để xác định xem một request có được phép truy cập vào route hay không. Chúng thường được sử dụng cho mục đích xác thực và phân quyền.

**Cách tạo một Guard**

Dưới đây là ví dụ về một Guard đơn giản để kiểm tra authentication:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }
  private validateRequest(request: any): boolean {
    const token = request.headers.authorization;
    return !!token; // Giả lập kiểm tra token
  }
}
```

**Khi nào sử dụng Guard?**

- Xác thực (Authentication)
- Phân quyền (Authorization)

#### 3.4.3 Interceptors

**Interceptor là gì?**

Interceptor là các lớp dùng để can thiệp vào quá trình xử lý request-response. Chúng có thể biến đổi dữ liệu, thêm logic trước và sau khi controller xử lý request.

**Cách tạo một Interceptor**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before handling request');
    const now = Date.now();
    return next.handle().pipe(
      tap(() => console.log(`After handling request... ${Date.now() - now}ms`)),
    );
  }
}
```

**Khi nào sử dụng Interceptor?**

Bạn sử dụng Interceptor khi cần cần can thiệp vào quá trình xử lý request-response, ví dụ:

- Logging
- Transforming response data
- Caching
- Measuring execution time

#### 3.4.4 Pipes

**Pipe là gì?**

Pipes là các lớp dùng để validate và transform dữ liệu đầu vào. Chúng được thực thi sau Guards và trước khi controller xử lý request.

**Khi nào sử dụng Pipes?**
- Validation: Kiểm tra dữ liệu đầu vào có hợp lệ không
- Transformation: Chuyển đổi dữ liệu đầu vào sang định dạng mong muốn (ví dụ: string -> number)

**Các loại Build-in Pipes:**

> Xem chi tiết tại [NestJS Pipes Documentation](https://docs.nestjs.com/pipes#built-in-pipes)

Ví dụ:

```typescript
//Giả sử chúng ta có một DTO với các validation rules
@Post()
create(@Body(new ValidationPipe()) createBookDto: CreateBookDto) {
  // ...
}
```

**Custom Pipe:**

Bạn cũng có thể tạo custom pipe để thực hiện các logic validate hoặc transform phức tạp hơn:

```typescript
import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class MyCustomPipe implements PipeTransform {
  transform(value: any) {
    // Logic để transform dữ liệu
    return value;
  }
}
```


### 3.5. So sánh Middleware vs Guard vs Interceptor (Khi nào dùng cái nào?)

- **Middleware**:
  - Chạy sớm nhất trong vòng đời request
  - Không có Dependency Injection mạnh mẽ
  - Phù hợp cho logging, CORS, request parsing

- **Guard**:
  - Quyết định có cho request đi tiếp hay không (authorization)
  - Có Dependency Injection đầy đủ
  - Phù hợp cho authentication và authorization

- **Interceptor**:
  - Biến đổi request/response
  - Có Dependency Injection đầy đủ
  - Phù hợp cho logging, transform, caching, exception handling

---


## 3. Error Handling

### 3.1. Tại sao cần quản lý lỗi?

- Cung cấp phản hồi rõ ràng và nhất quán cho client
- Giúp debug và theo dõi lỗi dễ dàng hơn
- Bảo vệ ứng dụng khỏi các lỗi không mong muốn
- Cải thiện trải nghiệm người dùng
- Dễ dàng mở rộng và bảo trì mã nguồn
- Tăng tính chuyên nghiệp của ứng dụng
- Tuân thủ các tiêu chuẩn API
- Giảm thiểu rủi ro bảo mật
- Hỗ trợ logging và monitoring hiệu quả
- Giúp phát hiện và xử lý lỗi kịp thời
- Tăng độ tin cậy của hệ thống
- Hỗ trợ phát triển theo hướng test-driven development (TDD)

### 3.2. Quản lý lỗi trong NestJS

NestJS cung cấp các built-in exceptions:

```typescript
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
```

**Sử dụng trong Service:**

```typescript
// src/books/books.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FilterBooksDto } from './dto/filter-books.dto';

interface Book {
  id: number;
  title: string;
  description: string;
  pages: number;
  genres: string[];
  isbn?: string;
  publishedYear?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BooksService {
  private books: Book[] = [];
  private currentId = 1;

  findAll(filterDto?: FilterBooksDto) {
    let result = [...this.books];

    // Filter by genre
    if (filterDto?.genre) {
      result = result.filter(book =>
        book.genres.some(g => g.toLowerCase() === filterDto.genre.toLowerCase())
      );
    }

    // Filter by pages range
    if (filterDto?.minPages) {
      result = result.filter(book => book.pages >= filterDto.minPages);
    }

    if (filterDto?.maxPages) {
      result = result.filter(book => book.pages <= filterDto.maxPages);
    }

    // Pagination
    const page = filterDto?.page || 1;
    const limit = filterDto?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedResult = result.slice(startIndex, endIndex);

    return {
      data: paginatedResult,
      meta: {
        page,
        limit,
        total: result.length,
        totalPages: Math.ceil(result.length / limit),
      },
    };
  }

  findOne(id: number): Book {
    const book = this.books.find(b => b.id === id);

    if (!book) {
      throw new NotFoundException(`Không tìm thấy sách với ID ${id}`);
    }

    return book;
  }

  create(createBookDto: CreateBookDto): Book {
    // Kiểm tra ISBN trùng
    if (createBookDto.isbn) {
      const existingBook = this.books.find(b => b.isbn === createBookDto.isbn);
      if (existingBook) {
        throw new ConflictException(`ISBN ${createBookDto.isbn} đã tồn tại`);
      }
    }

    const newBook: Book = {
      id: this.currentId++,
      ...createBookDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.books.push(newBook);
    return newBook;
  }

  update(id: number, updateBookDto: UpdateBookDto): Book {
    const bookIndex = this.books.findIndex(b => b.id === id);

    if (bookIndex === -1) {
      throw new NotFoundException(`Không tìm thấy sách với ID ${id}`);
    }

    // Kiểm tra ISBN trùng (nếu update ISBN)
    if (updateBookDto.isbn) {
      const existingBook = this.books.find(
        b => b.isbn === updateBookDto.isbn && b.id !== id
      );
      if (existingBook) {
        throw new ConflictException(`ISBN ${updateBookDto.isbn} đã tồn tại`);
      }
    }

    this.books[bookIndex] = {
      ...this.books[bookIndex],
      ...updateBookDto,
      updatedAt: new Date(),
    };

    return this.books[bookIndex];
  }

  remove(id: number): void {
    const bookIndex = this.books.findIndex(b => b.id === id);

    if (bookIndex === -1) {
      throw new NotFoundException(`Không tìm thấy sách với ID ${id}`);
    }

    this.books.splice(bookIndex, 1);
  }
}
```

**Custom HttpException:**

```typescript
// src/common/exceptions/custom.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BookNotFoundException extends HttpException {
  constructor(bookId: number) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Không tìm thấy sách với ID ${bookId}`,
        error: 'Book Not Found',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DuplicateISBNException extends HttpException {
  constructor(isbn: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: `ISBN ${isbn} đã tồn tại trong hệ thống`,
        error: 'Duplicate ISBN',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.CONFLICT,
    );
  }
}
```

### 3.3. Exception Filters

**Exception Filters là gì?**

Exception Filters là các class dùng để bắt và xử lý exceptions trong ứng dụng NestJS. Chúng cho phép bạn tùy chỉnh cách thức trả về lỗi cho client, bao gồm định dạng response, logging lỗi, và các hành động khác khi có lỗi xảy ra.

**Built-in Exception Filter:**

NestJS tự động xử lý exceptions và trả về response với format:

```json
{
  "statusCode": 404,
  "message": "Không tìm thấy sách với ID 1",
  "error": "Not Found"
}
```

**Custom Exception Filter:**

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'Internal server error',
      error:
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).error
          : exception.name,
    };

    // Log error
    this.logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify(errorResponse),
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }
}
```

**All Exceptions Filter:**

```typescript
// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    response.status(status).json(errorResponse);
  }
}
```

**Áp dụng Exception Filter:**

Ta có thể áp dụng Exception Filters ở nhiều cấp độ khác nhau: global, controller, hoặc method.

**Global filter:**

```typescript
// src/main.ts - Global filter
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
```

**Controller-level và Method-level filter:**

```typescript
// Controller-level filter
import { UseFilters } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Controller('books')
@UseFilters(HttpExceptionFilter)
export class BooksController {
  // ...
}

// Method-level filter
@Post()
@UseFilters(HttpExceptionFilter)
create(@Body() createBookDto: CreateBookDto) {
  // ...
}
```

> 📃 Xem thêm tại [Custom Exception Filters trong NestJS](./custom-exception-filter.md)

---

## 4. Execution Context

### 4.1. Execution Context là gì?

**ExecutionContext** là một wrapper object chứa thông tin về request hiện tại. Nó cung cấp các methods để truy cập:

- HTTP Request/Response objects
- WebSocket connections
- GraphQL contexts
- RPC messages

```typescript
export interface ExecutionContext extends ArgumentsHost {
  getClass<T = any>(): Type<T>;
  getHandler(): Function;
}

export interface ArgumentsHost {
  getArgs<T extends Array<any> = any[]>(): T;
  getArgByIndex<T = any>(index: number): T;
  switchToRpc(): RpcArgumentsHost;
  switchToHttp(): HttpArgumentsHost;
  switchToWs(): WsArgumentsHost;
  getType<TContext extends string = ContextType>(): TContext;
}
```

### 4.2. Sử dụng Execution Context trong Guards

**RolesGuard với Metadata:**

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy metadata từ handler và class
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    // Lấy request object
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Kiểm tra roles
    return requiredRoles.some((role) => user?.roles?.includes(role));
  }
}

// Sử dụng
@Controller('books')
@UseGuards(RolesGuard)
export class BooksController {
  @Get('admin')
  @Roles('admin')
  getAdminBooks() {
    return 'Admin books';
  }

  @Delete(':id')
  @Roles('admin', 'moderator')
  remove(@Param('id') id: number) {
    return this.booksService.remove(id);
  }
}
```

### 4.3. Sử dụng Execution Context trong Interceptors

**Timeout Interceptor:**

```typescript
// src/common/interceptors/timeout.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const timeoutValue = request.headers['x-timeout'] || 5000;

    return next.handle().pipe(
      timeout(timeoutValue),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request timeout'),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
```

### 4.4. Metadata và Custom Decorators

**Metadata** là dữ liệu bổ sung gắn vào class, method, hoặc parameter. NestJS sử dụng `reflect-metadata` để lưu trữ và truy xuất metadata.

**Public Decorator:**

```typescript
// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// src/common/guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    // Proceed with JWT validation
    const request = context.switchToHttp().getRequest();
    // ... validation logic
    return true;
  }
}

// Sử dụng
@Controller('books')
@UseGuards(JwtAuthGuard)
export class BooksController {
  @Public()
  @Get()
  findAll() {
    // Route này không cần authentication
    return this.booksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    // Route này cần authentication
    return this.booksService.findOne(id);
  }
}
```

### 4.5. Tạo Custom Decorators để lấy thông tin từ Request

**@User() Decorator:**

```typescript
// src/common/decorators/user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Nếu có data, return field cụ thể
    return data ? user?.[data] : user;
  },
);

// Sử dụng
@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(@User() user: any) {
    return user; // Toàn bộ user object
  }

  @Get('id')
  getUserId(@User('id') userId: number) {
    return { userId }; // Chỉ lấy id
  }

  @Get('email')
  getUserEmail(@User('email') email: string) {
    return { email }; // Chỉ lấy email
  }
}
```

**@CurrentUser() với validation:**

```typescript
// src/common/decorators/current-user.decorator.ts
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return user;
  },
);
```

**@Ip() Decorator:**

```typescript
// src/common/decorators/ip.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Ip = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.ip || request.connection.remoteAddress;
  },
);

// Sử dụng
@Post('login')
login(@Body() loginDto: LoginDto, @Ip() ip: string) {
  console.log(`Login attempt from IP: ${ip}`);
  return this.authService.login(loginDto, ip);
}
```

**@Cookies() Decorator:**

```typescript
// src/common/decorators/cookies.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Cookies = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.cookies?.[data] : request.cookies;
  },
);

// Sử dụng
@Get()
findAll(@Cookies('sessionId') sessionId: string) {
  return { sessionId };
}
```

### 4.6. Kết hợp nhiều Decorators

```typescript
// src/books/books.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Ip } from '../common/decorators/ip.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('books')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Public() // Route này không cần authentication
  @Get()
  findAll() {
    return this.booksService.findAll();
  }

  @Get('my-books')
  getMyBooks(@CurrentUser() user: any) {
    // Route này cần authentication
    return this.booksService.findByUserId(user.id);
  }

  @Post()
  @Roles('admin', 'author') // Chỉ admin và author mới tạo được sách
  create(
    @Body() createBookDto: CreateBookDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    console.log(`User ${user.id} creating book from IP: ${ip}`);
    return this.booksService.create(createBookDto);
  }

  @Delete(':id')
  @Roles('admin') // Chỉ admin mới xóa được sách
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    console.log(`Admin ${userId} deleting book ${id}`);
    return this.booksService.remove(id);
  }
}
```
