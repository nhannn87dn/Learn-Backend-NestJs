# Bonus 02: Tài liệu hóa API với OpenAPI (Swagger)

> Tiên quyết: Lesson 06 (DTO, class-validator), Lesson 09 (JWT, `JwtAuthGuard`).

Bạn có thể học bài này ngay sau Lesson 09, và nên áp dụng vào Final Project (Lesson 16), vì tiêu chí "tài liệu API" có trong rubric chấm điểm.

## Mục tiêu bài học

Sau bài này, học viên:

- **Giải thích được** OpenAPI là gì, Swagger là gì và mối quan hệ giữa hai khái niệm.
- **Cài đặt và cấu hình được** `@nestjs/swagger` để sinh tài liệu tự động cho project `books`.
- **Viết được** mô tả API bằng `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`, `@ApiBearerAuth`.
- **Mô tả được** đúng response format `{ success, statusCode, data }` của Lesson 08 trong Swagger.
- **Cấu hình được** Swagger CLI plugin để bớt viết decorator lặp lại, và nêu được quy tắc đặt tên file mà plugin yêu cầu.
- **Tùy chỉnh được** Swagger UI (giữ token, ẩn endpoint, tách tài liệu, tắt ở production).
- **Export được** OpenAPI spec (JSON) để import vào Postman và sinh TypeScript type cho frontend ReactJS.

## Ôn tập nhanh

Ở Lesson 06 ta tách dữ liệu đầu vào thành DTO (`CreateBookDto`, `UpdateBookDto`) và validate bằng class-validator + `ValidationPipe`. Ở Lesson 08, mọi response thành công được `TransformInterceptor` bọc thành `{ success, statusCode, data }`, còn lỗi được `HttpExceptionFilter` chuẩn hóa. Ở Lesson 09, các route cần đăng nhập được bảo vệ bằng `JwtAuthGuard` và client phải gửi header `Authorization: Bearer <token>`. Đến thời điểm này, muốn frontend biết API có những endpoint nào, body gửi lên ra sao, response trả về hình dạng gì, ta chỉ có cách... đọc code hoặc hỏi backend. Bài này giải quyết đúng vấn đề đó: sinh tài liệu **trực tiếp từ code**, luôn khớp với code.

---

## 1. OpenAPI là gì?

**OpenAPI Specification (OAS)** là một tiêu chuẩn mở để mô tả REST API bằng một file JSON hoặc YAML mà cả người lẫn máy đều đọc được. File này đóng vai trò như một **hợp đồng (API contract)** giữa backend và frontend, mô tả:

- Các endpoint (path) và HTTP method được hỗ trợ.
- Tham số đầu vào: path param, query param, header, request body.
- Cấu trúc dữ liệu (schema) của request và response theo từng status code.
- Cơ chế xác thực (security scheme), ví dụ Bearer JWT.

Ví dụ một đoạn spec tối giản mô tả `GET /books/{id}`:

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Books API
  version: 1.0.0
paths:
  /books/{id}:
    get:
      summary: Lấy chi tiết một cuốn sách
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Thành công
        '404':
          description: Không tìm thấy sách
```

Lợi ích của việc có một spec chuẩn:

- **Một nguồn sự thật duy nhất**: frontend, QA, đối tác đều đọc cùng một tài liệu.
- **Tài liệu tương tác**: công cụ như Swagger UI đọc spec và cho phép gọi thử API ngay trên trình duyệt.
- **Sinh code tự động**: từ spec có thể sinh TypeScript type, client SDK, thậm chí mock server.
- **Tích hợp công cụ**: Postman, Insomnia, Bruno đều import được spec thành collection.

Viết tay file YAML như trên cho hàng chục endpoint vừa mất thời gian vừa dễ lệch với code. Với NestJS, ta **không viết tay**: decorator trên controller và DTO sẽ được đọc để sinh spec.

---

## 2. Swagger là gì? Mối quan hệ giữa OpenAPI và Swagger

**Swagger** là bộ công cụ mã nguồn mở xây dựng xung quanh OpenAPI Specification. Lịch sử: spec ban đầu tên là "Swagger Specification", đến năm 2015 được chuyển giao cho OpenAPI Initiative và đổi tên thành OpenAPI từ phiên bản 3.0. Tên "Swagger" được giữ lại cho bộ công cụ, nhưng cộng đồng vẫn quen gọi chung là "Swagger".

| Công cụ | Vai trò |
|---|---|
| **Swagger UI** | Render spec thành trang web tương tác, gọi thử API được |
| **Swagger Editor** | Soạn và kiểm tra file spec trực tuyến |
| **Swagger Codegen** | Sinh client/server code từ spec |

Tóm lại: **OpenAPI là tiêu chuẩn (cái gì cần mô tả), Swagger là công cụ (dùng spec để làm gì)**. Trong NestJS, package `@nestjs/swagger` đảm nhận cả hai việc: sinh spec OpenAPI từ code và phục vụ Swagger UI.

```text
Code NestJS (controller + DTO + decorator)
        │  SwaggerModule.createDocument()
        ▼
OpenAPI document (JSON)  ──────────►  /api/docs-json  ──►  Postman, openapi-typescript (FE)
        │  SwaggerModule.setup()
        ▼
Swagger UI  (/api/docs)  ──►  Developer đọc và gọi thử API
```

---

## 3. Cài đặt và cấu hình `@nestjs/swagger`

### 3.1. Cài đặt

```bash
npm install @nestjs/swagger
```

Package này đã kèm sẵn tài nguyên của Swagger UI, không cần cài thêm gì khi dùng Express adapter.

### 3.2. Cấu hình trong `main.ts`

`DocumentBuilder` khai báo thông tin chung của tài liệu; `SwaggerModule.createDocument()` quét toàn bộ controller để tạo document; `SwaggerModule.setup()` gắn Swagger UI vào một đường dẫn.

```typescript
// src/main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); // Lesson 06
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));     // Lesson 08 / Bonus 01
  app.useGlobalFilters(new HttpExceptionFilter());                             // Lesson 08

  const config = new DocumentBuilder()
    .setTitle('Books API')
    .setDescription('Tài liệu REST API quản lý sách (NestJS + PostgreSQL)')
    .setVersion('1.0')
    .addTag('auth', 'Đăng ký, đăng nhập, refresh token')
    .addTag('books', 'Quản lý sách')
    .addBearerAuth() // khai báo security scheme "bearer" (JWT), dùng ở mục 4.3
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

### 3.3. Truy cập

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`
- OpenAPI YAML: `http://localhost:3000/api/docs-yaml`

Chưa thêm decorator nào, Swagger UI đã liệt kê được mọi route (vì NestJS biết `@Get`, `@Post`, `@Param`...), nhưng body và response còn trống, các endpoint nằm chung nhóm "default". Các mục sau sẽ lấp đầy những chỗ trống đó.

Nếu project có `app.setGlobalPrefix('api')`, các path trong spec tự động có tiền tố `/api`, nhưng đường dẫn Swagger UI thì không. Muốn UI cũng nằm sau prefix, truyền thêm `{ useGlobalPrefix: true }` vào `SwaggerModule.setup()`.

---

## 4. Mô tả API bằng decorators

### 4.1. `@ApiTags`, `@ApiOperation`, `@ApiResponse`

- `@ApiTags('books')` (trên controller): nhóm các endpoint thành một mục trên UI.
- `@ApiOperation({ summary, description })` (trên method): mô tả ngắn endpoint làm gì.
- `@ApiResponse({ status, description, type })`: mô tả từng response có thể xảy ra. Có các bản rút gọn như `@ApiOkResponse` (200), `@ApiCreatedResponse` (201), `@ApiBadRequestResponse` (400), `@ApiNotFoundResponse` (404)...
- `@ApiParam` / `@ApiQuery`: bổ sung mô tả cho path/query param lẻ. Nếu query được gom trong một DTO (`@Query() query: FilterBooksDto`), Swagger tự đọc các property của DTO, không cần `@ApiQuery`.

Trước tiên cần một class mô tả response. Theo quy ước của khóa học, không trả entity trực tiếp, nên ta tạo `BookResponseDto`; đồng thời một class mô tả response lỗi theo format của Lesson 08:

```typescript
// src/modules/books/dto/book-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Clean Code' })
  title: string;

  @ApiProperty({ example: 'A handbook of agile software craftsmanship' })
  description: string;

  @ApiProperty({ example: 464 })
  pages: number;

  @ApiProperty({ type: [String], example: ['Programming'] })
  genres: string[];

  @ApiPropertyOptional({ example: '9780132350884' })
  isbn?: string;

  @ApiProperty({ example: '2026-09-25T03:00:00.000Z' })
  createdAt: Date;
}
```

```typescript
// src/common/dto/error-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Không tìm thấy sách với ID 99' })
  message: string;

  @ApiProperty({ example: '2026-09-25T03:00:00.000Z' })
  timestamp: string;
}
```

### 4.2. `@ApiProperty` trên DTO

Swagger **không đọc được kiểu TypeScript** lúc runtime (kiểu bị xóa khi compile, như đã học ở Lesson 02), và cũng không tự hiểu decorator class-validator. Vì vậy mỗi property của DTO cần `@ApiProperty()` (bắt buộc) hoặc `@ApiPropertyOptional()` (không bắt buộc) để xuất hiện trong schema. Các option thường dùng: `description`, `example`, `minimum`/`maximum`, `minLength`/`maxLength`, `enum`, `type: [String]` cho mảng, `default`.

```typescript
// src/modules/books/dto/create-book.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ description: 'Tên sách', example: 'Clean Code', minLength: 3, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Mô tả ngắn', example: 'A handbook of agile software craftsmanship' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @ApiProperty({ description: 'Số trang', example: 464, minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  pages: number;

  @ApiProperty({ description: 'Thể loại', type: [String], example: ['Programming'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  genres: string[];

  @ApiPropertyOptional({ description: 'Mã ISBN-10 hoặc ISBN-13', example: '9780132350884' })
  @IsOptional()
  @IsString()
  isbn?: string;
}
```

Với `UpdateBookDto`, Lesson 06 dùng `PartialType` từ `@nestjs/mapped-types`. Khi đã có Swagger, **phải đổi sang `PartialType` từ `@nestjs/swagger`**: bản của `@nestjs/mapped-types` chỉ copy metadata của class-validator, còn bản của `@nestjs/swagger` copy thêm metadata `@ApiProperty` (và đánh dấu tất cả thành optional). Nếu dùng nhầm, body của `PATCH /books/:id` trên Swagger sẽ hiện một object rỗng.

```typescript
// src/modules/books/dto/update-book.dto.ts
import { PartialType } from '@nestjs/swagger'; // KHÔNG dùng '@nestjs/mapped-types' khi có Swagger
import { CreateBookDto } from './create-book.dto';

export class UpdateBookDto extends PartialType(CreateBookDto) {}
// Tương tự, @nestjs/swagger cũng export PickType, OmitType, IntersectionType
```

Với enum, truyền `enum` để Swagger hiện dropdown các giá trị hợp lệ:

```typescript
// src/modules/auth/dto/update-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../types/role.enum';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.MODERATOR })
  @IsEnum(Role)
  role: Role;
}
```

### 4.3. `@ApiBearerAuth` cho route cần JWT

Việc bảo vệ route vẫn do `JwtAuthGuard` đảm nhiệm; Swagger chỉ cần **biết** route nào cần token để: hiện biểu tượng ổ khóa, và tự gắn header `Authorization: Bearer <token>` khi gọi thử. Cần hai bước **khớp tên với nhau**:

1. `DocumentBuilder().addBearerAuth()` khai báo security scheme (mục 3.2). Không truyền tên thì tên mặc định là `bearer`.
2. `@ApiBearerAuth()` trên controller hoặc method, cũng mặc định dùng tên `bearer`.

Nếu muốn đặt tên riêng, hai chỗ phải giống hệt nhau:

```typescript
// src/main.ts (trích)
const config = new DocumentBuilder()
  .setTitle('Books API')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Dán access token (không cần chữ Bearer)' },
    'access-token', // tên security scheme
  )
  .build();
// Trên controller: @ApiBearerAuth('access-token')
```

Controller `books` hoàn chỉnh:

```typescript
// src/modules/books/books.controller.ts
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiNotFoundResponse,
  ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FilterBooksDto } from './dto/filter-books.dto';
import { BookResponseDto } from './dto/book-response.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sách', description: 'Hỗ trợ phân trang, lọc theo thể loại' })
  @ApiOkResponse({ type: [BookResponseDto] }) // query params được đọc tự động từ FilterBooksDto
  findAll(@Query() query: FilterBooksDto) {
    return this.booksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một cuốn sách' })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sách', type: ErrorResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() // route cần JWT → hiện ổ khóa trên Swagger UI
  @ApiOperation({ summary: 'Tạo sách mới' })
  @ApiCreatedResponse({ type: BookResponseDto })
  @ApiUnauthorizedResponse({ description: 'Thiếu hoặc sai token', type: ErrorResponseDto })
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật sách' })
  @ApiOkResponse({ type: BookResponseDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa sách' })
  @ApiForbiddenResponse({ description: 'Không đủ quyền', type: ErrorResponseDto })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}
```

Quy trình dùng trên Swagger UI: gọi `POST /auth/login` ngay trên UI, copy `accessToken`, bấm nút **Authorize** ở góc phải, dán token vào, từ đó mọi route có ổ khóa sẽ tự gửi kèm header.

Nếu project dùng `JwtAuthGuard` toàn cục bằng `APP_GUARD` (Lesson 09), có thể dùng `.addSecurityRequirements('bearer')` trong `DocumentBuilder` để mặc định mọi endpoint đều yêu cầu token, thay vì gắn `@ApiBearerAuth()` từng nơi. Còn nếu đã làm decorator `@Auth()` ở [Bonus 01](../Request-Lifecycle/README.md#71-kết-hợp-nhiều-decorator-với-applydecorators), `@ApiBearerAuth()` đã nằm sẵn trong đó.

### 4.4. Mô tả đúng response format `{ success, statusCode, data }`

Có một điểm dễ bị bỏ sót: `@ApiOkResponse({ type: BookResponseDto })` nói rằng response là một `BookResponseDto`, nhưng thực tế `TransformInterceptor` đã bọc nó thành `{ success, statusCode, data: BookResponseDto }`. Tài liệu sai lệch như vậy sẽ khiến frontend sinh type sai (mục 7). Giải pháp là viết một decorator dùng `ApiExtraModels` + `getSchemaPath` để mô tả "wrapper chứa model", gộp bằng `applyDecorators` (đã học ở Bonus 01):

```typescript
// src/common/swagger/api-wrapped-response.decorator.ts
import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface WrappedOptions {
  status?: HttpStatus;
  isArray?: boolean;
  description?: string;
}

export function ApiWrappedResponse(model: Type<unknown>, options: WrappedOptions = {}) {
  const status = options.status ?? HttpStatus.OK;
  const dataSchema = options.isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    ApiExtraModels(model), // đăng ký model vào components/schemas để $ref trỏ tới được
    ApiResponse({
      status,
      description: options.description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: status },
          data: dataSchema,
        },
      },
    }),
  );
}
```

```typescript
// src/modules/books/books.controller.ts (thay cho @ApiOkResponse ở trên)
@Get(':id')
@ApiWrappedResponse(BookResponseDto)
@ApiNotFoundResponse({ type: ErrorResponseDto })
findOne(@Param('id', ParseIntPipe) id: number) { /* ... */ }

@Get()
@ApiWrappedResponse(BookResponseDto, { isArray: true })
findAll(@Query() query: FilterBooksDto) { /* ... */ }
```

---

## 5. Swagger CLI plugin: tự sinh mô tả từ DTO

### 5.1. Vấn đề

Nhìn lại `CreateBookDto` ở mục 4.2: mỗi field vừa có `@MinLength(3)` vừa có `minLength: 3` trong `@ApiProperty`, vừa khai báo `isbn?: string` vừa phải nhớ dùng `@ApiPropertyOptional`. Thông tin bị viết hai lần, và sớm muộn sẽ lệch nhau. **Swagger CLI plugin** giải quyết việc này: trong lúc Nest CLI compile TypeScript, plugin đọc thẳng **kiểu TypeScript** (lúc này vẫn còn) và tự chèn metadata `@ApiProperty` vào code đã build.

### 5.2. Cấu hình `nest-cli.json`

Dạng đơn giản nhất:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": ["@nestjs/swagger"]
  }
}
```

Dạng có option:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

- `classValidatorShim` (mặc định bật): đọc thêm decorator class-validator như `@Min`, `@Max`, `@MinLength`, `@MaxLength`... để điền ràng buộc vào schema.
- `introspectComments` (mặc định tắt): đọc JSDoc comment phía trên property làm `description`, và tag `@example` làm `example`; phía trên method controller thì làm `summary`.

Sau khi đổi cấu hình plugin, hãy dừng `npm run start:dev`, xóa thư mục `dist` rồi chạy lại để chắc chắn code được compile lại.

### 5.3. Plugin tự sinh những gì và quy tắc đặt tên file

| Plugin tự làm | Lấy từ đâu |
|---|---|
| Thêm `@ApiProperty` cho **mọi** property | Khai báo property trong class |
| `required: false` | Dấu `?` (`isbn?: string`) |
| `type`, mảng, enum | Kiểu TypeScript (`string[]`, `Role`) |
| `default` | Giá trị khởi tạo (`page = 1`) |
| `minimum`, `maxLength`... | Decorator class-validator (khi bật `classValidatorShim`) |
| `description`, `example`, `summary` | JSDoc comment (khi bật `introspectComments`) |
| Response 200/201 có `type` | Kiểu trả về khai báo của method controller |

**Quy tắc bắt buộc về tên file**: plugin chỉ xử lý class nằm trong file có hậu tố **`.dto.ts`** hoặc **`.entity.ts`** (và `.controller.ts` cho phần controller). File đặt tên `create-book.ts` hay `book.model.ts` sẽ bị bỏ qua hoàn toàn, property không hiện trên Swagger dù không có lỗi nào. Đây là lý do nên đặt tên file đúng chuẩn Nest CLI ngay từ đầu (`nest g resource` đã làm sẵn).

Với plugin, `CreateBookDto` gọn lại, chỉ còn class-validator và comment:

```typescript
// src/modules/books/dto/create-book.dto.ts
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBookDto {
  /**
   * Tên sách
   * @example 'Clean Code'
   */
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  /** Mô tả ngắn */
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  /**
   * Số trang
   * @example 464
   */
  @IsInt()
  @Min(1)
  @Max(10000)
  pages: number;

  /** Danh sách thể loại */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  genres: string[];

  /** Mã ISBN-10 hoặc ISBN-13 */
  @IsOptional()
  @IsString()
  isbn?: string; // dấu ? → plugin tự đánh dấu không bắt buộc
}
```

### 5.4. Giới hạn cần biết

- Plugin chỉ chạy khi build bằng **Nest CLI** (`nest start`, `nest build`). Chạy file bằng công cụ khác (ví dụ ts-jest trong e2e test ở Lesson 15) thì cần cấu hình thêm AST transformer, nếu không metadata sẽ thiếu.
- Muốn ghi đè hoặc bổ sung (ví dụ `example` phức tạp, `format: 'email'`) vẫn có thể viết `@ApiProperty()` thủ công, giá trị viết tay được ưu tiên.
- Muốn ẩn một property (ví dụ `password` trong entity), dùng `@ApiHideProperty()`.
- Response type tự sinh từ kiểu trả về vẫn là **kiểu chưa bọc**, nên với project dùng `TransformInterceptor`, vẫn nên dùng `@ApiWrappedResponse()` ở mục 4.4.

---

## 6. Tùy chỉnh Swagger UI

### 6.1. Tùy chọn giao diện

Tham số thứ tư của `SwaggerModule.setup()` cho phép tùy chỉnh. `swaggerOptions` được chuyển thẳng cho Swagger UI, các option còn lại do NestJS xử lý:

```typescript
// src/main.ts (trích)
SwaggerModule.setup('api/docs', app, document, {
  customSiteTitle: 'Books API Docs', // tiêu đề tab trình duyệt
  customCss: '.swagger-ui .topbar { display: none }', // ẩn thanh topbar mặc định
  swaggerOptions: {
    persistAuthorization: true, // giữ token sau khi reload trang, rất tiện khi dev
    docExpansion: 'none',       // thu gọn mọi nhóm endpoint lúc mở trang
    filter: true,               // ô tìm kiếm theo tag
    tagsSorter: 'alpha',        // sắp xếp tag theo alphabet
    displayRequestDuration: true, // hiện thời gian phản hồi mỗi lần "Try it out"
  },
});
```

### 6.2. Ẩn endpoint khỏi tài liệu

Một số route nội bộ (health check, webhook, route debug) không nên xuất hiện trong tài liệu công khai:

```typescript
// src/modules/internal/internal.controller.ts
import { Controller } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController() // ẩn toàn bộ controller
@Controller('internal')
export class InternalController {}
```

```typescript
// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller('health')
export class HealthController {
  @Get()
  @ApiExcludeEndpoint() // chỉ ẩn một endpoint
  check() {
    return { status: 'ok' };
  }
}
```

### 6.3. Tách nhiều tài liệu theo module

Khi project có API cho admin và API công khai, có thể sinh hai document riêng bằng option `include`:

```typescript
// src/main.ts (trích)
const publicDoc = SwaggerModule.createDocument(app, publicConfig, { include: [BooksModule, AuthModule] });
SwaggerModule.setup('api/docs', app, publicDoc);

const adminDoc = SwaggerModule.createDocument(app, adminConfig, { include: [AdminModule] });
SwaggerModule.setup('api/admin/docs', app, adminDoc);
```

### 6.4. Không để Swagger công khai ở production

Swagger UI liệt kê toàn bộ bề mặt API, giúp kẻ tấn công dò endpoint dễ hơn. Cách đơn giản nhất là chỉ bật ở môi trường khác production (hoặc đặt sau Basic Auth / mạng nội bộ):

```typescript
// src/main.ts (trích)
if (process.env.NODE_ENV !== 'production') {
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
```

---

## 7. Export OpenAPI spec (JSON) cho frontend/Postman

Swagger UI dành cho người đọc; còn **file spec JSON** dành cho công cụ. Có hai cách lấy spec.

### 7.1. Qua URL

Như mục 3.3, khi server chạy, spec luôn có tại `/api/docs-json` (và `/api/docs-yaml`). Có thể đổi đường dẫn bằng option `jsonDocumentUrl` của `SwaggerModule.setup()`. Cách này tiện khi dev: công cụ luôn lấy được spec mới nhất.

### 7.2. Ghi ra file

Để commit spec vào repo (review thay đổi API qua pull request, chia sẻ cho team frontend không chạy backend), ghi document ra file lúc khởi động:

```typescript
// src/main.ts (trích)
import { writeFileSync } from 'node:fs';

const document = SwaggerModule.createDocument(app, config, {
  // operationId mặc định là "BooksController_findAll"; đổi thành "books_findAll" cho gọn khi sinh client
  operationIdFactory: (controllerKey: string, methodKey: string) =>
    `${controllerKey.replace('Controller', '').toLowerCase()}_${methodKey}`,
});

if (process.env.NODE_ENV !== 'production') {
  writeFileSync('./openapi.json', JSON.stringify(document, null, 2)); // file ở thư mục gốc project
}
SwaggerModule.setup('api/docs', app, document);
```

### 7.3. Import vào Postman

Trong Postman: **Import** → chọn **Link** và dán `http://localhost:3000/api/docs-json` (hoặc kéo thả file `openapi.json`). Postman tạo sẵn một collection đủ mọi endpoint, nhóm theo tag, có body mẫu lấy từ `example`. Không cần tạo request thủ công như các buổi trước.

### 7.4. Sinh TypeScript type cho frontend ReactJS

Ở mini project Lesson 08 và 11, bạn phải tự khai báo interface `Book` bên frontend, và mỗi khi backend thêm field lại phải sửa tay. Với spec, có thể sinh type tự động bằng `openapi-typescript`:

```bash
# chạy trong project ReactJS, backend đang chạy ở cổng 3000
npx openapi-typescript http://localhost:3000/api/docs-json -o src/types/api.d.ts
```

```typescript
// src/services/books.api.ts (project ReactJS)
import type { components } from '../types/api';
import { apiClient } from './api-client'; // axios instance từ Lesson 08

type Book = components['schemas']['BookResponseDto'];
type CreateBookInput = components['schemas']['CreateBookDto'];

interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
}

export async function createBook(input: CreateBookInput): Promise<Book> {
  const res = await apiClient.post<SuccessResponse<Book>>('/books', input);
  return res.data.data;
}
```

Khi backend đổi DTO, chỉ cần chạy lại lệnh, TypeScript bên frontend sẽ báo lỗi ở mọi chỗ dùng sai. Nếu muốn sinh luôn cả hàm gọi API, có các công cụ như `orval` hoặc `@openapitools/openapi-generator-cli`, đó là lúc `operationIdFactory` ở mục 7.2 phát huy tác dụng vì `operationId` trở thành tên hàm.

---

## Common mistakes

1. **`UpdateBookDto` dùng `PartialType` từ `@nestjs/mapped-types`.**
   Vì sao: bản này không copy metadata Swagger, body của `PATCH` trên Swagger UI hiện rỗng dù validation vẫn chạy đúng.
   Cách sửa: import `PartialType` (và `PickType`, `OmitType`) từ `@nestjs/swagger`.

2. **Tên security scheme không khớp giữa `addBearerAuth()` và `@ApiBearerAuth()`.**
   Vì sao: ví dụ `.addBearerAuth({...}, 'access-token')` nhưng controller lại ghi `@ApiBearerAuth()` (tên mặc định `bearer`). Bấm Authorize xong gọi API vẫn nhận 401 vì Swagger UI không gắn header.
   Cách sửa: để cả hai mặc định, hoặc dùng cùng một hằng số tên ở cả hai nơi. Kiểm tra tab "Curl" trên UI xem có header `Authorization` không.

3. **Đặt tên file DTO sai hậu tố nên plugin bỏ qua.**
   Vì sao: CLI plugin chỉ đọc file `*.dto.ts` / `*.entity.ts`; file `create-book.ts` không có lỗi gì nhưng schema trống. Tương tự, đổi cấu hình plugin mà không build lại thì không thấy thay đổi.
   Cách sửa: đặt tên theo chuẩn Nest CLI; sau khi đổi `nest-cli.json` thì xóa `dist` và restart.

4. **Dùng `interface` làm kiểu cho `@Body()` hoặc response.**
   Vì sao: interface bị xóa khi compile (Lesson 02), Swagger không có gì để đọc, và `ValidationPipe` cũng không validate được.
   Cách sửa: luôn dùng class cho DTO và response DTO.

5. **Tài liệu không khớp response thật, hoặc để Swagger công khai ở production.**
   Vì sao: quên rằng `TransformInterceptor` bọc response nên frontend sinh type thiếu lớp `data`; còn Swagger public ở production làm lộ toàn bộ endpoint.
   Cách sửa: dùng `@ApiWrappedResponse()` (mục 4.4); chỉ bật Swagger khi `NODE_ENV !== 'production'` hoặc bảo vệ bằng Basic Auth.

---

## Bài tập thực hành trên lớp

**Đề bài:** Tài liệu hóa toàn bộ API của project `books` (đã có auth từ Lesson 09):

1. Cài `@nestjs/swagger`, cấu hình `DocumentBuilder` có `addBearerAuth()`, Swagger UI tại `/api/docs`.
2. Gắn `@ApiTags` cho `AuthController` và `BooksController`; mỗi endpoint có `@ApiOperation` và ít nhất một response thành công + một response lỗi.
3. Thêm `@ApiProperty` cho `CreateBookDto`, `LoginDto`, `RegisterDto`; đổi `UpdateBookDto` sang `PartialType` của `@nestjs/swagger`.
4. Gắn `@ApiBearerAuth()` cho `POST`, `PATCH`, `DELETE /books`. Trên Swagger UI: login, bấm Authorize, tạo một cuốn sách thành công.
5. Import `http://localhost:3000/api/docs-json` vào Postman và gọi thử `GET /books`.

**Gợi ý hướng giải:**

- Làm theo thứ tự: cấu hình `main.ts` và mở UI trước, sau đó mới thêm decorator từng controller, reload trang để thấy thay đổi ngay.
- `LoginDto` nên có `example` là tài khoản seed sẵn (Lesson 07) để bấm "Try it out" là đăng nhập được luôn.
- Nếu Authorize xong vẫn 401: mở tab Curl của request, kiểm tra header; rồi kiểm tra tên security scheme (Common mistake 2).
- Nếu body `PATCH` hiện `{}`: kiểm tra import `PartialType` (Common mistake 1).

---

## Homework

- [ ] Hoàn thiện mô tả cho mọi endpoint còn lại (users, roles), dùng `@ApiExcludeEndpoint()` cho health check.
- [ ] Tạo `ErrorResponseDto` và gắn `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiNotFoundResponse` cho các route phù hợp.
- [ ] Bật Swagger CLI plugin với `introspectComments: true`, xóa bớt `@ApiProperty` thủ công trong DTO và thay bằng JSDoc; so sánh spec JSON trước và sau để chắc chắn không mất thông tin.
- [ ] Viết decorator `@ApiWrappedResponse()` (mục 4.4) và áp dụng cho toàn bộ `BooksController`, kể cả response danh sách.
- [ ] Ghi spec ra `openapi.json`, commit vào repo; trong project ReactJS của Lesson 08, sinh type bằng `openapi-typescript` và thay interface `Book` viết tay bằng type sinh ra.
- [ ] (Nâng cao) Mở rộng `@ApiWrappedResponse()` để mô tả response phân trang `{ success, statusCode, data: { items: Book[], meta: { page, limit, total } } }` (Lesson 07), rồi tách tài liệu thành hai document public/admin bằng option `include`.

---

## Câu hỏi ôn tập

1. Phân biệt OpenAPI và Swagger. Trong NestJS, package `@nestjs/swagger` đảm nhận vai trò nào?
2. Vì sao Swagger không tự đọc được kiểu của property trong DTO nếu không có `@ApiProperty()` hoặc CLI plugin? CLI plugin giải quyết vấn đề đó bằng cách nào?
3. Cần làm những bước nào để một route dùng `JwtAuthGuard` gọi thử được trên Swagger UI? Điều gì xảy ra nếu tên security scheme không khớp?
4. Vì sao `UpdateBookDto` phải dùng `PartialType` từ `@nestjs/swagger` thay vì `@nestjs/mapped-types`?
5. Nêu hai cách lấy file OpenAPI spec và một lợi ích cụ thể của spec đối với team frontend.
