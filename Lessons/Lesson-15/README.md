# Lesson 15: API Documentation với Swagger/OpenAPI trong NestJS


## 1. API Documentation Fundamentals

### Tại sao cần tài liệu API?

Hãy tưởng tượng bạn vừa vào một công ty mới, được giao nhiệm vụ tích hợp với một hệ thống backend đã có sẵn. Bạn cần biết: API có những endpoint nào? Mỗi endpoint nhận tham số gì? Trả về dữ liệu dạng nào? Nếu gặp lỗi thì lỗi trông như thế nào?

Nếu không có tài liệu, bạn buộc phải đọc source code, hỏi đồng nghiệp, hoặc tệ hơn — thử sai. Đây là một trong những nguyên nhân phổ biến nhất gây ra lãng phí thời gian trong các dự án phần mềm.

**Tài liệu API giải quyết các vấn đề cụ thể:**

- **Giao tiếp giữa các team:** Frontend dev không cần phải "hỏi han" backend dev từng lần. Họ chỉ cần mở tài liệu lên là biết cần gọi gì.
- **Onboarding người mới:** Developer mới vào dự án tự học được ngay thay vì phải được "cầm tay chỉ việc".
- **Giảm lỗi tích hợp:** Khi contract (hợp đồng) giữa client và server được định nghĩa rõ ràng, số lượng bug do misunderstanding giảm đáng kể.
- **Tự động hóa:** Từ tài liệu, bạn có thể tự động generate code client (SDK), test case, và mock server.

```
┌──────────────┐         ┌─────────────────┐         ┌──────────────┐
│  Frontend Dev│ ──────► │  API Document   │ ◄─────── │ Backend Dev  │
└──────────────┘         └─────────────────┘         └──────────────┘
         │                        │                          │
         │                        ▼                          │
         │               ┌─────────────────┐                 │
         └──────────────►│  Tích hợp đúng  │◄────────────────┘
                         │  ngay lần đầu   │
                         └─────────────────┘
```

### OpenAPI Specification

**OpenAPI Specification (OAS)** là một tiêu chuẩn mở để mô tả RESTful API theo định dạng có thể đọc được bởi cả con người lẫn máy móc. File OpenAPI thường là JSON hoặc YAML.

Trước đây nó có tên là **Swagger Specification**, nhưng sau khi được donate cho tổ chức OpenAPI Initiative (dưới sự bảo trợ của Linux Foundation), nó được đổi tên thành OpenAPI 3.0.

Ví dụ một đoạn file OpenAPI YAML cơ bản:

```yaml
openapi: 3.0.0
info:
  title: My Todo API
  version: 1.0.0
  description: API quản lý công việc cá nhân

paths:
  /todos:
    get:
      summary: Lấy danh sách tất cả todos
      responses:
        '200':
          description: Thành công
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Todo'

components:
  schemas:
    Todo:
      type: object
      properties:
        id:
          type: integer
        title:
          type: string
        completed:
          type: boolean
```

File này là "source of truth" — mọi người đều dựa vào đây để biết API trông như thế nào.

### Documentation Approaches

Có 3 cách tiếp cận phổ biến khi viết tài liệu API:

**1. Code-first (Annotation-based):**
Bạn viết code trước, sau đó thêm annotation/decorator để tự động sinh ra tài liệu. Đây là cách NestJS + Swagger sử dụng.

```
Code + Decorators → Auto-generate → OpenAPI Spec → Swagger UI
```

✅ Ưu điểm: Tài liệu luôn đồng bộ với code, dễ maintain  
❌ Nhược điểm: Code bị "pha loãng" bởi decorator documentation

**2. Design-first (Spec-first):**
Viết file OpenAPI YAML/JSON trước, sau đó generate code skeleton từ spec.

```
OpenAPI Spec → Generate skeleton → Implement logic
```

✅ Ưu điểm: Thiết kế API cẩn thận trước khi code, team có thể làm song song  
❌ Nhược điểm: Khó duy trì đồng bộ giữa spec và code thực tế

**3. Manual Documentation:**
Viết tài liệu tay bằng Markdown, Confluence, Notion, v.v.

✅ Ưu điểm: Linh hoạt, không phụ thuộc vào tool  
❌ Nhược điểm: Rất dễ bị outdated, tốn công maintain

> 💡 **Trong NestJS**, chúng ta sử dụng cách **Code-first** với `@nestjs/swagger`. Đây là cách tiếp cận thực tế nhất cho các dự án vừa và nhỏ.

---

## 2. Giới thiệu về Swagger/OpenAPI

### Swagger Ecosystem

"Swagger" thực ra là tên của một bộ công cụ, không phải một thứ duy nhất:

| Công cụ | Mô tả |
|---|---|
| **Swagger UI** | Giao diện web interactive để xem và test API |
| **Swagger Editor** | Editor online để viết OpenAPI spec |
| **Swagger Codegen** | Tool generate code client/server từ spec |
| **SwaggerHub** | Platform SaaS quản lý API spec |

Khi người ta nói "tích hợp Swagger vào NestJS", họ thường có nghĩa là: tự động generate OpenAPI spec từ code NestJS và hiển thị qua Swagger UI.

### OpenAPI 3.0 Specification

OpenAPI 3.0 là phiên bản hiện tại (cũng đã có 3.1 nhưng chưa phổ biến rộng rãi). So với phiên bản 2.0 (Swagger), nó có nhiều cải tiến:

- **`components`** thay cho `definitions` — tổ chức lại schema, responses, parameters
- **Multiple servers** — một API có thể có nhiều base URL
- **`requestBody`** thay thế `body` parameter — rõ ràng hơn
- **`oneOf`, `anyOf`, `allOf`** — hỗ trợ polymorphism tốt hơn
- **Callbacks** — hỗ trợ webhook

Cấu trúc tổng thể của một OpenAPI 3.0 document:

```yaml
openapi: 3.0.0        # Phiên bản spec
info: ...              # Thông tin API (tên, version, contact)
servers: [...]         # Danh sách server URLs
paths: {...}           # Tất cả các endpoints
components:            # Tái sử dụng schema, responses, ...
  schemas: {...}
  responses: {...}
  parameters: {...}
  securitySchemes: {...}
security: [...]        # Global security requirement
tags: [...]            # Nhóm các endpoints
```

### Alternative Tools Comparison

| Tool | Điểm mạnh | Điểm yếu |
|---|---|---|
| **Swagger UI** | Phổ biến, quen thuộc, nhiều integration | UI hơi cũ, khó customize |
| **Redoc** | UI đẹp hơn, tốt cho public docs | Không có try-it-out mặc định |
| **Scalar** | Hiện đại, đẹp, nhẹ | Còn khá mới |
| **Stoplight Elements** | Chuyên nghiệp, nhiều tính năng | Phức tạp hơn |

Chúng ta sẽ tìm hiểu Redoc và Scalar ở phần sau.

---

## 3. Cài đặt & Setup

### Swagger Module Installation

Để sử dụng Swagger với NestJS, chúng ta cần cài thêm package:

```bash
npm install @nestjs/swagger
```

> **Lưu ý:** `swagger-ui-express` không cần cài thêm — nó đã được bundle sẵn trong `@nestjs/swagger` từ phiên bản 5 trở đi.

### Basic Configuration

Mở file `src/main.ts` và thêm cấu hình Swagger:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Tạo config cho Swagger document
  const config = new DocumentBuilder()
    .setTitle('Todo API')                        // Tên API
    .setDescription('API quản lý công việc')     // Mô tả
    .setVersion('1.0')                           // Version
    .addTag('todos', 'Quản lý danh sách todo')   // Tag phân nhóm
    .build();

  // 2. Tạo document từ app + config
  const document = SwaggerModule.createDocument(app, config);

  // 3. Gắn Swagger UI vào route '/api'
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
```

Bây giờ chạy `npm run start:dev` và mở trình duyệt vào `http://localhost:3000/api` — bạn sẽ thấy Swagger UI hiện ra!

Ngoài ra, bạn cũng có thể lấy raw JSON spec tại: `http://localhost:3000/api-json`

### Multiple Configurations (Dev/Prod)

Thực tế, bạn không muốn expose Swagger UI trên môi trường production. Đây là cách xử lý:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Chỉ bật Swagger khi không phải production
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Todo API')
      .setDescription('API quản lý công việc — môi trường DEV')
      .setVersion('1.0.0')
      .addBearerAuth()  // Thêm nút Authorize cho JWT
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,  // Giữ token khi reload trang
      },
    });

    console.log(`📄 Swagger UI: http://localhost:3000/api-docs`);
  }

  await app.listen(3000);
}
bootstrap();
```

> 💡 **Best Practice:** Đặt URL của Swagger là `/api-docs` thay vì `/api` để tránh nhầm lẫn với prefix của API routes.

---

## 4. Swagger Decorators Deep Dive

Đây là phần cốt lõi — NestJS Swagger cung cấp một loạt decorator để bạn "mô tả" API ngay trong code.

### Endpoint Documentation

```typescript
// src/todos/todos.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Todo } from './entities/todo.entity';

@ApiTags('todos')           // Nhóm tất cả endpoints của controller này vào tag "todos"
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả todos',
    description: 'Trả về mảng các todo. Hỗ trợ phân trang qua query params.',
  })
  @ApiResponse({ status: 200, description: 'Thành công', type: [Todo] })
  findAll() {
    return this.todosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy một todo theo ID' })
  @ApiParam({
    name: 'id',
    description: 'ID của todo cần lấy',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Tìm thấy todo', type: Todo })
  @ApiResponse({ status: 404, description: 'Không tìm thấy todo' })
  findOne(@Param('id') id: string) {
    return this.todosService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo todo mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: Todo })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() createTodoDto: CreateTodoDto) {
    return this.todosService.create(createTodoDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật todo' })
  update(@Param('id') id: string, @Body() updateTodoDto: UpdateTodoDto) {
    return this.todosService.update(+id, updateTodoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa todo' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  remove(@Param('id') id: string) {
    return this.todosService.remove(+id);
  }
}
```

### Parameter Documentation

Swagger hỗ trợ 4 loại parameter:

```typescript
import {
  ApiQuery,
  ApiParam,
  ApiHeader,
  ApiCookieAuth
} from '@nestjs/swagger';

@Get('search')
@ApiQuery({
  name: 'keyword',
  description: 'Từ khóa tìm kiếm',
  required: false,
  type: String,
  example: 'học nestjs',
})
@ApiQuery({
  name: 'page',
  description: 'Trang hiện tại (bắt đầu từ 1)',
  required: false,
  type: Number,
  example: 1,
})
@ApiQuery({
  name: 'limit',
  description: 'Số item mỗi trang',
  required: false,
  type: Number,
  example: 10,
})
search(
  @Query('keyword') keyword?: string,
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
) {
  return this.todosService.search({ keyword, page, limit });
}

// Header parameter
@Get('export')
@ApiHeader({
  name: 'X-Client-Version',
  description: 'Version của client app',
  required: false,
})
export() { ... }
```

### Request/Response Documentation

```typescript
import {
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiExtraModels,
  getSchemaPath
} from '@nestjs/swagger';

// Mô tả request body một cách tường minh (optional nếu dùng DTO)
@Post('bulk')
@ApiOperation({ summary: 'Tạo nhiều todos cùng lúc' })
@ApiBody({
  description: 'Danh sách todos cần tạo',
  type: [CreateTodoDto],
  examples: {
    example1: {
      summary: 'Ví dụ cơ bản',
      value: [
        { title: 'Học NestJS', completed: false },
        { title: 'Viết unit test', completed: false },
      ],
    },
  },
})
@ApiResponse({
  status: 201,
  description: 'Tạo thành công',
  schema: {
    type: 'object',
    properties: {
      count: { type: 'number', example: 2 },
      items: {
        type: 'array',
        items: { $ref: getSchemaPath(Todo) },
      },
    },
  },
})
bulkCreate(@Body() createTodoDtos: CreateTodoDto[]) {
  return this.todosService.bulkCreate(createTodoDtos);
}
```

### Authentication Documentation

```typescript
// src/main.ts — Đăng ký security schemes
const config = new DocumentBuilder()
  .setTitle('Todo API')
  .setVersion('1.0')
  // JWT Bearer token
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Nhập JWT token của bạn',
    },
    'access-token', // Tên của security scheme (dùng để reference)
  )
  // API Key
  .addApiKey(
    { type: 'apiKey', in: 'header', name: 'X-API-KEY' },
    'api-key',
  )
  .build();
```

```typescript
// src/todos/todos.controller.ts — Apply security vào endpoint
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('todos')
@ApiBearerAuth('access-token')  // Tên phải khớp với tên trong DocumentBuilder
@UseGuards(JwtAuthGuard)
@Controller('todos')
export class TodosController {
  // Tất cả endpoints trong controller này đều yêu cầu auth
  // ...
}

// Hoặc apply cho từng endpoint:
@Post()
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
create(@Body() dto: CreateTodoDto) { ... }
```

---

## 5. Document DTOs & Models

### Schema Generation

NestJS Swagger tự động đọc TypeScript class để generate schema. Bạn chỉ cần dùng `@ApiProperty()`:

```typescript
// src/todos/dto/create-todo.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';

export enum TodoPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export class CreateTodoDto {
  @ApiProperty({
    description: 'Tiêu đề của todo',
    example: 'Học NestJS Swagger',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết (không bắt buộc)',
    example: 'Đọc documentation và làm theo tutorial',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái hoàn thành',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  completed?: boolean = false;

  @ApiProperty({
    description: 'Mức độ ưu tiên',
    enum: TodoPriority,
    example: TodoPriority.MEDIUM,
  })
  @IsEnum(TodoPriority)
  priority: TodoPriority;
}
```

```typescript
// src/todos/entities/todo.entity.ts
import { ApiProperty } from '@nestjs/swagger';

export class Todo {
  @ApiProperty({ description: 'ID tự tăng', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tiêu đề', example: 'Học NestJS' })
  title: string;

  @ApiProperty({ description: 'Mô tả', example: 'Đọc docs chính thức', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Đã hoàn thành chưa', example: false })
  completed: boolean;

  @ApiProperty({ description: 'Ngày tạo', example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Ngày cập nhật', example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}
```

### Validation Integration

Khi dùng cùng với `class-validator` và `@nestjs/mapped-types`, bạn có thể tái sử dụng DTO:

```typescript
// src/todos/dto/update-todo.dto.ts
import { PartialType } from '@nestjs/swagger';
// ⚠️ QUAN TRỌNG: Import từ @nestjs/swagger, KHÔNG phải @nestjs/mapped-types
// Lý do: @nestjs/swagger có version PartialType biết cách preserve ApiProperty metadata
import { CreateTodoDto } from './create-todo.dto';

export class UpdateTodoDto extends PartialType(CreateTodoDto) {
  // Tất cả field của CreateTodoDto đều trở thành optional
  // ApiProperty metadata được tự động kế thừa và điều chỉnh
}
```

> ⚠️ **Lỗi phổ biến:** Nhiều người import `PartialType` từ `@nestjs/mapped-types` thay vì `@nestjs/swagger`. Kết quả là metadata bị mất và Swagger không hiển thị đúng schema.

### Complex Types Handling

```typescript
// src/todos/dto/paginated-todos.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Todo } from '../entities/todo.entity';

export class PaginationMeta {
  @ApiProperty({ example: 100 })
  totalItems: number;

  @ApiProperty({ example: 10 })
  itemsPerPage: number;

  @ApiProperty({ example: 10 })
  totalPages: number;

  @ApiProperty({ example: 1 })
  currentPage: number;
}

export class PaginatedTodosDto {
  @ApiProperty({ type: [Todo] })  // type: [ClassName] cho array
  items: Todo[];

  @ApiProperty({ type: PaginationMeta })  // Nested object
  meta: PaginationMeta;
}

// Generic response wrapper
export class ApiResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Thao tác thành công' })
  message: string;

  // Với generic type, cần dùng cách khác:
  data: T;
}

// Vì TypeScript generics bị mất runtime, ta tạo concrete class cho từng case:
export class TodoApiResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Lấy todo thành công' })
  message: string;

  @ApiProperty({ type: Todo })
  data: Todo;
}
```

---

## 6. Advanced Features

### File Uploads

Đây là một case khá đặc biệt — khi upload file, bạn dùng `multipart/form-data`:

```typescript
// src/todos/todos.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';

@ApiTags('todos')
@Controller('todos')
export class TodosController {

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import todos từ file CSV' })
  @ApiConsumes('multipart/form-data')  // Thay đổi Content-Type
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',        // Hiển thị file picker trong Swagger UI
          description: 'File CSV chứa danh sách todos',
        },
        overwrite: {
          type: 'boolean',
          description: 'Ghi đè nếu đã tồn tại',
          default: false,
        },
      },
    },
  })
  importFromCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('overwrite') overwrite: boolean,
  ) {
    return this.todosService.importFromCsv(file, overwrite);
  }
}
```

### Multiple API Versions

Khi API cần versioning, bạn có thể tạo nhiều Swagger document:

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable versioning
  app.enableVersioning({
    type: VersioningType.URI, // /v1/todos, /v2/todos
  });

  // Document cho V1
  const configV1 = new DocumentBuilder()
    .setTitle('Todo API - V1')
    .setVersion('1.0')
    .addServer('/v1')
    .build();

  const documentV1 = SwaggerModule.createDocument(app, configV1, {
    include: [TodosModuleV1],  // Chỉ include module của V1
  });
  SwaggerModule.setup('api/v1/docs', app, documentV1);

  // Document cho V2
  const configV2 = new DocumentBuilder()
    .setTitle('Todo API - V2')
    .setVersion('2.0')
    .addServer('/v2')
    .build();

  const documentV2 = SwaggerModule.createDocument(app, configV2, {
    include: [TodosModuleV2],
  });
  SwaggerModule.setup('api/v2/docs', app, documentV2);

  await app.listen(3000);
}
```

### Custom Responses

Đôi khi bạn muốn document các error response theo chuẩn của project:

```typescript
// src/common/decorators/api-standard-responses.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

// Error response schema theo chuẩn của bạn
class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: ['title must not be empty'] })
  message: string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}

// Tạo custom decorator gộp nhiều @ApiResponse lại
export function ApiStandardResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Dữ liệu đầu vào không hợp lệ',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Chưa đăng nhập',
    }),
    ApiResponse({
      status: 403,
      description: 'Không có quyền truy cập',
    }),
    ApiResponse({
      status: 500,
      description: 'Lỗi hệ thống',
    }),
  );
}

// Sử dụng:
@Post()
@ApiStandardResponses()
@ApiResponse({ status: 201, description: 'Tạo thành công', type: Todo })
create(@Body() dto: CreateTodoDto) { ... }
```

### External Docs

```typescript
const config = new DocumentBuilder()
  .setTitle('Todo API')
  .setExternalDoc('Tài liệu đầy đủ tại Confluence', 'https://your-company.atlassian.net/wiki')
  .setContact('Backend Team', 'https://your-company.com', 'backend@company.com')
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .build();
```

---

## 7. Swagger UI Customization

### Theme và Branding

```typescript
// src/main.ts
SwaggerModule.setup('api-docs', app, document, {
  customSiteTitle: 'Todo API - Dev Portal',

  // Custom CSS
  customCss: `
    .swagger-ui .topbar { background-color: #1a1a2e; }
    .swagger-ui .topbar-wrapper img { content: url('/logo.png'); height: 40px; }
    .swagger-ui .info .title { color: #e94560; }
  `,

  // Custom CSS từ file bên ngoài (nếu serve static)
  customCssUrl: '/swagger-custom.css',

  // Custom JS (nếu cần inject logic)
  customJs: '/swagger-custom.js',

  // Favicon
  customfavIcon: '/favicon.ico',
});
```

### Custom Features

```typescript
SwaggerModule.setup('api-docs', app, document, {
  swaggerOptions: {
    // Giữ token sau khi refresh trang
    persistAuthorization: true,

    // Tự động mở rộng tag đầu tiên
    docExpansion: 'list', // 'none' | 'list' | 'full'

    // Filter endpoint theo tag/keyword
    filter: true,

    // Hiện thị thời gian request
    displayRequestDuration: true,

    // Thứ tự sắp xếp endpoint
    operationsSorter: 'alpha', // 'alpha' | 'method'

    // Thứ tự sắp xếp tag
    tagsSorter: 'alpha',

    // Số dòng hiển thị mặc định cho response
    defaultModelExpandDepth: 3,
  },
});
```

---

## 8. Alternative Documentation Tools

### Redoc

Redoc cho giao diện đẹp hơn, phù hợp cho public documentation:

```bash
npm install redoc-express
```

```typescript
// src/main.ts
import * as redoc from 'redoc-express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Tạo OpenAPI document như bình thường
  const config = new DocumentBuilder()
    .setTitle('Todo API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Expose JSON spec tại /api-json
  app.use('/api-json', (req, res) => {
    res.json(document);
  });

  // Mount Redoc UI tại /api-docs
  app.use(
    '/api-docs',
    redoc.default({
      title: 'Todo API Documentation',
      specUrl: '/api-json',
      redocOptions: {
        hideDownloadButton: false,
        expandResponses: '200,201',
        requiredPropsFirst: true,
      },
    }),
  );

  await app.listen(3000);
}
```

### Scalar

Scalar là tool mới và rất hiện đại, được cộng đồng ưa thích:

```bash
npm install @scalar/nestjs-api-reference
```

```typescript
// src/main.ts
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Todo API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Expose spec
  app.use('/openapi.json', (req, res) => res.json(document));

  // Scalar UI
  app.use(
    '/reference',
    apiReference({
      theme: 'purple', // 'default' | 'moon' | 'purple' | 'solarized' | ...
      spec: { url: '/openapi.json' },
    }),
  );

  await app.listen(3000);
}
```

> 💡 **Khi nào dùng gì?**
> - **Swagger UI**: Internal tools, developer portal nội bộ, cần try-it-out
> - **Redoc**: Public API documentation, cần đẹp và dễ đọc
> - **Scalar**: Dự án mới, muốn UI hiện đại nhất

### Postman Integration

Bạn có thể import trực tiếp OpenAPI spec vào Postman:

1. Mở Postman → Import
2. Nhập URL: `http://localhost:3000/api-json`
3. Postman sẽ tự động tạo collection với tất cả endpoints

Hoặc generate Postman collection từ CLI:

```bash
# Cài tool
npm install -g openapi-to-postmanv2

# Convert
openapi2postmanv2 -s api-spec.json -o postman-collection.json -p
```

---

## 9. Best Practices & Standards

### Writing Good Descriptions

**❌ Mô tả tệ:**
```typescript
@ApiOperation({ summary: 'Get todo' })
```

**✅ Mô tả tốt:**
```typescript
@ApiOperation({
  summary: 'Lấy thông tin một todo theo ID',
  description: `
    Trả về chi tiết của một todo item dựa trên ID.

    **Lưu ý:**
    - Chỉ trả về todos của user hiện tại đang đăng nhập
    - Yêu cầu Bearer token hợp lệ
    - ID phải là số nguyên dương
  `,
})
```

**Nguyên tắc viết description:**
- `summary`: Ngắn gọn, dạng động từ, tối đa 10 từ
- `description`: Giải thích chi tiết hơn khi cần, hỗ trợ Markdown
- Luôn đề cập side effect nếu có (ví dụ: "Hành động này không thể hoàn tác")

### Consistency

Tạo convention và áp dụng nhất quán cho toàn project:

```typescript
// src/common/swagger/response-schemas.ts
// Định nghĩa các response schema tái sử dụng

export const SWAGGER_RESPONSES = {
  UNAUTHORIZED: {
    status: 401,
    description: 'Token không hợp lệ hoặc đã hết hạn',
  },
  FORBIDDEN: {
    status: 403,
    description: 'Bạn không có quyền thực hiện thao tác này',
  },
  NOT_FOUND: (entity: string) => ({
    status: 404,
    description: `Không tìm thấy ${entity}`,
  }),
  VALIDATION_FAILED: {
    status: 422,
    description: 'Dữ liệu không hợp lệ',
  },
};

// Sử dụng:
@ApiResponse(SWAGGER_RESPONSES.NOT_FOUND('todo'))
```

### Error Handling Docs

Mô tả rõ ràng error response giúp developer xử lý lỗi đúng cách:

```typescript
// src/common/dto/error-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorDto {
  @ApiProperty({ example: 422 })
  statusCode: number;

  @ApiProperty({
    example: ['title must not be empty', 'priority must be a valid enum value'],
    description: 'Danh sách lỗi validation cụ thể',
  })
  message: string[];

  @ApiProperty({ example: 'Unprocessable Entity' })
  error: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Thời điểm xảy ra lỗi (ISO 8601)',
  })
  timestamp: string;

  @ApiProperty({
    example: '/todos',
    description: 'Endpoint đã gọi',
  })
  path: string;
}
```

---

## 10. Testing & Validation

### Spec Validation

Đảm bảo OpenAPI spec của bạn hợp lệ bằng cách dùng tool:

```bash
# Cài Swagger CLI
npm install -g @apidevtools/swagger-cli

# Validate spec
swagger-cli validate api-spec.json
```

Hoặc tích hợp vào test:

```typescript
// test/swagger-spec.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import SwaggerParser from '@apidevtools/swagger-parser';

describe('Swagger Spec Validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('OpenAPI spec phải hợp lệ', async () => {
    const config = new DocumentBuilder()
      .setTitle('Test')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Sẽ throw nếu spec không hợp lệ
    await expect(
      SwaggerParser.validate(document as any)
    ).resolves.not.toThrow();
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### API Testing từ Swagger UI

Swagger UI có nút **"Try it out"** cho phép bạn test API trực tiếp từ trình duyệt:

1. Mở Swagger UI tại `/api-docs`
2. Click vào endpoint muốn test
3. Click **"Try it out"**
4. Điền tham số và request body
5. Click **"Execute"**
6. Xem response bên dưới

Để test endpoint yêu cầu authentication:
1. Click nút **"Authorize"** ở trên cùng (hình ổ khóa)
2. Nhập token vào ô `Bearer Token`
3. Click **"Authorize"** → **"Close"**
4. Bây giờ tất cả request sẽ tự động đính kèm token

### Mock Servers

Từ OpenAPI spec, bạn có thể tạo mock server để frontend dev làm việc độc lập:

```bash
# Cài Prism — mock server từ OpenAPI spec
npm install -g @stoplight/prism-cli

# Lưu spec ra file
curl http://localhost:3000/api-json -o api-spec.json

# Chạy mock server tại port 4010
prism mock api-spec.json

# Bây giờ frontend gọi http://localhost:4010/todos
# Prism tự động trả về dữ liệu dựa trên example trong spec
```

---

## 11. Bảo mật tài liệu API

### Authentication Required

Bảo vệ Swagger UI bằng HTTP Basic Auth:

```bash
npm install express-basic-auth
```

```typescript
// src/main.ts
import * as basicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Bảo vệ route /api-docs bằng Basic Auth
  app.use(
    ['/api-docs', '/api-docs-json'],
    basicAuth({
      challenge: true,
      users: {
        // Username: Password — nên lấy từ env
        [configService.get('SWAGGER_USER')]:
          configService.get('SWAGGER_PASS'),
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Todo API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
```

```env
# .env
SWAGGER_USER=admin
SWAGGER_PASS=super-secret-password-123
```

### Environment-based Access

```typescript
// Swagger chỉ hiện ở dev và staging, không phải production
const allowedEnvs = ['development', 'staging'];

if (allowedEnvs.includes(process.env.NODE_ENV)) {
  // Setup swagger...
}
```

### API Key Protection

Nếu bạn muốn developer bên ngoài truy cập nhưng cần key:

```typescript
// src/middleware/swagger-auth.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SwaggerAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-swagger-key'] || req.query['swagger-key'];
    const validKey = process.env.SWAGGER_API_KEY;

    if (apiKey !== validKey) {
      return res.status(403).json({ message: 'Forbidden: Invalid Swagger API Key' });
    }
    next();
  }
}

// Áp dụng trong AppModule:
consumer
  .apply(SwaggerAuthMiddleware)
  .forRoutes('/api-docs', '/api-json');
```

---

## 12. CI/CD & Deployment

### Auto-generation

Tự động generate và lưu spec file khi build:

```typescript
// scripts/generate-swagger.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { writeFileSync } from 'fs';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Todo API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Lưu ra file JSON
  writeFileSync('./swagger-spec.json', JSON.stringify(document, null, 2));

  // Lưu ra file YAML (cần cài js-yaml)
  // const yaml = require('js-yaml');
  // writeFileSync('./swagger-spec.yaml', yaml.dump(document));

  console.log('✅ Swagger spec generated: swagger-spec.json');
  await app.close();
}

generateSwagger();
```

```json
// package.json
{
  "scripts": {
    "swagger:generate": "ts-node scripts/generate-swagger.ts"
  }
}
```

### Documentation Deployment

Triển khai docs lên GitHub Pages hoặc static host:

```yaml
# .github/workflows/deploy-docs.yml
name: Deploy API Documentation

on:
  push:
    branches: [main]

jobs:
  deploy-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Generate Swagger spec
        run: npm run swagger:generate

      - name: Build Redoc static HTML
        run: |
          npx redoc-cli build swagger-spec.json \
            --title "Todo API Docs" \
            --output docs/index.html

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

### Versioning

Quản lý version của API spec:

```typescript
// src/main.ts
import { readFileSync } from 'fs';

// Lấy version từ package.json
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

const config = new DocumentBuilder()
  .setTitle('Todo API')
  .setVersion(packageJson.version)  // Đồng bộ với npm version
  .build();
```

```json
// package.json
{
  "version": "2.1.0",
  "scripts": {
    "version:patch": "npm version patch && npm run swagger:generate && git add swagger-spec.json",
    "version:minor": "npm version minor && npm run swagger:generate && git add swagger-spec.json",
    "version:major": "npm version major && npm run swagger:generate && git add swagger-spec.json"
  }
}
```
