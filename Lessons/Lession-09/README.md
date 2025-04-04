# Xác thực và Phân quyền


## **1️⃣ Xác Thực trong NestJS (Authentication)**
Xác thực giúp xác minh danh tính của người dùng trước khi họ có thể truy cập tài nguyên trong ứng dụng.  

### **1.1 Sử dụng Passport.js cho Xác Thực**
[Passport.js](http://www.passportjs.org/) là thư viện phổ biến để xử lý xác thực, hỗ trợ nhiều phương thức như **JWT, OAuth, Google, Facebook...**  

### **📌 Cài đặt Passport và JWT**
```bash
npm install @nestjs/passport passport passport-jwt passport-local jsonwebtoken bcrypt
npm install --save-dev @types/passport-jwt @types/bcrypt
```

### **📌 Tạo Service xử lý JWT**
**🔹 auth.service.ts**  
```typescript
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateToken(user: any) {
    return this.jwtService.sign({ id: user.id, role: user.role });
  }
}
```

### **📌 Tạo Guard Xác Thực JWT**
**🔹 jwt-auth.guard.ts**  
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

---

## **2️⃣ Phân Quyền trong NestJS (Authorization)**
Sau khi xác thực, chúng ta cần đảm bảo chỉ người có quyền mới có thể truy cập tài nguyên.

### **2.1 Sử dụng Guards để Phân Quyền**
NestJS cung cấp **Guards** để kiểm soát quyền truy cập vào API.  
Ví dụ: **Chỉ Admin mới có thể xóa user**  

**🔹 roles.guard.ts**
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.user?.role === 'admin'; // Chỉ admin mới có quyền
  }
}
```

**🔹 Sử dụng Guard trong Controller**
```typescript
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

@UseGuards(RolesGuard)
@Delete('user/:id')
async deleteUser(@Param('id') id: string) {
  return this.userService.delete(id);
}
```

### **2.2 Dùng Decorator để Kiểm Tra Quyền**
Chúng ta có thể tạo Decorator để gán quyền cho từng API:  

**🔹 roles.decorator.ts**
```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

**🔹 Áp dụng trong Controller**
```typescript
import { Roles } from './roles.decorator';

@Roles('admin')
@Delete('user/:id')
async deleteUser(@Param('id') id: string) {
  return this.userService.delete(id);
}
```

---

## **3️⃣ Các Gói Hỗ Trợ Bảo Mật Khác**
Ngoài xác thực và phân quyền, chúng ta cần sử dụng một số **plugin/middleware bảo mật** để tăng cường an toàn cho ứng dụng.

### **3.1 Encryption và Hashing với Bcrypt**
**Mục đích:**  
- Mã hóa mật khẩu trước khi lưu vào DB.  
- Kiểm tra mật khẩu khi đăng nhập.  

**📌 Cách sử dụng Bcrypt để hash mật khẩu**
```typescript
import * as bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

### **3.2 Helmet – Bảo vệ HTTP Headers**
Helmet giúp bảo vệ ứng dụng bằng cách thiết lập các **HTTP Security Headers**.

**📌 Cài đặt Helmet**
```bash
npm install helmet
```

**📌 Sử dụng Helmet trong `main.ts`**
```typescript
import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet()); // Bật Helmet
  await app.listen(3000);
}
bootstrap();
```

---

### **3.3 CORS – Chống Tấn Công Cross-Origin**
CORS bảo vệ ứng dụng khỏi các **Cross-Origin Requests** không mong muốn.

**📌 Kích hoạt CORS trong `main.ts`**
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'https://yourdomain.com', // Chỉ cho phép domain này
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.listen(3000);
}
bootstrap();
```

---

### **3.4 CSRF Protection – Chống Tấn Công Cross-Site Request Forgery**
CSRF bảo vệ ứng dụng khỏi các request giả mạo từ bên ngoài.

**📌 Cài đặt gói CSRF**
```bash
npm install csurf
```

**📌 Thêm Middleware CSRF**
```typescript
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(csurf());
  await app.listen(3000);
}
bootstrap();
```

---

### **3.5 Rate Limiting – Giới Hạn Số Lượng Request**
Rate limiting giúp **ngăn chặn tấn công DDoS** bằng cách giới hạn số request từ 1 IP.

**📌 Cài đặt `express-rate-limit`**
```bash
npm install express-rate-limit
```

**📌 Cấu hình Rate Limiting**
```typescript
import * as rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 phút
      max: 100, // Giới hạn 100 request mỗi 15 phút
    }),
  );
  await app.listen(3000);
}
bootstrap();
```

