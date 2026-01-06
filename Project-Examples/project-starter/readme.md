# 📋 **Highlights của Project:**

Tôi đã tạo một **NestJS RESTful API Starter Project** hoàn chỉnh với đầy đủ các file cần thiết cho team backend. 


### **1. Cấu trúc đầy đủ:**
- ✅ Common modules (configs, constants, decorators, DTOs, filters, guards, interceptors)
- ✅ Auth module với JWT strategy
- ✅ Users module với CRUD đầy đủ
- ✅ Database setup với TypeORM & PostgreSQL

### **2. Response Format chuẩn hóa:**
- Success response thông thường
- Paginated response với metadata đầy đủ
- Error response với error codes

### **3. Security & Best Practices:**
- JWT Authentication
- Role-based Access Control
- Password hashing với bcrypt
- Global guards & interceptors
- Input validation với class-validator

### **4. Developer Experience:**
- ESLint + Prettier configuration
- TypeScript path aliases
- Environment configuration
- Logging interceptor
- Comprehensive README

## 🚀 **Cách sử dụng:**

```bash
# 1. Install dependencies
npm install

# 2. Setup database
# Tạo database PostgreSQL và cập nhật .env

# 3. Run migrations (nếu có)
npm run migration:run

# 4. Start development
npm run start:dev

# API sẽ chạy tại: http://localhost:3000/api/v1
```

## 📝 **API Examples:**

```bash
# Register
POST /api/v1/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "123456"
}

# Login
POST /api/v1/auth/login
{
  "email": "john@example.com",
  "password": "123456"
}

# Get users (với pagination)
GET /api/v1/users?page=1&limit=10
Headers: Authorization: Bearer {token}
```

Bạn có muốn tôi thêm:
- Swagger documentation?
- Docker configuration?
- Rate limiting?
- File upload handling?
- Email service integration?



Tôi đã tạo đầy đủ cấu hình TypeORM migrations và seeds cho bạn! 

## 📦 **Các file quan trọng:**

### **1. Migrations (4 files):**
- ✅ **CreateUsersTable** - Bảng users với indexes
- ✅ **CreatePostsTable** - Bảng posts với foreign keys
- ✅ **CreateCategoriesTable** - Bảng categories (self-referencing)
- ✅ **CreatePostCategoriesTable** - Bảng many-to-many

### **2. Seeds (4 files):**
- ✅ **seeder.ts** - Main seeder orchestrator
- ✅ **user.seeder.ts** - Seed 5 users (admin, users, moderator)
- ✅ **category.seeder.ts** - Seed categories với parent-child
- ✅ **post.seeder.ts** - Seed posts với relations

### **3. Configuration:**
- ✅ **data-source.ts** - TypeORM DataSource config
- ✅ **Entity examples** - User, Post, Category với relations

## 🚀 **Cách sử dụng:**

### **Setup Database:**
```bash
# 1. Tạo database PostgreSQL
createdb nestjs_starter

# 2. Cập nhật .env với thông tin database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nestjs_starter
```

### **Run Migrations:**
```bash
# Chạy tất cả migrations
npm run migration:run

# Xem status của migrations
npm run migration:show

# Rollback migration cuối cùng
npm run migration:revert
```

### **Run Seeds:**
```bash
# Seed với transaction (recommended)
npm run seed

# Hoặc seed đơn giản (dùng NestJS services)
npm run seed:simple

# Reset toàn bộ DB
npm run db:reset
```

### **Tạo Migration mới:**
```bash
# Tạo migration trống
npm run migration:create src/database/migrations/AddPhoneToUsers

# Hoặc generate từ entities
npm run migration:generate src/database/migrations/AddPhoneToUsers
```

## 📊 **Database Schema:**

```
users (1) ----< (N) posts (N) ----< (N) categories
                                         |
                                    parent_id (self-reference)
```

## 🔧 **NPM Scripts bổ sung:**

Thêm vào `package.json`:
```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:create": "typeorm migration:create",
    "migration:generate": "npm run typeorm -- migration:generate -d src/database/data-source.ts",
    "migration:run": "npm run typeorm -- migration:run -d src/database/data-source.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d src/database/data-source.ts",
    "migration:show": "npm run typeorm -- migration:show -d src/database/data-source.ts",
    "seed": "ts-node src/database/seeds/seeder.ts",
    "seed:simple": "ts-node src/database/seeds/seed.ts",
    "db:reset": "npm run migration:revert && npm run migration:run && npm run seed"
  }
}
```

## 💡 **Best Practices:**

1. ❌ **KHÔNG BAO GIỜ** dùng `synchronize: true` trong production
2. ✅ **LUÔN LUÔN** dùng migrations để quản lý schema
3. ✅ Tạo indexes cho các columns hay query
4. ✅ Dùng transactions trong seeders
5. ✅ Test migrations cả up và down
6. ✅ Backup database trước khi chạy migrations

Bạn có muốn tôi thêm:
- Transaction manager examples?
- Query builder advanced examples?
- Database backup/restore scripts?
- Docker compose cho PostgreSQL?