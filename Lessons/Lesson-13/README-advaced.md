# Lesson 13 — Upload & Streaming Files & Send Email trong NestJS

## 1.1 Tại sao cần Upload File?

Hầu hết ứng dụng web thực tế đều cần xử lý file. Hãy nghĩ đến những tính năng quen thuộc:

| Use Case | Ví dụ thực tế |
|---|---|
| **User Avatars** | Người dùng đổi ảnh đại diện trên Facebook, Zalo |
| **Documents / Attachments** | Gửi file PDF hợp đồng qua email trong app |
| **Media Content** | Upload video bài giảng lên hệ thống LMS |
| **Data Imports** | Import danh sách học sinh từ file Excel |

**Điểm mấu chốt cần hiểu:** File không thể gửi qua JSON thông thường. Khi bạn gửi `{ "name": "avatar.png" }` thì đó chỉ là chuỗi text — server không nhận được dữ liệu thực của file. Ta cần một cơ chế khác: **Multipart Form Data**.

---

## 1.2 HTTP Multipart Form Data

### Multipart/form-data là gì?

Khi browser hoặc client muốn gửi file lên server, nó sử dụng encoding type đặc biệt là `multipart/form-data`. Đây là một chuẩn HTTP cho phép gửi nhiều "phần" (parts) dữ liệu trong một request duy nhất — mỗi part có thể là text hoặc binary (file).

**Cấu trúc của một Multipart Request:**

```
POST /upload HTTP/1.1
Host: example.com
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="username"

nguyen_van_a
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="avatar"; filename="photo.jpg"
Content-Type: image/jpeg

[Binary data của file ảnh ở đây]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Giải thích từng phần:**
- `boundary`: Chuỗi ngẫu nhiên dùng để ngăn cách các "part" với nhau
- Mỗi part có `Content-Disposition` khai báo tên field và (nếu là file) tên file gốc
- Phần cuối có `--` để đánh dấu kết thúc

### Form Data vs JSON — Khi nào dùng cái nào?

Đây là câu hỏi mà nhiều bạn mới hay nhầm lẫn:

```
✅ Dùng JSON khi:
   - Gửi dữ liệu thuần text (login, register, update profile text)
   - API thuần REST không có file

✅ Dùng multipart/form-data khi:
   - Upload file (ảnh, video, PDF, Excel...)
   - Gửi MIX: vừa có file vừa có text trong cùng một request
     (Ví dụ: upload ảnh + caption + tags cùng lúc)

❌ Đừng dùng JSON để gửi file:
   - Kỹ thuật base64 encode file vào JSON tồn tại nhưng rất kém hiệu quả
   - File 1MB sau khi base64 → ~1.37MB, tốn bandwidth & memory
```

---



## 2.1 Upload File với Multer

### Multer là gì?

**Multer** là một Node.js middleware chuyên xử lý `multipart/form-data`. NestJS tích hợp sẵn Multer thông qua `@nestjs/platform-express`.

**Tại sao cần Multer?**

Khi một request multipart đến server, Express (và NestJS) mặc định **không** parse phần file — `req.file` sẽ là `undefined`. Multer đứng giữa, đọc binary stream, lưu file vào disk hoặc memory, rồi đính kèm metadata vào `req.file` để controller sử dụng.

```
Client Request (multipart)
        ↓
   [Multer Middleware]
   - Parse boundary
   - Validate file type/size
   - Lưu file vào disk/memory
        ↓
   Controller nhận được:
   req.file = { fieldname, originalname, size, path, ... }
```

### Cài đặt Dependencies

```bash
# Dùng Express platform (mặc định của NestJS)
npm install @nestjs/platform-express multer
npm install -D @types/multer

# Nếu dùng Fastify platform (ít phổ biến hơn)
npm install @fastify/multipart
```

> **Lưu ý:** Nếu bạn tạo project NestJS mới bằng `@nestjs/cli`, `@nestjs/platform-express` đã được cài sẵn. Chỉ cần cài thêm `multer` và `@types/multer`.

---

## 2.2 Basic File Upload

### Single File Upload — Upload một file duy nhất

Đây là use case đơn giản nhất: user upload một file (ví dụ: ảnh đại diện).

**Bước 1: Tạo Upload Controller**

```typescript
// upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar')) // 'avatar' = tên field trong form-data
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log(file);
    return {
      message: 'Upload thành công!',
      filename: file.originalname,
      size: file.size,
      path: file.path,
    };
  }
}
```

**Giải thích từng dòng:**

- `@UseInterceptors(FileInterceptor('avatar'))`: Gắn Multer vào route này. Tham số `'avatar'` phải khớp với tên field trong form-data của client.
- `@UploadedFile()`: Decorator để inject đối tượng file từ request vào tham số.
- `Express.Multer.File`: Kiểu TypeScript của đối tượng file, gồm các property:

```typescript
// Cấu trúc của Express.Multer.File
{
  fieldname: 'avatar',           // Tên field trong form
  originalname: 'photo.jpg',     // Tên file gốc từ client
  encoding: '7bit',
  mimetype: 'image/jpeg',        // MIME type
  destination: './uploads',      // Thư mục lưu (disk storage)
  filename: 'avatar-1234567890', // Tên file đã lưu trên server
  path: 'uploads/avatar-123...',  // Đường dẫn đầy đủ
  size: 204800,                  // Kích thước tính bằng bytes
}
```

**Bước 2: Đăng ký Module**

```typescript
// upload.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
})
export class UploadModule {}
```

**Test với curl:**

```bash
curl -X POST http://localhost:3000/upload/avatar \
  -F "avatar=@/path/to/photo.jpg"
```

### Multiple Files Upload — Upload nhiều file

NestJS/Multer cung cấp 3 interceptor cho trường hợp nhiều file:

#### `FilesInterceptor` — Nhiều file trên cùng một field

```typescript
import { FilesInterceptor } from '@nestjs/platform-express';

@Post('photos')
@UseInterceptors(FilesInterceptor('photos', 5)) // max 5 files, field name = 'photos'
uploadPhotos(
  @UploadedFiles() files: Express.Multer.File[],
) {
  return {
    count: files.length,
    files: files.map(f => ({ name: f.originalname, size: f.size })),
  };
}
```

#### `FileFieldsInterceptor` — File trên nhiều field khác nhau

```typescript
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Post('product')
@UseInterceptors(FileFieldsInterceptor([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
]))
uploadProduct(
  @UploadedFiles() files: {
    thumbnail?: Express.Multer.File[];
    gallery?: Express.Multer.File[];
  },
) {
  return {
    thumbnail: files.thumbnail?.[0]?.originalname,
    gallery: files.gallery?.map(f => f.originalname),
  };
}
```

#### `AnyFilesInterceptor` — Chấp nhận mọi file

```typescript
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Post('any')
@UseInterceptors(AnyFilesInterceptor())
uploadAny(@UploadedFiles() files: Express.Multer.File[]) {
  return { files: files.map(f => f.originalname) };
}
```

> **Khi nào dùng cái nào?**
> - Dùng `FileInterceptor` cho profile avatar, document đơn lẻ
> - Dùng `FilesInterceptor` cho gallery ảnh (cùng loại)
> - Dùng `FileFieldsInterceptor` cho form phức tạp (thumbnail + gallery + document)
> - Dùng `AnyFilesInterceptor` khi field names không cố định

---

## 2.3 Custom Storage Configuration

Mặc định Multer lưu file vào thư mục tạm và đặt tên ngẫu nhiên. Trong thực tế, ta cần kiểm soát: lưu ở đâu, đặt tên gì.

### Disk Storage — Lưu trực tiếp ra ổ đĩa

```typescript
// upload.config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';

export const diskStorageConfig = diskStorage({
  // Xác định thư mục lưu file
  destination: (req, file, callback) => {
    // Có thể tạo cấu trúc thư mục động theo ngày
    const date = new Date();
    const folder = `./uploads/${date.getFullYear()}/${date.getMonth() + 1}`;
    
    // Tạo thư mục nếu chưa có (cần import fs)
    // fs.mkdirSync(folder, { recursive: true });
    
    callback(null, folder); // null = không có lỗi
  },

  // Xác định tên file
  filename: (req, file, callback) => {
    // Tạo tên file unique: fieldname-timestamp-random.ext
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(file.originalname); // Lấy đuôi file: .jpg, .pdf...
    const name = `${file.fieldname}-${uniqueSuffix}${ext}`;
    callback(null, name);
  },
});
```

**Sử dụng config này trong controller:**

```typescript
@Post('avatar')
@UseInterceptors(FileInterceptor('avatar', { storage: diskStorageConfig }))
uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  // file.path = 'uploads/2024/1/avatar-1704067200000-123456789.jpg'
  return { path: file.path };
}
```

### Memory Storage — Giữ file trong RAM

```typescript
import { memoryStorage } from 'multer';

@Post('process')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
processFile(@UploadedFile() file: Express.Multer.File) {
  // Với memory storage, file.buffer chứa nội dung file dạng Buffer
  const buffer: Buffer = file.buffer;
  
  // Ví dụ: đọc nội dung file text
  const content = buffer.toString('utf-8');
  
  return { content };
}
```

**So sánh Disk Storage vs Memory Storage:**

| | Disk Storage | Memory Storage |
|---|---|---|
| **Lưu ở đâu** | Ổ đĩa cứng | RAM |
| **Truy cập** | `file.path` | `file.buffer` |
| **Giới hạn** | Dung lượng disk | Dung lượng RAM |
| **Tốc độ** | Chậm hơn | Nhanh hơn |
| **Persistence** | Còn sau khi server restart | Mất khi process kết thúc |
| **Dùng khi** | File lớn, lưu lâu dài | File nhỏ, xử lý xong rồi thôi (upload lên S3, đọc CSV...) |

> **Thực tế hay gặp:** Khi upload lên cloud (S3, Cloudinary), ta dùng **memory storage** — đọc file vào Buffer, gọi SDK của cloud để upload, không cần lưu xuống disk tạm.

---

## 2.4 File Validation

### Tại sao validation quan trọng?

Nếu không validate file upload, server của bạn có thể bị tấn công:

```
❌ Không validate → Rủi ro:
   - Người dùng upload file PHP/JS độc hại rồi execute
   - Upload file 10GB làm đầy disk server
   - Upload file zip bomb tiêu tốn CPU khi giải nén
   - Path traversal attack: filename = "../../etc/passwd"
```

### Validation với ParseFilePipe (Built-in)

NestJS cung cấp `ParseFilePipe` kèm các validator có sẵn:

```typescript
@Post('avatar')
@UseInterceptors(FileInterceptor('avatar'))
uploadAvatar(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        // Giới hạn kích thước: 2MB = 2 * 1024 * 1024 bytes
        new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
        
        // Chỉ chấp nhận ảnh JPEG và PNG
        new FileTypeValidator({ fileType: /^image\/(jpeg|png)$/ }),
      ],
      // fileIsRequired: false // Nếu file là optional
    }),
  )
  file: Express.Multer.File,
) {
  return { filename: file.originalname };
}
```

**Khi validation fail, NestJS tự động trả về:**

```json
{
  "statusCode": 400,
  "message": "Validation failed (expected size is less than 2097152)",
  "error": "Bad Request"
}
```

### Custom File Validator

Khi built-in validator không đủ, bạn có thể tự viết:

```typescript
// validators/image-dimension.validator.ts
import { FileValidator, Injectable } from '@nestjs/common';

// Validator kiểm tra file extension hợp lệ
@Injectable()
export class FileExtensionValidator extends FileValidator {
  private allowedExtensions: string[];

  constructor(options: { allowedExtensions: string[] }) {
    super(options);
    this.allowedExtensions = options.allowedExtensions;
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) return false;
    
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    return this.allowedExtensions.includes(ext ?? '');
  }

  buildErrorMessage(): string {
    return `Chỉ chấp nhận các định dạng: ${this.allowedExtensions.join(', ')}`;
  }
}

// Sử dụng:
new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
    new FileExtensionValidator({ allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'] }),
  ],
})
```

**Magic Number Validation (Nâng cao):**

File extension có thể bị giả mạo (đổi tên `virus.exe` thành `image.jpg`). Magic number validation đọc vài byte đầu của file để xác định loại thực sự:

```typescript
// Magic numbers: signature bytes ở đầu file
const MAGIC_NUMBERS = {
  jpg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  pdf: [0x25, 0x50, 0x44, 0x46], // "%PDF"
};

@Injectable()
export class MagicNumberValidator extends FileValidator {
  constructor(private allowedTypes: (keyof typeof MAGIC_NUMBERS)[]) {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file?.buffer) return false;
    
    return this.allowedTypes.some(type => {
      const magic = MAGIC_NUMBERS[type];
      return magic.every((byte, i) => file.buffer[i] === byte);
    });
  }

  buildErrorMessage(): string {
    return 'File không hợp lệ (kiểm tra magic number thất bại)';
  }
}
```

> **Lưu ý:** `MagicNumberValidator` yêu cầu `memoryStorage()` vì cần truy cập `file.buffer`. Với disk storage, file được lưu xuống đĩa ngay lập tức và không có buffer.

---

## 2.5 Advanced Upload Features

### Custom Upload Decorator — Tái sử dụng logic

Trong thực tế, bạn sẽ dùng cùng một cấu hình upload ở nhiều route. Thay vì copy-paste, hãy tạo custom decorator:

```typescript
// decorators/upload-image.decorator.ts
import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Decorator dùng lại được cho mọi route upload ảnh
export function UploadImage(fieldName: string = 'image') {
  return applyDecorators(
    UseInterceptors(
      FileInterceptor(fieldName, {
        storage: diskStorage({
          destination: './uploads/images',
          filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
            cb(null, uniqueName);
          },
        }),
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: (req, file, cb) => {
          if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
            return cb(new Error('Chỉ chấp nhận file ảnh!'), false);
          }
          cb(null, true);
        },
      }),
    ),
    // Tự động thêm Swagger docs
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: { type: 'string', format: 'binary' },
        },
      },
    }),
  );
}
```

**Sử dụng decorator:**

```typescript
@Controller('users')
export class UsersController {
  @Post(':id/avatar')
  @UploadImage('avatar') // Gọn gàng, rõ ràng
  updateAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return { userId: id, avatar: file.filename };
  }
}

@Controller('products')
export class ProductsController {
  @Post(':id/thumbnail')
  @UploadImage('thumbnail') // Tái sử dụng cùng decorator
  updateThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return { productId: id, thumbnail: file.filename };
  }
}
```

### Error Handling toàn diện

```typescript
// filters/multer-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const errorMessages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File quá lớn. Vui lòng chọn file nhỏ hơn.',
      LIMIT_FILE_COUNT: 'Quá nhiều file. Vui lòng giảm số lượng.',
      LIMIT_UNEXPECTED_FILE: 'Field file không hợp lệ.',
      LIMIT_FIELD_KEY: 'Tên field quá dài.',
    };

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: errorMessages[exception.code] || 'Lỗi upload file.',
      error: exception.code,
    });
  }
}
```

**Đăng ký filter trong main.ts:**

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MulterExceptionFilter } from './filters/multer-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new MulterExceptionFilter());
  await app.listen(3000);
}
bootstrap();
```

---

# Phần 3 — Cloud Storage Integration

## 3.1 Local Storage vs Cloud Storage

Khi mới học, ta thường lưu file thẳng vào disk của server (local storage). Điều này hoạt động tốt khi phát triển, nhưng gặp nhiều vấn đề khi đưa lên production.

### Vấn đề của Local Storage trong Production

```
Tình huống thực tế:
├── Server A (web server 1): lưu avatar user #123 tại /uploads/avatar-123.jpg
├── Server B (web server 2): KHÔNG có file này!
└── Load Balancer phân phối request ngẫu nhiên
    → User #123 lúc thấy avatar, lúc không → BUG!
```

**So sánh tổng quan:**

| Tiêu chí | Local Storage | Cloud Storage (S3, GCS...) |
|---|---|---|
| **Scalability** | ❌ Bị giới hạn bởi disk server | ✅ Gần như không giới hạn |
| **Multi-server** | ❌ File không được share | ✅ Tất cả server đều truy cập được |
| **Chi phí** | Thấp ban đầu, cao khi scale | Pay-as-you-go, tối ưu hơn |
| **Độ bền** | ❌ Mất file nếu server lỗi | ✅ Redundancy 99.999999999% |
| **CDN** | ❌ Phải tự setup | ✅ Tích hợp sẵn |
| **Backup** | Phải tự làm | Tự động |

**Khi nào nên dùng Cloud Storage?**
- Khi app có nhiều hơn 1 server (horizontal scaling)
- File cần truy cập nhanh từ nhiều vùng địa lý
- Cần backup tự động
- File volume lớn (hàng GB trở lên)

---

## 3.2 AWS S3 Integration

### AWS S3 là gì?

**Amazon Simple Storage Service (S3)** là dịch vụ lưu trữ object phổ biến nhất thế giới. Các khái niệm cơ bản:

```
AWS S3 Structure:
└── Bucket (giống như "ổ đĩa" hoặc "thư mục gốc")
    ├── Tên bucket phải unique toàn cầu
    ├── Gắn với một Region (ap-southeast-1 = Singapore)
    └── Objects (files)
        ├── Key = đường dẫn file (vd: "avatars/user-123.jpg")
        ├── Value = nội dung file (binary)
        └── Metadata (content-type, size, custom tags...)
```

### Cài đặt và Cấu hình

```bash
npm install @aws-sdk/client-s3
npm install @aws-sdk/s3-request-presigner
```

**Cấu hình credentials an toàn trong `.env`:**

```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET_NAME=my-app-uploads
```

> **Bảo mật quan trọng:** Không bao giờ hardcode AWS credentials vào source code. Luôn dùng environment variables. Trong production, dùng IAM Roles thay vì access key.

### Tạo S3 Service

```typescript
// s3/s3.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    // Khởi tạo S3 client với credentials từ env
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
  }

  /**
   * Upload file lên S3
   * @param file - File từ Multer (memory storage)
   * @param folder - Thư mục trên S3 (vd: 'avatars', 'documents')
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'uploads') {
    // Tạo key (đường dẫn) cho file trên S3
    const key = `${folder}/${uuid()}${extname(file.originalname)}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,           // Buffer từ memory storage
      ContentType: file.mimetype,  // Quan trọng: browsers cần biết loại file
      // ACL: 'public-read',       // Bỏ comment nếu muốn file public
    });

    await this.s3Client.send(command);

    // Trả về URL public (nếu bucket/object là public)
    return {
      key,
      url: `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`,
    };
  }

  /**
   * Tạo Presigned URL để download file private
   * URL này có thời hạn (ví dụ: 15 phút)
   */
  async getPresignedUrl(key: string, expiresIn: number = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // URL tự hết hạn sau expiresIn giây
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Xóa file khỏi S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.s3Client.send(command);
  }
}
```

### Upload Controller tích hợp S3

```typescript
// upload/upload.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { S3Service } from '../s3/s3.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(), // Phải dùng memory để có file.buffer
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    // Upload lên S3, lưu vào thư mục 'avatars'
    const result = await this.s3Service.uploadFile(file, 'avatars');
    
    return {
      message: 'Upload thành công!',
      url: result.url,
      key: result.key,
    };
  }
}
```

### Presigned URLs — Chia sẻ file private có thời hạn

Đây là tính năng rất quan trọng trong thực tế. Thay vì để file public (ai cũng truy cập được), ta để file private rồi tạo URL tạm thời:

```
Luồng hoạt động:
1. User upload file hợp đồng lên S3 (private)
2. Khi cần xem, client gọi API → server tạo presigned URL (hết hạn sau 15 phút)
3. Client dùng URL này để download trực tiếp từ S3
4. Sau 15 phút, URL hết hạn, không ai dùng được nữa

Ưu điểm:
✅ File luôn private, không bị crawl/leak
✅ Download trực tiếp từ S3 → không tốn bandwidth của server
✅ Có thể audit ai đã download file
```

```typescript
@Get('download/:key')
async getDownloadUrl(@Param('key') key: string) {
  // Tạo URL download hết hạn sau 15 phút (900 giây)
  const url = await this.s3Service.getPresignedUrl(key, 900);
  return { downloadUrl: url, expiresIn: '15 phút' };
}
```

---

## 3.3 Cloudinary Integration

### Cloudinary là gì?

**Cloudinary** là nền tảng quản lý media (ảnh + video) cao cấp hơn S3. Điểm khác biệt lớn nhất: Cloudinary có thể **biến đổi ảnh/video on-the-fly** qua URL.

```
Ví dụ sức mạnh Cloudinary:
Original URL:
https://res.cloudinary.com/demo/image/upload/sample.jpg

Resize 300x300, crop, chuyển sang WebP:
https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,f_webp/sample.jpg

Thêm watermark + blur mặt:
https://res.cloudinary.com/demo/image/upload/l_watermark,e_blur_faces/sample.jpg

→ Không cần code backend, chỉ cần thay đổi URL!
```

### Cài đặt và Cấu hình

```bash
npm install cloudinary
```

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret
```

### Tạo Cloudinary Service

```typescript
// cloudinary/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Cấu hình Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload ảnh lên Cloudinary từ Buffer
   * Trả về URL và public_id để quản lý sau này
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      // Tạo upload stream
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          // Tự động tối ưu chất lượng và format
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      // Chuyển Buffer thành Readable stream rồi pipe vào upload stream
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Tạo URL ảnh đã biến đổi
   * Không cần upload lại — Cloudinary xử lý on-the-fly
   */
  getTransformedUrl(publicId: string, options: object): string {
    return cloudinary.url(publicId, options);
  }

  /**
   * Xóa ảnh khỏi Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
```

### Ví dụ thực tế: Upload và tạo các kích thước ảnh

```typescript
@Post('product-image')
@UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
  const result = await this.cloudinaryService.uploadImage(file, 'products');
  
  // Tạo URL cho từng use case mà không cần upload lại
  const urls = {
    original: result.secure_url,
    // Thumbnail 150x150 cho danh sách sản phẩm
    thumbnail: this.cloudinaryService.getTransformedUrl(result.public_id, {
      width: 150, height: 150, crop: 'fill', quality: 'auto',
    }),
    // Medium 800x600 cho trang chi tiết
    medium: this.cloudinaryService.getTransformedUrl(result.public_id, {
      width: 800, height: 600, crop: 'limit', quality: 'auto', fetch_format: 'webp',
    }),
    // Ảnh đã tối ưu cho mobile
    mobile: this.cloudinaryService.getTransformedUrl(result.public_id, {
      width: 400, quality: 'auto:low', fetch_format: 'webp',
    }),
  };

  return { publicId: result.public_id, urls };
}
```

---

## 3.4 Alternative Cloud Storage (Tổng quan nhanh)

| Service | Tương thích S3 | Đặc điểm nổi bật |
|---|---|---|
| **Google Cloud Storage** | ❌ | Tích hợp sâu với GCP ecosystem |
| **Azure Blob Storage** | ❌ | Tốt khi dùng Azure AD, Office 365 |
| **DigitalOcean Spaces** | ✅ | Rẻ hơn S3, API y hệt S3 |
| **MinIO** | ✅ | Self-hosted, hoàn toàn private, miễn phí |

**MinIO** rất phổ biến để test local hoặc khi không muốn phụ thuộc cloud provider:

```bash
# Chạy MinIO local bằng Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

Sau đó dùng AWS SDK với endpoint trỏ vào MinIO:

```typescript
new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',       // Bất kỳ region nào, MinIO không quan tâm
  forcePathStyle: true,       // Quan trọng: MinIO cần path-style URL
  credentials: { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' },
})
```

---

# Phần 4 — File Streaming

## 4.1 Streaming là gì và tại sao cần?

### Vấn đề khi không dùng Streaming

Hình dung bạn muốn xem video 2GB. Nếu server phải load toàn bộ file vào RAM rồi gửi:

```
❌ Không có Streaming:
1. User request video 2GB
2. Server đọc toàn bộ 2GB vào RAM
3. Server gửi 2GB về client
→ Server bị tắc nghẽn
→ RAM cạn kiệt nếu nhiều user cùng lúc
→ User phải chờ tải xong mới xem được

✅ Có Streaming:
1. User request video 2GB
2. Server đọc chunk đầu tiên (ví dụ: 64KB)
3. Gửi chunk đó về client ngay lập tức
4. User bắt đầu xem trong khi server tiếp tục đọc chunk tiếp theo
→ RAM server chỉ cần giữ vài chunk cùng lúc
→ User thấy video gần như ngay lập tức
```

**Streaming phù hợp khi:**
- File lớn (video, audio, archive)
- Cần bắt đầu hiển thị/phát trước khi tải xong
- Server có nhiều request đồng thời
- Xuất báo cáo lớn (Excel, CSV hàng triệu dòng)

---

## 4.2 StreamableFile trong NestJS

NestJS có class `StreamableFile` giúp stream file dễ dàng:

### Basic File Streaming

```typescript
// download/download.controller.ts
import { Controller, Get, Param, Res, StreamableFile, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@Controller('files')
export class DownloadController {
  @Get(':filename')
  downloadFile(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response, // passthrough: true để NestJS vẫn xử lý response
  ): StreamableFile {
    const filePath = join(process.cwd(), 'uploads', filename);
    
    // Kiểm tra file tồn tại
    if (!existsSync(filePath)) {
      throw new NotFoundException('File không tồn tại');
    }

    // Tạo read stream (không load toàn bộ file vào RAM)
    const fileStream = createReadStream(filePath);

    // Set headers cho browser biết cách xử lý
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`, // attachment = download
    });

    return new StreamableFile(fileStream);
  }
}
```

### Download vs Inline Display

```typescript
// Download file (browser hiện hộp thoại Save As)
'Content-Disposition': `attachment; filename="${filename}"`

// Hiển thị inline (browser mở trực tiếp — PDF, ảnh, video)
'Content-Disposition': `inline; filename="${filename}"`
```

**Ví dụ: Serve ảnh trực tiếp**

```typescript
@Get('images/:filename')
serveImage(
  @Param('filename') filename: string,
  @Res({ passthrough: true }) res: Response,
): StreamableFile {
  const filePath = join(process.cwd(), 'uploads/images', filename);
  const fileStream = createReadStream(filePath);
  
  // Xác định MIME type từ extension
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  };

  res.set({
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Cache-Control': 'public, max-age=86400', // Cache 1 ngày
  });

  return new StreamableFile(fileStream);
}
```

---

## 4.3 Advanced Streaming — Range Requests (Video Seeking)

Đây là kỹ thuật quan trọng để xem video trực tuyến. Khi bạn kéo thanh tiến trình video đến phút 30, browser gửi request yêu cầu server chỉ gửi phần bytes từ giây 30 — không cần tải lại từ đầu.

```
HTTP Range Request:
Request Header:  Range: bytes=1048576-2097151  (lấy bytes từ 1MB đến 2MB)
Response Status: 206 Partial Content
Response Header: Content-Range: bytes 1048576-2097151/10485760 (đang gửi 1-2MB của 10MB total)
```

```typescript
@Get('video/:filename')
streamVideo(
  @Param('filename') filename: string,
  @Req() req: Request,
  @Res() res: Response,
) {
  const filePath = join(process.cwd(), 'videos', filename);
  const stat = statSync(filePath);
  const fileSize = stat.size;

  const rangeHeader = req.headers['range'];

  if (rangeHeader) {
    // Parse range header: "bytes=start-end"
    const parts = rangeHeader.replace('bytes=', '').split('-');
    const start = parseInt(parts[0], 10);
    // Nếu không có end, lấy đến hết file (hoặc tối đa 1MB mỗi chunk)
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1);
    const chunkSize = end - start + 1;

    // Tạo stream chỉ đọc đoạn bytes được yêu cầu
    const fileStream = createReadStream(filePath, { start, end });

    // 206 Partial Content — cho browser biết đây là một phần của file
    res.status(206);
    res.set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    fileStream.pipe(res);
  } else {
    // Lần đầu request — trả về toàn bộ file (hoặc phần đầu)
    res.set({
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes', // Thông báo server hỗ trợ range requests
    });

    createReadStream(filePath).pipe(res);
  }
}
```

---

## 4.4 Streaming từ Cloud Storage

### Stream trực tiếp từ AWS S3 về client

Thay vì: **Client → Server tải từ S3 → Server gửi về Client** (tốn bandwidth server)

Ta dùng: **Client → Server → S3 Stream → Client** (stream trực tiếp, RAM tiết kiệm)

```typescript
@Get('s3/:key')
async streamFromS3(
  @Param('key') key: string,
  @Res({ passthrough: true }) res: Response,
): Promise<StreamableFile> {
  const command = new GetObjectCommand({
    Bucket: this.configService.get('AWS_S3_BUCKET_NAME'),
    Key: key,
  });

  const s3Response = await this.s3Client.send(command);
  
  // s3Response.Body là một ReadableStream
  // Chuyển thành Node.js Readable stream
  const stream = s3Response.Body as NodeJS.ReadableStream;

  res.set({
    'Content-Type': s3Response.ContentType || 'application/octet-stream',
    'Content-Length': s3Response.ContentLength,
    'Content-Disposition': `attachment; filename="${key.split('/').pop()}"`,
  });

  return new StreamableFile(stream);
}
```

---

## 4.5 Server-Sent Events (SSE) — Real-time Streaming

SSE cho phép server **chủ động đẩy dữ liệu** về client theo thời gian thực. Khác với WebSocket (2 chiều), SSE chỉ đi 1 chiều: server → client.

**Use cases phổ biến:**
- Hiển thị log real-time (CI/CD pipeline)
- Progress bar khi xử lý file lớn
- Notification không cần polling
- Live dashboard

```typescript
// sse/sse.controller.ts
import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable, interval, map } from 'rxjs';

@Controller('sse')
export class SseController {
  // Ví dụ 1: Stream dữ liệu mỗi giây
  @Sse('events')
  @Get('events')
  streamEvents(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map(count => ({
        data: { message: `Event #${count}`, timestamp: new Date().toISOString() },
        type: 'update',
      })),
    );
  }

  // Ví dụ 2: Stream tiến trình xử lý file
  @Sse('progress/:jobId')
  streamProgress(@Param('jobId') jobId: string): Observable<MessageEvent> {
    // Giả lập tiến trình xử lý
    return new Observable(observer => {
      let progress = 0;
      const timer = setInterval(() => {
        progress += 10;
        observer.next({ data: { jobId, progress, status: 'processing' } });
        
        if (progress >= 100) {
          observer.next({ data: { jobId, progress: 100, status: 'done' } });
          observer.complete();
          clearInterval(timer);
        }
      }, 500);

      // Cleanup khi client ngắt kết nối
      return () => clearInterval(timer);
    });
  }
}
```

**Client sử dụng SSE (JavaScript):**

```javascript
const eventSource = new EventSource('/sse/progress/job-123');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  progressBar.style.width = `${data.progress}%`;
  
  if (data.status === 'done') {
    eventSource.close(); // Đóng kết nối khi xong
  }
};
```

---

# Phần 5 — Email Integration

## 5.1 Tại sao cần gửi Email?

Email vẫn là kênh thông báo quan trọng nhất trong web apps. Một số use case không thể thiếu:

| Loại Email | Mô tả | Ví dụ |
|---|---|---|
| **Transactional** | Gửi tự động khi có sự kiện | Xác nhận đặt hàng, hóa đơn |
| **Authentication** | Bảo mật tài khoản | Xác minh email, reset mật khẩu |
| **Notification** | Thông báo hoạt động | Có bình luận mới, ai đó tag bạn |
| **Marketing** | Tiếp thị | Newsletter, khuyến mãi |

### Các Email Service Provider

| Provider | Free Tier | Đặc điểm |
|---|---|---|
| **Mailtrap** | 1,000 email/tháng | Chỉ dùng để test, không gửi thật |
| **SendGrid** | 100 email/ngày | Phổ biến, analytics tốt |
| **AWS SES** | 62,000 email/tháng (từ EC2) | Rẻ nhất khi volume lớn |
| **Mailgun** | 5,000 email/tháng (3 tháng đầu) | API mạnh, logs chi tiết |
| **Resend** | 3,000 email/tháng | Mới, developer-friendly |
| **Gmail SMTP** | 500 email/ngày | Chỉ dùng để dev/test |

---

## 5.2 Setup NestJS Mailer Module

### Cài đặt

```bash
npm install @nestjs-modules/mailer nodemailer
npm install -D @types/nodemailer
npm install handlebars  # Template engine
```

### Cấu hình MailerModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),         // 'smtp.mailtrap.io' hoặc 'smtp.sendgrid.net'
          port: configService.get<number>('MAIL_PORT'), // 587 (TLS) hoặc 465 (SSL)
          secure: configService.get('MAIL_PORT') === 465, // true nếu port 465
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: `"${configService.get('MAIL_FROM_NAME')}" <${configService.get('MAIL_FROM_ADDRESS')}>`,
        },
        template: {
          dir: join(__dirname, 'mail', 'templates'), // Thư mục chứa templates
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

**.env:**

```env
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=your_mailtrap_user
MAIL_PASS=your_mailtrap_pass
MAIL_FROM_NAME=MyApp
MAIL_FROM_ADDRESS=noreply@myapp.com
```

---

## 5.3 Sending Basic Emails

### Mail Service

```typescript
// mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  // Email text đơn giản
  async sendTextEmail(to: string, subject: string, text: string) {
    await this.mailerService.sendMail({
      to,
      subject,
      text, // Plain text
    });
  }

  // Email HTML
  async sendHtmlEmail(to: string, subject: string, html: string) {
    await this.mailerService.sendMail({
      to,
      subject,
      html, // HTML content
    });
  }

  // Email với CC, BCC
  async sendEmailWithCopies(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
  }) {
    await this.mailerService.sendMail({
      ...options,
      priority: 'high', // 'high' | 'normal' | 'low'
    });
  }
}
```

---

## 5.4 Email Templates với Handlebars

### Tại sao cần Template Engine?

Nếu không dùng template, bạn phải viết HTML string trong TypeScript:

```typescript
// ❌ Xấu — khó đọc, khó maintain
const html = `<html><body><h1>Xin chào ${name}!</h1>
  <p>Mã xác nhận của bạn là: <strong>${code}</strong></p>
  ... (200 dòng HTML nữa)
</body></html>`;
```

Template engine cho phép tách HTML thành file riêng, dùng biến động:

### Cấu trúc thư mục

```
src/
└── mail/
    ├── mail.module.ts
    ├── mail.service.ts
    └── templates/
        ├── welcome.hbs           ← Handlebars template
        ├── verify-email.hbs
        ├── reset-password.hbs
        └── partials/
            ├── header.hbs        ← Tái sử dụng ở nhiều template
            └── footer.hbs
```

### Template: Welcome Email

```handlebars
{{!-- templates/welcome.hbs --}}
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #1565C0; color: white; padding: 24px; text-align: center; }
    .content { padding: 32px; color: #333; }
    .button { display: inline-block; background: #1565C0; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; }
    .footer { background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Chào mừng đến với {{appName}}! 🎉</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>{{username}}</strong>,</p>
      <p>Tài khoản của bạn đã được tạo thành công. Vui lòng xác nhận email để bắt đầu sử dụng.</p>
      
      {{!-- Điều kiện --}}
      {{#if isFirstTime}}
        <p>🎁 Vì đây là lần đầu bạn đăng ký, bạn nhận được <strong>30 ngày dùng thử miễn phí!</strong></p>
      {{/if}}
      
      <p style="text-align: center; margin: 32px 0;">
        <a href="{{verifyUrl}}" class="button">Xác nhận Email</a>
      </p>
      
      <p style="font-size: 12px; color: #999;">
        Link xác nhận hết hạn sau <strong>{{expiresIn}}</strong>.<br>
        Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
      </p>
    </div>
    <div class="footer">
      © 2024 {{appName}}. All rights reserved.
    </div>
  </div>
</body>
</html>
```

### Template: Reset Password

```handlebars
{{!-- templates/reset-password.hbs --}}
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>/* ... styles ... */</style></head>
<body>
  <div class="container">
    <div class="header"><h1>Đặt lại mật khẩu</h1></div>
    <div class="content">
      <p>Xin chào <strong>{{username}}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      
      <p>Mã OTP của bạn:</p>
      <div style="font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #1565C0; padding: 16px; background: #E3F2FD; border-radius: 8px;">
        {{otp}}
      </div>
      
      <p>Mã này có hiệu lực trong <strong>{{expiresIn}} phút</strong>.</p>
      
      {{!-- Danh sách --}}
      <p>Để bảo mật tài khoản:</p>
      <ul>
        {{#each securityTips}}
          <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
  </div>
</body>
</html>
```

### Mail Service với Templates

```typescript
// mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * Gửi email chào mừng sau khi đăng ký
   */
  async sendWelcomeEmail(user: { email: string; username: string }, verifyToken: string) {
    const verifyUrl = `https://myapp.com/verify-email?token=${verifyToken}`;
    
    await this.mailerService.sendMail({
      to: user.email,
      subject: '🎉 Chào mừng bạn đến với MyApp!',
      template: 'welcome', // Tên file template (không có .hbs)
      context: {           // Biến truyền vào template
        appName: 'MyApp',
        username: user.username,
        verifyUrl,
        expiresIn: '24 giờ',
        isFirstTime: true,
      },
    });
  }

  /**
   * Gửi OTP reset mật khẩu
   */
  async sendResetPasswordEmail(user: { email: string; username: string }, otp: string) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: '🔐 Mã đặt lại mật khẩu',
      template: 'reset-password',
      context: {
        username: user.username,
        otp,
        expiresIn: 15,
        securityTips: [
          'Không chia sẻ mã OTP với bất kỳ ai',
          'Nhân viên của chúng tôi sẽ không bao giờ hỏi mã OTP',
          'Thay đổi mật khẩu ngay sau khi khôi phục',
        ],
      },
    });
  }

  /**
   * Gửi xác nhận đơn hàng
   */
  async sendOrderConfirmation(order: {
    email: string;
    username: string;
    orderId: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
  }) {
    await this.mailerService.sendMail({
      to: order.email,
      subject: `✅ Đơn hàng #${order.orderId} đã được xác nhận`,
      template: 'order-confirmation',
      context: {
        username: order.username,
        orderId: order.orderId,
        items: order.items,
        total: order.total.toLocaleString('vi-VN'),
        currency: 'VNĐ',
      },
    });
  }
}
```

---

## 5.5 Email Attachments

### Đính kèm File vào Email

```typescript
import { join } from 'path';

// Đính kèm từ đường dẫn file
await this.mailerService.sendMail({
  to: 'user@example.com',
  subject: 'Hóa đơn tháng 12/2024',
  template: 'invoice',
  context: { invoiceNumber: 'INV-001', amount: '5,000,000 VNĐ' },
  attachments: [
    // Cách 1: Đính kèm từ file path
    {
      filename: 'invoice-dec-2024.pdf',
      path: join(process.cwd(), 'storage', 'invoices', 'invoice-001.pdf'),
    },
    
    // Cách 2: Đính kèm từ Buffer (file đã tạo trong memory)
    {
      filename: 'report.xlsx',
      content: excelBuffer, // Buffer của file Excel
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    
    // Cách 3: Đính kèm từ URL
    {
      filename: 'company-logo.png',
      path: 'https://myapp.com/assets/logo.png',
    },
  ],
});
```

### Inline Images (Nhúng ảnh vào HTML)

Thay vì link ảnh từ URL (có thể bị block), nhúng ảnh trực tiếp vào email:

```typescript
await this.mailerService.sendMail({
  to: 'user@example.com',
  subject: 'Email có ảnh nhúng',
  html: `
    <h1>Xin chào!</h1>
    <img src="cid:logo" alt="Logo" /> 
    <!-- cid:logo tham chiếu đến attachment có cid = 'logo' -->
  `,
  attachments: [
    {
      filename: 'logo.png',
      path: join(process.cwd(), 'assets', 'logo.png'),
      cid: 'logo', // Content-ID — phải match với src="cid:logo" trong HTML
    },
  ],
});
```

### Xử lý File Attachment lớn

```
❌ Vấn đề với file đính kèm lớn:
   - Gmail giới hạn 25MB/email
   - Outlook giới hạn 20MB/email
   - Tốn bandwidth, email bị delay
   - Dễ bị spam filter đánh dấu

✅ Giải pháp tốt hơn:
   - Upload file lên S3/Cloudinary
   - Tạo download link (có thể có expiry)
   - Gửi link trong email thay vì đính kèm file
```

```typescript
async sendLargeFileNotification(user: { email: string }, fileUrl: string, expiresAt: Date) {
  await this.mailerService.sendMail({
    to: user.email,
    subject: 'File của bạn đã sẵn sàng để tải',
    html: `
      <p>File của bạn đã được xử lý xong.</p>
      <p>
        <a href="${fileUrl}" style="background:#1565C0;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;">
          Tải xuống ngay
        </a>
      </p>
      <p><small>Link sẽ hết hạn vào: ${expiresAt.toLocaleString('vi-VN')}</small></p>
    `,
  });
}
```
