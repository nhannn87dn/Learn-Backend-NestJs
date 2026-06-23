# Lesson 14: Upload File và Gửi Mail với NestJS

## 1. File Upload là gì?

**File Upload** là quá trình client gửi file (hình ảnh, PDF, video...) lên server thông qua HTTP request. Thay vì gửi JSON text thông thường, request lúc này dùng định dạng **`multipart/form-data`** — cho phép đính kèm binary data cùng với các field text khác.

```
Request thông thường (JSON):
POST /users
Content-Type: application/json
Body: { "name": "John", "email": "john@example.com" }

─────────────────────────────────────────────────────

Request upload file (multipart/form-data):
POST /users/avatar
Content-Type: multipart/form-data; boundary=----FormBoundary

----FormBoundary
Content-Disposition: form-data; name="name"

John
----FormBoundary
Content-Disposition: form-data; name="avatar"; filename="photo.jpg"
Content-Type: image/jpeg

<binary data của file ảnh>
----FormBoundary--
```

**Các use case phổ biến:**
- Upload avatar / ảnh sản phẩm
- Import file Excel/CSV dữ liệu
- Upload tài liệu PDF, hợp đồng
- Đính kèm file khi gửi mail

---

## 2. Multer là gì?

**Multer** là middleware Node.js chuyên xử lý `multipart/form-data`. NestJS tích hợp sẵn Multer thông qua `@nestjs/platform-express` nên **không cần cài thêm package Multer**.

Multer nhận file từ request, xử lý và lưu vào nơi bạn chỉ định, sau đó gắn thông tin file vào `req.file` (1 file) hoặc `req.files` (nhiều file) để controller sử dụng.

```
Client gửi multipart request
        ↓
Multer Middleware nhận request
        ↓
Parse binary data → Validate → Lưu file
        ↓
Gắn file info vào req.file / req.files
        ↓
Controller xử lý tiếp
```

Multer hỗ trợ 2 kiểu storage:

| Storage | Lưu ở đâu | Dùng khi nào |
|---|---|---|
| `diskStorage` | Ổ đĩa server | Lưu file local, serve trực tiếp |
| `memoryStorage` | RAM (Buffer) | Upload lên Cloud (S3, Cloudinary) |

---

## 3. Cài đặt và cấu hình Multer với NestJS

```bash
npm install -D @types/multer
```

Tạo thư mục lưu file và thêm vào `.gitignore`:

```bash
mkdir uploads

# .gitignore
uploads/*
!uploads/.gitkeep
```

Thêm vào `.env` để dễ dàng cấu hình đường dẫn lưu file:

```env
UPLOAD_DIR=./uploads
```


## 4. Tạo API File Upload với Multer


Tạo một UploadModule riêng để quản lý tất cả logic liên quan đến file upload:

Cấu trúc thư mục:

```
src/
  upload/
    upload.module.ts
    upload.controller.ts
    upload.service.ts
    interceptors/
      local-storage.interceptor.ts
    filters/
      file.filter.ts
    strategies/
      file-naming.strategy.ts
      file-filter.strategy.ts
    pipes/
      file-validation.pipe.ts
```


Với code example như sau:


```typescript
// upload/upload.controller.ts
import {
  Controller, Post, Get, Param, Res,
  UploadedFile, UploadedFiles, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import {
  FileInterceptor, FilesInterceptor, FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('upload')
export class UploadController {
  //logic upload here
}
```


```typescript
// upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get('UPLOAD_DIR', './uploads'),
          filename: (req, file, callback) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname).toLowerCase();
            callback(null, `${uniqueSuffix}${ext}`);
          },
        }),
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB default
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
```

Khai báo UploadModule với AppModule:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadModule } from './upload/upload.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Các module khác...
    UploadModule,
  ],
})
export class AppModule {}
```

### Upload single file

Thêm vào upload.controller.ts:

```typescript
// Decorator: FileInterceptor('fieldName')
@Post('single')
@UseInterceptors(FileInterceptor('file'))
uploadSingle(@UploadedFile() file: Express.Multer.File) {
  if (!file) throw new BadRequestException('No file uploaded');

  return {
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    path: file.path,
  };
}
```

Test:

```bash
curl -X POST http://localhost:3000/upload/single \
  -F "file=@/path/to/image.jpg"
```

### Upload multiple files

```typescript
// FilesInterceptor('fieldName', maxCount)
@Post('multiple')
@UseInterceptors(FilesInterceptor('files', 5)) // Tối đa 5 files
uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
  if (!files || files.length === 0) {
    throw new BadRequestException('No files uploaded');
  }

  return files.map(file => ({
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
  }));
}
```

Test:

```bash
curl -X POST http://localhost:3000/upload/multiple \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "files=@document.pdf"
```

### Upload file với field name khác nhau

Khi form có nhiều field upload với tên khác nhau (ví dụ: `avatar` + `document`):

```typescript
// FileFieldsInterceptor nhận array các field config
@Post('fields')
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
    { name: 'documents', maxCount: 3 },
  ]),
)
uploadFields(
  @UploadedFiles()
  files: {
    avatar?: Express.Multer.File[];
    documents?: Express.Multer.File[];
  },
) {
  const avatar = files.avatar?.[0];
  const documents = files.documents ?? [];

  return {
    avatar: avatar
      ? { filename: avatar.filename, size: avatar.size }
      : null,
    documents: documents.map(doc => ({
      filename: doc.filename,
      size: doc.size,
    })),
  };
}
```

Test:

```bash
curl -X POST http://localhost:3000/upload/fields \
  -F "avatar=@photo.jpg" \
  -F "documents=@contract.pdf" \
  -F "documents=@invoice.pdf"
```

### No file upload (optional file)

Trường hợp file là optional — không bắt buộc phải upload:

```typescript
@Post('optional')
@UseInterceptors(FileInterceptor('thumbnail'))
uploadWithOptionalFile(
  @Body() body: CreatePostDto,
  @UploadedFile() thumbnail?: Express.Multer.File, // Optional
) {
  return {
    title: body.title,
    content: body.content,
    thumbnail: thumbnail
      ? { filename: thumbnail.filename, size: thumbnail.size }
      : null, // Không có file → vẫn xử lý bình thường
  };
}
```

---

## 5. Cấu hình Static File Serving trong NestJS

Sau khi upload, client cần truy cập file qua URL. Cài `ServeStaticModule`:

```bash
npm install @nestjs/serve-static
```

```typescript
// app.module.ts
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Thư mục vật lý
      serveRoot: '/uploads',                       // URL prefix
      // File uploads/abc123.jpg → http://localhost:3000/uploads/abc123.jpg
    }),
  ],
})
export class AppModule {}
```

Cập nhật upload response để trả về URL đầy đủ:

```typescript
// upload/upload.service.ts
@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {}

  getFileUrl(filename: string): string {
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    return `${baseUrl}/uploads/${filename}`;
  }
}
```

```env
BASE_URL=http://localhost:3000
```

> **Lưu ý production:** `ServeStaticModule` phù hợp cho dev và app nhỏ. Production nên dùng **Nginx** hoặc **CDN** để serve static files — hiệu quả hơn và giảm tải cho NestJS server.

---

## 6. Custom Upload với Interceptor

Thay vì cấu hình Multer toàn cục, có thể tạo **custom interceptor** để kiểm soát hoàn toàn logic upload — bao gồm storage, naming và filter — tại từng endpoint.

### Custom Storage Engine

```typescript
// upload/interceptors/local-storage.interceptor.ts
import { Injectable, mixin, NestInterceptor, Type } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Factory function trả về Interceptor class với config tùy chỉnh
export function LocalStorageInterceptor(
  fieldName: string,
  destination: string,
  options?: Partial<MulterOptions>,
): Type<NestInterceptor> {
  @Injectable()
  class MixinInterceptor extends FileInterceptor(fieldName, {
    storage: diskStorage({
      destination,
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    ...options,
  }) {}

  return mixin(MixinInterceptor);
}
```

Sử dụng:

```typescript
// Lưu avatar vào ./uploads/avatars
@Post('avatar')
@UseInterceptors(LocalStorageInterceptor('avatar', './uploads/avatars'))
uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  return { filename: file.filename };
}

// Lưu document vào ./uploads/documents
@Post('document')
@UseInterceptors(LocalStorageInterceptor('document', './uploads/documents'))
uploadDocument(@UploadedFile() file: Express.Multer.File) {
  return { filename: file.filename };
}
```

### Custom File Naming

Đặt tên file theo nhiều chiến lược khác nhau:

```typescript
// upload/strategies/file-naming.strategy.ts
import { Request } from 'express';
import { extname } from 'path';

type NamingCallback = (error: Error | null, filename: string) => void;

// Strategy 1: Timestamp + random
export const timestampNaming = (
  req: Request,
  file: Express.Multer.File,
  cb: NamingCallback,
) => {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = extname(file.originalname).toLowerCase();
  cb(null, `${unique}${ext}`);
};

// Strategy 2: Giữ tên gốc, chỉ sanitize
export const originalNaming = (
  req: Request,
  file: Express.Multer.File,
  cb: NamingCallback,
) => {
  const sanitized = file.originalname
    .toLowerCase()
    .replace(/\s+/g, '-')         // Thay space bằng dấu -
    .replace(/[^a-z0-9.\-]/g, ''); // Xóa ký tự đặc biệt
  cb(null, sanitized);
};

// Strategy 3: Đặt tên theo user ID
export const userBasedNaming = (
  req: Request,
  file: Express.Multer.File,
  cb: NamingCallback,
) => {
  const userId = (req as any).user?.id ?? 'anonymous';
  const ext = extname(file.originalname).toLowerCase();
  const timestamp = Date.now();
  cb(null, `user-${userId}-${timestamp}${ext}`);
};
```

```typescript
// Dùng strategy đặt tên theo user
@Post('avatar')
@UseInterceptors(
  FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: userBasedNaming,
    }),
  }),
)
uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  // filename: "user-123-1735000000000.jpg"
  return { filename: file.filename };
}
```

### Custom File Filter

```typescript
// upload/filters/file.filter.ts
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// MIME types cho phép
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Factory tạo file filter từ danh sách MIME types
export const createFileFilter = (allowedMimeTypes: string[]) => {
  return (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          `Loại file không hợp lệ. Chỉ chấp nhận: ${allowedMimeTypes.join(', ')}`,
        ),
        false,
      );
    }
    callback(null, true);
  };
};

// Config sẵn cho từng loại upload
export const imageUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: './uploads/images',
    filename: timestampNaming,
  }),
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

export const documentUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: './uploads/documents',
    filename: timestampNaming,
  }),
  fileFilter: createFileFilter(ALLOWED_DOCUMENT_TYPES),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
};
```

Áp dụng vào controller:

```typescript
@Post('image')
@UseInterceptors(FileInterceptor('file', imageUploadOptions))
uploadImage(@UploadedFile() file: Express.Multer.File) {
  if (!file) throw new BadRequestException('No image uploaded');
  return { filename: file.filename, url: this.uploadService.getFileUrl(file.filename) };
}

@Post('document')
@UseInterceptors(FileInterceptor('file', documentUploadOptions))
uploadDocument(@UploadedFile() file: Express.Multer.File) {
  if (!file) throw new BadRequestException('No document uploaded');
  return { filename: file.filename, url: this.uploadService.getFileUrl(file.filename) };
}
```

---

## 7. File Validation (Size, Type)

Ngoài filter trong Multer, nên validate thêm ở tầng **Pipe** của NestJS để có error message đồng nhất với toàn app.

```typescript
// upload/pipes/file-validation.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  required?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions = {}) {}

  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    const { maxSizeBytes, allowedMimeTypes, required = true } = this.options;

    // Kiểm tra file có tồn tại không
    if (!file) {
      if (required) throw new BadRequestException('File là bắt buộc');
      return file; // Optional file → bỏ qua validate
    }

    // Validate kích thước
    if (maxSizeBytes && file.size > maxSizeBytes) {
      const maxMB = (maxSizeBytes / 1024 / 1024).toFixed(1);
      throw new BadRequestException(
        `File quá lớn. Kích thước tối đa cho phép: ${maxMB}MB`,
      );
    }

    // Validate MIME type
    if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Loại file không hợp lệ. Chỉ chấp nhận: ${allowedMimeTypes.join(', ')}`,
      );
    }

    return file;
  }
}
```

Sử dụng Pipe trong controller:

```typescript
@Post('avatar')
@UseInterceptors(FileInterceptor('avatar'))
uploadAvatar(
  @UploadedFile(
    new FileValidationPipe({
      required: true,
      maxSizeBytes: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    }),
  )
  file: Express.Multer.File,
) {
  return {
    filename: file.filename,
    url: this.uploadService.getFileUrl(file.filename),
  };
}

@Post('attachment')
@UseInterceptors(FileInterceptor('attachment'))
uploadAttachment(
  @UploadedFile(
    new FileValidationPipe({
      required: false,               // Optional
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    }),
  )
  file?: Express.Multer.File,
) {
  return {
    hasAttachment: !!file,
    filename: file?.filename ?? null,
  };
}
```

---

## 8. Upload Nâng cao

### Upload lên Cloud Storage — AWS S3

Lưu file trên server local có nhiều hạn chế: mất khi redeploy, không scale khi có nhiều server. Cloud Storage giải quyết vấn đề này.

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

```typescript
// upload/providers/s3.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { extname } from 'path';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = configService.get('AWS_S3_BUCKET');
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<{ url: string; key: string }> {
    const ext = extname(file.originalname).toLowerCase();
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,        // Cần dùng memoryStorage()
        ContentType: file.mimetype,
        ACL: 'public-read',
      },
    });

    const result = await upload.done();
    return {
      url: `https://${this.bucket}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`,
      key,
    };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
```

```env
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
```

```typescript
// Controller upload lên S3 — bắt buộc dùng memoryStorage
@Post('s3')
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(), // File → RAM → S3 (không lưu disk)
    fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES),
    limits: { fileSize: 5 * 1024 * 1024 },
  }),
)
async uploadToS3(@UploadedFile() file: Express.Multer.File) {
  if (!file) throw new BadRequestException('No file uploaded');
  const { url, key } = await this.s3Service.uploadFile(file, 'images');
  return { url, key };
}
```

### Upload lên Cloud Storage — Cloudinary

Cloudinary phổ biến hơn với ảnh vì hỗ trợ resize, crop, optimize tự động.

```bash
npm install cloudinary
```

```typescript
// upload/providers/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get('CLOUDINARY_API_KEY'),
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: [
            { width: 1200, crop: 'limit' }, // Tối đa 1200px
            { quality: 'auto' },             // Tự optimize
            { fetch_format: 'auto' },        // Tự chuyển sang WebP
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(file.buffer); // Đẩy buffer vào stream
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
```

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```typescript
@Post('cloudinary')
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES),
    limits: { fileSize: 5 * 1024 * 1024 },
  }),
)
async uploadToCloudinary(@UploadedFile() file: Express.Multer.File) {
  if (!file) throw new BadRequestException('No file uploaded');

  const result = await this.cloudinaryService.uploadFile(file, 'avatars');
  return {
    url: result.secure_url,     // HTTPS URL
    publicId: result.public_id, // Dùng để xóa sau
    width: result.width,
    height: result.height,
    format: result.format,      // Có thể là webp dù upload jpg
  };
}
```

### Streaming File Upload

Với file lớn (video, file backup...), không nên load toàn bộ vào RAM. **Streaming** đọc và gửi từng chunk một:

```typescript
// upload/upload.controller.ts
import { Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { stat } from 'fs/promises';

@Get('stream/:filename')
async streamFile(
  @Param('filename') filename: string,
  @Res() res: Response,
) {
  const filePath = join(process.cwd(), 'uploads', filename);

  if (!existsSync(filePath)) {
    throw new NotFoundException('File not found');
  }

  const fileStat = await stat(filePath);
  const range = res.req.headers.range;

  if (range) {
    // Hỗ trợ range request (video seek, resume download)
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileStat.size - 1;
    const chunkSize = end - start + 1;

    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    // Stream toàn bộ file
    res.set({
      'Content-Length': fileStat.size,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    createReadStream(filePath).pipe(res);
  }
}
```

---

## 9. Gửi Mail với NestJS

### Tại sao cần gửi mail trong Backend?

Mail là kênh giao tiếp quan trọng giữa hệ thống và người dùng:

- **Xác thực email** sau khi đăng ký tài khoản
- **Quên mật khẩu** — gửi link reset password
- **Thông báo đơn hàng** — xác nhận, vận chuyển, giao hàng
- **OTP / 2FA** — mã xác thực 2 bước
- **Alert hệ thống** — thông báo lỗi, cảnh báo bảo mật

### SMTP là gì?

**SMTP** (Simple Mail Transfer Protocol) là giao thức tiêu chuẩn để **gửi** email. Backend kết nối đến SMTP server và nhờ nó chuyển mail đi.

```
NestJS App → SMTP Server → Recipient Mail Server → Inbox người nhận
```

**Các thông số SMTP:**

| Thông số | Mô tả | Gmail |
|---|---|---|
| `host` | Địa chỉ SMTP server | `smtp.gmail.com` |
| `port` | Cổng kết nối | `587` (STARTTLS) / `465` (SSL) |
| `secure` | Dùng SSL | `false` với 587, `true` với 465 |
| `user` | Tài khoản | `yourmail@gmail.com` |
| `pass` | Mật khẩu | App Password (16 ký tự) |

### Cấu hình email provider

**Gmail — Tạo App Password:**
1. Google Account → Security → Bật **2-Step Verification**
2. Tìm **App passwords** → Tạo mới cho "Mail"
3. Dùng password 16 ký tự vừa tạo (không dùng password Gmail thường)

**SendGrid — Miễn phí 100 mail/ngày:**
1. Đăng ký tại [sendgrid.com](https://sendgrid.com)
2. Settings → API Keys → Create API Key

**Mailgun — Miễn phí 1000 mail/tháng:**
1. Đăng ký tại [mailgun.com](https://mailgun.com)
2. Sending → Domains → Lấy SMTP credentials

### Cài đặt và Tạo MailModule

```bash
npm install @nestjs-modules/mailer nodemailer handlebars
npm install -D @types/nodemailer
```

Tạo thư mục templates:

```
src/
  mail/
    templates/
      welcome.hbs
      reset-password.hbs
      order-confirmation.hbs
    dto/
      send-mail.dto.ts
    mail.module.ts
    mail.service.ts
    mail.controller.ts
```

```typescript
// mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),
          port: configService.get<number>('MAIL_PORT'),
          secure: configService.get('MAIL_SECURE') === 'true',
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"${configService.get('MAIL_FROM_NAME', 'MyApp')}" <${configService.get('MAIL_USER')}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  controllers: [MailController],
  exports: [MailService], // Export để AuthModule, OrderModule... dùng được
})
export class MailModule {}
```

```env
# Gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=yourmail@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM_NAME=MyApp

# SendGrid (thay thế)
# MAIL_HOST=smtp.sendgrid.net
# MAIL_PORT=587
# MAIL_USER=apikey
# MAIL_PASSWORD=SG.xxxxxxxxxxxx

# Mailgun (thay thế)
# MAIL_HOST=smtp.mailgun.org
# MAIL_PORT=587
# MAIL_USER=postmaster@yourdomain.mailgun.org
# MAIL_PASSWORD=your_mailgun_password
```

---

## 10. Tạo API Gửi Email

### Gửi mail với plain text

```typescript
// mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendPlainText(
    to: string | string[],
    subject: string,
    text: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,       // Có thể gửi cho nhiều người: ['a@mail.com', 'b@mail.com']
      subject,
      text,     // Plain text content
    });
  }
}
```

```typescript
// mail/dto/send-mail.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsArray } from 'class-validator';

export class SendPlainMailDto {
  @IsEmail()
  to: string;

  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  text: string;
}
```

```typescript
// mail/mail.controller.ts
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('plain')
  @HttpCode(HttpStatus.OK)
  async sendPlain(@Body() dto: SendPlainMailDto) {
    await this.mailService.sendPlainText(dto.to, dto.subject, dto.text);
    return { message: 'Email sent successfully' };
  }
}
```

### Gửi mail với HTML

Tạo Handlebars template:

```handlebars
{{! mail/templates/welcome.hbs }}
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: #4F46E5; color: white; padding: 32px; text-align: center; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .button { display: inline-block; background: #4F46E5; color: white !important;
              padding: 12px 28px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .footer { padding: 16px 32px; background: #f9f9f9; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Chào mừng đến với MyApp! 🎉</h1>
    </div>
    <div class="body">
      <p>Xin chào <strong>{{name}}</strong>,</p>
      <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng xác thực email của bạn:</p>
      <a href="{{verifyUrl}}" class="button">Xác thực Email</a>
      <p>Link có hiệu lực trong <strong>{{expireIn}}</strong>.</p>
      <p style="color: #999; font-size: 13px;">
        Nếu bạn không thực hiện đăng ký, hãy bỏ qua email này.
      </p>
    </div>
    <div class="footer">© 2025 MyApp. All rights reserved.</div>
  </div>
</body>
</html>
```

```handlebars
{{! mail/templates/reset-password.hbs }}
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: #DC2626; color: white; padding: 32px; text-align: center; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .button { display: inline-block; background: #DC2626; color: white !important;
              padding: 12px 28px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 12px 16px;
               border-radius: 6px; font-size: 13px; color: #92400E; }
    .footer { padding: 16px 32px; background: #f9f9f9; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Đặt lại mật khẩu</h1>
    </div>
    <div class="body">
      <p>Xin chào <strong>{{name}}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <a href="{{resetUrl}}" class="button">Đặt lại mật khẩu</a>
      <p>Link có hiệu lực trong <strong>{{expireIn}}</strong>.</p>
      <div class="warning">
        ⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
        Tài khoản của bạn vẫn an toàn.
      </div>
    </div>
    <div class="footer">© 2025 MyApp. All rights reserved.</div>
  </div>
</body>
</html>
```

```typescript
// mail/mail.service.ts — thêm các methods HTML
async sendWelcomeEmail(
  user: { name: string; email: string },
  verifyToken: string,
): Promise<void> {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;

  await this.mailerService.sendMail({
    to: user.email,
    subject: '🎉 Chào mừng bạn đến với MyApp!',
    template: 'welcome',      // Tên file .hbs (không cần extension)
    context: {                // Biến truyền vào template
      name: user.name,
      verifyUrl,
      expireIn: '24 giờ',
    },
  });
}

async sendResetPasswordEmail(
  user: { name: string; email: string },
  resetToken: string,
): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await this.mailerService.sendMail({
    to: user.email,
    subject: '🔐 Yêu cầu đặt lại mật khẩu',
    template: 'reset-password',
    context: {
      name: user.name,
      resetUrl,
      expireIn: '1 giờ',
    },
  });
}
```

### Gửi mail với attachments

```typescript
// mail/mail.service.ts — gửi mail kèm file đính kèm
async sendWithAttachment(
  to: string,
  subject: string,
  html: string,
  attachments: Array<{
    filename: string;
    path?: string;       // Đường dẫn file trên disk
    content?: Buffer;    // Buffer (khi dùng memoryStorage)
    contentType?: string;
  }>,
): Promise<void> {
  await this.mailerService.sendMail({
    to,
    subject,
    html,
    attachments, // Nodemailer tự xử lý cả path lẫn buffer
  });
}

// Gửi hóa đơn PDF kèm theo mail
async sendInvoiceEmail(
  to: string,
  customerName: string,
  invoiceNumber: string,
  invoicePdfBuffer: Buffer,
): Promise<void> {
  await this.mailerService.sendMail({
    to,
    subject: `📄 Hóa đơn #${invoiceNumber} từ MyApp`,
    template: 'invoice',
    context: { customerName, invoiceNumber },
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: invoicePdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

// Gửi báo cáo kèm nhiều file đính kèm
async sendReportEmail(
  to: string[],
  reportTitle: string,
  filePaths: string[],
): Promise<void> {
  const attachments = filePaths.map(filePath => ({
    filename: filePath.split('/').pop(), // Lấy tên file từ path
    path: filePath,                      // Nodemailer tự đọc file từ disk
  }));

  await this.mailerService.sendMail({
    to,
    subject: `📊 Báo cáo: ${reportTitle}`,
    html: `<p>Vui lòng xem báo cáo <strong>${reportTitle}</strong> trong file đính kèm.</p>`,
    attachments,
  });
}
```

Controller tổng hợp:

```typescript
// mail/mail.controller.ts
import {
  Controller, Post, Body, HttpCode, HttpStatus,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MailService } from './mail.service';
import { SendPlainMailDto } from './dto/send-mail.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  // Gửi plain text
  @Post('plain')
  @HttpCode(HttpStatus.OK)
  async sendPlain(@Body() dto: SendPlainMailDto) {
    await this.mailService.sendPlainText(dto.to, dto.subject, dto.text);
    return { message: 'Email sent successfully' };
  }

  // Gửi welcome HTML email
  @Post('welcome')
  @HttpCode(HttpStatus.OK)
  async sendWelcome(
    @Body('to') to: string,
    @Body('name') name: string,
  ) {
    await this.mailService.sendWelcomeEmail(
      { name, email: to },
      'example-verify-token-123',
    );
    return { message: 'Welcome email sent successfully' };
  }

  // Gửi reset password email
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async sendResetPassword(
    @Body('to') to: string,
    @Body('name') name: string,
  ) {
    await this.mailService.sendResetPasswordEmail(
      { name, email: to },
      'example-reset-token-456',
    );
    return { message: 'Reset password email sent successfully' };
  }

  // Gửi mail kèm file đính kèm
  @Post('with-attachment')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async sendWithAttachment(
    @Body('to') to: string,
    @Body('subject') subject: string,
    @Body('body') body: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const attachments = file
      ? [{ filename: file.originalname, content: file.buffer, contentType: file.mimetype }]
      : [];

    await this.mailService.sendWithAttachment(
      to,
      subject,
      `<p>${body}</p>`,
      attachments,
    );
    return { message: 'Email with attachment sent successfully' };
  }
}
```

Test:

```bash
# Gửi plain text
curl -X POST http://localhost:3000/mail/plain \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Test","text":"Xin chào!"}'

# Gửi welcome HTML
curl -X POST http://localhost:3000/mail/welcome \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","name":"Nguyễn Văn A"}'

# Gửi kèm file đính kèm
curl -X POST http://localhost:3000/mail/with-attachment \
  -F "to=user@example.com" \
  -F "subject=Tài liệu đính kèm" \
  -F "body=Vui lòng xem file đính kèm" \
  -F "file=@/path/to/document.pdf"
```

