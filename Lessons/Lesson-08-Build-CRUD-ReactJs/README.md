# Lesson 07 – Consume NestJS REST API với ReactJS (CRUD)

> Mini project: vận dụng API đã xây dựng ở Lesson 04-07 vào một frontend ReactJS thật.

## Mục tiêu bài học

* Chuẩn hóa response format của API bằng Interceptor và Exception Filter, để frontend luôn nhận được đúng một cấu trúc response duy nhất (dù thành công hay lỗi)
* Hiểu cách frontend làm việc với REST API
* Dựng được một ứng dụng ReactJS gọi API NestJS, hiển thị và thao tác CRUD trên dữ liệu thật từ backend

## Ôn tập nhanh buổi trước

Từ Lesson 04 đến 07, chúng ta đã xây xong các endpoint CRUD với TypeORM (Entity, Repository, DTO, Validation, Migrations). Vấn đề còn lại: mỗi endpoint hiện trả về response theo một hình dạng khác nhau tùy người viết (có nơi trả object trực tiếp, có nơi bọc thêm `message`), và khi có lỗi thì NestJS mặc định trả về một cấu trúc lỗi khác hẳn cấu trúc thành công. Bài này giải quyết đúng vấn đề đó trước khi bắt tay code phần frontend.

## 1. Chuẩn hóa response format

### 1.1. Vì sao cần chuẩn hóa response format?

Khi frontend gọi API, nó cần biết **chắc chắn** response sẽ luôn có hình dạng nào để viết code xử lý dùng chung (ví dụ một hàm `apiClient` xử lý mọi response, không cần viết riêng cho từng endpoint). Nếu mỗi endpoint trả response một kiểu khác nhau — có nơi trả thẳng object, có nơi bọc trong `{ data: ... }` — code frontend sẽ phải xử lý từng trường hợp riêng lẻ, rất dễ phát sinh lỗi khi có endpoint mới. Ta cần **một cấu trúc chung** cho *mọi response thành công*, và **một cấu trúc chung khác** cho *mọi response lỗi*.

### 1.2. Interceptor là gì?

**Interceptor** là một class implement `NestInterceptor`, đứng ở giữa lúc handler (method controller) xử lý xong và lúc response thực sự được gửi về client. Interceptor có thể **đọc và biến đổi (transform)** giá trị mà handler trả về, trước khi Express/Fastify gửi nó ra ngoài — tương tự middleware nhưng nằm sau khi handler đã chạy xong.

```typescript
// Interceptor "bọc" mọi response thành công vào một cấu trúc chung
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: context.switchToHttp().getResponse().statusCode,
        data,
      })),
    );
  }
}
```

Đăng ký global trong `main.ts` (`app.useGlobalInterceptors(new TransformInterceptor())`) để áp dụng cho **mọi controller**, không cần sửa lại từng endpoint. Xem ví dụ đầy đủ và các biến thể (pagination metadata, response DTO riêng cho từng use case) tại [Response Structure](./response.md).

### 1.3. Exception Filter là gì?

**Exception Filter** là cơ chế xử lý lỗi tập trung của NestJS: khi bất kỳ đâu trong ứng dụng (Controller, Service, Guard, Pipe...) `throw` một exception, NestJS sẽ bắt lỗi đó và chuyển cho Exception Filter xử lý trước khi trả response về client — thay vì để lỗi rơi thẳng ra ngoài với stack trace không có cấu trúc.

Mặc định, NestJS đã có sẵn một `ExceptionFilter` toàn cục xử lý các lớp lỗi kế thừa từ `HttpException` (`NotFoundException`, `BadRequestException`... đã học ở Lesson 05). Nhưng cấu trúc lỗi mặc định đó (`{ statusCode, message, error }`) chưa chắc khớp với cấu trúc response thành công ở mục 1.2 — vì vậy ta viết một **Exception Filter tùy chỉnh** để mọi lỗi cũng được bọc theo đúng "hình dạng" giống response thành công.

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch() // không truyền tham số = bắt TẤT CẢ loại exception, kể cả lỗi không lường trước
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

```typescript
// src/main.ts
app.useGlobalFilters(new HttpExceptionFilter());
```

### 1.4. Kết quả: một cấu trúc response duy nhất

| | Thành công | Lỗi |
|---|---|---|
| Cơ chế | `TransformInterceptor` | `HttpExceptionFilter` |
| Ví dụ response | `{ success: true, statusCode: 200, data: {...} }` | `{ success: false, statusCode: 404, message: "Không tìm thấy" }` |

Nhờ vậy, frontend chỉ cần viết **một** hàm xử lý response chung, dựa trên field `success` để biết đi theo nhánh thành công hay lỗi — đây chính là nền tảng cho phần "Xử lý lỗi API" ở mục 4 bên dưới.

---

## 2. Init dự án ReactJS (phục vụ demo API)

* Khởi tạo ReactJS bằng Vite
* Cấu trúc tối thiểu cho CRUD
* Các package cần thiết
  * React Router v7
  * Axios + Axios Instance + interceptors
  * React Query
  * Shadcn UI
  * React Hook Form + Zod
  * Zustand

## 3. Kết nối ReactJS với API NestJS

* Client – Server trong REST API
* Axios instance
* Service layer gọi API

## 4. Xây dựng giao diện CRUD

* Hiển thị danh sách dữ liệu
* Thêm mới dữ liệu
* Xóa dữ liệu
* Chỉnh sửa dữ liệu
* Loading & Error state
* Alert / Notification — đọc field `success`/`message` từ response đã chuẩn hóa ở mục 1 để hiển thị thông báo phù hợp

---

## Common mistakes — lỗi người mới hay gặp

1. **Chỉ viết Interceptor cho response thành công, quên Exception Filter cho lỗi**: kết quả là response thành công có cấu trúc `{ success, data }` nhưng response lỗi vẫn là cấu trúc mặc định của NestJS — frontend phải viết 2 nhánh xử lý khác nhau, mất hết ý nghĩa của việc chuẩn hóa.
2. **Đăng ký Interceptor/Filter ở cấp controller thay vì global**: dễ quên áp dụng cho controller mới tạo sau này. Nên đăng ký `app.useGlobalInterceptors()`/`app.useGlobalFilters()` một lần trong `main.ts`.
3. **Gọi API trực tiếp bằng `fetch`/`axios` rải rác trong từng component**: khó bảo trì khi cần đổi base URL hoặc thêm header chung (token). Nên tập trung vào một service layer/axios instance duy nhất.
4. **Không xử lý loading/error state**: UI "đứng hình" không phản hồi gì trong lúc chờ API, hoặc crash trắng trang khi API lỗi vì không có bước kiểm tra `success === false`.

## Bài tập thực hành trên lớp

**Đề bài**:
1. Viết `TransformInterceptor` và `HttpExceptionFilter` theo đúng mục 1, áp dụng global cho project `books` API đã xây ở Lesson 06-07.
2. Khởi tạo project ReactJS bằng Vite, cài Axios, tạo một axios instance dùng chung.
3. Xây trang danh sách sách (gọi `GET /books`), có xử lý loading/error dựa trên field `success`.
4. Thêm form tạo mới và xóa sách, cập nhật lại danh sách sau khi thao tác thành công.

**Gợi ý hướng giải**: viết và test 2 file `TransformInterceptor`/`HttpExceptionFilter` bằng Postman trước để chắc chắn response đã đúng cấu trúc, rồi mới bắt đầu code phần React — tránh vừa sửa backend vừa debug frontend cùng lúc.

## Homework

- [ ] Thêm trang chỉnh sửa sách (form pre-fill dữ liệu cũ, gọi `PATCH /books/:id`).
- [ ] Thêm Alert/Notification (toast) hiển thị đúng `message` trả về từ API khi thao tác thành công hoặc thất bại.
- [ ] (Nâng cao) Viết thêm 1 Exception Filter riêng chỉ bắt riêng lỗi từ TypeORM (ví dụ vi phạm unique constraint) và trả về message thân thiện hơn thay vì lỗi SQL thô.

## Câu hỏi ôn tập

1. Interceptor và Exception Filter khác nhau ở điểm nào trong vòng đời một request?
2. Vì sao nên đăng ký Interceptor/Exception Filter ở cấp global thay vì từng controller?
3. Nếu không chuẩn hóa response, frontend sẽ gặp khó khăn gì khi số lượng endpoint tăng lên?
4. `@Catch()` không truyền tham số nghĩa là gì? Vì sao Exception Filter tùy chỉnh nên bắt cả lỗi không phải `HttpException`?
