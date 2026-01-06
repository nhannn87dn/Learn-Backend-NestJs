# Giải pháp xác thực & phân quyền RBAC cho NestJS

Tôi sẽ thiết kế một hệ thống xác thực hoàn chỉnh với các tính năng bạn yêu cầu.

## Kiến trúc tổng quan

```
Client Request → Guard (JWT) → Redis Check → Controller → Service
                    ↓
              Blacklist Check
                    ↓
              RBAC Authorization
```

## 1. Cấu trúc Database (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT
);

-- User-Role mapping (Many-to-Many)
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Role-Permission mapping (Many-to-Many)
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Refresh token table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info JSONB,
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

## 2. Cài đặt Dependencies

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/typeorm typeorm pg
npm install redis ioredis
npm install bcrypt argon2
npm install cookie-parser
npm install class-validator class-transformer
```

## 3. Module Configuration## 4. Entities## 5. Redis Service## 6. Auth Service## 7. JWT Strategies## 8. Guards & Decorators## 9. Auth Controller## 10. Protected Routes Example## 11. Main App Configuration## 12. Environment Variables## 13. Seed Data Script## 14. Testing với cURL/Postman## Tóm tắt kiến trúc và Flow

### **Flow xác thực:**

1. **Login**: User gửi email/password → Server tạo accessToken (cookie) + refreshToken (body) → Lưu device fingerprint vào Redis
2. **Request**: Client gửi request với cookie → JwtStrategy verify → Check blacklist (Redis) → Check device fingerprint → Load user + permissions
3. **Authorization**: PermissionsGuard/RolesGuard kiểm tra quyền từ cache (Redis) hoặc DB
4. **Refresh**: Client gửi refreshToken → Verify → Blacklist token cũ → Tạo cặp token mới
5. **Logout**: Blacklist accessToken + revoke refreshToken trong DB
6. **Revoke All**: Đánh dấu timestamp revoke trong Redis + revoke DB

### **Điểm mạnh của giải pháp:**

✅ **Bảo mật cao**: 
- AccessToken trong httpOnly cookie (chống XSS)
- RefreshToken rotation (mỗi lần refresh tạo token mới)
- Device fingerprint detection (phát hiện token bị đánh cắp)
- Blacklist trong Redis (thu hồi token ngay lập tức)

✅ **Performance tốt**:
- Cache permissions trong Redis (giảm query DB)
- Redis TTL tự động xóa expired tokens
- Eager loading relations khi cần

✅ **RBAC linh hoạt**:
- Many-to-many: User ↔ Role ↔ Permission
- Kết hợp cả Role-based và Permission-based guards
- Dễ mở rộng thêm permissions/roles

✅ **Production-ready**:
- Global JWT guard với Public decorator
- Error handling đầy đủ
- Transaction khi seed data
- Environment configuration

### **Chạy project:**

```bash
# Install dependencies
npm install

# Setup database
docker-compose up -d  # nếu dùng Docker

# Run migrations
npm run typeorm migration:run

# Seed data
npm run seed

# Start development
npm run start:dev
```

Bạn có cần tôi giải thích thêm phần nào hoặc customize thêm không?