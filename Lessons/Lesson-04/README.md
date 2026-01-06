# Controllers và Routing

## 1. Cách Tạo Controller – Hướng Dẫn Ngắn Gọn

Trong NestJS, controller là nơi xử lý các request đến từ client. Để tạo một controller, bạn chỉ cần:

- **Đánh dấu lớp với decorator `@Controller()`**: Điều này cho biết lớp đó là một controller và cho phép định nghĩa một "prefix" cho các route bên trong.
- **Sử dụng các decorator của HTTP method** như `@Get()`, `@Post()`,… để định nghĩa các endpoint cụ thể.

**Ví dụ:**

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return 'Danh sách tất cả người dùng';
  }
}
```

**Giải thích:**

- `@Controller('users')`: Tạo một controller với prefix `/users`.
- `@Get()`: Định nghĩa endpoint xử lý GET request tại `/users`.

---

## 2. Định Nghĩa Routing

### a. Decorator HTTP Method

Các decorator HTTP method giúp xác định kiểu request mà endpoint sẽ xử lý:

- **`@Get()`**: Dành cho HTTP GET (truy xuất dữ liệu).
- **`@Post()`**: Dành cho HTTP POST (tạo mới dữ liệu).
- **`@Put()`**: Dành cho HTTP PUT (cập nhật toàn bộ dữ liệu).
- **`@Patch()`**: Dành cho HTTP PATCH (cập nhật một phần dữ liệu).
- **`@Delete()`**: Dành cho HTTP DELETE (xóa dữ liệu).

**Ví dụ:**

```typescript
import { Controller, Get, Post, Put, Delete } from '@nestjs/common';

@Controller('products')
export class ProductsController {
  @Get()
  findAll() {
    return 'Lấy danh sách sản phẩm';
  }

  @Post()
  create() {
    return 'Tạo sản phẩm mới';
  }

  @Put(':id')
  update() {
    return 'Cập nhật sản phẩm';
  }

  @Delete(':id')
  remove() {
    return 'Xóa sản phẩm';
  }
}
```

### b. Xử Lý Tham Số Dữ Liệu

NestJS cung cấp các decorator để lấy dữ liệu từ request:

- **`@Param()`**: Trích xuất tham số từ URL.
- **`@Query()`**: Lấy dữ liệu từ query string.
- **`@Body()`**: Lấy dữ liệu từ phần body của request.

**Ví dụ:**

```typescript
import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';

@Controller('products')
export class ProductsController {
  @Get()
  findAll(@Query() query: any) {
    return `Lấy danh sách sản phẩm với query: ${JSON.stringify(query)}`;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return `Thông tin sản phẩm có id: ${id}`;
  }

  @Post()
  create(@Body() createProductDto: any) {
    return {
      message: 'Tạo sản phẩm thành công',
      data: createProductDto,
    };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProductDto: any) {
    return {
      message: `Cập nhật sản phẩm có id: ${id}`,
      data: updateProductDto,
    };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return `Xóa sản phẩm có id: ${id}`;
  }
}
```

### c. Request Object Khác

Để lấy các thông tin khác từ request, bạn có thể sử dụng:

- **`@Req()`**: Lấy toàn bộ đối tượng request (bao gồm các thông tin về HTTP, headers, body,…).
- **`@Headers()`**: Trích xuất các header cụ thể từ request.

**Ví dụ sử dụng `@Req()` và `@Headers()`:**

```typescript
import { Controller, Get, Req, Headers } from '@nestjs/common';
import { Request } from 'express';

@Controller('info')
export class InfoController {
  @Get()
  getInfo(@Req() request: Request, @Headers('user-agent') userAgent: string) {
    return {
      url: request.url,
      userAgent,
    };
  }
}
```

Xem thêm: <https://docs.nestjs.com/controllers#request-object>

### d. Xử Lý Response và HTTP Status Code

Bạn có thể trả về phản hồi theo nhiều cách:

- **Trả về dữ liệu đơn giản** (chuỗi, đối tượng JSON,…).

```javascript
@Get('abcd/*')
findAll() {
  return 'This route uses a wildcard';
}
```

- **Sử dụng class `HttpStatus`** để đặt mã trạng thái cho response.

```javascript
@Post()
@HttpCode(204)
create() {
  return 'This action adds a new cat';
}
```

- **Sử dụng đối tượng `@Res()`** để có kiểm soát chi tiết đối với phản hồi (lưu ý khi sử dụng `@Res()` bạn cần tự xử lý việc gửi response).

**Ví dụ sử dụng `@Res()`:**

```typescript
import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Controller('status')
export class StatusController {
  @Get()
  getStatus(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      message: 'Thành công',
    });
  }
}
```

### e. Handling Errors (Xử Lý Lỗi)

NestJS có cơ chế Exception Filters để xử lý lỗi một cách có cấu trúc. Bạn có thể:

- **Ném các lỗi mặc định** như `NotFoundException`, `BadRequestException`,…
- **Tạo Exception Filter** riêng nếu muốn xử lý lỗi theo cách tùy chỉnh.

**Ví dụ sử dụng các lỗi mặc định:**

```typescript
import { Controller, Get, NotFoundException } from '@nestjs/common';

@Controller('items')
export class ItemsController {
  @Get(':id')
  findOne(@Param('id') id: string) {
    const item = null; // Giả sử không tìm thấy item
    if (!item) {
      throw new NotFoundException(`Không tìm thấy item với id: ${id}`);
    }
    return item;
  }
}
```

---

## 3. Tổng Kết

Bài viết đã trình bày chi tiết theo các đầu mục bạn yêu cầu:

- **Cách tạo controller:** Sử dụng `@Controller()` và các decorator HTTP method cơ bản.
- **Định nghĩa routing:**  
  - **Decorator HTTP Method:** `@Get()`, `@Post()`, `@Put()`, `@Delete()`,…
  - **Xử lý tham số dữ liệu:** Sử dụng `@Param()`, `@Query()`, `@Body()`.
  - **Request object khác:** Lấy toàn bộ đối tượng request với `@Req()` và header với `@Headers()`.
  - **Response và HTTP status code:** Quản lý phản hồi thông qua trả về dữ liệu đơn giản hoặc sử dụng `@Res()` kết hợp `HttpStatus`.
  - **Handling errors:** Sử dụng Exception Filters và các exception mặc định như `NotFoundException`.
