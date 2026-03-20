
# 9. Advanced Authentication

## 9.1 Social Authentication (OAuth 2.0)

**Social Authentication** cho phép đăng nhập bằng tài khoản bên thứ ba (Google, Facebook, GitHub). Nền tảng là giao thức **OAuth 2.0**.

**Luồng OAuth 2.0:**

```
1. User click "Đăng nhập bằng Google"
2. App redirect user đến Google Authorization Server
3. User đồng ý cấp quyền
4. Google redirect về app kèm Authorization Code
5. App đổi Authorization Code lấy Access Token từ Google
6. App dùng Access Token để lấy thông tin user từ Google
7. App tạo/cập nhật user trong DB và cấp JWT cho user
```

**Cài đặt cho Google OAuth:**

```bash
npm install passport-google-oauth20
npm install -D @types/passport-google-oauth20
```

```typescript
// src/auth/strategies/google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      accessToken,
    };
    const result = await this.authService.findOrCreateGoogleUser(user);
    done(null, result);
  }
}
```

```typescript
// src/auth/auth.controller.ts
@Public()
@Get('google')
@UseGuards(AuthGuard('google'))
googleAuth() {
  // Guard tự redirect đến Google
}

@Public()
@Get('google/callback')
@UseGuards(AuthGuard('google'))
googleAuthCallback(@Request() req) {
  // req.user chứa dữ liệu từ GoogleStrategy.validate()
  return this.authService.loginWithSocial(req.user);
}
```

## 9.2 Two Factor Authentication (2FA)

**2FA (Two-Factor Authentication)** là lớp bảo mật thứ hai sau mật khẩu. Ngay cả khi mật khẩu bị lộ, tài khoản vẫn an toàn nếu kẻ tấn công không có thiết bị vật lý của người dùng.

**Các loại 2FA phổ biến:**
- **TOTP** (Time-based One-Time Password) — dùng app Authenticator (Google Authenticator, Authy)
- **SMS OTP** — gửi mã qua tin nhắn
- **Email OTP** — gửi mã qua email

Trong bài này, chúng ta dùng **TOTP** vì bảo mật nhất và không tốn chi phí SMS.

**Cài đặt:**

```bash
npm install speakeasy qrcode
npm install -D @types/speakeasy @types/qrcode
```

**2FA Flow:**

```
SETUP:
1. User bật 2FA → server tạo secret key
2. Server tạo QR Code từ secret key
3. User quét QR Code bằng Authenticator App
4. User nhập mã OTP để xác nhận setup
5. Server lưu secret key vào DB

LOGIN VỚI 2FA:
1. User nhập username + password → server trả về token tạm
2. User nhập mã OTP từ Authenticator App
3. Server verify OTP → cấp token thật
```

**Triển khai 2FA:**

```typescript
// src/auth/auth.service.ts

// Bước 1: Tạo secret và QR Code
async setup2FA(userId: number) {
  const secret = speakeasy.generateSecret({
    name: `MyApp (${userId})`,
    length: 20,
  });

  // Lưu secret tạm vào DB (chưa kích hoạt)
  await this.usersService.setTemp2FASecret(userId, secret.base32);

  // Tạo QR Code để user quét
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32, // Backup code cho user
    qrCode: qrCodeUrl,     // Base64 image
  };
}

// Bước 2: Verify và kích hoạt 2FA
async enable2FA(userId: number, token: string) {
  const user = await this.usersService.findById(userId);
  const secret = user.temp2FASecret;

  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // Cho phép sai lệch ±30 giây
  });

  if (!isValid) {
    throw new UnauthorizedException('Invalid 2FA token');
  }

  // Kích hoạt 2FA chính thức
  await this.usersService.activate2FA(userId, secret);
  return { message: '2FA enabled successfully' };
}

// Bước 3: Verify 2FA khi login
async verify2FAToken(userId: number, token: string) {
  const user = await this.usersService.findById(userId);

  if (!user.is2FAEnabled) {
    throw new BadRequestException('2FA is not enabled');
  }

  const isValid = speakeasy.totp.verify({
    secret: user.secret2FA,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!isValid) {
    throw new UnauthorizedException('Invalid 2FA token');
  }

  // Cấp token thật sau khi xác thực 2FA thành công
  return this.generateTokens(user.id, user.username);
}
```

```typescript
// src/auth/auth.controller.ts

// Setup 2FA (user cần đăng nhập trước)
@UseGuards(JwtAuthGuard)
@Post('2fa/setup')
setup2FA(@Request() req) {
  return this.authService.setup2FA(req.user.userId);
}

// Kích hoạt 2FA
@UseGuards(JwtAuthGuard)
@Post('2fa/enable')
enable2FA(@Request() req, @Body('token') token: string) {
  return this.authService.enable2FA(req.user.userId, token);
}

// Login bước 2: Nhập OTP
@Public()
@Post('2fa/verify')
verify2FA(@Body() body: { userId: number; token: string }) {
  return this.authService.verify2FAToken(body.userId, body.token);
}
```

---

# 10. Tổng kết

## Checklist bảo mật Authentication

- [ ] **Mật khẩu** luôn được hash bằng bcrypt/argon2 trước khi lưu
- [ ] **Access Token** ngắn hạn (5–15 phút)
- [ ] **Refresh Token** được lưu an toàn (httpOnly cookie hoặc hash trong DB)
- [ ] Sử dụng **HTTPS** ở production
- [ ] **Rate limiting** cho endpoint login để chống brute force
- [ ] **Token rotation** khi dùng refresh token
- [ ] Không lưu thông tin nhạy cảm trong JWT payload
- [ ] **2FA** cho tài khoản quan trọng

## Cấu trúc thư mục hoàn chỉnh

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

## Biến môi trường (.env)

```env
JWT_ACCESS_SECRET=your-very-long-access-secret-key
JWT_REFRESH_SECRET=your-very-long-refresh-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

