# NestJS Authentication với Passport + JWT

> Hướng dẫn này được soạn bám sát tài liệu chính thức [NestJS Recipes: Passport](https://docs.nestjs.com/recipes/passport), có bổ sung **Refresh Token**, **module Users** và **module Auth** tách biệt rõ ràng.

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cài đặt dependencies](#2-cài-đặt-dependencies)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Users Module](#4-users-module)
5. [Auth Module — Local Strategy](#5-auth-module--local-strategy)
6. [Auth Module — JWT Strategy](#6-auth-module--jwt-strategy)
7. [Refresh Token](#7-refresh-token)
8. [Global Guard + @Public() Decorator](#8-global-guard--public-decorator)
9. [Kiểm tra với cURL](#9-kiểm-tra-với-curl)
10. [Biến môi trường](#10-biến-môi-trường)

---

## 1. Tổng quan kiến trúc

```
POST /auth/register     → Đăng ký tài khoản
POST /auth/login        → Đăng nhập → trả về accessToken + refreshToken
POST /auth/refresh      → Dùng refreshToken → cấp accessToken mới
POST /auth/logout       → Xóa refreshToken, đăng xuất
GET  /auth/profile      → Route được bảo vệ bằng JWT
```

**Luồng xác thực:**

```
[Login]
  Client ──POST username+password──▶ LocalStrategy.validate()
                                          │
                                    AuthService.login()
                                          │
                                    ◀── { accessToken, refreshToken }

[Gọi API được bảo vệ]
  Client ──GET /profile + Bearer token──▶ JwtStrategy.validate()
                                               │
                                         ◀── req.user
```

---

## 2. Cài đặt dependencies

```bash
# Tạo project mới
nest new nestjs-auth && cd nestjs-auth

# Passport + strategies
npm install @nestjs/passport passport passport-local passport-jwt
npm install -D @types/passport-local @types/passport-jwt

# JWT
npm install @nestjs/jwt

# Password hashing
npm install bcrypt
npm install -D @types/bcrypt

# Validation
npm install class-validator class-transformer
```

---

## 3. Cấu trúc thư mục

```
src/
├── app.module.ts
├── main.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── user.entity.ts
│   └── dto/
│       └── create-user.dto.ts
│
└── auth/
    ├── auth.module.ts
    ├── auth.service.ts
    ├── auth.controller.ts
    ├── constants.ts
    ├── decorators/
    │   └── public.decorator.ts
    ├── dto/
    │   ├── login.dto.ts
    │   └── register.dto.ts
    ├── guards/
    │   ├── local-auth.guard.ts
    │   ├── jwt-auth.guard.ts
    │   └── jwt-refresh.guard.ts
    └── strategies/
        ├── local.strategy.ts
        ├── jwt.strategy.ts
        └── jwt-refresh.strategy.ts
```

---

## 4. Users Module

Module này chịu trách nhiệm quản lý dữ liệu user. Trong thực tế bạn sẽ dùng TypeORM/Prisma thay cho mảng in-memory.

### 4.1 User Entity

```typescript
// src/users/user.entity.ts
export class User {
  userId: number;
  username: string;
  email: string;
  password: string;          // đã hash bằng bcrypt
  refreshToken?: string;     // hash của refreshToken hiện tại
}
```

### 4.2 DTOs

```typescript
// src/users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### 4.3 UsersService

```typescript
// src/users/users.service.ts
import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  // Mô phỏng database — thay bằng TypeORM/Prisma trong thực tế
  private readonly users: User[] = [];
  private idCounter = 1;

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const exists = await this.findByUsername(dto.username);
    if (exists) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user: User = {
      userId: this.idCounter++,
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
    };
    this.users.push(user);

    const { password, ...result } = user;
    return result;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async findById(userId: number): Promise<User | undefined> {
    return this.users.find(u => u.userId === userId);
  }

  async updateRefreshToken(userId: number, refreshToken: string | null) {
    const user = await this.findById(userId);
    if (!user) return;

    // Lưu hash của refreshToken thay vì raw token
    user.refreshToken = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : undefined;
  }
}
```

### 4.4 UsersModule

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],   // export để AuthModule dùng được
})
export class UsersModule {}
```

---

## 5. Auth Module — Local Strategy

### 5.1 DTOs

```typescript
// src/auth/dto/login.dto.ts
import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}
```

```typescript
// src/auth/dto/register.dto.ts
export { CreateUserDto as RegisterDto } from '../../users/dto/create-user.dto';
```

### 5.2 Constants

```typescript
// src/auth/constants.ts
// CẢNH BÁO: Trong production, dùng biến môi trường thay vì hardcode!
export const jwtConstants = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
};
```

### 5.3 AuthService

```typescript
// src/auth/auth.service.ts
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // ─── Được gọi bởi LocalStrategy ───────────────────────────────────────────
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result; // Gắn vào req.user bởi Passport
    }
    return null;
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  async register(dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // ─── Login: gọi sau khi LocalStrategy đã validate xong ───────────────────
  async login(user: any) {
    const tokens = await this.generateTokens(user.userId, user.username);
    await this.usersService.updateRefreshToken(user.userId, tokens.refreshToken);
    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout(userId: number) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  // ─── Refresh Tokens ───────────────────────────────────────────────────────
  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    // So sánh raw refreshToken với hash đang lưu trong DB
    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    // Token Rotation: cấp cặp token mới, vô hiệu token cũ
    const tokens = await this.generateTokens(user.userId, user.username);
    await this.usersService.updateRefreshToken(user.userId, tokens.refreshToken);
    return tokens;
  }

  // ─── Helper: tạo cặp accessToken + refreshToken ───────────────────────────
  private async generateTokens(userId: number, username: string) {
    const payload = { sub: userId, username };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.accessSecret,
        expiresIn: jwtConstants.accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.refreshSecret,
        expiresIn: jwtConstants.refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
```

### 5.4 Local Strategy

Theo tài liệu chính thức, Local Strategy xác thực `username` + `password` từ request body:

```typescript
// src/auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'username', // đổi thành 'email' nếu cần
    });
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user; // → gắn vào req.user
  }
}
```

### 5.5 Local Auth Guard

```typescript
// src/auth/guards/local-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

---

## 6. Auth Module — JWT Strategy

### 6.1 JWT Strategy (Access Token)

```typescript
// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // Lấy token từ header: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.accessSecret,
    });
  }

  async validate(payload: any) {
    // Passport đã verify chữ ký và hạn token trước khi gọi hàm này
    return { userId: payload.sub, username: payload.username };
    // → kết quả gắn vào req.user
  }
}
```

### 6.2 JWT Auth Guard

```typescript
// src/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Nếu route được đánh dấu @Public() → bỏ qua xác thực
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    return super.canActivate(context);
  }
}
```

---

## 7. Refresh Token

### 7.1 JWT Refresh Strategy

```typescript
// src/auth/strategies/jwt-refresh.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { jwtConstants } from '../constants';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.refreshSecret,
      passReqToCallback: true, // cần req để lấy raw token
    });
  }

  async validate(req: Request, payload: any) {
    // Lấy raw refreshToken từ header để so sánh với hash trong DB
    const refreshToken = req
      .get('Authorization')
      .replace('Bearer', '')
      .trim();

    return { ...payload, refreshToken };
    // → req.user = { sub, username, refreshToken }
  }
}
```

### 7.2 JWT Refresh Guard

```typescript
// src/auth/guards/jwt-refresh.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
```

---

## 8. Global Guard + @Public() Decorator

### 8.1 Public Decorator

```typescript
// src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 8.2 AuthController

```typescript
// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ── Đăng ký ─────────────────────────────────────────────────────
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── Đăng nhập ────────────────────────────────────────────────────
  // LocalAuthGuard gọi LocalStrategy.validate() trước
  // Nếu hợp lệ → req.user được gán → xuống handler này
  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Request() req) {
    return this.authService.login(req.user);
  }

  // ── Refresh token ─────────────────────────────────────────────────
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refreshTokens(@Request() req) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    return this.authService.refreshTokens(userId, refreshToken);
  }

  // ── Đăng xuất ────────────────────────────────────────────────────
  // Route này được bảo vệ bởi Global JwtAuthGuard (không cần @UseGuards)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  // ── Lấy thông tin người dùng hiện tại ─────────────────────────────
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
```

### 8.3 AuthModule

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // JwtModule đăng ký ở đây chủ yếu để inject JwtService vào AuthService
    // Secret thực sự được truyền khi gọi jwtService.signAsync(payload, { secret })
    JwtModule.register({}),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
```

### 8.4 AppModule — Đăng ký Global Guard

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Bảo vệ toàn bộ API, trừ route @Public()
    },
  ],
})
export class AppModule {}
```

### 8.5 main.ts — Bật Validation Pipe

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,      // bỏ các field không có trong DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();
```

---

## 9. Kiểm tra với cURL

### Đăng ký

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "email": "john@example.com", "password": "secret123"}'

# Response:
# { "userId": 1, "username": "john", "email": "john@example.com" }
```

### Đăng nhập

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "secret123"}'

# Response:
# {
#   "accessToken": "eyJhbGci...",
#   "refreshToken": "eyJhbGci..."
# }
```

### Truy cập route được bảo vệ

```bash
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer <accessToken>"

# Response:
# { "userId": 1, "username": "john" }
```

### Truy cập khi không có token

```bash
curl http://localhost:3000/auth/profile

# Response:
# { "statusCode": 401, "message": "Unauthorized" }
```

### Làm mới token (Refresh)

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Authorization: Bearer <refreshToken>"

# Response:
# {
#   "accessToken": "eyJhbGci...(mới)",
#   "refreshToken": "eyJhbGci...(mới)"
# }
```

### Đăng xuất

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <accessToken>"

# Response:
# { "message": "Logged out successfully" }
```

---

## 10. Biến môi trường

Tạo file `.env` ở thư mục gốc:

```env
JWT_ACCESS_SECRET=thay-bang-chuoi-bi-mat-dai-va-ngau-nhien
JWT_REFRESH_SECRET=thay-bang-chuoi-bi-mat-khac-cho-refresh
```

Cài `@nestjs/config` để đọc `.env`:

```bash
npm install @nestjs/config
```

```typescript
// src/app.module.ts
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ...
  ],
})
```

Cập nhật `constants.ts`:

```typescript
// src/auth/constants.ts
export const jwtConstants = {
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
};
```

---

## Tóm tắt luồng hoàn chỉnh

```
REGISTER
  POST /auth/register
    └── UsersService.create() → hash password → lưu user

LOGIN
  POST /auth/login
    └── LocalAuthGuard
          └── LocalStrategy.validate()
                └── AuthService.validateUser() → bcrypt.compare()
                      └── AuthService.login()
                            ├── generateTokens() → accessToken + refreshToken
                            └── updateRefreshToken() → lưu hash(refreshToken)

GỌI API
  GET /auth/profile + Bearer accessToken
    └── JwtAuthGuard (global)
          └── JwtStrategy.validate()
                └── req.user = { userId, username }

REFRESH
  POST /auth/refresh + Bearer refreshToken
    └── JwtRefreshGuard
          └── JwtRefreshStrategy.validate()
                └── AuthService.refreshTokens()
                      ├── bcrypt.compare(raw, hash)
                      ├── generateTokens() → cặp token mới
                      └── updateRefreshToken() → cập nhật hash mới (Token Rotation)

LOGOUT
  POST /auth/logout + Bearer accessToken
    └── JwtAuthGuard (global)
          └── AuthService.logout()
                └── updateRefreshToken(null) → xóa refreshToken
```

---

> **Tham khảo chính thức:**
> - [NestJS Recipes: Passport](https://docs.nestjs.com/recipes/passport)
> - [NestJS Security: Authentication](https://docs.nestjs.com/security/authentication)
> - [@nestjs/jwt](https://github.com/nestjs/jwt)
