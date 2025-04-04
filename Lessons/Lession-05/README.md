# Provider,  Dependency Injection và Module

Dưới đây là bài viết chi tiết về **Provider** và **Dependency Injection** trong NestJS, được xây dựng dựa trên tài liệu chính thức. Bài viết sẽ giúp bạn hiểu rõ khái niệm, cách tạo provider và cách sử dụng cơ chế Dependency Injection (DI) trong ứng dụng NestJS.

---

## 1. Giới Thiệu Về Provider và Dependency Injection

### a. Provider là gì?

- **Provider** là những lớp, giá trị hoặc factory function cung cấp các dịch vụ, logic nghiệp vụ hoặc dữ liệu cho ứng dụng.
- Provider được sử dụng để chia sẻ logic và dữ liệu giữa các thành phần như controller, service, repository,…
- Một provider có thể là một lớp thông thường được đánh dấu bằng decorator `@Injectable()`, cho phép NestJS quản lý vòng đời của nó.

### b. Dependency Injection (DI)

- **Dependency Injection** là một kỹ thuật thiết kế phần mềm giúp tách biệt sự phụ thuộc giữa các thành phần.
- DI trong NestJS cho phép tự động khởi tạo và cung cấp các instance của provider cho những nơi cần sử dụng, làm cho mã nguồn dễ bảo trì, mở rộng và kiểm thử.
- Khi một lớp cần sử dụng một provider, bạn chỉ cần khai báo dependency trong constructor và NestJS sẽ tự động "tiêm" (inject) nó.

---

## 2. Cách Tạo Provider

### a. Sử Dụng Decorator `@Injectable()`

Để tạo một provider đơn giản, bạn đánh dấu lớp đó bằng decorator `@Injectable()`. Điều này cho phép NestJS nhận biết lớp đó là một provider và quản lý vòng đời của nó.

**Ví dụ:**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  private users = ['Alice', 'Bob', 'Charlie'];

  findAll(): string[] {
    return this.users;
  }

  findOne(id: number): string {
    return this.users[id] || 'Không tìm thấy người dùng';
  }
}
```

**Giải thích:**

- `@Injectable()`: Đánh dấu `UsersService` là một provider có thể được sử dụng cho Dependency Injection.
- Lớp chứa các phương thức xử lý logic nghiệp vụ như `findAll()` và `findOne()`.

### b. Các Loại Provider Khác

NestJS hỗ trợ nhiều cách đăng ký provider tùy thuộc vào nhu cầu:


- **Class Provider** là cách thông dụng nhất: đăng ký trực tiếp một lớp được đánh dấu bằng `@Injectable()`.  
- Khi một lớp được đăng ký dưới dạng class provider, NestJS sẽ tự động tạo instance của lớp đó để sử dụng ở các nơi cần thiết.

**Ví dụ:**

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  private users = ['Alice', 'Bob', 'Charlie'];

  findAll(): string[] {
    return this.users;
  }
}
```

- **Value Provider** cho phép bạn đăng ký một giá trị cụ thể (có thể là đối tượng, hàm,...) làm provider.  
- Đây là cách hữu ích để cung cấp các cấu hình hoặc hằng số cho ứng dụng.

**Ví dụ:**

```typescript
export const CONFIG = {
  port: 3000,
  host: 'localhost',
};

// Trong module:
@Module({
  providers: [
    {
      provide: 'CONFIG_TOKEN',
      useValue: CONFIG,
    },
  ],
})
export class AppModule {}
```


- **Factory Provider** sử dụng một factory function để trả về giá trị hoặc đối tượng cần được cung cấp.  
- Điều này cho phép bạn tùy biến quá trình tạo instance, đặc biệt hữu ích khi cần thực hiện logic phức tạp hoặc phụ thuộc vào các giá trị khác.

**Ví dụ:**

```typescript
@Module({
  providers: [
    {
      provide: 'CUSTOM_SERVICE',
      useFactory: (configService: ConfigService) => {
        // Sử dụng ConfigService để tạo ra đối tượng custom
        return new CustomService(configService.get('API_KEY'));
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
```


- **Async Providers** được sử dụng khi việc khởi tạo provider cần thực hiện các tác vụ bất đồng bộ, chẳng hạn như đọc cấu hình từ file, kết nối đến cơ sở dữ liệu hoặc các dịch vụ bên ngoài.  
- Thông thường, bạn sử dụng `useFactory` với một hàm bất đồng bộ và khai báo các dependency cần tiêm.

**Ví dụ:**

```typescript
@Module({
  providers: [
    {
      provide: 'ASYNC_CONFIG',
      useFactory: async () => {
        const config = await loadConfig(); // Giả sử loadConfig là hàm bất đồng bộ
        return config;
      },
    },
  ],
})
export class AppModule {}
```

---

## 3. Đăng Ký Provider Trong Module

Để sử dụng provider, bạn cần đăng ký nó trong module thông qua thuộc tính `providers` của decorator `@Module()`. Điều này giúp NestJS biết được các provider nào có thể được inject vào các thành phần khác.

**Ví dụ:**

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

**Giải thích:**

- **controllers:** Danh sách các controller sử dụng provider.
- **providers:** Danh sách các provider được module cung cấp. Khi một controller hay service cần sử dụng `UsersService`, NestJS sẽ tự động tiêm instance của nó.

---

## 4. Dependency Injection Trong NestJS

### a. Cách Tiêm Provider Vào Controller Hoặc Service

Để sử dụng provider trong một lớp khác (ví dụ, controller), bạn khai báo dependency trong constructor của lớp đó.

**Ví dụ: Tiêm `UsersService` vào `UsersController`:**

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.findAll();
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    const userId = parseInt(id, 10);
    return this.usersService.findOne(userId);
  }
}
```


**Giải thích:**

- **Constructor Injection:** Thông qua constructor, NestJS sẽ tự động tạo và cung cấp instance của `UsersService` cho `UsersController`.
- Điều này giúp controller tập trung vào việc xử lý request và chuyển giao logic nghiệp vụ cho provider.

### b. Lợi Ích Của Dependency Injection

- **Tái Sử Dụng:** Các provider có thể được sử dụng ở nhiều nơi trong ứng dụng mà không cần tạo lại nhiều instance.
- **Kiểm Thử:** Dễ dàng mock các dependency khi viết unit test.
- **Tách Biệt Mối Quan Tâm:** Giúp chia nhỏ logic nghiệp vụ và xử lý định tuyến, làm cho mã nguồn dễ bảo trì và mở rộng.

## 5. Injection Scopes (Phạm Vi Tiêm Dependency)

NestJS cho phép cấu hình phạm vi của provider thông qua thuộc tính `scope` trong decorator `@Injectable()` hoặc khi đăng ký provider. Có 3 phạm vi chính:

### a. Default (Singleton)

- **Singleton:** Mặc định, provider được tạo ra một lần duy nhất và được chia sẻ cho toàn bộ ứng dụng.  
- Đây là lựa chọn hiệu quả cho hầu hết các dịch vụ không cần trạng thái riêng biệt cho mỗi request.

**Ví dụ:**

```typescript
@Injectable()
export class UsersService {
  // Singleton: một instance duy nhất được sử dụng cho mọi request
}
```

### b. Request Scope

- **Request Scope:** Mỗi request HTTP sẽ tạo ra một instance riêng cho provider.  
- Điều này hữu ích khi provider cần giữ trạng thái riêng biệt cho từng request hoặc khi làm việc với các thông tin liên quan đến request đó.

**Ví dụ:**

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
  // Mỗi request sẽ có instance riêng của RequestScopedService
}
```

### c. Transient Scope

- **Transient Scope:** Mỗi lần tiêm provider, một instance mới sẽ được tạo ra.  
- Transient giúp tránh chia sẻ trạng thái giữa các thành phần, nhưng có thể gây tốn kém tài nguyên nếu không được sử dụng hợp lý.

**Ví dụ:**

```typescript
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {
  // Mỗi lần injection sẽ có một instance mới của TransientService
}
```


## 6. Khái Niệm Cơ Bản Về Module

Trong NestJS, module là đơn vị tổ chức cơ bản của ứng dụng. Mỗi module nhóm các thành phần liên quan như controller, provider, service,… lại với nhau. Nhờ đó, module giúp:

- **Tách biệt mối quan tâm:** Mỗi module đảm nhiệm một phần chức năng cụ thể của ứng dụng.
- **Quản lý và bảo trì:** Các thành phần được nhóm lại giúp dễ dàng mở rộng, kiểm thử và bảo trì mã nguồn.
- **Chia sẻ và tái sử dụng:** Module có thể export provider để được sử dụng trong các module khác.

Trong NestJS, **module** là một đơn vị tổ chức quan trọng giúp nhóm các thành phần liên quan lại với nhau. Mỗi module có thể chứa:  
- **Controllers** (Xử lý HTTP request)  
- **Providers** (Service, Repository, Factory, Helpers...)  
- **Exports** (Các thành phần có thể chia sẻ với module khác)  
- **Imports** (Tích hợp các module khác vào)  

Nhờ cơ chế module hóa, ứng dụng NestJS dễ mở rộng, bảo trì và tái sử dụng.  

---

### **6.1. Cách Định Nghĩa Một Module**  

Mỗi module trong NestJS được định nghĩa bằng decorator `@Module()`. Decorator này nhận một đối tượng chứa các metadata mô tả module.  

**Ví dụ: Định nghĩa một module `UsersModule`**  

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController], // Controller xử lý request
  providers: [UsersService],      // Service cung cấp logic nghiệp vụ
})
export class UsersModule {}
```

Ở đây:  
- **`controllers`**: Chứa danh sách controller của module.  
- **`providers`**: Danh sách các service hoặc provider được quản lý bởi module.  

---

### **6.2. Feature Modules**  

Trong NestJS, thay vì đặt tất cả logic vào `AppModule`, ta chia ứng dụng thành nhiều **feature modules** (module chức năng) để dễ tổ chức và quản lý.  

**Ví dụ: Tách biệt module cho User và Post**  

```
/src
 ├── users
 │   ├── dto
 │   │     ├── create-user.dto.ts
 │   ├── interfaces
 │   │     ├── user.interfaces.ts 
 │   ├── users.module.ts
 │   ├── users.controller.ts
 │   ├── users.service.ts
 │
 ├── posts
 │   ├── dto
 │   │     ├── create-post.dto.ts
 │   ├── interfaces
 │   │     ├── post.interfaces.ts
 │   ├── posts.module.ts
 │   ├── posts.controller.ts
 │   ├── posts.service.ts
 │
 ├── app.module.ts
 ├── main.ts
```

Sau đó, ta **import các feature module vào AppModule**:

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [UsersModule, PostsModule], // Nhúng các module chức năng vào
})
export class AppModule {}
```

Ưu điểm:  
✔️ **Mã nguồn có tổ chức rõ ràng**  
✔️ **Dễ mở rộng, bảo trì**  
✔️ **Tăng khả năng tái sử dụng**  

---

### **6.3. Shared Modules**  

Khi một module chứa service cần được sử dụng bởi nhiều module khác, ta cần định nghĩa **shared module**.  

**Ví dụ: `DatabaseModule` dùng chung**  

```typescript
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useValue: 'MySQL Connection',
    },
  ],
  exports: ['DATABASE_CONNECTION'], // Cho phép module khác sử dụng
})
export class DatabaseModule {}
```

Bây giờ, module khác có thể sử dụng nó bằng cách **import vào module của mình**:  

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
})
export class UsersModule {}
```

⚠ **Lưu ý:** Nếu không **export** provider thì module khác sẽ không thể sử dụng nó.  

---

### **6.4. Module Re-exporting**  

Thay vì bắt buộc phải import nhiều module, ta có thể tái xuất (re-export) module bằng cách export luôn các module con.  

**Ví dụ: `CoreModule` re-export `DatabaseModule` và `LoggerModule`**  

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [DatabaseModule, LoggerModule],
  exports: [DatabaseModule, LoggerModule], // Re-export module con
})
export class CoreModule {}
```

Giờ đây, các module khác chỉ cần **import `CoreModule`** là có thể sử dụng cả `DatabaseModule` và `LoggerModule` mà không cần import riêng lẻ.

```typescript
import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [CoreModule],
})
export class AppModule {}
```

💡 **Lợi ích của Module Re-exporting**  
✔️ Giúp quản lý import dễ dàng hơn  
✔️ Giảm số lượng module cần import  

---

### **6.5. Dependency Injection (DI) Giữa Các Module**  

NestJS sử dụng cơ chế **Dependency Injection (DI)** để chia sẻ dữ liệu và logic giữa các module. Khi một module cần dùng một service từ module khác, nó cần **import module đó** và service cần được **export**.  

**Ví dụ: UsersService cần `DatabaseService` từ DatabaseModule**  

1️⃣ **DatabaseModule export `DatabaseService`**  

```typescript
import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService], // Export service để module khác dùng
})
export class DatabaseModule {}
```

2️⃣ **UsersModule import `DatabaseModule` và sử dụng `DatabaseService`**  

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule], // Import để có thể sử dụng DatabaseService
  providers: [UsersService],
})
export class UsersModule {}
```

3️⃣ **Inject `DatabaseService` vào `UsersService`**  

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private databaseService: DatabaseService) {}

  findAllUsers() {
    return this.databaseService.query('SELECT * FROM users');
  }
}
```

---

### **6.6. Global Modules**  

Để tránh phải import một module trong tất cả các module khác, NestJS cung cấp decorator `@Global()` giúp biến một module thành **module toàn cục (Global Module)**.  

**Ví dụ: Tạo một `ConfigModule` làm Global Module**  

```typescript
import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [
    {
      provide: 'CONFIG',
      useValue: { appName: 'NestJS App', port: 3000 },
    },
  ],
  exports: ['CONFIG'],
})
export class ConfigModule {}
```

📌 **Lợi ích của Global Module**  
✔️ Không cần phải import trong mỗi module khác  
✔️ Tiện lợi cho các module dùng chung như Config, Logger, Database  


### 6.7. Dynamic Modules

Dynamic Modules cho phép bạn tạo ra các module có thể cấu hình được tại thời điểm import, tùy thuộc vào các tham số hoặc điều kiện cụ thể. Điều này hữu ích khi cần chia sẻ cấu hình hoặc logic khởi tạo giữa các module mà không cần phải tạo nhiều phiên bản module tĩnh.

**Ví dụ về Dynamic Module:**

```typescript
import { Module, DynamicModule } from '@nestjs/common';

@Module({})
export class DatabaseModule {
  static forRoot(options: { host: string; port: number }): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        // Có thể thêm các provider khác dựa trên options
      ],
      exports: ['DATABASE_OPTIONS'],
    };
  }
}
```

Khi sử dụng, bạn có thể cấu hình module như sau:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';

@Module({
  imports: [
    DatabaseModule.forRoot({ host: 'localhost', port: 3306 }),
  ],
})
export class AppModule {}
```

---

### 6.8. Lazy Loading Modules

Lazy Loading (tải module lười) cho phép tải module chỉ khi chúng thực sự cần thiết, giúp giảm thời gian khởi động của ứng dụng. Đây là một kỹ thuật quan trọng trong việc tối ưu hóa hiệu suất, đặc biệt là trong các ứng dụng có số lượng module lớn.

- **Cách hoạt động:** Module sẽ không được khởi tạo cho đến khi một thành phần nào đó thực sự cần đến chúng.  
- **Ưu điểm:** Giảm tải ban đầu và cải thiện tốc độ khởi động của ứng dụng.

NestJS hỗ trợ lazy loading thông qua cơ chế import module trong các module khác theo cách truyền thống, và các module được tạo ra thông qua Dynamic Modules cũng có thể hỗ trợ lazy loading nếu được cấu hình đúng.

---

### 6.9. ModuleRef

ModuleRef là một lớp cung cấp các phương thức để truy xuất các provider đã đăng ký trong module một cách động tại runtime. Nó rất hữu ích trong các tình huống:
- Khi cần lấy một provider mà không thể tiêm trực tiếp qua constructor.
- Khi xử lý các dependency phức tạp hoặc xử lý tình huống circular dependency.

**Ví dụ sử dụng ModuleRef:**

```typescript
import { Injectable, ModuleRef } from '@nestjs/common';

@Injectable()
export class SomeService {
  constructor(private moduleRef: ModuleRef) {}

  async getOtherService() {
    const otherService = await this.moduleRef.resolve('OtherService');
    return otherService.doSomething();
  }
}
```

Với ModuleRef, bạn có thể "lấy" một provider bất cứ lúc nào, đảm bảo tính linh hoạt trong quản lý dependency.

---

### 6.10. Circular Dependency

Circular dependency xảy ra khi hai hay nhiều module hoặc provider phụ thuộc lẫn nhau, dẫn đến vòng lặp không mong muốn trong quá trình khởi tạo. Điều này có thể gây ra lỗi hoặc hành vi không xác định.

**Cách xử lý Circular Dependency trong NestJS:**

- **Forward References:** Sử dụng hàm `forwardRef()` để khai báo dependency khi có vòng lặp giữa các module hoặc provider.

**Ví dụ xử lý circular dependency giữa hai service:**

```typescript
// user.service.ts
import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { PostsService } from './posts.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => PostsService))
    private postsService: PostsService,
  ) {}
}

// posts.service.ts
import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class PostsService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}
}
```

- **Tách Biệt Mối Quan Tâm:** Cố gắng phân chia lại logic nếu có thể, giảm sự phụ thuộc trực tiếp giữa các module hay provider.


## 7. Tổng Kết

- **Provider** là thành phần cung cấp dịch vụ, logic nghiệp vụ cho ứng dụng và được đánh dấu bằng `@Injectable()`.
- **Đăng ký Provider:** Được thực hiện thông qua thuộc tính `providers` trong decorator `@Module()`, giúp NestJS quản lý và cung cấp instance cho các lớp khác.
- **Dependency Injection:** Giúp tự động "tiêm" các instance của provider vào controller, service hoặc các thành phần khác thông qua constructor, làm cho mã nguồn dễ bảo trì, mở rộng và kiểm thử.

- **Module:** Là đơn vị tổ chức cơ bản trong NestJS, giúp nhóm các thành phần liên quan lại với nhau, quản lý và chia sẻ logic nghiệp vụ.
- **Dynamic Modules:** Cho phép cấu hình module theo thời điểm chạy, hỗ trợ tùy biến và tái sử dụng.
- **Lazy Loading Modules:** Tải module khi cần, cải thiện hiệu suất và thời gian khởi động ứng dụng.
- **ModuleRef:** Cung cấp cách truy xuất provider một cách linh hoạt tại runtime.
- **Circular Dependency:** Cần được xử lý cẩn thận thông qua forward references và thiết kế lại cấu trúc ứng dụng để tránh vòng lặp phụ thuộc.

Những cơ chế và kỹ thuật này giúp NestJS trở nên mạnh mẽ, linh hoạt và dễ mở rộng, cho phép bạn xây dựng các ứng dụng quy mô lớn một cách có tổ chức và hiệu quả.
