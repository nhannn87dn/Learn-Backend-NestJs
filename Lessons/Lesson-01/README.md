# Giới thiệu về NestJS

## Khái niệm và lợi ích của NestJS

## So sánh NestJS với Node.js thuần và các framework khác

## Cài đặt môi trường phát triển (Node.js, NestJS CLI, IDE)
\

Dưới đây là bài viết chi tiết về **Provider** trong NestJS, bao gồm các loại provider, cách sử dụng custom providers, async providers và phạm vi (injection scopes) của provider. Bài viết này sẽ giúp bạn hiểu rõ hơn về cơ chế Dependency Injection và cách tùy biến provider trong ứng dụng NestJS, dựa trên các tài liệu chính thức:

---

## 1. Giới Thiệu Về Provider và Dependency Injection

- **Provider** là các thành phần (lớp, giá trị, factory function) cung cấp dịch vụ, logic nghiệp vụ hoặc dữ liệu cho các phần khác của ứng dụng.  
- Provider được đánh dấu bằng decorator `@Injectable()` và được đăng ký trong module để có thể sử dụng thông qua cơ chế Dependency Injection (DI).  
- **Dependency Injection (DI)** giúp tách biệt sự phụ thuộc giữa các thành phần, cho phép NestJS tự động khởi tạo và "tiêm" các instance của provider vào các controller, service hoặc thành phần khác.

---

## 2. Các Loại Provider Trong NestJS

NestJS hỗ trợ nhiều kiểu provider, bao gồm:

### a. Class Provider

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

### b. Value Provider

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

### c. Factory Provider

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

### d. Asynchronous Provider

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

## 3. Custom Providers

- **Custom Providers** cho phép bạn kiểm soát quá trình khởi tạo và đăng ký provider.  
- Bạn có thể sử dụng các token (string hoặc symbol) làm định danh cho provider, giúp tránh xung đột tên và hỗ trợ test dễ dàng hơn.  
- Khi dùng custom providers, bạn có thể kết hợp với class, value hoặc factory provider để đáp ứng nhu cầu cụ thể.

---

## 4. Injection Scopes (Phạm Vi Tiêm Dependency)

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

---

## 5. Tổng Kết

- **Provider** trong NestJS có nhiều dạng: class, value, factory, và async provider, giúp bạn tùy chỉnh cách cung cấp dịch vụ cho ứng dụng.  
- **Custom Providers** cho phép sử dụng token và factory function để kiểm soát quá trình tạo instance.  
- **Async Providers** hỗ trợ các tác vụ bất đồng bộ khi khởi tạo provider, đảm bảo rằng các giá trị cần thiết được tải về trước khi sử dụng.  
- **Injection Scopes** giúp quản lý vòng đời của provider với 3 phạm vi chính: Singleton (mặc định), Request (mỗi request có instance riêng) và Transient (mỗi lần tiêm đều tạo instance mới).  

Những tính năng này giúp NestJS trở nên linh hoạt và mạnh mẽ trong việc xây dựng các ứng dụng có cấu trúc rõ ràng, dễ bảo trì và mở rộng. Bạn có thể tìm hiểu thêm chi tiết từ tài liệu chính thức của NestJS tại: citeturn0search0

Hy vọng bài viết này đã cung cấp cho bạn một cái nhìn đầy đủ và chi tiết về Provider và Dependency Injection trong NestJS!