# Lesson 14: Upload File với NestJS + Multer

## Phần 1: Kiến thức nền cần ôn trước khi học

### 1.1. `multipart/form-data` là gì?

Khi gửi dữ liệu JSON thông thường, request có `Content-Type: application/json` và body là một chuỗi JSON thuần túy. Nhưng **file không thể encode thành JSON** một cách hiệu quả (dữ liệu nhị phân, dung lượng lớn).

Vì vậy, khi cần gửi kèm file, trình duyệt/client sẽ dùng kiểu encode khác: `multipart/form-data`. Request body lúc này được chia thành nhiều **phần (part)**, mỗi phần ngăn cách bởi một `boundary` (chuỗi ký tự ngẫu nhiên), mỗi phần có thể là text field hoặc file:

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryABC123

------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="name"

Bàn phím cơ
------WebKitFormBoundaryABC123
Content-Disposition: form-data; name="image"; filename="keyboard.jpg"
Content-Type: image/jpeg

<dữ liệu nhị phân của file>
------WebKitFormBoundaryABC123--
```

**Điều học viên cần nhớ**: khi test API upload bằng Postman/curl, phải chọn đúng kiểu `form-data` (không phải `raw`/JSON), và field chứa file phải chọn type là `File`.

### 1.2. `Buffer` và `Stream` trong Node.js

Khi file được gửi lên server, dữ liệu đến dưới dạng **luồng nhị phân (binary stream)**. NestJS (thông qua Multer) sẽ xử lý luồng này theo 1 trong 2 cách:

- **Buffer**: toàn bộ nội dung file được gom lại thành một khối dữ liệu nhị phân nằm trong RAM (`file.buffer`)
- **Stream ghi trực tiếp ra ổ đĩa**: dữ liệu được ghi thẳng vào file trên disk trong lúc đang nhận, không giữ toàn bộ trong RAM (`file.path`)

Đây là 2 chiến lược lưu trữ khác nhau — sẽ học chi tiết ở Phần 3 (`memoryStorage` vs `diskStorage`).

### 1.3. Ôn nhanh Decorator, Pipe, Interceptor trong NestJS

Việc upload file trong NestJS sử dụng đồng thời 3 khái niệm sau — nếu chưa nhớ rõ, đây là lúc ôn lại và áp dụng thực tế:

| Khái niệm | Vai trò trong upload file |
|---|---|
| **Interceptor** | Chặn request *trước khi* vào Controller, dùng Multer để đọc và xử lý phần multipart, gắn file vào `request` |
| **Decorator** (`@UploadedFile()`) | Lấy file đã được Interceptor xử lý ra khỏi request, đưa vào tham số của method Controller |
| **Pipe** (`ParseFilePipe`) | Validate file (kích thước, loại file...) trước khi method Controller thực sự chạy logic |

> Đây chính là ví dụ thực tế sinh động nhất cho khái niệm Decorator và Pipe mà bạn đã học ở tài liệu TypeScript trước — không còn là lý thuyết trừu tượng nữa.

---

## Phần 2: Upload file cơ bản với Multer

NestJS không tự viết engine xử lý upload — nó dùng lại thư viện **Multer** (middleware upload phổ biến nhất của Express) và bọc lại dưới dạng Interceptor chuẩn NestJS.

### 2.1. Cài đặt

```bash
npm install @nestjs/platform-express multer
npm install -D @types/multer
```

- `@nestjs/platform-express`: cung cấp các Interceptor upload (`FileInterceptor`, `FilesInterceptor`...)
- `multer`: thư viện xử lý multipart thực sự, chạy phía dưới
- `@types/multer`: định nghĩa kiểu TypeScript cho `Express.Multer.File` — **bắt buộc cài** để có gợi ý kiểu chính xác, tránh phải dùng `any`

### 2.2. Các loại Interceptor cho upload

#### `FileInterceptor()` — upload đúng 1 file

Dùng khi form chỉ có **một field file duy nhất**.

```typescript
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('single')
  @UseInterceptors(FileInterceptor('file')) // 'file' phải khớp với tên field trong form-data
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
    return { message: 'Upload thành công' };
  }
}
```

#### `FilesInterceptor()` — upload nhiều file, cùng một field

Dùng khi người dùng chọn **nhiều file cùng lúc** cho cùng một field (ví dụ upload nhiều ảnh sản phẩm).

```typescript
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadedFiles } from '@nestjs/common';

@Post('multiple')
@UseInterceptors(FilesInterceptor('files', 5)) // 'files' = tên field, 5 = số lượng file tối đa
uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
  return { count: files.length };
}
```

#### `FileFieldsInterceptor()` — nhiều field khác nhau, mỗi field 1 loại file

Dùng khi form có **nhiều field file khác tên nhau**, ví dụ vừa upload avatar vừa upload ảnh giấy tờ định danh trong cùng một request.

```typescript
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Post('profile')
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
    { name: 'idCards', maxCount: 2 },
  ]),
)
uploadProfile(
  @UploadedFiles()
  files: { avatar?: Express.Multer.File[]; idCards?: Express.Multer.File[] },
) {
  return {
    avatar: files.avatar?.[0]?.originalname,
    idCards: files.idCards?.map((file) => file.originalname),
  };
}
```

#### `AnyFilesInterceptor()` — nhận file mà không cần biết trước tên field

Dùng trong trường hợp form động, tên field file không cố định trước.

```typescript
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Post('any')
@UseInterceptors(AnyFilesInterceptor())
uploadAny(@UploadedFiles() files: Express.Multer.File[]) {
  return { count: files.length };
}
```

**Bảng chọn nhanh Interceptor phù hợp**:

| Tình huống | Interceptor |
|---|---|
| 1 file, 1 field | `FileInterceptor` |
| Nhiều file, cùng field | `FilesInterceptor` |
| Nhiều field, mỗi field khác mục đích | `FileFieldsInterceptor` |
| Không biết trước tên field | `AnyFilesInterceptor` |

### 2.3. Cấu trúc object `Express.Multer.File`

Khi file được xử lý xong, `@UploadedFile()` trả về một object có cấu trúc:

```typescript
interface MulterFile {
  fieldname: string;      // tên field trong form ("file", "avatar"...)
  originalname: string;   // tên file gốc do người dùng upload (VD: "nice-photo.jpg")
  encoding: string;       // kiểu encode ("7bit"...)
  mimetype: string;       // MIME type do CLIENT khai báo (VD: "image/jpeg") — chưa đáng tin, học ở Phần 6
  size: number;           // dung lượng file tính bằng byte
  buffer?: Buffer;        // dữ liệu nhị phân, CHỈ CÓ khi dùng memoryStorage
  destination?: string;   // thư mục lưu, CHỈ CÓ khi dùng diskStorage
  filename?: string;      // tên file đã lưu trên disk, CHỈ CÓ khi dùng diskStorage
  path?: string;          // đường dẫn đầy đủ tới file trên disk, CHỈ CÓ khi dùng diskStorage
}
```

> Lưu ý quan trọng: `mimetype` trong object này là do **client tự khai báo trong request**, hoàn toàn có thể bị giả mạo — không nên dùng trực tiếp field này để quyết định file có an toàn hay không. Sẽ giải quyết kỹ ở Phần 6.

### 2.4. Demo upload đơn giản nhất — chỉ log ra, chưa lưu gì

```typescript
@Post('demo')
@UseInterceptors(FileInterceptor('file'))
demoUpload(@UploadedFile() file: Express.Multer.File) {
  console.log('Tên gốc:', file.originalname);
  console.log('Kích thước:', file.size, 'bytes');
  console.log('MIME type (client khai báo):', file.mimetype);
  return { message: 'Đã nhận file, chưa lưu trữ' };
}
```

> **Mục tiêu bước này**: giúp học viên "nhìn thấy" hình dạng thật của dữ liệu file trước khi học cách xử lý/lưu trữ nó — tránh việc học viên viết code lưu file mà không hiểu rõ mình đang thao tác với cái gì.

---

## Phần 3: Lưu trữ file

### 3.1. Lưu vào ổ đĩa local — `diskStorage`

`diskStorage` cấu hình Multer ghi file trực tiếp ra một thư mục trên server, không giữ toàn bộ nội dung file trong RAM.

```typescript
import { diskStorage } from 'multer';
import { extname } from 'path';

@Post('disk')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads', // thư mục lưu file
      filename: (req, file, callback) => {
        // Tự đặt tên file để tránh trùng lặp / ghi đè lẫn nhau
        const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = extname(file.originalname); // lấy đuôi file gốc, VD: ".jpg"
        callback(null, `${suffix}${ext}`);
      },
    }),
  }),
)
uploadToDisk(@UploadedFile() file: Express.Multer.File) {
  return { path: file.path, storedName: file.filename };
}
```

#### Tự động tạo thư mục nếu chưa tồn tại

Multer **không tự tạo thư mục** — nếu `./uploads` chưa tồn tại, upload sẽ báo lỗi. Cần tự đảm bảo thư mục tồn tại trước, ví dụ trong `main.ts` lúc khởi động ứng dụng:

```typescript
import { existsSync, mkdirSync } from 'fs';

const uploadDir = './uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}
```

### 3.2. Lưu trong bộ nhớ — `memoryStorage`

`memoryStorage` giữ toàn bộ nội dung file dưới dạng `Buffer` trong RAM (`file.buffer`), **không tự ghi ra disk**.

```typescript
import { memoryStorage } from 'multer';

@Post('memory')
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
  }),
)
uploadToMemory(@UploadedFile() file: Express.Multer.File) {
  console.log(file.buffer.length); // dữ liệu nhị phân đầy đủ, sẵn sàng xử lý tiếp
  return { message: 'File đang nằm trong RAM, chưa lưu vĩnh viễn ở đâu cả' };
}
```

**Khi nào dùng `memoryStorage`**:
- Cần xử lý file trước khi lưu (ví dụ: resize ảnh, nén file, kiểm tra magic number — học ở Phần 6)
- Sẽ đẩy file thẳng lên cloud storage (S3, Cloudinary...) — không cần giữ bản local trung gian

**So sánh nhanh disk vs memory**:

| Tiêu chí | `diskStorage` | `memoryStorage` |
|---|---|---|
| Nơi lưu tạm thời | Ổ đĩa | RAM |
| Rủi ro khi file lớn/nhiều request cùng lúc | Thấp hơn (không chiếm RAM) | **Cao** — có thể gây tràn RAM nếu không giới hạn kích thước file chặt chẽ |
| Xử lý file trước khi lưu vĩnh viễn (resize, kiểm tra nội dung...) | Khó hơn, phải đọc lại từ disk | Thuận tiện — dữ liệu đã có sẵn trong `buffer` |
| Phù hợp khi | Lưu trực tiếp trên server, không xử lý gì thêm | Cần xử lý/validate trước khi đẩy đi nơi khác |

> **Lưu ý quan trọng**: nếu dùng `memoryStorage`, **bắt buộc phải giới hạn kích thước file** (học ở Phần 4) thật chặt chẽ, vì mỗi request upload sẽ chiếm RAM tương ứng với dung lượng file — nhiều request cùng lúc với file lớn có thể làm sập server.

### 3.3. (Mở rộng) Upload lên Cloud Storage

Trong thực tế production, file thường **không lưu trực tiếp trên server ứng dụng** vì lý do:
- Server có thể scale ngang (nhiều instance) — file lưu local ở instance này sẽ không thấy được từ instance khác
- Cloud storage (AWS S3, Google Cloud Storage, Cloudinary...) có CDN, backup, khả năng mở rộng tốt hơn nhiều

Chiến lược phổ biến: dùng `memoryStorage` để nhận file vào `buffer`, validate xong (Phần 6), rồi dùng SDK tương ứng (`@aws-sdk/client-s3` chẳng hạn) để đẩy `buffer` đó lên cloud, cuối cùng chỉ lưu **URL/key** của file vào database.

> Phần này chỉ giới thiệu hướng mở rộng — không đi sâu cấu hình SDK cụ thể trong tài liệu này, vì mỗi cloud provider có cách cấu hình riêng.

---

## Phần 4: Validation cơ bản — Kích thước & Số lượng

### 4.1. Giới hạn dung lượng file bằng `limits.fileSize`

```typescript
@Post('limited')
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB, đơn vị byte
    },
  }),
)
uploadWithLimit(@UploadedFile() file: Express.Multer.File) {
  return { message: 'OK' };
}
```

Nếu file vượt quá giới hạn, Multer sẽ tự động chặn **trước khi** vào tới Controller, và ném ra lỗi `MulterError` với `code = 'LIMIT_FILE_SIZE'`.

### 4.2. Giới hạn số lượng file

Với `FilesInterceptor`, tham số thứ 2 chính là số lượng file tối đa:

```typescript
@UseInterceptors(FilesInterceptor('files', 5)) // tối đa 5 file
```

Ngoài ra có thể giới hạn thêm qua `limits.files`:

```typescript
@UseInterceptors(
  FilesInterceptor('files', 5, {
    limits: { files: 5, fileSize: 2 * 1024 * 1024 },
  }),
)
```

### 4.3. Bắt lỗi Multer, trả response thân thiện

Mặc định, khi Multer ném lỗi (`MulterError`), NestJS sẽ trả về response lỗi khá chung chung. Nên viết một **Exception Filter riêng** để bắt và định dạng lại lỗi này — liên hệ trực tiếp tới kiến thức Custom Error Class đã học trước đó.

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { MulterError } from 'multer';
import { Response } from 'express';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const errorMessages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'Dung lượng file vượt quá giới hạn cho phép',
      LIMIT_FILE_COUNT: 'Số lượng file vượt quá giới hạn cho phép',
      LIMIT_UNEXPECTED_FILE: 'Field file không hợp lệ',
    };

    response.status(400).json({
      statusCode: 400,
      message: errorMessages[exception.code] ?? 'Lỗi upload file',
      error: 'Bad Request',
    });
  }
}
```

Áp dụng filter này ở cấp Controller hoặc toàn cục (`app.useGlobalFilters()`).

---

## Phần 5: Validation Tên file (Filename)

### 5.1. Vì sao cần validate tên file

**Path Traversal Attack**: nếu server tin tưởng tuyệt đối vào `originalname` của file để đặt tên lưu trữ, kẻ tấn công có thể gửi tên file kiểu `../../../etc/passwd` hoặc chứa ký tự `/`, `\` nhằm ghi đè file ở vị trí ngoài ý muốn trên server.

```typescript
// NGUY HIỂM — không bao giờ làm thế này
filename: (req, file, callback) => {
  callback(null, file.originalname); // dùng thẳng tên gốc do client gửi lên
}
```

Ngoài rủi ro bảo mật, dùng thẳng tên gốc còn gây ra các vấn đề:
- Tên có ký tự đặc biệt (`?`, `*`, `:`, dấu tiếng Việt có dấu) có thể gây lỗi trên một số hệ điều hành/filesystem
- Hai người dùng upload file cùng tên → **ghi đè lẫn nhau** nếu không xử lý trùng tên
- Tên quá dài vượt giới hạn filesystem

### 5.2. Chiến lược đặt lại tên file an toàn

**Nguyên tắc**: **không bao giờ** dùng trực tiếp `originalname` để đặt tên file lưu trên server. Thay vào đó:
1. Sinh tên file mới bằng UUID hoặc timestamp + số ngẫu nhiên
2. Chỉ giữ lại **đuôi file (extension)** đã qua validate (học ở Phần 6) từ tên gốc
3. Lưu `originalname` (tên gốc do người dùng đặt) vào **database**, để khi cần hiển thị lại cho người dùng (ví dụ trong danh sách file đã upload) thì lấy từ database ra, không phải từ tên file thật trên server

```typescript
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

filename: (req, file, callback) => {
  const ext = extname(file.originalname).toLowerCase();
  const newFileName = `${uuidv4()}${ext}`; // VD: "8f14e45f-ceea-4d5c-b7ab-1e5f4d2b1a3c.jpg"
  callback(null, newFileName);
}
```

```typescript
// Khi lưu thông tin file vào database
await this.fileRepository.save({
  storedName: file.filename,      // "8f14e45f-....jpg" — dùng để tìm file thật trên server
  originalName: file.originalname, // "Ảnh đại diện của tôi.jpg" — dùng để hiển thị lại cho người dùng
  path: file.path,
  size: file.size,
});
```

### 5.3. Chuẩn hóa tên file (nếu vẫn cần giữ một phần tên gốc)

Một số hệ thống muốn giữ lại một phần tên gốc trong tên file lưu trữ (dễ debug hơn UUID thuần túy). Khi đó cần **chuẩn hóa (sanitize)** tên trước khi dùng:

```typescript
function sanitizeFileName(originalName: string): string {
  const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, ''); // bỏ đuôi file tạm thời
  return nameWithoutExtension
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/[^a-zA-Z0-9-_]/g, '-') // thay ký tự không hợp lệ bằng dấu gạch ngang
    .replace(/-+/g, '-') // gộp nhiều dấu gạch ngang liên tiếp
    .toLowerCase()
    .slice(0, 100); // giới hạn độ dài
}

// "My Profile Photo (new).png" -> "my-profile-photo-new"
```

> **Khuyến nghị sư phạm**: nên dạy học viên theo hướng **kết hợp cả 2** — dùng UUID làm phần chính đảm bảo không trùng/không có rủi ro bảo mật, có thể ghép thêm phần tên đã chuẩn hóa nếu muốn dễ nhận diện: `${sanitizeFileName(file.originalname)}-${uuidv4()}${ext}`.

---

## Phần 6: Validation Extension & MIME Type — Trọng tâm chính

### 6.1. Vì sao chỉ kiểm tra extension là chưa đủ

Có 3 "nguồn thông tin" khác nhau để xác định loại file, với độ tin cậy khác nhau:

| Nguồn thông tin | Ai quyết định | Độ tin cậy |
|---|---|---|
| Extension (đuôi file, VD `.jpg`) | Client tự đặt tên file, hoàn toàn có thể đổi tùy ý | **Thấp** |
| MIME type (`file.mimetype`, VD `image/jpeg`) | Client tự khai báo trong request | **Thấp — dễ giả mạo** |
| Magic Number (chữ ký nhị phân ở đầu file) | Do chính nội dung thật của file quyết định | **Cao — khó giả mạo** |

Kẻ tấn công hoàn toàn có thể lấy một file `.php` hoặc `.exe` độc hại, đổi đuôi thành `.jpg`, đồng thời sửa `Content-Type` trong request thành `image/jpeg` — nếu server chỉ kiểm tra 2 nguồn thông tin đầu, file độc hại vẫn lọt qua.

> **Magic Number (File Signature)** là vài byte đầu tiên cố định của một định dạng file, do chính cấu trúc file quy định — ví dụ file PNG luôn bắt đầu bằng byte `89 50 4E 47`, file JPEG luôn bắt đầu bằng `FF D8 FF`. Đây là thông tin **không thể giả mạo bằng cách đổi tên file**, vì nó nằm trong chính nội dung nhị phân của file.

### 6.2. Viết custom `fileFilter` trong cấu hình Multer

`fileFilter` là một hàm chạy **trước khi** Multer lưu file, dùng để chấp nhận hoặc từ chối file dựa trên thông tin có sẵn (extension, mimetype).

#### Whitelist extension (nên dùng whitelist, tránh blacklist)

```typescript
import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

@UseInterceptors(
  FileInterceptor('file', {
    fileFilter: (req, file, callback) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return callback(
          new BadRequestException(`Chỉ chấp nhận các định dạng: ${ALLOWED_EXTENSIONS.join(', ')}`),
          false,
        );
      }
      callback(null, true);
    },
  }),
)
```

> **Vì sao ưu tiên whitelist thay vì blacklist?** Blacklist (liệt kê những gì bị cấm, VD chặn `.exe`, `.php`...) sẽ luôn thiếu sót vì không thể liệt kê hết mọi định dạng nguy hiểm hiện có và tương lai. Whitelist (chỉ liệt kê những gì được phép) an toàn hơn nhiều vì mặc định chặn tất cả, chỉ mở cho những gì đã xác nhận an toàn.

#### Kết hợp thêm whitelist MIME type

```typescript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

fileFilter: (req, file, callback) => {
  const ext = extname(file.originalname).toLowerCase();
  const isValidExtension = ALLOWED_EXTENSIONS.includes(ext);
  const isValidMimeType = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (!isValidExtension || !isValidMimeType) {
    return callback(new BadRequestException('Định dạng file không hợp lệ'), false);
  }
  callback(null, true);
}
```

> Kiểm tra cả 2 giúp chặn được các trường hợp đơn giản (đổi đuôi mà quên đổi mimetype hoặc ngược lại), nhưng **vẫn chưa đủ an toàn tuyệt đối** — vì cả 2 đều do client khai báo. Bước tiếp theo (6.4) mới là bước kiểm tra thực chất.

### 6.3. Viết Custom Validation Pipe cho file — `ParseFilePipe`

NestJS cung cấp sẵn `ParseFilePipe` — một Pipe chuyên dùng để validate file **sau khi** đã qua Interceptor, cho phép kết hợp nhiều `FileValidator` khác nhau.

#### Dùng các Validator có sẵn

```typescript
import {
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';

@Post('validated')
@UseInterceptors(FileInterceptor('file'))
uploadValidated(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
        new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return { message: 'File hợp lệ' };
}
```

Nếu bất kỳ validator nào thất bại, `ParseFilePipe` tự động ném `BadRequestException` với thông báo lỗi rõ ràng — không cần tự viết try/catch.

> **Lưu ý về `FileTypeValidator`**: mặc định validator này kiểm tra dựa trên `file.mimetype` (do client khai báo) — **vẫn chưa phải kiểm tra magic number thực sự**. Một số phiên bản NestJS mới hỗ trợ tùy chọn `skipMagicNumbersValidation: false` để bật kiểm tra magic number tích hợp sẵn; nếu phiên bản đang dùng chưa hỗ trợ, cần tự viết Validator riêng như mục 6.4.

#### Tự viết Custom `FileValidator`

Khi cần logic đặc thù (ví dụ kiểm tra tỉ lệ khung hình ảnh, số trang PDF...), tự viết Validator riêng bằng cách kế thừa `FileValidator` — đây là ví dụ áp dụng trực tiếp kiến thức **Abstract Class / kế thừa** đã học ở tài liệu TypeScript trước.

```typescript
import { FileValidator } from '@nestjs/common';

interface MinFileSizeOptions {
  minSize: number;
}

export class MinFileSizeValidator extends FileValidator<MinFileSizeOptions> {
  isValid(file: Express.Multer.File): boolean {
    return file.size >= this.validationOptions.minSize;
  }

  buildErrorMessage(): string {
    return `File phải có dung lượng tối thiểu ${this.validationOptions.minSize} bytes`;
  }
}
```

```typescript
new ParseFilePipe({
  validators: [
    new MinFileSizeValidator({ minSize: 1024 }), // ít nhất 1KB, tránh file rỗng/hỏng
  ],
})
```

### 6.4. Kiểm tra thực chất bằng Magic Number

Đây là bước quan trọng nhất để đảm bảo file **thực sự** là loại được khai báo, không phụ thuộc vào extension hay mimetype do client gửi lên.

#### Cài đặt thư viện đọc magic number

```bash
npm install file-type
```

#### Viết Validator kiểm tra magic number

```typescript
import { FileValidator } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

interface MagicNumberOptions {
  allowedMimeTypes: string[]; // VD: ['image/jpeg', 'image/png', 'image/webp']
}

export class MagicNumberFileValidator extends FileValidator<MagicNumberOptions> {
  private detectedMimeType: string | undefined;

  async isValid(file: Express.Multer.File): Promise<boolean> {
    // Yêu cầu file phải nằm trong buffer (dùng memoryStorage) để đọc được nội dung nhị phân
    const detectedFileType = await fileTypeFromBuffer(file.buffer);
    this.detectedMimeType = detectedFileType?.mime;

    if (!detectedFileType) return false; // không nhận diện được -> nghi ngờ, từ chối
    return this.validationOptions.allowedMimeTypes.includes(detectedFileType.mime);
  }

  buildErrorMessage(): string {
    return `Nội dung file thực tế (${this.detectedMimeType ?? 'không xác định'}) không khớp với định dạng cho phép`;
  }
}
```

```typescript
@Post('magic-number')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
uploadWithMagicNumberCheck(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MagicNumberFileValidator({
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return { message: 'File đã được xác minh thực chất bằng magic number' };
}
```

#### Demo minh họa cho học viên

Cho học viên tự tay thử tấn công hệ thống của chính mình để thấy rõ giá trị của bước này:
1. Lấy một file bất kỳ không phải ảnh (ví dụ file `.txt` hoặc `.exe` giả lập)
2. Đổi đuôi file thành `.jpg`
3. Upload lên API chỉ có validate extension + mimetype (mục 6.2/6.3) → **upload thành công** vì client tự khai extension/mimetype là ảnh
4. Upload lên API có thêm `MagicNumberFileValidator` (mục 6.4) → **bị từ chối**, vì nội dung nhị phân thật sự không phải là ảnh

> Đây là bài demo rất hiệu quả để học viên hiểu ngay lập tức "tại sao không được tin extension/mimetype" mà không cần giải thích dài dòng.

### 6.5. Kết hợp thành một Pipeline Validation hoàn chỉnh

Thứ tự kiểm tra đề xuất, từ rẻ/nhanh tới đắt/chậm (fail sớm để tiết kiệm tài nguyên xử lý):

```
1. Kích thước file (rẻ nhất, kiểm tra ngay ở fileFilter/limits)
        ↓
2. Extension whitelist (rẻ, chỉ so sánh chuỗi)
        ↓
3. MIME type whitelist (rẻ, chỉ so sánh chuỗi)
        ↓
4. Magic Number thực tế (tốn chi phí đọc buffer, nên đặt sau cùng)
        ↓
5. Chuẩn hóa & sinh tên file an toàn (Phần 5)
        ↓
6. Lưu trữ (Phần 3)
```

```typescript
@Post('complete')
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(), // dùng memory để có buffer cho bước kiểm tra magic number
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return callback(new BadRequestException('Sai định dạng file'), false);
      }
      callback(null, true);
    },
  }),
)
async uploadComplete(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
        new MagicNumberFileValidator({
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  const ext = extname(file.originalname).toLowerCase();
  const storedName = `${uuidv4()}${ext}`;

  // Ghi buffer ra disk (hoặc đẩy lên cloud) sau khi đã validate xong hoàn toàn
  await writeFile(`./uploads/${storedName}`, file.buffer);

  return {
    originalName: file.originalname,
    storedName,
    size: file.size,
  };
}
```

---

## Phần 7: Xử lý lỗi & Trả response chuẩn

### 7.1. Custom Exception Filter cho lỗi upload

Liên hệ trực tiếp tới **Custom Error Class** đã học ở tài liệu TypeScript trước: NestJS xử lý lỗi upload theo đúng cơ chế `instanceof` + Exception Filter đã học.

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

@Catch(HttpException, MulterError)
export class UploadExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException | MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof MulterError) {
      return response.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: this.translateMulterError(exception.code),
      });
    }

    const status = exception.getStatus();
    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }

  private translateMulterError(code: string): string {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'Dung lượng file vượt quá giới hạn cho phép',
      LIMIT_FILE_COUNT: 'Số lượng file vượt quá giới hạn cho phép',
      LIMIT_UNEXPECTED_FILE: 'Field file không đúng quy định',
    };
    return messages[code] ?? 'Lỗi xử lý file upload';
  }
}
```

### 7.2. Format response lỗi rõ ràng cho từng trường hợp

**Nguyên tắc**: response lỗi nên đủ rõ để client biết chính xác cần sửa gì, nhưng **không tiết lộ thông tin nhạy cảm về hệ thống** (ví dụ không nên trả nguyên `error.stack` cho client production).

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Chỉ chấp nhận các định dạng: .jpg, .jpeg, .png, .webp"
}
```

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Dung lượng file vượt quá giới hạn cho phép (tối đa 2MB)"
}
```
