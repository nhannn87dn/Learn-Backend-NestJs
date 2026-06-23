# Advanced Providers & Dependency Injection

> **Mục tiêu bài học**
> - Hiểu sâu về Dependency Injection trong NestJS
> - Nắm vững các loại Custom Providers
> - Quản lý Injection Scopes
> - Làm việc với Dynamic Modules
> - Xử lý Circular Dependency
> - Sử dụng Module Reference và Lazy Loading

---

## 1. Ôn tập: Standard Provider

### 1.1 Provider cơ bản đã học

Trong bài học trước chúng ta đã làm việc với **Standard Provider** - cách phổ biến nhất:

```typescript
// Service được đánh dấu @Injectable()
@Injectable()
export class BooksService {
  findAll() {
    return ['Book 1', 'Book 2'];
  }
}

// Đăng ký trong module
@Module({
  providers: [BooksService], // Shorthand syntax
})
export class BooksModule {}

// Inject vào controller
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}
}
```

**Cách viết đầy đủ của Standard Provider:**

```typescript
@Module({
  providers: [
    {
      provide: BooksService,     // Token để identify
      useClass: BooksService,    // Class sẽ được khởi tạo
    },
  ],
})
```

**Giải thích:**
- `provide`: Token (khóa) để identify provider
- `useClass`: Class thực tế sẽ được instantiate và inject

---

## 2. Custom Providers

### 2.1 Khái niệm

Trong NestJS, Custom Providers được sử dụng để tùy chỉnh cách mà các dependency được quản lý và cung cấp trong ứng dụng. Chúng cung cấp một cách linh hoạt để xác định và thay thế các logic mặc định của **dependency injection (DI)**.

### 2.2 Tại sao cần Custom Providers?

**Các tình huống thực tế:**

1. **Inject giá trị cố định** (configuration, constants)
2. **Inject kết quả từ factory function** (tạo object phức tạp)
3. **Thay thế implementation** (mock cho testing)
4. **Inject third-party libraries** (Axios, Winston Logger...)
5. **Inject async resources** (Database connection)

### 2.3 Class Providers (useClass)

Cho phép **thay thế implementation** của một provider.

**Ví dụ 1: Mock Service cho Testing**

```typescript
// Interface chung
interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Implementation thật
@Injectable()
export class EmailService implements IEmailService {
  async sendEmail(to: string, subject: string, body: string) {
    // Gọi SendGrid, AWS SES, etc.
    console.log(`Sending email to ${to}...`);
    // await this.sendGridClient.send(...)
  }
}

// Mock implementation cho testing
@Injectable()
export class MockEmailService implements IEmailService {
  async sendEmail(to: string, subject: string, body: string) {
    console.log(`[MOCK] Email sent to ${to}`);
    // Không gửi thật, chỉ log
  }
}

// Trong module
@Module({
  providers: [
    {
      provide: EmailService,
      useClass: process.env.NODE_ENV === 'production' 
        ? EmailService 
        : MockEmailService,
    },
  ],
})
export class AppModule {}
```

Giải thích:
- Tạo interface `IEmailService` để định nghĩa contract chung
- Tạo 2 implementation: `EmailService` (thật) và `MockEmailService` (giả lập)
- Sử dụng `useClass` để chọn implementation dựa trên môi trường


**Ví dụ 2: Strategy Pattern**

```typescript
// Abstract class
abstract class PaymentStrategy {
  abstract processPayment(amount: number): Promise<void>;
}

// Concrete implementations
@Injectable()
class StripePayment extends PaymentStrategy {
  async processPayment(amount: number) {
    console.log(`Processing ${amount} via Stripe`);
  }
}

@Injectable()
class PaypalPayment extends PaymentStrategy {
  async processPayment(amount: number) {
    console.log(`Processing ${amount} via PayPal`);
  }
}

// Module configuration
@Module({
  providers: [
    {
      provide: PaymentStrategy,
      useClass: process.env.PAYMENT_GATEWAY === 'paypal' 
        ? PaypalPayment 
        : StripePayment,
    },
  ],
})
export class PaymentModule {}

// Sử dụng
@Injectable()
export class OrdersService {
  constructor(private paymentStrategy: PaymentStrategy) {}

  async checkout(amount: number) {
    await this.paymentStrategy.processPayment(amount);
  }
}
```

Giải thích:
- Định nghĩa abstract class `PaymentStrategy`
- Tạo các implementation cụ thể cho từng gateway
- Sử dụng `useClass` để chọn strategy dựa trên config


### 2.3 Value Providers (useValue)

Inject **giá trị cố định** hoặc **object đã tạo sẵn**.

Thay vì ánh xạ đến một class, bạn có thể cung cấp một giá trị cụ thể.

**Ví dụ 1: Inject Configuration**

```typescript
// config/database.config.ts
export const databaseConfig = {
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'secret',
  database: 'mydb',
};

// Module
@Module({
  providers: [
    {
      provide: 'DATABASE_CONFIG',
      useValue: databaseConfig,
    },
  ],
})
export class DatabaseModule {}

// Inject vào service
@Injectable()
export class DatabaseService {
  constructor(
    @Inject('DATABASE_CONFIG') 
    private config: typeof databaseConfig,
  ) {
    console.log(`Connecting to ${this.config.host}:${this.config.port}`);
  }
}
```

**Lưu ý:** Khi dùng string token (`'DATABASE_CONFIG'`), phải dùng decorator `@Inject()`.

Giải thích:
- Tạo object `databaseConfig` chứa cấu hình
- Sử dụng `useValue` để cung cấp object này như một provider
- Inject vào service bằng token đã định nghĩa, khi đó trong service ta có thể sử dụng cấu hình này.

**Ví dụ 2: Inject Constants**

```typescript
// constants/app.constants.ts
export const APP_CONSTANTS = {
  API_VERSION: 'v1',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_LANGUAGES: ['en', 'vi', 'ja'],
  CACHE_TTL: 3600,
};

@Module({
  providers: [
    {
      provide: 'APP_CONSTANTS',
      useValue: APP_CONSTANTS,
    },
  ],
  exports: ['APP_CONSTANTS'],
})
export class ConfigModule {}

// Sử dụng
@Injectable()
export class UploadService {
  constructor(
    @Inject('APP_CONSTANTS') 
    private constants: typeof APP_CONSTANTS,
  ) {}

  validateFileSize(size: number): boolean {
    return size <= this.constants.MAX_FILE_SIZE;
  }
}
```

### 2.4 Factory Providers (useFactory)

Sử dụng **factory function** để tạo provider. Hữu ích khi:
- Cần logic phức tạp để khởi tạo
- Phụ thuộc vào các provider khác
- Cần tạo async (kết nối database, đọc file config...)

**Ví dụ 1: Factory đơn giản**

```typescript
@Module({
  providers: [
    {
      provide: 'CONNECTION',
      useFactory: () => {
        const environment = process.env.NODE_ENV;
        
        if (environment === 'production') {
          return {
            host: 'prod.database.com',
            port: 5432,
          };
        }
        
        return {
          host: 'localhost',
          port: 5432,
        };
      },
    },
  ],
})
export class DatabaseModule {}
```

**Ví dụ 2: Factory với Dependencies**

```typescript
// Config service
@Injectable()
export class ConfigService {
  get(key: string): string {
    return process.env[key];
  }
}

// Factory sử dụng ConfigService
@Module({
  providers: [
    ConfigService,
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: (configService: ConfigService) => {
        return {
          host: configService.get('DB_HOST'),
          port: parseInt(configService.get('DB_PORT')),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
        };
      },
      inject: [ConfigService], // Inject dependencies vào factory
    },
  ],
})
export class DatabaseModule {}
```

Giải thích:
- Tạo `ConfigService` để đọc biến môi trường
- Sử dụng `useFactory` để tạo object cấu hình database dựa trên `ConfigService`


**Ví dụ 3: Async Factory (Kết nối Database)**

```typescript
import { DataSource } from 'typeorm';

@Module({
  providers: [
    {
      provide: 'DATA_SOURCE',
      useFactory: async () => {
        const dataSource = new DataSource({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'secret',
          database: 'mydb',
          entities: [],
          synchronize: true,
        });

        await dataSource.initialize();
        console.log('Database connected!');
        
        return dataSource;
      },
    },
  ],
  exports: ['DATA_SOURCE'],
})
export class DatabaseModule {}

// Sử dụng
@Injectable()
export class UsersRepository {
  constructor(
    @Inject('DATA_SOURCE') 
    private dataSource: DataSource,
  ) {}

  async findAll() {
    return this.dataSource.query('SELECT * FROM users');
  }
}
```

**Ví dụ 4: Factory với Multiple Dependencies**

```typescript
@Injectable()
export class LoggerService {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

@Injectable()
export class ConfigService {
  get(key: string): string {
    return process.env[key] || '';
  }
}

@Module({
  providers: [
    LoggerService,
    ConfigService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (
        configService: ConfigService,
        logger: LoggerService,
      ) => {
        const host = configService.get('REDIS_HOST');
        const port = configService.get('REDIS_PORT');
        
        logger.log(`Connecting to Redis at ${host}:${port}`);
        
        // Giả lập Redis client
        return {
          host,
          port,
          connect: () => logger.log('Redis connected'),
        };
      },
      inject: [ConfigService, LoggerService],
    },
  ],
})
export class CacheModule {}
```

### 2.5 Alias Providers (useExisting)

Tạo **alias** (bí danh) cho provider đã tồn tại.

```typescript
@Injectable()
export class LoggerService {
  log(message: string) {
    console.log(message);
  }
}

@Module({
  providers: [
    LoggerService,
    {
      provide: 'LOGGER',
      useExisting: LoggerService, // Alias
    },
  ],
})
export class AppModule {}

// Có thể inject bằng 2 cách
@Injectable()
export class UserService {
  constructor(
    private logger: LoggerService, // Cách 1
    // HOẶC
    @Inject('LOGGER') private logger2: LoggerService, // Cách 2
  ) {}
}
```

**Use case thực tế:**

```typescript
// Abstract class
abstract class IAuthService {
  abstract login(username: string, password: string): Promise<string>;
}

// Implementation
@Injectable()
export class JwtAuthService extends IAuthService {
  async login(username: string, password: string) {
    // JWT logic
    return 'jwt_token';
  }
}

@Module({
  providers: [
    JwtAuthService,
    {
      provide: IAuthService,
      useExisting: JwtAuthService,
    },
  ],
})
export class AuthModule {}

// Inject bằng abstract class
@Injectable()
export class UsersService {
  constructor(private authService: IAuthService) {}
  // Dễ dàng thay thế implementation sau này
}
```

---

## 3. Non-Service Providers

### 3.1 Khái niệm

**Non-Service Provider** là provider không phải là class service (không có `@Injectable()`), ví dụ:
- Constants
- Configuration objects
- Third-party libraries
- Functions
- Primitive values

### 3.2 Ví dụ thực tế

**Ví dụ 1: Inject Function**

```typescript
// utils/helpers.ts
export function generateRandomId(): string {
  return Math.random().toString(36).substring(7);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

// Module
@Module({
  providers: [
    {
      provide: 'ID_GENERATOR',
      useValue: generateRandomId,
    },
    {
      provide: 'CURRENCY_FORMATTER',
      useValue: formatCurrency,
    },
  ],
})
export class UtilsModule {}

// Sử dụng
@Injectable()
export class OrdersService {
  constructor(
    @Inject('ID_GENERATOR') 
    private generateId: () => string,
    @Inject('CURRENCY_FORMATTER')
    private formatCurrency: (amount: number) => string,
  ) {}

  createOrder(amount: number) {
    const orderId = this.generateId();
    const formatted = this.formatCurrency(amount);
    
    return {
      id: orderId,
      amount: formatted,
    };
  }
}
```

**Ví dụ 2: Inject API Keys và Secrets**

```typescript
// constants/api-keys.ts
export const API_KEYS = {
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,
};

@Module({
  providers: [
    {
      provide: 'API_KEYS',
      useValue: API_KEYS,
    },
  ],
  exports: ['API_KEYS'],
})
export class ConfigModule {}

// Sử dụng
@Injectable()
export class EmailService {
  constructor(
    @Inject('API_KEYS') 
    private apiKeys: typeof API_KEYS,
  ) {}

  async send(to: string, subject: string) {
    // Sử dụng this.apiKeys.SENDGRID_API_KEY
  }
}
```

**Ví dụ 3: Inject Array/Object Configurations**

```typescript
// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: false,
  ENABLE_ANALYTICS: true,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024,
};

// Supported payment methods
export const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Credit Card', enabled: true },
  { id: 'paypal', name: 'PayPal', enabled: true },
  { id: 'bank_transfer', name: 'Bank Transfer', enabled: false },
];

@Module({
  providers: [
    {
      provide: 'FEATURE_FLAGS',
      useValue: FEATURE_FLAGS,
    },
    {
      provide: 'PAYMENT_METHODS',
      useValue: PAYMENT_METHODS,
    },
  ],
  exports: ['FEATURE_FLAGS', 'PAYMENT_METHODS'],
})
export class ConfigModule {}
```

### 3.3 Tóm tắt

- **useClass**: Dùng class để cung cấp các dependency, phù hợp cho các chiến lược (Xác thực Oauth, JWT) hoặc logic có thể thay thế.
- **useValue**: Dùng cho các giá trị tĩnh, chẳng hạn như config hoặc danh sách hằng số.
- **useFactory**: Tạo dependency với logic tùy chỉnh, phù hợp khi cần khởi tạo hoặc xử lý trước khi cung cấp (Các connection ví dụ Redis, Database, Caching).
- **useExisting**: Tái sử dụng một provider đã có, giúp tổ chức code và tiết kiệm tài nguyên.

---

## 4. Injection Scopes

### 4.1 Khái niệm Scope

**Scope** xác định **lifecycle** và **cách chia sẻ** provider instance trong ứng dụng.

### 4.2 Các loại Scope

#### 4.2.1 DEFAULT Scope (Singleton)

- **Mặc định** của NestJS
- Provider được tạo **một lần duy nhất** khi ứng dụng khởi động
- **Chia sẻ chung** giữa tất cả requests
- **Performance tốt nhất**

```typescript
@Injectable() // Mặc định là DEFAULT scope
export class UsersService {
  private counter = 0;

  increment() {
    this.counter++;
    return this.counter;
  }
}

// Request 1: increment() → 1
// Request 2: increment() → 2
// Request 3: increment() → 3
// (Cùng 1 instance, counter được giữ nguyên)
```

**Biểu đồ:**
```
Application Start
      ↓
  [UsersService Instance] ← Tạo 1 lần
      ↓
  Request 1 → Dùng chung instance
  Request 2 → Dùng chung instance
  Request 3 → Dùng chung instance
```

#### 4.2.2 REQUEST Scope

- Provider được tạo **mới cho mỗi request**
- **Không chia sẻ** giữa các requests
- Hữu ích khi cần **request-specific data**

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  private counter = 0;

  increment() {
    this.counter++;
    return this.counter;
  }
}

// Request 1: increment() → 1
// Request 2: increment() → 1 (instance mới)
// Request 3: increment() → 1 (instance mới)
```

**Ví dụ thực tế: Request ID Tracking**

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private requestId: string;

  constructor(@Inject(REQUEST) private request: Request) {
    this.requestId = this.generateRequestId();
    this.request['requestId'] = this.requestId;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRequestId(): string {
    return this.requestId;
  }

  getUserId(): string {
    return this.request['user']?.id || 'anonymous';
  }
}

// Sử dụng
@Injectable({ scope: Scope.REQUEST })
export class LoggerService {
  constructor(private context: RequestContextService) {}

  log(message: string) {
    console.log(`[${this.context.getRequestId()}] ${message}`);
  }
}

@Controller('users')
export class UsersController {
  constructor(private logger: LoggerService) {}

  @Get()
  findAll() {
    this.logger.log('Fetching all users');
    // Output: [req_1234567890_abc123] Fetching all users
    return [];
  }
}
```

**Lưu ý quan trọng:**
- REQUEST scope **giảm performance** (tạo instance mỗi request)
- Nếu inject REQUEST-scoped provider vào DEFAULT-scoped provider, provider đó cũng trở thành REQUEST-scoped

#### 4.2.3 TRANSIENT Scope

- Provider được tạo **mỗi lần inject**
- **Không chia sẻ** giữa các consumers
- Mỗi nơi inject sẽ có **instance riêng**

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  private id = Math.random();

  getId() {
    return this.id;
  }
}

@Injectable()
export class ServiceA {
  constructor(private transient: TransientService) {
    console.log('ServiceA:', this.transient.getId()); // 0.123
  }
}

@Injectable()
export class ServiceB {
  constructor(private transient: TransientService) {
    console.log('ServiceB:', this.transient.getId()); // 0.456 (khác ServiceA)
  }
}
```

**Use case: Logger với unique ID**

```typescript
@Injectable({ scope: Scope.TRANSIENT })
export class Logger {
  private instanceId = Math.random().toString(36).substr(2, 9);

  log(message: string) {
    console.log(`[Logger-${this.instanceId}] ${message}`);
  }
}

@Injectable()
export class UsersService {
  constructor(private logger: Logger) {}
  // Logger instance riêng cho UsersService
}

@Injectable()
export class OrdersService {
  constructor(private logger: Logger) {}
  // Logger instance riêng cho OrdersService (khác với UsersService)
}
```

### 4.3 So sánh các Scope

| Scope | Tạo khi nào | Chia sẻ | Performance | Use Case |
|-------|-------------|---------|-------------|----------|
| **DEFAULT** | App start | Toàn app | ⚡⚡⚡ Tốt nhất | Services, Repositories |
| **REQUEST** | Mỗi request | Trong 1 request | ⚡ Chậm | Request context, User info |
| **TRANSIENT** | Mỗi lần inject | Không | ⚡⚡ Trung bình | Logger riêng biệt |

### 4.4 Inject REQUEST object

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  constructor(@Inject(REQUEST) private request: Request) {}

  logAction(action: string) {
    const userId = this.request['user']?.id;
    const ip = this.request.ip;
    const userAgent = this.request.get('user-agent');

    console.log({
      action,
      userId,
      ip,
      userAgent,
      timestamp: new Date(),
    });
  }
}

@Controller('products')
export class ProductsController {
  constructor(private audit: AuditService) {}

  @Post()
  create(@Body() dto: any) {
    this.audit.logAction('CREATE_PRODUCT');
    // Tạo product...
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.audit.logAction('DELETE_PRODUCT');
    // Xóa product...
  }
}
```

---

## 5. Dynamic Modules

### 5.1 Khái niệm

**Dynamic Modules** là một tính năng mạnh mẽ trong NestJS cho phép bạn tạo ra các module có thể cấu hình được (configurable modules). Thay vì cấu hình tĩnh, chúng cho phép tái sử dụng cùng một module với các thiết lập khác nhau tùy thuộc vào điều kiện cụ thể tại thời điểm runtime.

**Tại sao cần Dynamic Module?**
- Tái sử dụng module với config khác nhau
- Tạo module linh hoạt, có thể configure
- Giống như "factory pattern" cho modules

**Các khái niệm then chốt**

*   **forRoot()**: Sử dụng khi bạn cần cấu hình chung cho toàn bộ ứng dụng. Phương thức này thường chỉ được gọi một lần duy nhất trong module gốc như `AppModule`. Ví dụ: Cấu hình kết nối cơ sở dữ liệu hoặc JWT.
*   **forFeature()**: Sử dụng để mở rộng hoặc bổ sung cấu hình cục bộ bên trong các module con (như định nghĩa các Repository cụ thể cho một bảng dữ liệu).
*   **registerAsync()**: Một dạng module động cho phép truyền cấu hình một cách bất đồng bộ, ví dụ như lấy secret key từ `ConfigService`.


### 5.2 Cú pháp Dynamic Module

```typescript
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}
```

### 5.3 Ví dụ chi tiết

**Ví dụ 1: Config Module**

```typescript
// config.module.ts
import { DynamicModule, Module } from '@nestjs/common';

interface ConfigModuleOptions {
  folder: string;
  isGlobal?: boolean;
}

@Module({})
export class ConfigModule {
  static forRoot(options: ConfigModuleOptions): DynamicModule {
    const configProvider = {
      provide: 'CONFIG_OPTIONS',
      useValue: options,
    };

    return {
      module: ConfigModule,
      providers: [configProvider, ConfigService],
      exports: [ConfigService],
      global: options.isGlobal || false,
    };
  }
}

// config.service.ts
@Injectable()
export class ConfigService {
  constructor(
    @Inject('CONFIG_OPTIONS') private options: ConfigModuleOptions,
  ) {}

  get(key: string): string {
    // Đọc từ file trong folder đã config
    return process.env[key];
  }
}

// Sử dụng trong AppModule
@Module({
  imports: [
    ConfigModule.forRoot({
      folder: './config',
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

**Ví dụ 2: Database Module**

```typescript
// database.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface DatabaseOptions {
  type: 'postgres' | 'mysql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    const dataSourceProvider = {
      provide: 'DATA_SOURCE',
      useFactory: async () => {
        const dataSource = new DataSource({
          type: options.type,
          host: options.host,
          port: options.port,
          username: options.username,
          password: options.password,
          database: options.database,
          entities: [],
          synchronize: true,
        });

        await dataSource.initialize();
        return dataSource;
      },
    };

    return {
      module: DatabaseModule,
      providers: [dataSourceProvider],
      exports: [dataSourceProvider],
    };
  }

  static forFeature(entities: any[]): DynamicModule {
    const providers = entities.map(entity => ({
      provide: `${entity.name}_REPOSITORY`,
      useFactory: (dataSource: DataSource) => {
        return dataSource.getRepository(entity);
      },
      inject: ['DATA_SOURCE'],
    }));

    return {
      module: DatabaseModule,
      providers: providers,
      exports: providers,
    };
  }
}

// Sử dụng
@Module({
  imports: [
    DatabaseModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'secret',
      database: 'mydb',
    }),
  ],
})
export class AppModule {}

// Trong feature module
@Module({
  imports: [DatabaseModule.forFeature([User, Product])],
})
export class UsersModule {}
```

**Ví dụ 3: Logger Module với Levels**

```typescript
// logger.module.ts
import { DynamicModule, Module } from '@nestjs/common';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level: LogLevel;
  timestamp: boolean;
  colorize: boolean;
}

@Module({})
export class LoggerModule {
  static forRoot(options: LoggerOptions): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: 'LOGGER_OPTIONS',
          useValue: options,
        },
        LoggerService,
      ],
      exports: [LoggerService],
      global: true,
    };
  }
}

// logger.service.ts
@Injectable()
export class LoggerService {
  constructor(
    @Inject('LOGGER_OPTIONS') private options: LoggerOptions,
  ) {}

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.options.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  debug(message: string) {
    if (this.shouldLog('debug')) {
      this.print('DEBUG', message);
    }
  }

  info(message: string) {
    if (this.shouldLog('info')) {
      this.print('INFO', message);
    }
  }

  warn(message: string) {
    if (this.shouldLog('warn')) {
      this.print('WARN', message);
    }
  }

  error(message: string) {
    if (this.shouldLog('error')) {
      this.print('ERROR', message);
    }
  }

  private print(level: string, message: string) {
    const timestamp = this.options.timestamp 
      ? `[${new Date().toISOString()}]` 
      : '';
    console.log(`${timestamp} [${level}] ${message}`);
  }
}

// Sử dụng
@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'info',
      timestamp: true,
      colorize: false,
    }),
  ],
})
export class AppModule {}
```

### 5.4 forRoot vs forFeature Pattern

**forRoot**: Configure toàn module (gọi 1 lần trong AppModule)
**forFeature**: Configure cho từng feature module

```typescript
// Trong AppModule
@Module({
  imports: [
    CacheModule.forRoot({
      host: 'localhost',
      port: 6379,
    }),
  ],
})
export class AppModule {}

// Trong UsersModule
@Module({
  imports: [
    CacheModule.forFeature({
      keyPrefix: 'users:',
      ttl: 3600,
    }),
  ],
})
export class UsersModule {}

// Trong ProductsModule
@Module({
  imports: [
    CacheModule.forFeature({
      keyPrefix: 'products:',
      ttl: 7200,
    }),
  ],
})
export class ProductsModule {}
```

---

## 6. Circular Dependency

### 6.1 Circular Dependency là gì?

**Circular Dependency** xảy ra khi 2 hoặc nhiều modules/providers phụ thuộc lẫn nhau.

Trong **NestJS, circular dependency** (phụ thuộc vòng tròn) xảy ra khi hai hoặc nhiều module hoặc provider phụ thuộc vào nhau, tạo thành một vòng lặp. Ví dụ:

- Module A phụ thuộc vào Module B.
- Module B lại phụ thuộc vào Module A.

Điều này có thể dẫn đến các vấn đề như lỗi runtime hoặc hành vi không mong muốn vì NestJS không thể giải quyết các phụ thuộc đúng cách.

```typescript
// ❌ Circular Dependency
// users.service.ts
@Injectable()
export class UsersService {
  constructor(private ordersService: OrdersService) {}
  //OrdersService phụ thuộc UsersService
}
// orders.service.ts
@Injectable()
export class OrdersService {
  constructor(private usersService: UsersService) {}
  // UsersService phụ thuộc OrdersService
}

// UsersService → OrdersService → UsersService → ...
```

**Vấn đề:**
- NestJS không thể khởi tạo vì không biết tạo cái nào trước
- Throw error: `Nest can't resolve dependencies`

### 6.2 Circular Dependency giữa Modules

```typescript
// ❌ Lỗi
// users.module.ts
@Module({
  imports: [OrdersModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

// orders.module.ts
@Module({
  imports: [UsersModule],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

**Giải pháp: forwardRef()**

```typescript
// ✅ Đúng
// users.module.ts
import { Module, forwardRef } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

// orders.module.ts
@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

### 6.3 Circular Dependency giữa Providers

```typescript
// ❌ Lỗi
// users.service.ts
@Injectable()
export class UsersService {
  constructor(private ordersService: OrdersService) {}
}

// orders.service.ts
@Injectable()
export class OrdersService {
  constructor(private usersService: UsersService) {}
}
```

**Giải pháp:**

```typescript
// ✅ Đúng
// users.service.ts
import { Injectable, forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
  ) {}

  getUserOrders(userId: number) {
    return this.ordersService.findByUserId(userId);
  }
}

// orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}

  findByUserId(userId: number) {
    const user = this.usersService.findOne(userId);
    // Logic...
  }
}
```

### 6.4 Best Practice: Tránh Circular Dependency

**Cách 1: Tách logic chung ra Service thứ 3**

```typescript
// ❌ Trước khi refactor
// users.service.ts
@Injectable()
export class UsersService {
  constructor(private ordersService: OrdersService) {}

  getUserWithOrders(userId: number) {
    const user = this.findOne(userId);
    const orders = this.ordersService.findByUserId(userId);
    return { user, orders };
  }
}

// orders.service.ts
@Injectable()
export class OrdersService {
  constructor(private usersService: UsersService) {}

  getOrderWithUser(orderId: number) {
    const order = this.findOne(orderId);
    const user = this.usersService.findOne(order.userId);
    return { order, user };
  }
}

// ✅ Sau khi refactor
// user-orders.service.ts
@Injectable()
export class UserOrdersService {
  constructor(
    private usersService: UsersService,
    private ordersService: OrdersService,
  ) {}

  getUserWithOrders(userId: number) {
    const user = this.usersService.findOne(userId);
    const orders = this.ordersService.findByUserId(userId);
    return { user, orders };
  }

  getOrderWithUser(orderId: number) {
    const order = this.ordersService.findOne(orderId);
    const user = this.usersService.findOne(order.userId);
    return { order, user };
  }
}

// users.service.ts - Không còn phụ thuộc OrdersService
@Injectable()
export class UsersService {
  findOne(userId: number) { /* ... */ }
}

// orders.service.ts - Không còn phụ thuộc UsersService
@Injectable()
export class OrdersService {
  findOne(orderId: number) { /* ... */ }
  findByUserId(userId: number) { /* ... */ }
}
```

**Cách 2: Sử dụng Events**

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(private eventEmitter: EventEmitter2) {}

  createUser(data: any) {
    const user = { id: 1, ...data };
    
    // Emit event thay vì gọi trực tiếp OrdersService
    this.eventEmitter.emit('user.created', { userId: user.id });
    
    return user;
  }
}

// orders.service.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class OrdersService {
  @OnEvent('user.created')
  handleUserCreated(payload: { userId: number }) {
    console.log(`Creating welcome order for user ${payload.userId}`);
    // Tạo order chào mừng...
  }
}
```

---

## 7. Module Reference và Lazy Loading

### 7.1 ModuleRef

**ModuleRef** trong NestJS là một công cụ giúp bạn truy cập và tương tác với các dịch vụ (services) giữa các module một cách linh động tại thời điểm runtime. Đây là công cụ mạnh mẽ khi bạn cần làm việc với các phụ thuộc không thể xác định khi biên dịch, hoặc khi cần truy cập các dịch vụ trong các module khác mà không dùng trực tiếp injection.

**ModuleRef** cho phép **dynamic retrieval** (lấy động) các providers trong runtime.

#### 7.1.1 Lấy Service từ Module khác

Giả sử bạn có `ModuleA` cần gọi `ServiceB` từ `ModuleB`. Bạn có thể sử dụng `ModuleRef` để truy xuất `ServiceB` mà không cần phải inject nó trực tiếp vào `ModuleA`:

```typescript
// module-a.module.ts
import { Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ModuleB } from './module-b.module';
import { ServiceA } from './service-a.service';
import { ServiceB } from './service-b.service';
@Module({
  imports: [ModuleB],
  providers: [ServiceA],
})
export class ModuleA {
  constructor(private moduleRef: ModuleRef) {}

  async useServiceB() {
    const serviceB = this.moduleRef.get(ServiceB, { strict: false });
    return serviceB.performAction();
  }
}
```

#### 7.1.2 Lấy Service với Scope khác


Nếu bạn xây dựng một plugin hoặc hệ thống microservices, nơi các module có thể thay đổi hoặc bổ sung vào runtime, bạn có thể dùng `ModuleRef` để tạo và sử dụng các provider động.

Khi bạn cần lấy một service có scope khác (ví dụ: `REQUEST` scope), bạn có thể sử dụng `ModuleRef` với tùy chọn `strict: false`:

Ví dụ: Giả sử bạn có một service SomeService và muốn sử dụng nó trong AppService mà không cần inject vào constructor:

```ts

@Injectable()
export class AppService {
  constructor(private moduleRef: ModuleRef) {}

  getDynamicService() {
    const dynamicService = this.moduleRef.get(SomeService, { strict: false });
    dynamicService.doSomething();
  }
}
```

- Đảm bảo `SomeService` được cung cấp trong AppModule hoặc module tương ứng.
- `AppService` có thể sử dụng `ModuleRef` để lấy dịch vụ từ module khác mà không phải inject trực tiếp.


#### 7.1.3 Sử dụng các provider chưa được đăng ký trước

ModuleRef giúp bạn tạo ra các instance của các provider mà không cần phải đăng ký chúng một cách tĩnh.


Nếu một provider không được đăng ký trong module chính, bạn vẫn có thể lấy nó thông qua `ModuleRef.resolve(`) để tạo instance của nó.


Ví dụ: Giả sử bạn muốn khởi tạo một provider chưa được đăng ký như `DynamicService`

```ts
@Injectable()
export class DynamicModuleService {
  constructor(private moduleRef: ModuleRef) {}

  async getDynamicInstance() {
    const service = await this.moduleRef.resolve(SomeService);
    service.run();
  }
}
```

DynamicService có thể là một service chưa được đăng ký trực tiếp trong module, nhưng bạn có thể sử dụng ModuleRef để khởi tạo nó động tại runtime

### 7.1.4 Truy xuất provider từ các module không phải là phụ thuộc trực tiếp

ModuleRef cho phép bạn truy xuất các provider từ module khác mà không phải inject chúng trong constructor.

Ví dụ: Giả sử bạn có một service trong module khác và muốn sử dụng nó trong một service khác:

```ts

import { Injectable, ModuleRef } from '@nestjs/common';
import { SomeOtherService } from './some-other.service';

@Injectable()
export class AnotherService {
  constructor(private moduleRef: ModuleRef) {}

  useService() {
    const serviceFromAnotherModule = this.moduleRef.get(SomeOtherService);
    serviceFromAnotherModule.performAction(); // Gọi phương thức của SomeOtherService
  }
}

```

- `SomeOtherService` được đăng ký trong một module khác và không cần inject trực tiếp vào `AnotherService`.
- Bạn có thể lấy instance của `SomeOtherService` từ module khác bằng cách sử dụng `ModuleRef`.


### 7.2 Lazy Loading Modules

**Lazy Loading Modules** trong NestJS là kỹ thuật tối ưu hóa hiệu suất bằng cách chỉ tải các module khi ứng dụng thực sự cần sử dụng chúng tại một thời điểm cụ thể. 

Thay vì tải tất cả module ngay khi ứng dụng khởi chạy (**eager loading**), lazy loading mang lại những lợi ích sau:
*   **Giảm thời gian khởi động**: Đặc biệt hữu ích với các ứng dụng lớn có nhiều module phức tạp.
*   **Tiết kiệm tài nguyên**: Module chỉ chiếm bộ nhớ khi được kích hoạt.
*   **Tối ưu trải nghiệm**: Người dùng cảm thấy ứng dụng phản hồi nhanh hơn do quá trình khởi tạo ban đầu được tinh giản.


#### 7.2.1 Vế đề khi không có Lazy Loading

Mặc định, NestJS hoạt động theo cơ chế:

> **Load toàn bộ module ngay khi ứng dụng khởi động**

Ví dụ:

```ts
AppModule
 ├── UserModule
 ├── AuthModule
 ├── OrderModule
 ├── PaymentModule
 ├── ReportModule
```

👉 Khi app start:

* TẤT CẢ module trên đều được khởi tạo
* Tất cả provider, service, DB connection đều chạy

❌ Hệ quả trong app lớn

* Thời gian start app **chậm**
* Tốn memory
* Module ít dùng (report, admin, analytics…) vẫn bị load
* Không tối ưu cho:

  * Admin feature
  * Background task
  * Feature hiếm khi dùng

---

#### 7.2.2 Lazy Loading Modules giải quyết vấn đề gì?

> **Chỉ load module khi THỰC SỰ cần dùng**

* App khởi động nhanh hơn
* Tiết kiệm tài nguyên
* Module chỉ init khi có request tới

👉 Đây là **Lazy Loading**.

---

#### 7.2.3 Lazy Loading trong NestJS hoạt động như thế nào?

NestJS cho phép:

* **Load module động tại runtime**
* Thông qua `LazyModuleLoader`

```ts
import { LazyModuleLoader } from '@nestjs/core';
```

👉 Module **không nằm trong `imports` của AppModule**
👉 Chỉ load khi gọi code

---

#### 7.2.4. Khi nào NÊN dùng Lazy Loading?


❗ Lazy load CHỈ nên áp dụng cho module:

* Ít được truy cập
* Không nằm trên critical path
* Không ảnh hưởng auth / core flow
* Không bị gọi liên tục mỗi reques


✅ Rất phù hợp cho:

* Admin module
* Report / Analytics
* Cron job
* Feature dùng ít
* Micro-feature

❌ Không nên dùng cho:

* Auth
* User
* Core business
* Module dùng liên tục

---

#### 7.2.5 Ví dụ   

Lazy Load `Admin Module`

🎯 Mục tiêu

* App start **KHÔNG load AdminModule**
* Khi user truy cập `/admin` → mới load

---

Bước 1: Tạo AdminModule (bình thường)

```ts
// admin/admin.module.ts
@Module({
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
```

```ts
// admin/admin.service.ts
@Injectable()
export class AdminService {
  getStats() {
    return 'Admin statistics';
  }
}
```

```ts
// admin/admin.controller.ts
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}
```

👉 **KHÔNG import AdminModule vào AppModule**

---

Bước 2: Dùng `LazyModuleLoader`

```ts
// app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';


@Controller()
export class AppController {
  constructor(
    private lazyModuleLoader: LazyModuleLoader,
    private moduleRef: ModuleRef,
  ) {}

  @Get('admin/stats')
  async getAdminStats() {

    // Lazy load AdminModule
    const { AdminModule } = await import('./admin/admin.module');

    // Load module động
    const moduleRef = await this.lazyModuleLoader.load(() => AdminModule);
    // Lấy AdminService từ module vừa load
    const adminService = moduleRef.get(AdminService, { strict: false });

    return adminService.getStats();
  }
}
```

**Điều gì xảy ra khi gọi API này?**

Lần đầu gọi `/admin/stats`

1. NestJS **import AdminModule**
2. Khởi tạo:

   * AdminModule
   * AdminService
   * AdminController
3. Trả kết quả

**Những lần gọi sau**

* Module **đã được cache**
* Không load lại
* Chạy rất nhanh

---

#### 7.2.6 So sánh Eager vs Lazy

| Tiêu chí        | Eager (mặc định) | Lazy             |
| --------------- | ---------------- | ---------------- |
| Thời gian start | Chậm hơn         | Nhanh hơn        |
| Memory          | Cao              | Thấp hơn         |
| Code phức tạp   | Đơn giản         | Phức tạp hơn     |
| Phù hợp         | Core feature     | Optional feature |

---

#### 7.2.7 Pattern chuẩn cho Lazy Module

```ts
const moduleRef = await this.lazyModuleLoader.load(() =>
  import('./admin/admin.module').then((m) => m.AdminModule),
);

const service = moduleRef.get(AdminService, { strict: false });
```

