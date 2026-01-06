# Upload file và send mail trong NestJs

- Thiết lập tài nguyên tĩnh
- Xử lý File Upload (Multer, AWS S3)
- Streaming files
- Send mail trong NestJs

---

## 🎯 Thiết lập tài nguyên tĩnh

Cách cấu hình để NestJS **phục vụ tài nguyên tĩnh** (ảnh, file HTML, JS, CSS,...) từ một thư mục cụ thể.

---

### ✅ Bước 1: Cài đặt gói `@nestjs/serve-static`

```bash
npm install --save @nestjs/serve-static
```

---

### ✅ Bước 2: Tạo thư mục chứa tài nguyên tĩnh

Ví dụ, bạn tạo thư mục `public/` ở gốc dự án:

```
my-project/
├── src/
├── public/
│   └── index.html
│   └── image.png
│   └── styles.css
```

---

### ✅ Bước 3: Cấu hình trong `AppModule`

Mở `src/app.module.ts` và import `ServeStaticModule`:

```ts
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // đường dẫn đến thư mục public
    }),
    // các module khác...
  ],
})
export class AppModule {}
```

---

### ✅ Tuỳ chọn nâng cao: Cấu hình nhiều thư mục tĩnh hoặc thêm route prefix

```ts
ServeStaticModule.forRoot([
  {
    rootPath: join(__dirname, '..', 'public'),
    exclude: ['/api*'], // không ảnh hưởng đến các route bắt đầu bằng /api
  },
  {
    rootPath: join(__dirname, '..', 'upload'),
    serveRoot: '/upload-files', // tài nguyên sẽ được truy cập qua http://localhost:3000/upload-files/
  },
])
```

---

### ✅ Kiểm tra

Khởi động ứng dụng:

```bash
npm run start
```

Truy cập trình duyệt:

- `http://localhost:3000/index.html`
- `http://localhost:3000/image.png`
- `http://localhost:3000/styles.css`
- `http://localhost:3000/upload-files/avatar.jpg` (nếu có cấu hình thêm thư mục `upload`)

---

### ⚠️ Lưu ý

- Tài nguyên tĩnh **nên đặt ngoài `src/`** để tránh bị tách rời hoặc xoá khi biên dịch.
- Nếu bạn dùng **build production**, hãy đảm bảo copy thư mục tĩnh (`public/`) vào thư mục build (`dist/`) nếu cần thiết.

---

## 🎯 Xử lý File Upload (Multer, AWS S3)

### 📂 1. Upload file **lưu trên server (local disk)**

#### ✅ Cài đặt

```bash
npm install --save @nestjs/platform-express multer
```

#### ✅ Cấu hình controller

```ts
// upload.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads', // thư mục lưu file
        filename: (req, file, cb) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueName}${ext}`);
        },
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                cb(new Error('Only image files allowed!'), false);
            } else {
                cb(null, true);
            }
        }
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: file.path,
    };
  }
}
```

#### ✅ Kết quả

File sẽ được lưu trong thư mục `uploads/` trong root dự án.

---

### ☁️ 2. Upload file từ client → Multer → đẩy lên AWS S3

#### ✅ Cài đặt

```bash
npm install --save @nestjs/platform-express multer
npm install --save @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
```

#### ✅ Cấu hình S3Service

```ts
// aws/s3.service.ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';

@Injectable()
export class S3Service {
  private s3 = new S3Client({
    region: 'ap-southeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  async uploadFile(file: Express.Multer.File, bucket: string) {
    const fileExt = extname(file.originalname);
    const key = `${uuid()}${fileExt}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }
}
```

#### ✅ Controller upload dùng Multer + S3

```ts
// upload.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './aws/s3.service';

@Controller('upload-s3')
export class UploadS3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadToS3(@UploadedFile() file: Express.Multer.File) {
    const url = await this.s3Service.uploadFile(file, 'your-s3-bucket-name');
    return { url };
  }
}
```

#### ✅ Đăng ký Module

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadS3Controller } from './upload.controller';
import { S3Service } from './aws/s3.service';

@Module({
  controllers: [UploadController, UploadS3Controller],
  providers: [S3Service],
})
export class AppModule {}
```

#### ✅ Môi trường `.env`

```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

---

# 🧠 So sánh nhanh

| Tiêu chí                | Upload Local                          | Upload AWS S3                         |
|------------------------|----------------------------------------|----------------------------------------|
| Đơn giản               | ✅                                      | ❌ (phức tạp hơn)                      |
| Lưu trữ mở rộng        | ❌ (phụ thuộc ổ cứng)                  | ✅ (cloud scale)                       |
| Quản lý truy cập file  | ❌                                      | ✅ (public/private, signed URL)        |
| Phù hợp môi trường dev | ✅                                      | ✅                                     |
| Phù hợp production     | ❌ (trừ khi có CDN riêng)              | ✅                                     |

---

🧠 Gợi ý mở rộng

- 📂 Lưu folder theo productId hoặc ngày trong S3 hoặc local
- 🖼️ Resize ảnh thumbnail trước khi upload (dùng sharp)
- ✅ Validate loại file + kích thước
- 💾 Lưu metadata vào database với entity Product/Post (nếu dùng TypeORM, Prisma,...)

---
## 🎯 Streaming files


Dưới đây là bài **hướng dẫn cách upload file dung lượng lớn trong NestJS** bằng **streaming**, dựa trên tài liệu chính thức:

📘 [NestJS - Streaming files](https://docs.nestjs.com/techniques/streaming-files)

---

**🧠 Vì sao cần dùng streaming?**

- Với file lớn (vài trăm MB → vài GB), Multer sẽ **nạp toàn bộ vào RAM**, dễ gây quá tải.
- Streaming giúp:
  - Ghi file trực tiếp xuống đĩa hoặc đẩy đi nơi khác mà **không cần giữ toàn bộ trong bộ nhớ**
  - Quản lý bộ nhớ tốt hơn

---

### ✅ 1. Cài đặt cần thiết

```bash
npm install --save @nestjs/platform-express
```

---

### ✅ 2. Upload file lớn dùng streaming (ghi trực tiếp vào ổ đĩa)

`file-upload.controller.ts`

```ts
import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('stream-upload')
export class FileUploadController {
  @Post()
  async uploadFile(@Req() req: Request, @Res() res: Response) {
    const uploadFolder = path.join(__dirname, '..', '..', 'uploads');

    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder);
    }

    const fileName = `upload-${Date.now()}`;
    const filePath = path.join(uploadFolder, fileName);
    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      return res.status(HttpStatus.OK).json({
        message: 'Upload thành công',
        filePath: `/uploads/${fileName}`,
      });
    });

    writeStream.on('error', (err) => {
      console.error(err);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Lỗi khi ghi file',
      });
    });
  }
}
```

---

### ✅ 3. Gửi file bằng `curl` hoặc Postman

```bash
curl -X POST http://localhost:3000/stream-upload \
  --header "Content-Type: application/octet-stream" \
  --data-binary "@path/to/your/largefile.zip"
```

> Trong Postman, chọn "binary" để gửi file lớn (không dùng `form-data` nếu không cần metadata).

---

### ✅ 4. Lưu ý khi triển khai thực tế

| Vấn đề                 | Giải pháp                                      |
|------------------------|------------------------------------------------|
| Bộ nhớ                 | Sử dụng `stream` để tránh RAM bị quá tải      |
| Đường dẫn lưu          | Nên cấu trúc lại theo ngày hoặc theo user     |
| Trùng tên file         | Dùng `uuid()` hoặc timestamp                  |
| Định danh file         | Có thể thêm query param để truyền tên file    |
| Kích thước file        | Cấu hình `bodyParser` giới hạn nếu cần        |

---

### ✅ 5. Kết hợp với AWS S3 (stream đến S3)

Sử dụng `Upload` API trong `@aws-sdk/lib-storage` để stream file lên S3:

```ts
import { Upload } from '@aws-sdk/lib-storage';

const upload = new Upload({
  client: new S3Client({ region: 'ap-southeast-1' }),
  params: {
    Bucket: 'your-bucket',
    Key: 'video.mp4',
    Body: req, // stream trực tiếp từ client
  },
});

await upload.done();
```

---

### 🔥 Tổng kết

- Với file dung lượng **>100MB**, dùng `req.pipe()` là lựa chọn an toàn.
- Bạn có thể:
  - Ghi file xuống đĩa
  - Gửi đi S3
  - Xử lý streaming thêm (nén, resize, ghi logs…)


---
## 🎯  Gửi email trong NestJS bằng Gmail SMTP

Áp dụng cho các dự án cần gửi mail xác thực, thông báo, khôi phục mật khẩu v.v.

### Mục tiêu

- Gửi email HTML có nội dung tùy biến (tên, mã OTP, link…)
- Template viết bằng **MJML** để đảm bảo **gọn**, **đẹp**, **responsive**
- Dùng Handlebars để **render nội dung động**

---

### Cấu trúc thư mục

```
src/
  mail/
    mail.service.ts
    templates/
      otp.mjml
```

---

### ✅ Bước 1: Cài đặt thư viện

```bash
npm install nodemailer handlebars mjml
```

> MJML sẽ giúp bạn biên dịch MJML thành HTML tương thích mọi mail client.  
> Handlebars giúp bạn nhúng động nội dung như `{{name}}`, `{{otp}}`

---

### ✅ Bước 2: Tạo template MJML

Tạo file: `src/mail/templates/otp.mjml`

```xml
<mjml>
  <mj-body>
    <mj-section background-color="#fafafa" padding="20px">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold">Chào {{name}},</mj-text>
        <mj-text font-size="16px">Mã OTP của bạn là:</mj-text>
        <mj-text font-size="26px" font-weight="bold" color="#ff4d4f">{{otp}}</mj-text>
        <mj-text font-size="14px">Mã có hiệu lực trong {{expiresIn}} phút.</mj-text>
        <mj-divider border-color="#cccccc" />
        <mj-text font-size="12px" color="#999999">Đây là email tự động, vui lòng không trả lời.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

---

### ✅ Bước 3: Tạo MailService

```ts
// src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as hbs from 'handlebars';
import mjml2html from 'mjml';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // ví dụ: yourapp@gmail.com
      pass: process.env.GMAIL_PASS,
    },
  });

  private async renderTemplate(templateName: string, context: any): Promise<string> {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.mjml`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');

    const compiled = hbs.compile(templateSource)(context);
    const { html, errors } = mjml2html(compiled);

    if (errors.length > 0) {
      console.error('MJML Compile Errors:', errors);
    }

    return html;
  }

  async sendOtpEmail(to: string, context: { name: string; otp: string; expiresIn: number }) {
    const html = await this.renderTemplate('otp', context);

    const mailOptions = {
      from: `"My App" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Mã xác thực OTP',
      html,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
```

---

### ✅ Bước 4: Gửi email từ Controller

```ts
// src/mail/mail.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-otp')
  async sendOtp(@Body() body: { email: string; name: string }) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresIn = 10;

    await this.mailService.sendOtpEmail(body.email, {
      name: body.name,
      otp,
      expiresIn,
    });

    return { message: 'Email sent!', otp }; // Trả OTP về chỉ để test
  }
}
```

---

### ✅ Bước 5: Thiết lập biến môi trường

Trong `.env`:

```
GMAIL_USER=yourapp@gmail.com
GMAIL_PASS=yourapppassword
```

> Nếu bạn dùng Gmail thì phải **bật xác thực 2 bước** và tạo App Password  
> Truy cập: https://myaccount.google.com/apppasswords

---

### 📸 Kết quả

Email gửi đến sẽ có giao diện đẹp, có màu, căn giữa, chữ lớn, responsive trên mọi thiết bị – nhờ MJML đã biên dịch ra HTML chuẩn email (rất dài, rất lằng nhằng nếu bạn viết tay).

---

### 🧠 Gợi ý mở rộng

| Tính năng                      | Cách làm                                            |
|-------------------------------|-----------------------------------------------------|
| Gửi link reset password       | Thêm `{{link}}` và `mj-button href="{{link}}"`     |
| Template xác thực tài khoản   | Tương tự như trên                                  |
| Email đa ngôn ngữ             | Render template theo `language`                    |
| MJML + React                  | Dùng `mjml-react` nếu bạn muốn viết bằng JSX       |
| Gửi nền bằng Bull Queue       | Kết hợp NestJS + Bull để gửi email async hiệu quả  |

---
