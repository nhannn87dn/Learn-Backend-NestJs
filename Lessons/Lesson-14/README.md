# Lesson 14: Tài liệu hóa API với OpenAPI (Swagger)

## 1. OpenAPI là gì?

**OpenAPI** (trước đây gọi là Swagger Specification) là một tiêu chuẩn mở để mô tả các RESTful API. Nó cung cấp một định dạng chuẩn (thường là JSON hoặc YAML) để định nghĩa toàn bộ giao diện của một API, bao gồm:

- Các endpoint (đường dẫn) có sẵn
- Phương thức HTTP được hỗ trợ (GET, POST, PUT, DELETE, ...)
- Tham số đầu vào (query params, path params, request body)
- Cấu trúc dữ liệu phản hồi (response schemas)
- Cơ chế xác thực (authentication)

### Lợi ích của OpenAPI

- **Chuẩn hóa**: Mọi thành viên trong team đều có cùng hiểu biết về API.
- **Tự động sinh tài liệu**: Tools như Swagger UI có thể đọc file OpenAPI và render giao diện tương tác.
- **Tự động sinh code**: Có thể sinh client SDK hoặc server stub từ spec.
- **Dễ kiểm thử**: Cho phép test API trực tiếp từ trình duyệt mà không cần Postman.

### Ví dụ một OpenAPI spec đơn giản (YAML)

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Lấy danh sách người dùng
      responses:
        '200':
          description: Thành công
```

---

## 2. Swagger là gì?

**Swagger** là bộ công cụ mã nguồn mở được xây dựng xung quanh OpenAPI Specification, giúp thiết kế, xây dựng, tài liệu hóa và tiêu thụ REST API dễ dàng hơn.

### Các thành phần chính của Swagger

| Công cụ | Mô tả |
|---|---|
| **Swagger UI** | Giao diện web tương tác để hiển thị và test API |
| **Swagger Editor** | Trình soạn thảo online cho OpenAPI spec |
| **Swagger Codegen** | Sinh code client/server từ OpenAPI spec |
| **Swagger Hub** | Nền tảng cộng tác thiết kế API |

### Mối quan hệ giữa OpenAPI và Swagger

- **OpenAPI** là *tiêu chuẩn/đặc tả* (specification).
- **Swagger** là *bộ công cụ* (toolset) triển khai tiêu chuẩn đó.
- Từ phiên bản 3.0 trở đi, tên chính thức là **OpenAPI Specification (OAS)**, nhưng thuật ngữ "Swagger" vẫn được dùng phổ biến trong cộng đồng.

---

## 3. Cài đặt và cấu hình Swagger với NestJS

NestJS cung cấp module `@nestjs/swagger` tích hợp sẵn với Swagger UI, giúp tự động tạo tài liệu API từ code.

### Bước 1: Cài đặt các package cần thiết

```bash
npm install @nestjs/swagger
```

### Bước 2: Cấu hình Swagger trong `main.ts`

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình thông tin tài liệu
  const config = new DocumentBuilder()
    .setTitle('My API')                          // Tên API
    .setDescription('Mô tả chi tiết về API')    // Mô tả
    .setVersion('1.0')                           // Phiên bản
    .addTag('users', 'Quản lý người dùng')       // Tag nhóm endpoint
    .addBearerAuth()                             // Thêm xác thực JWT
    .build();

  // Tạo tài liệu từ config
  const document = SwaggerModule.createDocument(app, config);

  // Gắn Swagger UI vào route /api/docs
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

### Bước 3: Truy cập Swagger UI

Khởi động server và mở trình duyệt tại:

```
http://localhost:3000/api/docs
```

Để xem file JSON spec của OpenAPI:

```
http://localhost:3000/api/docs-json
```

---

## 4. Tạo tài liệu API với Swagger

### 4.1 Sử dụng decorators để mô tả API

NestJS Swagger cung cấp nhiều decorator để annotate controller, DTO và model.

#### Decorator trên Controller & Route

```typescript
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';

@ApiTags('users')               // Nhóm endpoint dưới tag "users"
@ApiBearerAuth()                // Yêu cầu Bearer Token
@Controller('users')
export class UsersController {

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng mỗi trang' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách người dùng thành công.' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực.' })
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return [];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin một người dùng' })
  @ApiParam({ name: 'id', type: String, description: 'ID của người dùng' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin người dùng.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng.' })
  findOne(@Param('id') id: string) {
    return {};
  }

  @Post()
  @ApiOperation({ summary: 'Tạo người dùng mới' })
  @ApiResponse({ status: 201, description: 'Tạo người dùng thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ.' })
  create(@Body() createUserDto: CreateUserDto) {
    return {};
  }
}
```

#### Decorator trên DTO (Data Transfer Object)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Tên đầy đủ của người dùng',
    example: 'Nguyen Van A',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Địa chỉ email',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Mật khẩu (tối thiểu 8 ký tự)',
    example: 'password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại (không bắt buộc)',
    example: '0901234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
```

#### Decorator trên Entity / Response Model

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty({ example: 1, description: 'ID người dùng' })
  id: number;

  @ApiProperty({ example: 'Nguyen Van A' })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
```

---

### 4.2 Tạo API documentation

#### Sử dụng `ApiResponse` với kiểu dữ liệu cụ thể

```typescript
import { ApiResponse } from '@nestjs/swagger';

@Get(':id')
@ApiResponse({
  status: 200,
  description: 'Trả về thông tin người dùng.',
  type: UserEntity,   // Swagger sẽ render schema từ UserEntity
})
findOne(@Param('id') id: string): UserEntity {
  return this.usersService.findOne(+id);
}
```

#### Phân nhóm bằng Tags

Tags giúp nhóm các endpoint liên quan lại với nhau trong Swagger UI:

```typescript
// Trong DocumentBuilder (main.ts)
const config = new DocumentBuilder()
  .addTag('auth', 'Xác thực và phân quyền')
  .addTag('users', 'Quản lý người dùng')
  .addTag('products', 'Quản lý sản phẩm')
  .build();

// Trên từng Controller
@ApiTags('auth')
@Controller('auth')
export class AuthController { ... }
```

#### Mô tả Enum

```typescript
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

@ApiProperty({
  enum: UserRole,
  description: 'Vai trò của người dùng',
  example: UserRole.USER,
})
role: UserRole;
```

---

### 4.3 Tùy chỉnh Swagger UI

#### Tùy chỉnh giao diện cơ bản

```typescript
SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: {
    persistAuthorization: true,      // Lưu token sau khi reload trang
    docExpansion: 'none',            // Thu gọn tất cả endpoint mặc định
    filter: true,                    // Hiển thị ô tìm kiếm
    showRequestDuration: true,       // Hiển thị thời gian request
    defaultModelsExpandDepth: 2,     // Độ sâu mặc định khi expand model
  },
  customSiteTitle: 'My API Docs',    // Tiêu đề tab trình duyệt
  customCss: `
    .swagger-ui .topbar { background-color: #1a1a2e; }
    .swagger-ui .topbar-wrapper img { display: none; }
  `,
});
```

#### Thêm xác thực JWT vào Swagger

```typescript
// main.ts - Thêm Bearer Auth vào config
const config = new DocumentBuilder()
  .setTitle('My API')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Nhập JWT token',
      in: 'header',
    },
    'JWT-auth',   // Tên định danh (dùng trong @ApiBearerAuth)
  )
  .build();

// Trên Controller cần xác thực
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController { ... }
```

#### Ẩn một số endpoint khỏi Swagger

```typescript
import { ApiExcludeEndpoint, ApiExcludeController } from '@nestjs/swagger';

// Ẩn toàn bộ controller
@ApiExcludeController()
@Controller('internal')
export class InternalController { ... }

// Ẩn một endpoint cụ thể
@Get('health-check')
@ApiExcludeEndpoint()
healthCheck() {
  return { status: 'ok' };
}
```

#### Tạo nhiều tài liệu Swagger theo module

Trong các dự án lớn, có thể tách Swagger thành nhiều tài liệu riêng biệt:

```typescript
// Tài liệu cho Admin API
const adminDocument = SwaggerModule.createDocument(app, adminConfig, {
  include: [AdminModule],
});
SwaggerModule.setup('api/admin/docs', app, adminDocument);

// Tài liệu cho Public API
const publicDocument = SwaggerModule.createDocument(app, publicConfig, {
  include: [UsersModule, ProductsModule],
});
SwaggerModule.setup('api/docs', app, publicDocument);
```

---

## Tóm tắt

| Decorator | Mục đích |
|---|---|
| `@ApiTags()` | Nhóm endpoint theo tag |
| `@ApiOperation()` | Mô tả chức năng của endpoint |
| `@ApiParam()` | Mô tả path parameter |
| `@ApiQuery()` | Mô tả query parameter |
| `@ApiBody()` | Mô tả request body |
| `@ApiResponse()` | Mô tả response |
| `@ApiProperty()` | Mô tả thuộc tính trong DTO/Entity |
| `@ApiPropertyOptional()` | Thuộc tính không bắt buộc trong DTO |
| `@ApiBearerAuth()` | Đánh dấu endpoint cần Bearer token |
| `@ApiExcludeEndpoint()` | Ẩn endpoint khỏi tài liệu |