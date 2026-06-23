

## 4. Handling Responses

Khi xây dựng API, việc quản lý requests và responses một cách nhất quán và có cấu trúc là rất quan trọng. Điều này giúp cải thiện trải nghiệm người dùng, dễ dàng mở rộng và bảo trì mã nguồn.

### 4.1. Vấn đề cân giải quyết

Khi một dự án có **nhiều endpoints**, **nhiều người** phát triển, việc đảm bảo rằng tất cả responses đều có cấu trúc giống nhau có thể trở nên khó khăn. Một số vấn đề phổ biến bao gồm:

- **Inconsistent Response Formats:** Các endpoints trả về các cấu trúc response
khác nhau, gây khó khăn cho client khi xử lý dữ liệu.
- **Lack of Metadata:** Thiếu thông tin bổ sung như status codes, messages, timestamps, pagination info.
- **Error Handling:** Không có cách chuẩn để trả về lỗi, dẫn đến việc client không thể xử lý lỗi một cách hiệu quả.

Ví dụ về response không nhất quán:

Endpoint A trả về:

```json
{
  "id": 1,
  "title": "Clean Code",
  "description": "A handbook...",
  "pages": 464,
  "genres": ["Programming"]
}
```

Trong khi Endpoint B trả về:

```json
{
  "data": {
    "id": 2,
    "title": "The Pragmatic Programmer",
    "description": "Your journey to mastery...",
    "pages": 352,
    "genres": ["Programming"]
  },
  "message": "Book retrieved successfully"
}
```

Điều này gây khó khăn cho client khi phải xử lý các định dạng khác nhau.

=> Giải pháp là áp dụng một **response format chuẩn** cho tất cả các endpoints, bao gồm các thông tin như status code, message, data, và metadata khác nếu cần thiết.

### 4.2. Transform Response

`Interceptor` trong NestJS cho phép bạn can thiệp vào quá trình xử lý request-response. Bạn có thể sử dụng interceptor để **transform** response từ controller trước khi gửi về client, đảm bảo rằng tất cả responses đều tuân theo một cấu trúc nhất quán.

**Sử dụng Interceptor để transform response:**

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        message: data?.message || 'Request successful',
        data: data?.data || data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

**Áp dụng global:**

Giúp đảm bảo tất cả responses đều được transform.

```typescript
// src/main.ts
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

app.useGlobalInterceptors(new TransformInterceptor());
```

**Response trước khi transform:**

```json
{
  "id": 1,
  "title": "Clean Code",
  "description": "A handbook...",
  "pages": 464,
  "genres": ["Programming"]
}
```

**Response sau khi transform:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "id": 1,
    "title": "Clean Code",
    "description": "A handbook...",
    "pages": 464,
    "genres": ["Programming"]
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### 4.3. Custom Response Format

Trên đây là format response chung. Tuy nhiên, trong nhiều trường hợp, bạn muốn có các định dạng response tùy chỉnh hơn theo rule riêng của dự án.

Bạn có thể tạo các **Response DTOs** để định nghĩa cấu trúc response cho từng trường hợp cụ thể như:

**Tạo Response DTO:**

```typescript
// src/common/dto/response.dto.ts
export class PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class PaginatedResponseDto<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
  message?: string;
  timestamp: string;

  constructor(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string,
  ) {
    this.success = true;
    this.data = data;
    this.message = message || 'Success';
    this.timestamp = new Date().toISOString();

    const totalPages = Math.ceil(total / limit);

    this.meta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}

export class ApiResponseDto<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;

  constructor(data: T, message?: string) {
    this.success = true;
    this.data = data;
    this.message = message || 'Success';
    this.timestamp = new Date().toISOString();
  }
}
```

**BookService trả về dữ liệu:**

```typescript
// src/books/books.service.ts
// Giả sử phương thức findAll trả về dữ liệu với pagination
findAll(filterDto?: FilterBooksDto) {
  // ...logic lọc và phân trang
  return {
    data: paginatedResult,
    meta: {
      page,
      limit,
      total: result.length,
      totalPages: Math.ceil(result.length / limit),
    },
  };
}
```

**Sử dụng trong Book Controller:**

```typescript
// src/books/books.controller.ts
import { PaginatedResponseDto, ApiResponseDto } from '../common/dto/response.dto';
import { BookEntity } from './entities/book.entity';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll(@Query() filterDto: FilterBooksDto) {
    const result = this.booksService.findAll(filterDto);

    const books = result.data.map(book => new BookEntity(book));

    return new PaginatedResponseDto(
      books,
      result.meta.page,
      result.meta.limit,
      result.meta.total,
      'Lấy danh sách sách thành công',
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const book = this.booksService.findOne(id);
    return new ApiResponseDto(
      new BookEntity(book),
      'Lấy thông tin sách thành công',
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createBookDto: CreateBookDto) {
    const book = this.booksService.create(createBookDto);
    return new ApiResponseDto(
      new BookEntity(book),
      'Tạo sách mới thành công',
    );
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    const book = this.booksService.update(id, updateBookDto);
    return new ApiResponseDto(
      new BookEntity(book),
      'Cập nhật sách thành công',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    this.booksService.remove(id);
  }
}
```

**Response mẫu cho GET /books:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Clean Code",
      "description": "A handbook of agile software craftsmanship",
      "pages": 464,
      "genres": ["Programming", "Software Engineering"],
      "createdAt": "2024-01-20T10:00:00.000Z",
      "updatedAt": "2024-01-20T10:00:00.000Z",
      "summary": "Clean Code - 464 trang"
    },
    {
      "id": 2,
      "title": "The Pragmatic Programmer",
      "description": "Your journey to mastery",
      "pages": 352,
      "genres": ["Programming"],
      "createdAt": "2024-01-20T10:05:00.000Z",
      "updatedAt": "2024-01-20T10:05:00.000Z",
      "summary": "The Pragmatic Programmer - 352 trang"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "message": "Lấy danh sách sách thành công",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### 4.4. Best Practices cho Response Handling

- **Consistency is Key:** Đảm bảo tất cả endpoints trả về response theo cùng một cấu trúc.
- **Use DTOs for Responses:** Sử dụng Data Transfer Objects (DTOs) để định nghĩa cấu trúc response rõ ràng và `chỉ trả về những fields cần thiết`.
- **Leverage Interceptors:** Sử dụng interceptors để tự động transform responses.
- **Include Metadata:** Cung cấp thông tin bổ sung như pagination, timestamps để hỗ trợ client.
- **Handle Errors Gracefully:** Sử dụng exception filters để trả về lỗi một cách nhất quán và có cấu trúc.
- **Only Expose Necessary Data:** Sử dụng serialization để `loại bỏ các fields nhạy cảm` khỏi response.

Ví dụ khi bạn cần trả về thông tin chi tiết của một cuốn sách thì cần tạo một `Response DTO` riêng:

```typescript
// src/books/dto/book-detail-response.dto.ts
import { Exclude, Expose, Transform } from 'class-transformer';
@Exclude()
export class BookDetailResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  pages: number;

  @Expose()
  genres: string[];

  @Expose()
  isbn?: string;

  @Expose()
  publishedYear?: number;

  @Expose()
  @Transform(({ value }) => value.toISOString())
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value.toISOString())
  updatedAt: Date;

  @Expose()
  get summary(): string {
    return `${this.title} - ${this.pages} trang`;
  }

  @Expose()
  additionalInfo: string; // Thông tin chi tiết bổ sung

  constructor(partial: Partial<BookDetailResponseDto>) {
    Object.assign(this, partial);
  }
}
```

Vì trên UI bạn cần hiển thị thêm thông tin chi tiết về sách, nên bạn tạo một DTO riêng để phục vụ cho mục đích này.

Còn trên UI về Quản lý Danh Sách Books bạn chỉ cần hiển thị các thông tin cơ bản, nên bạn sử dụng `Response DTO` riêng cho mục đích đó.

```typescript
// src/books/dto/book-list-response.dto.ts
import { Exclude, Expose, Transform } from 'class-transformer';
@Exclude()
export class BookListResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  @Transform(({ value }) => value.toISOString())
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value.toISOString())
  updatedAt: Date;

  constructor(partial: Partial<BookListResponseDto>) {
    Object.assign(this, partial);
  }
}
```
