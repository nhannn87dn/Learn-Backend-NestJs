# Lesson 08: Authentication (Jwt, 2FA)

## Mục tiêu bài học

- Hiểu về khái niệm Authentication là gì?
- Nắm được cái mô hình xác thực người dùng phổ biến
- Nắm được cách thức bảo mật mật khẩu người dùng
- Hiểu về JWT và cách sử dụng JWT trong NestJS
- Hiểu về PassportJS và cách sử dụng PassportJS trong NestJS
- Biết cách bảo vệ API với Guards
- Hiểu về Refresh Token và cách sử dụng Refresh Token
- Hiểu về các phương thức xác thực nâng cao như Social Authentication và Two Factor Authentication (2FA)

---

## 1. Tổng quan về Authentication

**Authentication** (Xác thực) là quá trình **kiểm tra danh tính** của người dùng - tức là xác nhận "bạn là ai?".

**Ví dụ thực tế:**
- Khi bạn đăng nhập Facebook bằng email/mật khẩu → Facebook xác thực bạn có phải là chủ tài khoản không
- Mở khóa iPhone bằng FaceID → iPhone xác thực bạn có phải chủ nhân thiết bị
- Quẹt thẻ từ vào công ty → Hệ thống xác thực bạn là nhân viên

**Các phương thức Authentication phổ biến:**
- Username/Password (truyền thống)
- Email + OTP (One-Time Password)
- Sinh trắc học (vân tay, khuôn mặt)
- Social Login (Google, Facebook)
- Multi-Factor Authentication (MFA)


---

## 2. Các phương thức Authentication trong Backend

### 2.1 Session-based Authentication

Đây là phương thức truyền thống, hoạt động theo cơ chế **stateful** (máy chủ lưu trạng thái).

**Luồng hoạt động:**

```
1. Client gửi username + password lên server
2. Server xác thực thông tin → tạo Session ID → lưu vào database/memory
3. Server trả về Session ID trong Cookie
4. Mỗi request tiếp theo, client gửi kèm Cookie
5. Server tra cứu Session ID → xác định người dùng
```

**Ưu điểm:**
- Dễ vô hiệu hóa session (logout tức thì)
- Dữ liệu nhạy cảm nằm trên server

**Nhược điểm:**
- Khó scale vì server phải lưu state
- Không phù hợp với kiến trúc microservices
- Gặp vấn đề với CORS khi frontend/backend khác domain


### 2.2 Token-based Authentication

Phương thức hiện đại hơn, hoạt động theo cơ chế **stateless** (máy chủ không lưu trạng thái).

**Luồng hoạt động:**

```
1. Client gửi username + password lên server
2. Server xác thực → ký và tạo Token (thường là JWT)
3. Server trả về Token cho client
4. Client lưu Token (localStorage, memory, cookie httpOnly)
5. Mỗi request tiếp theo, client gửi kèm Token trong Header
6. Server verify chữ ký Token → xác định người dùng
```

**Ưu điểm:**
- Stateless → dễ scale
- Phù hợp với SPA, Mobile App, Microservices
- Có thể chứa thông tin user trong token

**Nhược điểm:**
- Không thể revoke token ngay lập tức (trừ khi dùng blacklist)
- Token bị đánh cắp là nguy hiểm nếu không xử lý đúng


---

## 3. Authentication JWT Flow

### 3.1 JWT là gì?

**JWT (JSON Web Token)** là một chuẩn mở (RFC 7519) để truyền thông tin an toàn giữa các bên dưới dạng JSON object.

### 3.2 Cấu trúc JWT

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

JWT gồm 3 phần, ngăn cách bởi dấu chấm (.):

```
HEADER.PAYLOAD.SIGNATURE
```

#### 3.2.1. Header (Phần đầu)

Chứa thông tin về thuật toán mã hóa:

```json
{
  "alg": "HS256",  // Thuật toán: HMAC SHA256
  "typ": "JWT"     // Loại token
}
```

Sau đó được **Base64Url encode**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

#### 3.2.2. Payload (Dữ liệu)

Chứa thông tin người dùng (claims):

```json
{
  "sub": "123456",           // Subject: User ID
  "email": "user@example.com",
  "role": "admin",
  "iat": 1516239022,         // Issued At: Thời điểm tạo token
  "exp": 1516242622          // Expiration: Thời điểm hết hạn
}
```

**Lưu ý:** Payload chỉ được **encode**, KHÔNG được **encrypt** → Không lưu thông tin nhạy cảm (password, số thẻ tín dụng)!

#### 3.2.3. Signature (Chữ ký)

Đảm bảo tính toàn vẹn của token:

```javascript
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret_key
)
```

**Cách hoạt động:**
- Server tạo chữ ký bằng secret key (chỉ server biết)
- Khi nhận token, server tính lại signature và so sánh
- Nếu token bị sửa đổi → signature không khớp → reject

### 3.3 Tại sao dùng JWT thay vì Session?


#### Session-based Authentication (Truyền thống)

```
Client                          Server
  |                               |
  |-- POST /login (credentials)-->|
  |                               | 1. Validate credentials
  |                               | 2. Tạo session, lưu vào DB/Redis
  |                               | 3. Gửi sessionID về cookie
  |<------ Set-Cookie: sid=xyz ---|
  |                               |
  |-- GET /profile --------------->|
  |   Cookie: sid=xyz             | 4. Lấy session từ DB bằng sid
  |                               | 5. Kiểm tra session còn hợp lệ?
  |<------ User data --------------|
```

**Nhược điểm Session:**
- Cần lưu trữ session trên server (tốn bộ nhớ)
- Khó scale horizontal (nhiều server cần share session store)
- Không phù hợp với microservices

#### JWT-based Authentication (Hiện đại)

```
Client                          Server
  |                               |
  |-- POST /login (credentials)-->|
  |                               | 1. Validate credentials
  |                               | 2. Tạo JWT token (không lưu DB)
  |<------ { token: "eyJ..." } ---|
  |                               |
  | Lưu token vào memory/cookie   |
  |                               |
  |-- GET /profile --------------->|
  |   Authorization: Bearer eyJ...| 3. Verify signature
  |                               | 4. Decode payload → lấy user info
  |<------ User data --------------|
```

**Ưu điểm JWT:**
- **Stateless**: Server không cần lưu trữ, chỉ verify signature
- **Scalable**: Dễ dàng scale horizontal (không cần shared storage)
- **Cross-domain**: Dùng được cho nhiều domain/service
- **Mobile-friendly**: Phù hợp với mobile app

**Nhược điểm JWT:**
- Không thể revoke token trước khi hết hạn (trừ khi dùng blacklist)
- Token có thể bị lớn nếu payload nhiều data
- Cần cẩn thận với XSS (nếu lưu trong localStorage)

### 3.3 Tạo User và Hash Password

### 3.3.1 Follow Đăng ký một User mới


```
User                    Frontend                Backend
 |                         |                        |
 | Nhập form đăng ký       |                        |
 |------------------------>|                        |
 |                         | POST /users/create    |
 |                         |----------------------->|
 |                         |   {                    | 1. Validate input
 |                         |     email,             | 2. Check email exists?
 |                         |     password,          | 3. Hash password (bcrypt)
 |                         |     name               | 4. Save to DB
 |                         |   }                    | 5. Return success
 |                         |<-----------------------|
 |<------------------------|   { message: "OK" }    |
 | Hiển thị thông báo      |                        |
```

### 3.3.2 Các bước thực hiện


Tạo modules user với CLI NestJS:

```bash
nest g module modules/user
```


#### Bước 1: Tạo UserEntity

```typescript
// src/modules/user/user.entity.ts
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ unique: true })
    email: string;
    
    @Column()
    password: string;
    
    @Column()
    name: string;
    }
```

#### Bước 2: Tạo UserRepository


```typescript
// src/modules/user/user.repository.ts
@EntityRepository(User)
export class UserRepository extends Repository<User> {
    // Tạo user mới
    async createUser(email: string, password: string, name: string): Promise<User> {
        const user = this.create({ email, password, name });
        return await this.save(user);
    }
}
```

#### Bước 3: Tạo UserService


Lệnh tại UserService bằng CLI NestJS:

```bash
nest g service modules/user --no-spec
```


```typescript
// src/modules/user/user.service.ts
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserRepository)
        private userRepository: UserRepository,
    ) {}
    // Kiểm tra email đã tồn tại chưa
    async makeSureEmailDoesNotExist(email: string): Promise<void> {
        const user = await this.userRepository
            .findOne({ email });
        if (user) {
            throw new ConflictException('Email already exists');
        }
    }

    //phương thức đăng ký user mới
    async create(email: string, password: string, name: string): Promise<User> {
        // Kiểm tra email đã tồn tại chưa
        await this.makeSureEmailDoesNotExist(email);

        // Hash password
        //TODO: Sử dụng bcrypt hoặc argon2 để hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user mới
        return await this.userRepository.createUser(email, hashedPassword, name);
    }
}
```

> Tìm hiểu về **Password Hashing** và tại sao không nên lưu mật khẩu dưới dạng plain text tại [Password Hashing](./Password-Hashing.md)

#### Bước 4: Tạo UserController

Lệnh tại UserControler bằng CLI NestJS:

```bash
nest g controller modules/user --no-spec
```

Sau đó code `UserController` thành như sau:

```typescript
// src/modules/user/user.controller.ts
@Controller('users')
export class UserController {
    constructor(private userService: UserService) {}

    @Post('create')
    async create(@Body() body: RegisterDto): Promise<{ message: string }> {
        const { email, password, name } = body;
        await this.userService.create(email, password, name);
        return { message: 'User created successfully' };
    }
}
```

#### Bước 5: Tạo UserModule

```typescript
// src/modules/user/user.module.ts
@Module({
    imports: [TypeOrmModule.forFeature([UserRepository])],
    providers: [UserService],
    controllers: [UserController],
    exports: [UserService], // Export UserService để AuthModule sử dụng
})
export class UserModule {}
```

#### Bước 6: Tích hợp UserModule vào AppModule

```typescript
// src/app.module.ts
@Module({
    imports: [
        TypeOrmModule.forRoot({
            // Cấu hình kết nối database
        }),
        UserModule, // Import UserModule
        AuthModule, // Import AuthModule (sẽ tạo sau)
    ],
})
export class AppModule {}
```

#### Bước 7: Test API tạo user mới

Sử dụng Postman hoặc REST Client để gửi request

### 3.4 Đăng nhập và tạo Tokens

#### 3.4.1 Follow Đăng nhập (Login)

> Xem tài liệu chính thức của NestJS về Authentication với JWT tại [Authentication with JWT](https://docs.nestjs.com/security/authentication#authentication)

```
User                    Frontend                Backend
 |                         |                        |
 | Nhập email/password     |                        |
 |------------------------>|                        |
 |                         | POST /auth/login       |
 |                         |----------------------->|
 |                         |   {                    | 1. Tìm user by email
 |                         |     email,             | 2. So sánh password hash
 |                         |     password           | 3. Tạo JWT token
 |                         |   }                    | 4. Return token
 |                         |<-----------------------|
 |                         |   {                    |
 |                         |     accessToken,       |
 |                         |     refreshToken       |
 |                         |   }                    |
 | Lưu token               |                        |
 |<------------------------|                        |
```
#### 3.4.2 Các bước thực hiện

Bước 0: Cài đặt và cấu hình JWT trong NestJS

```bash
npm install @nestjs/jwt passport-jwt
```

Bước 1: Tạo AuthModule

```bash
nest g module modules/auth
```

Bước 2: Tạo AuthService

Sử dụng lệnh sau nếu chưa có AuthService:

```bash
nest g service modules/auth --no-spec
```

Code AuthService:

```typescript
@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
    ) {}

    async login(loginDto: LoginDto) {
        // 1. Validate user
        const user = await this.validateUser(loginDto.email, loginDto.password);
        
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        
        // 2. Tạo payload cho JWT
        const payload = {
            sub: user.id,      // Subject: User ID
            email: user.email,
            role: user.role
        };
        
        // 3. Tạo tokens
        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '15m' // 15 phút
        });
        
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d' // 7 ngày
        });
        
        return {
            accessToken,
            refreshToken,
            user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
            }
        };
        }

        async validateUser(email: string, password: string) {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            return null;
        }
        
        // So sánh password hash
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return null;
        }
        
        return user;
        }
}
```

Bổ sung vào UserRepository phương thức tìm user theo email:

```typescript
// src/modules/user/user.repository.ts
@EntityRepository(User)
export class UserRepository extends Repository<User> {
    // Tìm user theo email
    async findByEmail(email: string): Promise<User> {
        return await this.findOne({ email });
    }
    // ... các phương thức khác
}
```

Bổ sung vào UserService phương thức tìm user theo email:

```typescript
// src/modules/user/user.service.ts
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserRepository)
        private userRepository: UserRepository,
    ) {}
    // Tìm user theo email
    async findByEmail(email: string): Promise<User> {
        return await this.userRepository.findByEmail(email);
    }
    // ... các phương thức khác
}
```

Bước 3: Tạo AuthController

```typescript
// src/modules/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('login')
    async login(@Body() body: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
        const { email, password } = body;
        return await this.authService.login(email, password);
    }
}
```

Bước 4: Refactor AuthModule

```typescript
// src/modules/auth/auth.module.ts
@Module({
    imports: [
        UserModule, // Import UserModule để AuthService sử dụng UserService
        JwtModule.register({
            global: true, // Đăng ký JwtModule toàn cục
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '15m' },
        }),
    ],
    providers: [AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
```

Bước 5: Đăng ký AuthModule vào AppModule

```typescript
// src/app.module.ts
@Module({
    imports: [
        TypeOrmModule.forRoot({
            // Cấu hình kết nối database
        }),
        UserModule, // Import UserModule
        AuthModule, // Import AuthModule
    ],
})
export class AppModule {}
```

Bước 6: Test API đăng nhập


## 4. Protect API với Guards và  PassportJS JWT

### 4.1 JWT Authentication Flow với Guards

```
Client                          Server
  |                               |
  |-- POST /login (credentials)-->|
  |                               | 1. Validate credentials
  |                               | 2. Tạo JWT token (không lưu DB)
  |<------ { token: "eyJ..." } ---|
  |                               |
  | Lưu token vào memory/cookie   |
  |                               |
  |-- GET /profile --------------->|
  |   Authorization: Bearer eyJ...| 3. Verify signature
  |                               | 4. Decode payload → lấy user info
  |<------ User data --------------|
```

### 4.2 Các bước thực hiện

Cài đặt PassportJS và JWT Strategy:

```bash
npm install @nestjs/passport passport passport-jwt passport-local
npm install --save-dev @types/passport-local @types/passport-jwt
```

Bước 1: Tạo JWT AuthGuard

```typescript
// src/modules/auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Bước 2: Tạo JWT Strategy

```typescript
// src/modules/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET,
        });
    }

    async validate(payload: any) {
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}
```

Bước 3: Tạo Local Strategy (nếu cần)

```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({ usernameField: 'email' });
    }
    
    async validate(email: string, password: string): Promise<any> {
        const user = await this.authService.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}
```

Bước 4: Cập nhật AuthModule

```typescript
@Module({
    imports: [
        UserModule,
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: '15m' },
        }),
        PassportModule,
    ],
    providers: [AuthService, JwtStrategy, LocalStrategy],
    controllers: [AuthController],
})
export class AuthModule {}
```

Bước 5: Bảo vệ API với JwtAuthGuard

```typescript
@Controller('auth')
export class AuthController {

    // ... các phương thức khác

    @Post('login')
    @UseGuards(LocalAuthGuard) // Sử dụng LocalAuthGuard để xác thực email/password
    async login(@Body() body: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
        const { email, password } = body;
        return await this.authService.login(email, password);
    }

    @UseGuards(JwtAuthGuard) // Sử dụng JwtAuthGuard để bảo vệ route
    @Get('profile')
    getProfile(@Request() req) {
        return req.user; // Thông tin user từ JWT payload
    }
}
```

Bước 6: Global Guard

Nếu muốn bảo vệ toàn bộ API (trừ một số route public):

- Tạo public route decorator

```typescript
//src/modules/auth/decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```
- Tạo Global Guard

```typescript
//src/modules/auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true; // Bỏ qua xác thực nếu route được đánh dấu là public
        }
        return super.canActivate(context);
    }
}
```

- Đăng ký Global Guard trong AppModule

```typescript
// src/app.module.ts
@Module({
    imports: [
        TypeOrmModule.forRoot({
            // Cấu hình kết nối database
        }),
        UserModule,
        AuthModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard, // Đăng ký JwtAuthGuard toàn cục
        },
    ],
})
export class AppModule {}
```

- Sử dụng trong các controller

```typescript
@Controller('users')
export class UserController {
    @Public() // Đánh dấu route này là public, không cần JWT
    @Post('create')
    async create(@Body() body: RegisterDto): Promise<{ message: string }> {
        const { email, password, name } = body;
        await this.userService.create(email, password, name);
        return { message: 'User created successfully' };
    }

}
```


## 5. Refresh Token

### 5.1 Tại sao cần Refresh Token?

- Access Token thường có thời gian sống ngắn (15 phút - 1 giờ) để giảm thiểu rủi ro nếu token bị đánh cắp
- Refresh Token có thời gian sống dài hơn (7 ngày - 30 ngày) để người dùng không phải đăng nhập lại quá thường xuyên
- Khi Access Token hết hạn, client có thể sử dụng Refresh Token để lấy Access Token mới mà không cần phải nhập lại thông tin đăng nhập.


### 5.2 Refresh Token Flow

Vấn đề với Access Token ngắn hạn: người dùng phải đăng nhập lại mỗi 15 phút → trải nghiệm tệ. **Refresh Token** giải quyết điều này.

```
1. Login → server trả về accessToken (15 phút) + refreshToken (7 ngày)
2. Client dùng accessToken để gọi API
3. accessToken hết hạn → server trả về 401
4. Client gửi refreshToken lên endpoint /auth/refresh
5. Server verify refreshToken → cấp accessToken mới
6. Client tiếp tục gọi API với accessToken mới
```

### 5.3 Triển khai Refresh Token trong NestJS

Tạo một JWT Strategy mới cho Refresh Token:

```typescript
// src/auth/strategies/jwt-refresh.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      passReqToCallback: true, // Cần req để lấy refresh token gốc
    });
  }

  validate(req: Request, payload: any) {
    const refreshToken = req.get('Authorization').replace('Bearer', '').trim();
    return { ...payload, refreshToken };
  }
}
```

Refactor UserEntity để lưu refresh token:

```typescript
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({ unique: true })
    email: string;
    
    @Column()
    password: string;
    
    @Column()
    name: string;

    @Column({ nullable: true })
    refreshToken: string; // Lưu refresh token hiện tại

        
}
```

Refactor AuthService để hỗ trợ refresh token:

```typescript
@Injectable()
export class AuthService {
    // ... các phương thức khác
    
    async refreshToken(userId: number, refreshToken: string) {
        const user = await this.userService.findById(userId);
        if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
        }
    
        const payload = { sub: user.id, email: user.email, role: user.role };
        const newAccessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
        });
        const newRefreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
        });

        // Cập nhật refresh token mới vào database
        user.refreshToken = newRefreshToken;
        await this.userService.updateRefreshToken(user.id, { refreshToken: newRefreshToken });
    
        return { 
            accessToken: newAccessToken, refreshToken: newRefreshToken
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
             };
    }
    }
}
```

Tạo endpoint mới trong AuthController để refresh token:

```typescript
@Controller('auth')
export class AuthController {
    // ... các phương thức khác

    @UseGuards(JwtRefreshGuard) // Sử dụng JwtRefreshGuard để xác thực refresh token
    @Post('refresh')
    async refreshTokens(@Request() req) {
        const userId = req.user.userId;
        const refreshToken = req.user.refreshToken;
        return await this.authService.refreshToken(userId, refreshToken);
    }
}
```

### 5.4 Token Rotation

**Token Rotation** là kỹ thuật bảo mật: mỗi khi dùng Refresh Token, cấp một Refresh Token mới và vô hiệu hóa cái cũ. Điều này giúp:
- Phát hiện khi Refresh Token bị đánh cắp
- Giới hạn thời gian sử dụng của mỗi token

```
Refresh Token cũ → /auth/refresh → Refresh Token mới + Access Token mới
                                 ↓
                        Refresh Token cũ bị vô hiệu hóa
```

> Nếu kẻ tấn công dùng Refresh Token đã bị rotate, server nhận ra và có thể thu hồi toàn bộ session của user đó.

## Cấu trúc hệ thống với Authentication

```
src/
├── auth/
│   ├── decorators/
│   │   └── public.decorator.ts
│   ├── dto/
│   │   ├── register.dto.ts
│   │   └── login.dto.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-refresh.guard.ts
│   │   └── local-auth.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-refresh.strategy.ts
│   │   ├── local.strategy.ts
│   │   └── google.strategy.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
└── users/
    ├── user.entity.ts
    ├── users.module.ts
    └── users.service.ts
```


## Advanced Authentication

- Social Authentication (Google, Facebook, GitHub)
- Two Factor Authentication (2FA)

==> Xem chi tiết trong file [Advanced Authentication](./Advanced-Authentication.md)
