# Lesson 09 - Authentication & Authorization (Chi Tiết Cho Người Mới)

## 1. Tổng quan về Authentication & Authorization

### 1.1. Authentication là gì?

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

### 1.2. Authorization là gì?

**Authorization** (Phân quyền) là quá trình **xác định quyền hạn** của người dùng - tức là "bạn được phép làm gì?".

**Ví dụ thực tế:**
- Trên Shopee: Người dùng thường chỉ xem sản phẩm, nhưng Admin có thể quản lý toàn bộ hệ thống
- Trên Google Drive: Owner có thể xóa file, Editor có thể chỉnh sửa, Viewer chỉ xem
- Trong công ty: Nhân viên IT truy cập server, nhưng nhân viên Marketing thì không

### 1.3. Tại sao cần cả hai?

**Authentication** và **Authorization** luôn đi đôi với nhau:

```
Authentication (Xác thực)          Authorization (Phân quyền)
        ↓                                    ↓
   "Bạn là ai?"                        "Bạn làm được gì?"
        ↓                                    ↓
  Đăng nhập thành công            Kiểm tra quyền trước khi thực hiện hành động
```

**Ví dụ minh họa:**

**Netflix:**
1. **Authentication**: Đăng nhập bằng email/password → Netflix biết bạn là ai
2. **Authorization**: 
   - Gói Basic → chỉ xem 1 màn hình
   - Gói Premium → xem 4 màn hình + Ultra HD

**Shopee (Seller Center):**
1. **Authentication**: Đăng nhập tài khoản seller
2. **Authorization**:
   - Chủ shop: Toàn quyền (xóa sản phẩm, rút tiền)
   - Nhân viên: Chỉ trả lời chat, đóng gói hàng

### 1.4. Sự khác biệt quan trọng

| Tiêu chí | Authentication | Authorization |
|----------|---------------|---------------|
| Câu hỏi | Bạn là ai? | Bạn được làm gì? |
| Thời điểm | Diễn ra đầu tiên | Diễn ra sau Authentication |
| Công nghệ | JWT, Session, OAuth | RBAC, ABAC, ACL |
| Thất bại | 401 Unauthorized | 403 Forbidden |

---

## 2. Authentication với JWT + Passport

### 2.1. JWT là gì?

**JWT (JSON Web Token)** là một chuẩn mở (RFC 7519) để truyền thông tin an toàn giữa các bên dưới dạng JSON object.

**Cấu trúc JWT:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

JWT gồm 3 phần, ngăn cách bởi dấu chấm (.):

```
HEADER.PAYLOAD.SIGNATURE
```

#### 2.1.1. Header (Phần đầu)

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

#### 2.1.2. Payload (Dữ liệu)

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

#### 2.1.3. Signature (Chữ ký)

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

### 2.2. Tại sao dùng JWT thay vì Session?

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

### 2.3. Flow Đăng ký / Đăng nhập

#### Flow Đăng ký (Register)

```
User                    Frontend                Backend
 |                         |                        |
 | Nhập form đăng ký       |                        |
 |------------------------>|                        |
 |                         | POST /auth/register    |
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

**Code ví dụ:**

```typescript
// auth.service.ts
async register(registerDto: RegisterDto) {
  // 1. Kiểm tra email đã tồn tại
  const existingUser = await this.userRepository.findOne({
    where: { email: registerDto.email }
  });
  
  if (existingUser) {
    throw new ConflictException('Email already exists');
  }
  
  // 2. Hash password
  const hashedPassword = await bcrypt.hash(registerDto.password, 10);
  
  // 3. Tạo user mới
  const user = this.userRepository.create({
    email: registerDto.email,
    password: hashedPassword,
    name: registerDto.name,
    role: Role.USER // Default role
  });
  
  await this.userRepository.save(user);
  
  // 4. Không trả về password
  const { password, ...result } = user;
  return result;
}
```

#### Flow Đăng nhập (Login)

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

**Code ví dụ:**

```typescript
// auth.service.ts
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
  const user = await this.userRepository.findOne({ where: { email } });
  
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
```

### 2.4. Flow Forgot Password

```
User                    Frontend                Backend                   Email Service
 |                         |                        |                          |
 | Click "Forgot Password" |                        |                          |
 |------------------------>|                        |                          |
 | Nhập email              | POST /auth/forgot-password                         |
 |------------------------>|----------------------->|                          |
 |                         |   { email }            | 1. Tìm user by email    |
 |                         |                        | 2. Tạo reset token      |
 |                         |                        | 3. Lưu token + expiry   |
 |                         |                        |------------------------->|
 |                         |                        |   Gửi email reset link   |
 |                         |<-----------------------|<-------------------------|
 |<------------------------|   { message: "Check email" }                      |
 |                         |                        |                          |
 | Mở email, click link    |                        |                          |
 | GET /reset-password?token=xyz                    |                          |
 |------------------------------------------------->|                          |
 |                         |                        | 4. Verify token         |
 |                         |                        | 5. Hiển thị form reset  |
 |<-------------------------------------------------|                          |
 | Nhập password mới       |                        |                          |
 |                         | POST /auth/reset-password                         |
 |                         |----------------------->|                          |
 |                         |   {                    | 6. Hash password mới    |
 |                         |     token,             | 7. Update DB            |
 |                         |     newPassword        | 8. Xóa reset token      |
 |                         |   }                    |                          |
 |                         |<-----------------------|                          |
 |<------------------------|   { message: "Success" }                          |
```

**Code ví dụ:**

```typescript
// auth.service.ts
async forgotPassword(email: string) {
  const user = await this.userRepository.findOne({ where: { email } });
  
  if (!user) {
    // Không nên báo "email not found" → security risk
    return { message: 'If email exists, reset link will be sent' };
  }
  
  // Tạo reset token (random string)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = await bcrypt.hash(resetToken, 10);
  
  // Lưu token vào DB với thời gian hết hạn
  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
  await this.userRepository.save(user);
  
  // Gửi email
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await this.emailService.sendResetPasswordEmail(user.email, resetUrl);
  
  return { message: 'If email exists, reset link will be sent' };
}

async resetPassword(token: string, newPassword: string) {
  // Tìm user có reset token hợp lệ
  const users = await this.userRepository.find({
    where: {
      resetPasswordExpires: MoreThan(new Date())
    }
  });
  
  let user = null;
  for (const u of users) {
    const isValid = await bcrypt.compare(token, u.resetPasswordToken);
    if (isValid) {
      user = u;
      break;
    }
  }
  
  if (!user) {
    throw new BadRequestException('Invalid or expired token');
  }
  
  // Update password
  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await this.userRepository.save(user);
  
  return { message: 'Password reset successfully' };
}
```

### 2.5. Công cụ cần dùng

#### 2.5.1. bcrypt - Hash Password

**Tại sao cần hash password?**

```
❌ LƯU TRỰC TIẾP (Nguy hiểm!)
Database:
| id | email           | password  |
|----|-----------------|-----------|
| 1  | user@gmail.com  | 123456    | ← Ai vào DB đều thấy!

✅ LƯU HASH (An toàn)
Database:
| id | email           | password                                                      |
|----|-----------------|---------------------------------------------------------------|
| 1  | user@gmail.com  | $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy |
                        ↑ Không thể reverse về password gốc!
```

**Cài đặt:**

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

**Sử dụng:**

```typescript
import * as bcrypt from 'bcrypt';

// Hash password (khi register)
const saltRounds = 10; // Độ phức tạp (10-12 là phổ biến)
const hashedPassword = await bcrypt.hash('123456', saltRounds);
// Result: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

// So sánh password (khi login)
const isMatch = await bcrypt.compare('123456', hashedPassword);
// Result: true hoặc false
```

**Salt là gì?**

Salt là một chuỗi ngẫu nhiên được thêm vào password trước khi hash:

```
Password: "123456"
Salt: "randomsalt123"
Hash input: "123456" + "randomsalt123"
Hash output: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

**Tại sao cần salt?**
- Ngăn chặn **rainbow table attack** (bảng hash password phổ biến)
- Hai user cùng password "123456" → hash khác nhau (vì salt khác nhau)

#### 2.5.2. @nestjs/jwt

```bash
npm install @nestjs/jwt
```

**Cấu hình:**

```typescript
// auth.module.ts
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AuthModule {}
```

**Sử dụng:**

```typescript
// auth.service.ts
import { JwtService } from '@nestjs/jwt';

constructor(private jwtService: JwtService) {}

async login(user: User) {
  const payload = { sub: user.id, email: user.email };
  
  return {
    accessToken: this.jwtService.sign(payload),
  };
}
```

#### 2.5.3. @nestjs/passport + passport-jwt

Passport là middleware authentication phổ biến nhất cho Node.js.

```bash
npm install @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt
```

**JwtStrategy - Giải mã và validate JWT:**

```typescript
// strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any) {
    // Payload từ JWT đã được decode
    // { sub: 123, email: 'user@example.com', iat: ..., exp: ... }
    
    // Tùy chọn: Lấy thông tin user từ DB
    const user = await this.userService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException();
    }
    
    // Return value sẽ được attach vào request.user
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
```

**Giải thích flow:**

```
Client gửi request:
GET /profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

                    ↓

1. ExtractJwt.fromAuthHeaderAsBearerToken()
   → Lấy token từ header "Authorization: Bearer xxx"

                    ↓

2. Verify signature bằng secretOrKey
   → Nếu sai → throw UnauthorizedException

                    ↓

3. Decode payload
   → { sub: 123, email: 'user@example.com', ... }

                    ↓

4. Gọi validate(payload)
   → Return user object

                    ↓

5. Attach vào request.user
   → Controller có thể dùng @Req() req hoặc @CurrentUser()
```

#### 2.5.4. passport-local - Login bằng username/password

```bash
npm install passport-local
npm install -D @types/passport-local
```

**LocalStrategy:**

```typescript
// strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Default là 'username'
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return user;
  }
}
```

**Sử dụng trong Controller:**

```typescript
// auth.controller.ts
import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local')) // Sử dụng LocalStrategy
  async login(@Request() req) {
    // Nếu qua được Guard → user đã valid
    // req.user chứa data từ LocalStrategy.validate()
    return this.authService.login(req.user);
  }
}
```

---

## 3. Thực hành từng bước

### Bước 1: Tạo UserModule + UserService

#### 1.1. Tạo User Entity

```typescript
// entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // Không trả về password trong response
  password: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({ nullable: true })
  @Exclude()
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  resetPasswordExpires: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 1.2. Tạo User DTOs

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
```

```typescript
// dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const)
) {}
```

#### 1.3. Tạo User Service

```typescript
// user.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Kiểm tra email đã tồn tại
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Tạo user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }
}
```

#### 1.4. Tạo User Controller

```typescript
// user.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from './entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor) // Áp dụng @Exclude()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // Chỉ admin mới tạo user
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // Chỉ admin mới xem danh sách user
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
```

#### 1.5. Tạo User Module

```typescript
// user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export để AuthModule dùng
})
export class UserModule {}
```

---

### Bước 2: Tạo AuthModule

#### 2.1. Tạo Auth DTOs

```typescript
// dto/register.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
```

```typescript
// dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

```typescript
// dto/forgot-password.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
```

```typescript
// dto/reset-password.dto.ts
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
```

#### 2.2. Tạo Auth Service

```typescript
// auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MoreThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.userService.create(registerDto);
    const { password, ...result } = user;
    return result;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return { message: 'If email exists, reset link will be sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.userRepository.save(user);

    // TODO: Gửi email với resetToken
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    console.log('Reset URL:', resetUrl); // Tạm thời log ra console

    return { message: 'If email exists, reset link will be sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const users = await this.userRepository.find({
      where: {
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    let user = null;
    for (const u of users) {
      if (u.resetPasswordToken) {
        const isValid = await bcrypt.compare(token, u.resetPasswordToken);
        if (isValid) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }
}
```

#### 2.3. Tạo LocalStrategy

```typescript
// strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
```

#### 2.4. Tạo JwtStrategy

```typescript
// strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
```

#### 2.5. Tạo Auth Guards

```typescript
// guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// guards/local-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
```

#### 2.6. Tạo Auth Controller

```typescript
// auth.controller.ts
import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
```

#### 2.7. Tạo Auth Module

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    UserModule,
    PassportModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## 4. Quản lý Access Token & Refresh Token

### 4.1. Tại sao cần Refresh Token?

**Vấn đề với chỉ dùng Access Token:**

```
Scenario 1: Access Token hết hạn sau 15 phút
- User đang làm việc → 15 phút sau bị logout → Trải nghiệm tệ!

Scenario 2: Access Token hết hạn sau 7 ngày
- Nếu token bị đánh cắp → Hacker có 7 ngày để sử dụng → Nguy hiểm!
```

**Giải pháp: Access Token + Refresh Token**

```
Access Token:
- Thời gian sống ngắn (15 phút - 1 giờ)
- Dùng để authenticate mỗi request
- Nếu bị đánh cắp → chỉ dùng được trong thời gian ngắn

Refresh Token:
- Thời gian sống dài (7-30 ngày)
- Chỉ dùng để lấy access token mới
- Lưu an toàn hơn (httpOnly cookie)
```

### 4.2. Flow hoàn chỉnh

```
┌─────────┐                           ┌─────────┐
│ Client  │                           │ Server  │
└────┬────┘                           └────┬────┘
     │                                     │
     │  1. POST /login                     │
     │  { email, password }                │
     ├────────────────────────────────────>│
     │                                     │
     │  2. Return tokens                   │
     │  {                                  │
     │    accessToken: "eyJ..." (15m),     │
     │    refreshToken: "eyJ..." (7d)      │
     │  }                                  │
     │<────────────────────────────────────┤
     │                                     │
     │  Lưu:                               │
     │  - accessToken: memory/localStorage │
     │  - refreshToken: httpOnly cookie    │
     │                                     │
     │  3. GET /profile                    │
     │  Authorization: Bearer {accessToken}│
     ├────────────────────────────────────>│
     │                                     │
     │  4. Return user data                │
     │<────────────────────────────────────┤
     │                                     │
     │  ... 15 phút sau ...                │
     │                                     │
     │  5. GET /profile                    │
     │  Authorization: Bearer {accessToken}│
     ├────────────────────────────────────>│
     │                                     │
     │  6. 401 Unauthorized                │
     │  { message: "Token expired" }       │
     │<────────────────────────────────────┤
     │                                     │
     │  7. POST /auth/refresh              │
     │  { refreshToken }                   │
     ├────────────────────────────────────>│
     │                                     │
     │  8. Return new tokens               │
     │  {                                  │
     │    accessToken: "eyJ..." (15m),     │
     │    refreshToken: "eyJ..." (7d)      │
     │  }                                  │
     │<────────────────────────────────────┤
     │                                     │
     │  9. Retry GET /profile              │
     │  Authorization: Bearer {newAccessToken}
     ├────────────────────────────────────>│
     │                                     │
     │  10. Return user data               │
     │<────────────────────────────────────┤
     │                                     │
```

### 4.3. Refresh Token Rotation (Best Practice)

**Vấn đề với Refresh Token thông thường:**

```
Nếu Refresh Token bị đánh cắp:
- Hacker có thể dùng nó trong 7-30 ngày
- Không có cách nào phát hiện token bị đánh cắp
```

**Refresh Token Rotation:**

```
Mỗi lần dùng Refresh Token → Tạo cặp token mới + Vô hiệu hóa Refresh Token cũ

Flow:
1. Client dùng refreshToken_1 → Server trả về:
   - accessToken_2
   - refreshToken_2
   - Đánh dấu refreshToken_1 là đã dùng (one-time use)

2. Nếu refreshToken_1 được dùng lần nữa → Phát hiện tấn công!
   → Vô hiệu hóa TẤT CẢ refresh token của user
   → Bắt user login lại
```

### 4.4. Implementation

#### 4.4.1. Tạo RefreshToken Entity

```typescript
// entities/refresh-token.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean; // Đã bị thu hồi

  @Column({ default: false })
  isUsed: boolean; // Đã được sử dụng (cho Rotation)

  @CreateDateColumn()
  createdAt: Date;
}
```

#### 4.4.2. Update Auth Service

```typescript
// auth.service.ts
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    // ... existing dependencies
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Lưu refresh token vào DB
    await this.saveRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 ngày

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  async refresh(refreshToken: string) {
    // 1. Verify refresh token
    let payload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Tìm refresh token trong DB
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // 3. Kiểm tra token đã bị revoked hoặc used
    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.isUsed) {
      // PHÁT HIỆN TẤN CÔNG! Token đã được dùng rồi mà còn dùng lại
      // → Vô hiệu hóa TẤT CẢ refresh token của user này
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedException('Possible token theft detected');
    }

    // 4. Đánh dấu token cũ là đã sử dụng (Rotation)
    storedToken.isUsed = true;
    await this.refreshTokenRepository.save(storedToken);

    // 5. Tạo cặp token mới
    const newPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    const newAccessToken = this.jwtService.sign(newPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const newRefreshToken = this.jwtService.sign(newPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // 6. Lưu refresh token mới
    await this.saveRefreshToken(payload.sub, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string) {
    // Revoke tất cả refresh token của user
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    return { message: 'Logout successfully' };
  }

  private async revokeAllUserTokens(userId: string) {
    await this.refreshTokenRepository.update(
      { userId },
      { isRevoked: true },
    );
  }
}
```

#### 4.4.3. Tạo Refresh Endpoint

```typescript
// auth.controller.ts
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ... existing endpoints

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user) {
    return this.authService.logout(user.id);
  }
}
```

#### 4.4.4. Tạo CurrentUser Decorator

```typescript
// decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 4.5. Lưu trữ Token an toàn

#### 4.5.1. Frontend - Lưu Access Token

**Option 1: Memory (Khuyến nghị nhất)**

```typescript
// Frontend: React/Vue/Angular
class AuthService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  clearAccessToken() {
    this.accessToken = null;
  }
}

// Khi refresh page → mất token → dùng refresh token để lấy lại
```

**Ưu điểm:**
- An toàn nhất với XSS (không thể đánh cắp qua JavaScript)
- Token mất khi refresh page → dùng refresh token để lấy lại

**Nhược điểm:**
- Phức tạp hơn (cần handle refresh page)

**Option 2: localStorage (Không khuyến nghị)**

```typescript
localStorage.setItem('accessToken', token);
const token = localStorage.getItem('accessToken');
```

**Nhược điểm:**
- Dễ bị tấn công XSS (Cross-Site Scripting)
- Nếu hacker inject script → có thể đánh cắp token

**Option 3: httpOnly Cookie (Backend set)**

```typescript
// Backend: NestJS
@Post('login')
async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
  const result = await this.authService.login(loginDto);

  // Set access token vào httpOnly cookie
  response.cookie('accessToken', result.accessToken, {
    httpOnly: true,
    secure: true, // Chỉ gửi qua HTTPS
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 phút
  });

  return result;
}
```

**Ưu điểm:**
- An toàn với XSS (JavaScript không đọc được)

**Nhược điểm:**
- Dễ bị tấn công CSRF (Cross-Site Request Forgery)
- Cần implement CSRF protection

#### 4.5.2. Frontend - Lưu Refresh Token

**Luôn dùng httpOnly Cookie:**

```typescript
// Backend: NestJS
@Post('login')
async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
  const result = await this.authService.login(loginDto);

  // Set refresh token vào httpOnly cookie
  response.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,   // JavaScript không đọc được
    secure: true,     // Chỉ gửi qua HTTPS
    sameSite: 'strict', // Chống CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });

  // Không trả refresh token trong response body
  const { refreshToken, ...responseData } = result;
  return responseData;
}
```

#### 4.5.3. So sánh các phương pháp lưu trữ

| Phương pháp | XSS | CSRF | Khuyến nghị |
|-------------|-----|------|-------------|
| Memory | ✅ An toàn | ✅ An toàn | ⭐⭐⭐⭐⭐ Tốt nhất cho Access Token |
| localStorage | ❌ Nguy hiểm | ✅ An toàn | ❌ Không khuyến nghị |
| httpOnly Cookie | ✅ An toàn | ⚠️ Cần CSRF protection | ⭐⭐⭐⭐ Tốt cho Refresh Token |

---

## 5. Authorization với Guards

### 5.1. Tạo Role và Permission Entity

#### 5.1.1. Permission Entity

```typescript
// entities/permission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // Ví dụ: 'create:user', 'delete:post', 'read:analytics'

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];
}
```

#### 5.1.2. Role Entity

```typescript
// entities/role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Permission } from './permission.entity';
import { User } from '../../user/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // Ví dụ: 'admin', 'user', 'moderator'

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Permission, permission => permission.roles, {
    eager: true, // Tự động load permissions khi query role
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @OneToMany(() => User, user => user.role)
  users: User[];
}
```

#### 5.1.3. Update User Entity

```typescript
// entities/user.entity.ts
import { ManyToOne, JoinColumn } from 'typeorm';
import { Role } from '../role/entities/role.entity';

@Entity('users')
export class User {
  // ... existing fields

  @ManyToOne(() => Role, role => role.users, {
    eager: true, // Tự động load role và permissions
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ nullable: true })
  roleId: string;
}
```

**Quan hệ giữa các Entity:**

```
User ──────> Role ──────> Permission
(Many-to-One)   (Many-to-Many)

Ví dụ:
User "John"
  └─> Role "Admin"
      ├─> Permission "create:user"
      ├─> Permission "delete:user"
      ├─> Permission "create:post"
      └─> Permission "delete:post"

User "Alice"
  └─> Role "Moderator"
      ├─> Permission "create:post"
      └─> Permission "update:post"
```

### 5.2. Tạo Role & Permission Service

```typescript
// role/role.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(name: string, description: string, permissionIds: string[]) {
    const permissions = await this.permissionRepository.findByIds(permissionIds);

    const role = this.roleRepository.create({
      name,
      description,
      permissions,
    });

    return this.roleRepository.save(role);
  }

  async findAll() {
    return this.roleRepository.find({
      relations: ['permissions'],
    });
  }

 ```typescript
// role/role.service.ts (tiếp)
  async findById(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async findByName(name: string) {
    return this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  async update(id: string, name?: string, description?: string, permissionIds?: string[]) {
    const role = await this.findById(id);

    if (name) role.name = name;
    if (description) role.description = description;

    if (permissionIds) {
      const permissions = await this.permissionRepository.findByIds(permissionIds);
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }

  async remove(id: string) {
    const role = await this.findById(id);
    await this.roleRepository.remove(role);
  }

  async addPermissions(roleId: string, permissionIds: string[]) {
    const role = await this.findById(roleId);
    const permissions = await this.permissionRepository.findByIds(permissionIds);

    role.permissions = [...role.permissions, ...permissions];
    return this.roleRepository.save(role);
  }

  async removePermissions(roleId: string, permissionIds: string[]) {
    const role = await this.findById(roleId);

    role.permissions = role.permissions.filter(
      permission => !permissionIds.includes(permission.id),
    );

    return this.roleRepository.save(role);
  }
}
```

```typescript
// permission/permission.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../role/entities/permission.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(name: string, description?: string) {
    const permission = this.permissionRepository.create({
      name,
      description,
    });

    return this.permissionRepository.save(permission);
  }

  async findAll() {
    return this.permissionRepository.find();
  }

  async findById(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async findByName(name: string) {
    return this.permissionRepository.findOne({
      where: { name },
    });
  }

  async remove(id: string) {
    const permission = await this.findById(id);
    await this.permissionRepository.remove(permission);
  }
}
```

### 5.3. Seed Roles & Permissions

Tạo dữ liệu mẫu cho roles và permissions:

```typescript
// database/seeds/role-permission.seed.ts
import { DataSource } from 'typeorm';
import { Role } from '../../role/entities/role.entity';
import { Permission } from '../../role/entities/permission.entity';

export class RolePermissionSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const roleRepository = dataSource.getRepository(Role);

    // Tạo Permissions
    const permissions = [
      { name: 'create:user', description: 'Create new users' },
      { name: 'read:user', description: 'View user information' },
      { name: 'update:user', description: 'Update user information' },
      { name: 'delete:user', description: 'Delete users' },
      
      { name: 'create:post', description: 'Create new posts' },
      { name: 'read:post', description: 'View posts' },
      { name: 'update:post', description: 'Update posts' },
      { name: 'delete:post', description: 'Delete posts' },
      
      { name: 'read:analytics', description: 'View analytics dashboard' },
      { name: 'manage:settings', description: 'Manage system settings' },
    ];

    const createdPermissions = [];
    for (const permData of permissions) {
      let permission = await permissionRepository.findOne({
        where: { name: permData.name },
      });

      if (!permission) {
        permission = permissionRepository.create(permData);
        await permissionRepository.save(permission);
      }

      createdPermissions.push(permission);
    }

    // Tạo Roles với Permissions
    const rolesData = [
      {
        name: 'admin',
        description: 'Administrator with full access',
        permissionNames: [
          'create:user', 'read:user', 'update:user', 'delete:user',
          'create:post', 'read:post', 'update:post', 'delete:post',
          'read:analytics', 'manage:settings',
        ],
      },
      {
        name: 'moderator',
        description: 'Moderator with limited access',
        permissionNames: [
          'read:user',
          'create:post', 'read:post', 'update:post', 'delete:post',
        ],
      },
      {
        name: 'user',
        description: 'Regular user',
        permissionNames: [
          'read:user', 'read:post', 'create:post', 'update:post',
        ],
      },
    ];

    for (const roleData of rolesData) {
      let role = await roleRepository.findOne({
        where: { name: roleData.name },
        relations: ['permissions'],
      });

      const rolePermissions = createdPermissions.filter(p =>
        roleData.permissionNames.includes(p.name),
      );

      if (!role) {
        role = roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          permissions: rolePermissions,
        });
      } else {
        role.permissions = rolePermissions;
      }

      await roleRepository.save(role);
    }

    console.log('Roles and Permissions seeded successfully');
  }
}
```

### 5.4. Guards - Bảo vệ Routes

#### 5.4.1. JwtAuthGuard (Đã tạo ở trên)

Guard này kiểm tra xem user đã đăng nhập chưa:

```typescript
// guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Kiểm tra @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Route public → không cần authentication
    }

    return super.canActivate(context); // Tiếp tục verify JWT
  }
}
```

#### 5.4.2. @Public() Decorator

Dùng để exclude một số route khỏi authentication:

```typescript
// decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Sử dụng:**

```typescript
@Controller('auth')
export class AuthController {
  @Public() // Route này không cần authentication
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Route này CẦN authentication (không có @Public())
  @Post('logout')
  logout(@CurrentUser() user) {
    return this.authService.logout(user.id);
  }
}
```

#### 5.4.3. RolesGuard - Role-based Access Control

```typescript
// guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách roles được phép từ @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // Không có yêu cầu role → cho phép
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    // Kiểm tra role của user có trong danh sách yêu cầu không
    return requiredRoles.includes(user.role.name);
  }
}
```

#### 5.4.4. @Roles() Decorator

```typescript
// decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Sử dụng:**

```typescript
@Controller('users')
export class UserController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // Chỉ admin mới xem được
  findAll() {
    return this.userService.findAll();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user', 'moderator') // Tất cả roles đều xem được
  getProfile(@CurrentUser() user) {
    return user;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // Chỉ admin mới xóa được
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
```

#### 5.4.5. PermissionsGuard - Permission-based Access Control (Nâng cao)

```typescript
// guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách permissions được phép từ @Permissions() decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role || !user.role.permissions) {
      return false;
    }

    // Lấy tất cả permission names của user
    const userPermissions = user.role.permissions.map(p => p.name);

    // Kiểm tra user có TẤT CẢ permissions yêu cầu không
    return requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    );
  }
}
```

#### 5.4.6. @Permissions() Decorator

```typescript
// decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

**Sử dụng:**

```typescript
@Controller('users')
export class UserController {
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('create:user') // Cần permission "create:user"
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('delete:user') // Cần permission "delete:user"
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('read:analytics', 'read:user') // Cần CẢ 2 permissions
  getAnalytics() {
    return this.analyticsService.getUserAnalytics();
  }
}
```

### 5.5. So sánh Roles vs Permissions

| Tiêu chí | Role-based (RBAC) | Permission-based (PBAC) |
|----------|-------------------|------------------------|
| Độ chi tiết | Thô (admin, user, moderator) | Chi tiết (create:user, delete:post) |
| Dễ quản lý | ✅ Dễ | ⚠️ Phức tạp hơn |
| Linh hoạt | ⚠️ Ít linh hoạt | ✅ Rất linh hoạt |
| Use case | App nhỏ, roles rõ ràng | App lớn, phân quyền phức tạp |

**Ví dụ thực tế:**

```typescript
// RBAC - Đơn giản
@Roles('admin') // Admin làm được mọi thứ
deleteUser() { ... }

// PBAC - Chi tiết
@Permissions('delete:user') // Chỉ cần permission cụ thể
deleteUser() { ... }

// Kết hợp cả hai
@Roles('admin', 'moderator')
@Permissions('delete:post')
deletePost() { ... }
```

### 5.6. Global Guards

Áp dụng guards cho toàn bộ app (không cần `@UseGuards()` ở mỗi controller):

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Mặc định TẤT CẢ routes cần authentication
    },
  ],
})
export class AppModule {}
```

**Lợi ích:**
- Không cần viết `@UseGuards(JwtAuthGuard)` ở mọi controller
- Dùng `@Public()` cho các route không cần authentication

```typescript
@Controller('products')
export class ProductController {
  @Get() // Tự động có JwtAuthGuard
  findAll() { ... }

  @Public() // Exclude khỏi authentication
  @Get(':id')
  findOne(@Param('id') id: string) { ... }
}
```

---

## 6. Thực hành - Bảo vệ Routes

### 6.1. Scenario 1: Admin Dashboard

```typescript
// admin.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') // TẤT CẢ routes trong controller này chỉ cho admin
export class AdminController {
  @Get('dashboard')
  getDashboard() {
    return {
      totalUsers: 1000,
      totalPosts: 5000,
      revenue: 100000,
    };
  }

  @Get('users')
  getAllUsers() {
    return { message: 'List of all users' };
  }

  @Get('analytics')
  getAnalytics() {
    return { message: 'System analytics' };
  }
}
```

### 6.2. Scenario 2: User Profile

```typescript
// profile.controller.ts
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard) // Cần đăng nhập
export class ProfileController {
  constructor(private userService: UserService) {}

  @Get()
  getProfile(@CurrentUser() user) {
    // User chỉ xem được profile của chính mình
    return this.userService.findById(user.id);
  }

  @Patch()
  updateProfile(@CurrentUser() user, @Body() updateDto: UpdateProfileDto) {
    // User chỉ update được profile của chính mình
    return this.userService.update(user.id, updateDto);
  }
}
```

### 6.3. Scenario 3: Posts với nhiều permissions

```typescript
// posts.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Public() // Ai cũng xem được
  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('create:post') // Cần permission "create:post"
  create(@Body() createPostDto: CreatePostDto, @CurrentUser() user) {
    return this.postsService.create(createPostDto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('update:post')
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user,
  ) {
    // Kiểm tra user có phải chủ post không
    return this.postsService.update(id, updatePostDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('delete:post')
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.postsService.remove(id, user.id);
  }
}
```

### 6.4. Scenario 4: Ownership Check

Kiểm tra user có phải chủ sở hữu resource không:

```typescript
// posts.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';

@Injectable()
export class PostsService {
  async update(id: string, updateDto: UpdatePostDto, userId: string) {
    const post = await this.postsRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Kiểm tra ownership
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    Object.assign(post, updateDto);
    return this.postsRepository.save(post);
  }

  async remove(id: string, userId: string) {
    const post = await this.postsRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postsRepository.remove(post);
    return { message: 'Post deleted successfully' };
  }
}
```

**Hoặc tạo OwnershipGuard:**

```typescript
// guards/ownership.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;

    // Lấy service và method cần kiểm tra ownership
    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());

    if (!resourceType) {
      return true;
    }

    // Tìm resource và kiểm tra ownership
    // Logic tùy theo từng loại resource

    return true;
  }
}
```

---

## 7. Best Practices & Lưu ý thực tế

### 7.1. Xử lý lỗi Authentication & Authorization

#### 7.1.1. Custom Exception Filters

```typescript
// filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    const error =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as object);

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...error,
    });
  }
}
```

**Áp dụng global:**

```typescript
// main.ts
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(3000);
}
```

#### 7.1.2. Custom Error Messages

```typescript
// auth.service.ts
async login(loginDto: LoginDto) {
  const user = await this.validateUser(loginDto.email, loginDto.password);

  if (!user) {
    throw new UnauthorizedException({
      message: 'Invalid email or password',
      errorCode: 'INVALID_CREDENTIALS',
    });
  }

  // ...
}
```

**Response:**

```json
{
  "success": false,
  "statusCode": 401,
  "timestamp": "2026-01-23T10:30:00.000Z",
  "path": "/auth/login",
  "message": "Invalid email or password",
  "errorCode": "INVALID_CREDENTIALS"
}
```

#### 7.1.3. Phân biệt 401 vs 403

```
401 Unauthorized:
- User CHƯA đăng nhập
- Token không hợp lệ / hết hạn
- Message: "Please login to continue"

403 Forbidden:
- User ĐÃ đăng nhập
- NHƯNG không có quyền truy cập
- Message: "You don't have permission to access this resource"
```

**Example:**

```typescript
@Get('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getDashboard(@CurrentUser() user) {
  // Nếu chưa login → 401 Unauthorized (từ JwtAuthGuard)
  // Nếu đã login nhưng không phải admin → 403 Forbidden (từ RolesGuard)
  return this.dashboardService.getStats();
}
```

### 7.2. Rate Limiting cho Login Endpoint

Ngăn chặn brute-force attack:

```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 10, // 10 requests per 60s
    }]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**Custom rate limit cho login:**

```typescript
// auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 lần / 60s
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

### 7.3. Logout - Invalidate Refresh Token

```typescript
// auth.service.ts
async logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    // Revoke refresh token cụ thể
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isRevoked: true },
    );
  } else {
    // Revoke tất cả refresh tokens của user
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  return { message: 'Logout successfully' };
}
```

**Logout from all devices:**

```typescript
@Post('logout-all')
@UseGuards(JwtAuthGuard)
logoutAll(@CurrentUser() user) {
  return this.authService.logout(user.id); // Không truyền refreshToken
}
```

### 7.4. Bảo mật Cookie

```typescript
// auth.controller.ts
@Post('login')
async login(
  @Body() loginDto: LoginDto,
  @Res({ passthrough: true }) response: Response,
) {
  const result = await this.authService.login(loginDto);

  // Set cookie với các options bảo mật
  response.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,      // JavaScript không đọc được
    secure: process.env.NODE_ENV === 'production', // Chỉ HTTPS trong production
    sameSite: 'strict',  // Chống CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    path: '/',           // Cookie áp dụng cho toàn site
  });

  const { refreshToken, ...responseData } = result;
  return responseData;
}
```

### 7.5. Khi nào nên dùng Session thay vì JWT?

**Dùng JWT khi:**
- ✅ Microservices architecture
- ✅ Mobile app
- ✅ Cần scale horizontal dễ dàng
- ✅ Cross-domain authentication
- ✅ Stateless server

**Dùng Session khi:**
- ✅ Monolithic application
- ✅ Cần revoke token ngay lập tức
- ✅ Web app truyền thống
- ✅ Dữ liệu session lớn
- ✅ Bảo mật cao (banking, healthcare)

**Ví dụ Session-based:**

```typescript
// main.ts
import * as session from 'express-session';
import * as RedisStore from 'connect-redis';
import { createClient } from 'redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisClient = createClient({ url: 'redis://localhost:6379' });
  await redisClient.connect();

  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );

  await app.listen(3000);
}
```

### 7.6. Security Checklist

```
✅ Hash passwords với bcrypt (saltRounds >= 10)
✅ Validate input với class-validator
✅ Use httpOnly cookies cho refresh tokens
✅ Implement rate limiting cho login
✅ Use HTTPS trong production (secure cookies)
✅ Set short expiry cho access tokens (15m-1h)
✅ Implement refresh token rotation
✅ Never log sensitive data (passwords, tokens)
✅ Use CORS properly
✅ Sanitize user input (prevent XSS)
✅ Use prepared statements (prevent SQL injection)
✅ Implement CSRF protection cho cookie-based auth
✅ Monitor suspicious activities
✅ Keep dependencies updated
```

---

## 8. Cấu trúc Module hoàn chỉnh

```
src/
├── app.module.ts
├── main.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── entities/
│   │   └── refresh-token.entity.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── permissions.guard.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── decorators/
│       ├── current-user.decorator.ts
│       ├── public.decorator.ts
│       ├── roles.decorator.ts
│       └── permissions.decorator.ts
├── user/
│   ├── user.module.ts
│   ├── user.service.ts
│   ├── user.controller.ts
│   └── entities/
│       └── user.entity.ts
├── role/
│   ├── role.module.ts
│   ├── role.service.ts
│   ├── role.controller.ts
│   └── entities/
│       └── role.entity.ts
├── permission/
│   ├── permission.module.ts
│   ├── permission.service.ts
│   ├── permission.controller.ts
│   └── entities/
│       └── permission.entity.ts
├── database/
│   ├── database.module.ts
│   └── seeds/
│       └── role-permission.seed.ts
└── filters/
    └── http-exception.filter.ts
```
