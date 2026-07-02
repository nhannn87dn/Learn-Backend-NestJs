# Gửi Email với Nodemailer + Handlebars (SMTP Gmail)

## Phần cơ bản (bắt buộc nắm vững)

### Phần 1: Kiến thức nền cần ôn trước khi học

#### 1.1. SMTP là gì?

**SMTP (Simple Mail Transfer Protocol)** là giao thức chuẩn dùng để **gửi** email qua mạng — khác hoàn toàn với việc gọi một REST API thông thường.

| | Gọi REST API | Gửi mail qua SMTP |
|---|---|---|
| Giao thức | HTTP/HTTPS | SMTP (cổng 25/465/587) |
| Cách xác thực | Token, API Key trong header | Username + Password (hoặc App Password) khi "bắt tay" với mail server |
| Bản chất | Request - Response tức thời | Gửi mail vào hàng đợi của mail server, server đó sẽ tự relay tới server nhận |

Khi ứng dụng NestJS "gửi mail", thực chất nó đang **kết nối tới một SMTP server** (ví dụ server của Gmail), xác thực, rồi "giao" nội dung mail cho server đó xử lý tiếp — bản thân ứng dụng của bạn **không tự gửi mail trực tiếp tới hộp thư người nhận**.

```
Ứng dụng NestJS  →  (kết nối SMTP)  →  smtp.gmail.com  →  Mail server người nhận  →  Hộp thư người dùng
```

#### 1.2. Vì sao cần Template Engine, không viết HTML bằng string nối tay?

```typescript
// Cách KHÔNG NÊN làm — string nối tay
const html = '<h1>Xin chào ' + user.name + '</h1><p>Mã OTP của bạn là: ' + otp + '</p>';
```

Vấn đề của cách này:
- HTML dài, nhiều biến → code rối, khó đọc, khó bảo trì
- Không tách biệt được "nội dung logic" và "giao diện trình bày" — người thiết kế giao diện mail không thể sửa mà không đụng vào code TypeScript
- Dễ quên escape dữ liệu, dẫn tới lỗi hiển thị hoặc rủi ro bảo mật (học kỹ ở Phần 7)

**Template Engine** giải quyết vấn đề này bằng cách tách file `.hbs` (chứa HTML + placeholder) ra riêng, code TypeScript chỉ cần truyền dữ liệu (gọi là `context`) vào, template engine sẽ tự "render" ra HTML hoàn chỉnh.

#### 1.3. Ôn nhanh Module, Provider, `@Global()` trong NestJS

Chức năng gửi mail thường được nhiều module khác trong hệ thống dùng lại (module Auth gửi OTP, module Order gửi hóa đơn, module User gửi mail chào mừng...). Vì vậy `MailModule` thường được thiết kế là **module dùng chung**:

| Khái niệm | Vai trò trong MailModule |
|---|---|
| **Module** | Đóng gói toàn bộ logic gửi mail (cấu hình, service, template) thành 1 khối độc lập |
| **Provider** (`MailerService`) | Class chứa logic thực sự — được đăng ký để các module khác có thể inject vào dùng |
| **`@Global()`** (tùy chọn) | Đánh dấu module này có thể được inject ở bất kỳ đâu trong ứng dụng mà không cần import lại nhiều lần |

#### 1.4. Biến môi trường — vì sao không hardcode thông tin SMTP

```typescript
// TUYỆT ĐỐI KHÔNG làm thế này
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  auth: { user: 'myemail@gmail.com', pass: 'my-app-password' }, // lộ thông tin nhạy cảm trong code, đẩy lên Git
});
```

Thông tin xác thực SMTP (username, password/app password, API key của các provider khác) là **bí mật**, tuyệt đối không được viết cứng (hardcode) trong source code — vì source code thường được đẩy lên Git, dễ bị lộ nếu repo public hoặc bị rò rỉ. Luôn đọc các thông tin này từ biến môi trường (`.env`) thông qua `ConfigService` của NestJS — chi tiết cấu hình ở Phần 3.

---

### Phần 2: Cấu hình Gmail SMTP an toàn

#### 2.1. Vì sao không dùng mật khẩu Gmail thường

Google **không cho phép** ứng dụng bên thứ ba đăng nhập trực tiếp bằng mật khẩu tài khoản Gmail thông thường vì lý do bảo mật (đặc biệt nếu tài khoản đã bật xác thực 2 lớp). Thay vào đó, Google cung cấp **App Password** — một mật khẩu riêng, chỉ dùng cho một ứng dụng/mục đích cụ thể, có thể thu hồi độc lập mà không ảnh hưởng tới mật khẩu chính.

#### 2.2. Các bước tạo App Password

> **Ghi chú cho giáo viên**: nên demo trực tiếp trên màn hình, vì giao diện Google Account có thể thay đổi theo thời gian.

1. Bật **Xác thực 2 bước (2-Step Verification)** cho tài khoản Google — bắt buộc phải bật trước, nếu chưa bật sẽ không thấy mục App Password
2. Vào **Google Account → Security → App passwords**
3. Chọn ứng dụng (hoặc đặt tên tùy ý, ví dụ "NestJS App"), Google sẽ sinh ra một chuỗi 16 ký tự
4. Dùng chuỗi 16 ký tự này làm `pass` khi cấu hình SMTP transport — **không dùng mật khẩu Gmail thật**

#### 2.3. Thông số SMTP của Gmail

| Thông số | Giá trị |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `465` (SSL) hoặc `587` (TLS/STARTTLS) |
| Secure | `true` nếu dùng port 465, `false` nếu dùng port 587 |
| User | Địa chỉ Gmail đầy đủ |
| Pass | App Password 16 ký tự (không phải mật khẩu thường) |

#### 2.4. Giới hạn cần lưu ý khi dùng Gmail SMTP

- Gmail giới hạn khoảng **500 mail/ngày** cho tài khoản cá nhân thông thường (con số này có thể thay đổi theo chính sách Google, giáo viên nên kiểm tra lại thông tin mới nhất khi giảng)
- Gửi số lượng lớn hoặc bất thường dễ khiến Google tạm khóa tính năng gửi mail của tài khoản, hoặc mail bị đưa vào spam
- **Kết luận sư phạm**: Gmail SMTP rất phù hợp để **học tập, demo, dự án cá nhân/nhỏ** — nhưng **không phù hợp cho production có lượng người dùng thật**. Đây chính là lý do Phần 8 (nâng cao) giới thiệu các provider chuyên dụng như SendGrid, Resend.

---

### Phần 3: Cài đặt & Setup MailModule cơ bản

#### 3.1. Cài đặt package

```bash
npm install @nestjs-modules/mailer nodemailer handlebars
npm install -D @types/nodemailer
```

| Package | Vai trò |
|---|---|
| `@nestjs-modules/mailer` | Module bọc Nodemailer theo chuẩn NestJS, hỗ trợ sẵn tích hợp template engine |
| `nodemailer` | Thư viện gửi mail thực sự, chạy phía dưới |
| `handlebars` | Template engine dùng để render file `.hbs` thành HTML |

#### 3.2. Cấu hình `.env`

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=myapp@gmail.com
MAIL_PASSWORD=abcdefghijklmnop
MAIL_FROM="My App <myapp@gmail.com>"
```

#### 3.3. Cấu hình `MailerModule` với `forRootAsync`

Dùng `forRootAsync` (thay vì `forRoot`) để đọc cấu hình **động** từ `ConfigService`, thay vì viết cứng giá trị trong code.

```typescript
// mail.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          port: config.get<number>('MAIL_PORT'),
          secure: config.get<boolean>('MAIL_SECURE'),
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: config.get<string>('MAIL_FROM'), // địa chỉ gửi mặc định nếu không chỉ định riêng
        },
        template: {
          dir: join(__dirname, 'templates'), // thư mục chứa file .hbs — chi tiết ở Phần 4
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true, // báo lỗi nếu template dùng biến chưa được định nghĩa trong context
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

> **Giải thích cho học viên**: `useFactory` chính là một hàm được NestJS gọi lúc khởi động ứng dụng, `inject: [ConfigService]` yêu cầu NestJS "tiêm" `ConfigService` vào hàm này — đây là ứng dụng thực tế của tư duy Dependency Injection đã học ở tài liệu TypeScript/NestJS trước, chỉ khác là áp dụng ở cấp độ cấu hình module thay vì cấp độ class thông thường.

#### 3.4. Gửi mail đơn giản nhất — chưa dùng template

Tạo `MailService` để đóng gói logic gửi mail, các module khác sẽ inject `MailService` này thay vì dùng trực tiếp `MailerService` của thư viện — giúp dễ kiểm soát và thay đổi logic sau này.

```typescript
// mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendTestEmail(toEmail: string): Promise<void> {
    await this.mailerService.sendMail({
      to: toEmail,
      subject: 'Kiểm tra cấu hình SMTP',
      text: 'Nếu bạn nhận được mail này, cấu hình SMTP đã hoạt động đúng.',
    });
    this.logger.log(`Đã gửi mail thử nghiệm tới ${toEmail}`);
  }
}
```

```typescript
// Gọi thử từ một Controller demo
@Post('test-mail')
async testMail(@Body('email') email: string) {
  await this.mailService.sendTestEmail(email);
  return { message: 'Đã gửi, kiểm tra hộp thư' };
}
```

> **Bài thực hành đầu tiên cho học viên**: chạy đúng đoạn code trên, xác nhận nhận được mail thật trong hộp thư — đây là bước "chạy được cái đơn giản nhất" trước khi học tiếp template, giúp cô lập lỗi (nếu có) là do cấu hình SMTP hay do logic template sau này.

---

### Phần 4: Template Email với Handlebars

#### 4.1. Vì sao dùng Template Engine thay vì string nối tay

Đã giải thích lý do ở mục 1.2. Ở đây bổ sung so sánh nhanh các lựa chọn engine phổ biến:

| Engine | Đặc điểm | Phù hợp cho email? |
|---|---|---|
| **Handlebars** | Cú pháp đơn giản (`{{ }}`), hạn chế logic phức tạp trong template (chủ đích thiết kế) | ✅ Rất phù hợp — email nên tách biệt rõ logic và trình bày |
| EJS | Cho phép viết JavaScript thuần ngay trong template | ⚠️ Dễ lạm dụng, logic bị trộn lẫn vào giao diện |
| Pug | Cú pháp rút gọn dựa trên thụt lề (indentation) | ⚠️ Khó debug với HTML email vốn đã phức tạp (bảng, style inline) |

> **Lý do sư phạm chọn Handlebars cho môn học này**: cú pháp tối giản, buộc học viên tách bạch rõ ràng "chỗ nào là dữ liệu, chỗ nào là giao diện" — tư duy này áp dụng tốt cho gần như mọi hệ thống gửi mail thực tế.

#### 4.2. Cấu trúc thư mục template chuẩn

```
src/
└── mail/
    ├── mail.module.ts
    ├── mail.service.ts
    └── templates/
        ├── welcome.hbs
        ├── otp.hbs
        └── partials/
            ├── header.hbs
            └── footer.hbs
```

`dir` trong cấu hình `template` (đã khai báo ở mục 3.3) phải trỏ đúng tới thư mục `templates/` này.

> **Lưu ý kỹ thuật khi build production**: NestJS biên dịch `.ts` thành `.js` trong thư mục `dist`, nhưng file `.hbs` **không phải code TypeScript** nên không tự động được copy sang `dist`. Cần cấu hình copy thủ công (ví dụ thêm script trong `package.json` dùng `cpx` hoặc cấu hình `assets` trong `nest-cli.json`):
> ```json
> // nest-cli.json
> {
>   "compilerOptions": {
>     "assets": ["mail/templates/**/*"],
>     "watchAssets": true
>   }
> }
> ```

#### 4.3. Cú pháp Handlebars cơ bản

##### Biến (`{{ }}`)

```handlebars
<!-- welcome.hbs -->
<h1>Xin chào {{ name }}!</h1>
<p>Chào mừng bạn đã đăng ký tài khoản tại {{ appName }}.</p>
```

##### Điều kiện (`{{#if}}`)

```handlebars
{{#if isVipMember}}
  <p>Cảm ơn bạn là thành viên VIP — bạn được giảm giá 20%!</p>
{{else}}
  <p>Đăng ký gói VIP để nhận nhiều ưu đãi hơn.</p>
{{/if}}
```

##### Vòng lặp (`{{#each}}`)

```handlebars
<h2>Chi tiết đơn hàng</h2>
<ul>
  {{#each products}}
    <li>{{ this.name }} — Số lượng: {{ this.quantity }} — Giá: {{ this.price }}đ</li>
  {{/each}}
</ul>
```

##### Partial — tách phần dùng chung

Partial giúp tránh lặp lại HTML header/footer (logo công ty, thông tin liên hệ, link hủy đăng ký...) ở mọi template.

```handlebars
<!-- partials/footer.hbs -->
<hr>
<p style="font-size: 12px; color: #999;">
  © 2026 My Company. Nếu không muốn nhận mail này, <a href="{{unsubscribeUrl}}">bấm vào đây</a>.
</p>
```

```handlebars
<!-- welcome.hbs -->
<h1>Xin chào {{ name }}!</h1>
<p>Chào mừng bạn đến với hệ thống.</p>
{{> footer}}
```

> Cần đăng ký thư mục `partials` riêng khi cấu hình `HandlebarsAdapter` nếu muốn dùng cú pháp `{{> partialName}}` — tham khảo tài liệu `@nestjs-modules/mailer` bản đang dùng để cấu hình đường dẫn `partialsDir` chính xác.

##### Custom Helper — hàm tự định nghĩa dùng trong template

```typescript
import * as Handlebars from 'handlebars';

Handlebars.registerHelper('formatCurrency', (amount: number) => {
  return amount.toLocaleString('vi-VN') + 'đ';
});
```

```handlebars
<p>Tổng tiền: {{ formatCurrency totalAmount }}</p>
<!-- Kết quả: Tổng tiền: 1.200.000đ -->
```

#### 4.4. Gửi mail có template thực tế

```typescript
// mail.service.ts
async sendWelcomeEmail(toEmail: string, userName: string): Promise<void> {
  await this.mailerService.sendMail({
    to: toEmail,
    subject: 'Chào mừng bạn đến với hệ thống!',
    template: './welcome', // trỏ tới file welcome.hbs trong thư mục templates
    context: {
      name: userName,
      appName: 'My App',
    },
  });
}

async sendOtpEmail(toEmail: string, otpCode: string): Promise<void> {
  await this.mailerService.sendMail({
    to: toEmail,
    subject: 'Mã xác thực OTP của bạn',
    template: './otp',
    context: {
      otpCode,
      expiresIn: '5 phút',
    },
  });
}
```

```handlebars
<!-- templates/otp.hbs -->
<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
  <h2>Mã xác thực của bạn</h2>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">{{ otpCode }}</p>
  <p>Mã có hiệu lực trong {{ expiresIn }}. Không chia sẻ mã này với bất kỳ ai.</p>
</div>
```

> **Bài thực hành**: cho học viên tự viết `otp.hbs` và `welcome.hbs`, gọi thử từ 2 API riêng biệt, kiểm tra kết quả thực tế trong hộp thư — đây là kỹ năng dùng nhiều nhất trong công việc thực tế (email xác thực, email thông báo, email hóa đơn...).

#### 4.5. Thiết kế HTML Email chuẩn — lưu ý quan trọng

HTML Email **khác đáng kể** so với HTML trang web thông thường:

| Vấn đề | Giải thích |
|---|---|
| **Layout bằng `<table>`** | Nhiều mail client (đặc biệt Outlook desktop) không hỗ trợ tốt Flexbox/Grid — dùng `<table>` để đảm bảo hiển thị nhất quán |
| **CSS phải inline** | Nhiều mail client (Gmail trên một số nền tảng) loại bỏ thẻ `<style>` trong `<head>` — CSS nên viết trực tiếp vào thuộc tính `style=""` của từng thẻ |
| **Không hỗ trợ JavaScript** | Email không chạy được JS, mọi tương tác phải xử lý qua link dẫn ra ngoài |
| **Kích thước ảnh cố định** | Nên khai báo `width`/`height` cụ thể cho `<img>`, tránh phụ thuộc CSS responsive phức tạp |

> **Gợi ý sư phạm**: không bắt học viên tự thiết kế HTML email từ đầu (rất mất thời gian, nhiều "bẫy" tương thích trình duyệt). Nên giới thiệu:
> - Dùng công cụ **MJML** (ngôn ngữ đánh dấu chuyên cho email, tự động sinh ra HTML table + inline CSS chuẩn) rồi chuyển kết quả thành file `.hbs`
> - Hoặc dùng lại các **template mẫu email miễn phí** có sẵn trên mạng, chỉ chỉnh sửa nội dung và gắn placeholder Handlebars vào

---

## Phần nâng cao (học sau khi đã vững phần cơ bản)

> Từ đây trở đi là các chủ đề mở rộng: xử lý bất đồng bộ với Queue, testing chuyên sâu, bảo mật nâng cao, và tích hợp đa provider. Không bắt buộc với học viên mới, nhưng **cần thiết khi đưa hệ thống gửi mail vào môi trường production thật**.

### Phần 5: Xử lý bất đồng bộ & độ tin cậy khi gửi mail (đi sâu)

#### 5.1. Vì sao không nên gửi mail đồng bộ ngay trong luồng xử lý request chính

Xét ví dụ API đăng ký tài khoản gửi mail chào mừng **đồng bộ**:

```typescript
// Cách CHƯA TỐI ƯU
@Post('register')
async register(@Body() dto: RegisterDto) {
  const user = await this.userService.create(dto);
  await this.mailService.sendWelcomeEmail(user.email, user.name); // (1) chờ tại đây
  return { message: 'Đăng ký thành công' }; // (2) chỉ trả response SAU KHI mail gửi xong
}
```

Vấn đề của cách làm này:

1. **Chậm response**: kết nối SMTP + gửi mail có thể mất 1-3 giây (thậm chí lâu hơn nếu mạng chậm) — người dùng phải chờ lâu hơn mức cần thiết chỉ để nhận được response "đăng ký thành công", dù việc gửi mail không quyết định việc đăng ký có thành công hay không
2. **Request chính bị fail oan**: nếu SMTP server tạm thời lỗi (Gmail bảo trì, mất kết nối mạng...), `await` sẽ ném lỗi, toàn bộ request `/register` fail theo — dù bản chất tài khoản **đã được tạo thành công** trong database
3. **Không có cơ chế thử lại (retry)**: nếu gửi mail thất bại, mail đó **mất luôn**, không có cách nào để hệ thống tự động thử gửi lại sau

#### 5.2. Giải pháp: tách việc gửi mail ra khỏi luồng xử lý chính bằng Queue

**Queue (hàng đợi)** là một cơ chế cho phép "giao việc" (job) cho một tiến trình xử lý riêng, chạy **độc lập** với luồng xử lý request HTTP chính. Request chính chỉ cần "đẩy job vào hàng đợi" rồi trả response ngay lập tức; một **Worker** riêng sẽ lấy job ra và xử lý (gửi mail) ở phía sau (background).

```
Request /register
      │
      ├── (1) Tạo user trong DB
      ├── (2) Đẩy job "gửi mail chào mừng" vào Queue  ──────┐
      └── (3) Trả response ngay lập tức                     │
                                                              ▼
                                              Worker riêng lấy job ra xử lý
                                              (gửi mail thật, có thể mất vài giây,
                                               không ảnh hưởng gì tới request đã trả xong)
```

##### Giới thiệu BullMQ (thư viện Queue phổ biến trong hệ sinh thái NestJS)

BullMQ là thư viện Queue dựa trên **Redis**, được NestJS hỗ trợ tích hợp sẵn qua package `@nestjs/bullmq`.

```bash
npm install @nestjs/bullmq bullmq
```

> **Yêu cầu hạ tầng**: BullMQ cần một **Redis server** đang chạy để lưu trữ hàng đợi. Trong môi trường học tập, có thể chạy Redis bằng Docker: `docker run -d -p 6379:6379 redis`.

##### Cấu hình Queue trong `AppModule`

```typescript
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'mail-queue', // tên hàng đợi riêng cho việc gửi mail
    }),
  ],
})
export class AppModule {}
```

##### Đẩy job vào Queue thay vì gửi mail trực tiếp

```typescript
// mail.producer.ts — nơi "đẩy việc" vào hàng đợi
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MailProducer {
  constructor(@InjectQueue('mail-queue') private readonly mailQueue: Queue) {}

  async addWelcomeEmailJob(toEmail: string, userName: string): Promise<void> {
    await this.mailQueue.add(
      'send-welcome-email', // tên job
      { toEmail, userName }, // dữ liệu kèm theo job
      {
        attempts: 3, // tự động thử lại tối đa 3 lần nếu thất bại
        backoff: { type: 'exponential', delay: 5000 }, // lần thử lại sau tăng dần: 5s, 10s, 20s...
      },
    );
  }
}
```

```typescript
// Controller giờ chỉ cần đẩy job, KHÔNG chờ gửi mail xong
@Post('register')
async register(@Body() dto: RegisterDto) {
  const user = await this.userService.create(dto);
  await this.mailProducer.addWelcomeEmailJob(user.email, user.name); // gần như tức thời, không phải chờ SMTP
  return { message: 'Đăng ký thành công' }; // trả response ngay, không phụ thuộc việc gửi mail
}
```

##### Worker xử lý job — nơi thực sự gọi `MailService`

```typescript
// mail.processor.ts — nơi "xử lý việc" đã được đẩy vào hàng đợi
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'send-welcome-email': {
        const { toEmail, userName } = job.data;
        await this.mailService.sendWelcomeEmail(toEmail, userName);
        this.logger.log(`Đã gửi mail chào mừng tới ${toEmail} (job #${job.id})`);
        break;
      }
      default:
        this.logger.warn(`Không nhận diện được loại job: ${job.name}`);
    }
  }
}
```

> **Giải thích cơ chế `attempts` + `backoff`**: nếu `process()` ném lỗi (ví dụ SMTP tạm thời không kết nối được), BullMQ sẽ **tự động đưa job trở lại hàng đợi** và thử xử lý lại sau một khoảng thời gian (tính theo `backoff`), tối đa số lần bằng `attempts`. Đây chính là cơ chế **retry tự động** giải quyết trực tiếp vấn đề "mất mail nếu gửi thất bại" đã nêu ở mục 5.1.

##### Theo dõi job thất bại hoàn toàn (sau khi hết số lần retry)

```typescript
import { OnWorkerEvent } from '@nestjs/bullmq';

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  // ... phần process() ở trên

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job #${job.id} (${job.name}) thất bại hoàn toàn sau ${job.attemptsMade} lần thử: ${error.message}`);
    // Có thể ghi vào bảng "failed_emails" trong DB để đội vận hành xem xét thủ công sau này
  }
}
```

> **Mức độ cần thiết cho học viên**: phần Queue/BullMQ là kiến thức **khá rộng** (có thể là một chủ đề riêng biệt trong lộ trình học), nên ở đây chỉ cần học viên hiểu **đúng vấn đề Queue giải quyết** (tách gửi mail khỏi request chính, có retry tự động) và **đọc hiểu được** đoạn code Producer/Processor mẫu ở trên — chưa cần thành thạo cấu hình BullMQ ở mức chuyên sâu (priority queue, rate limiting theo queue, concurrency...).

#### 5.3. Xử lý lỗi khi KHÔNG dùng Queue (giải pháp tạm thời, đơn giản hơn)

Nếu dự án chưa sẵn sàng tích hợp Redis/BullMQ, có thể dùng giải pháp đơn giản hơn: **không `await` việc gửi mail**, và tự bắt lỗi riêng để không làm crash luồng chính.

```typescript
@Post('register')
async register(@Body() dto: RegisterDto) {
  const user = await this.userService.create(dto);

  // Không await — để việc gửi mail chạy "nền", không chặn response
  this.mailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
    this.logger.error(`Gửi mail chào mừng thất bại cho ${user.email}: ${error.message}`);
    // Không throw lại lỗi — vì gửi mail chào mừng không phải nghiệp vụ bắt buộc tức thời
  });

  return { message: 'Đăng ký thành công' };
}
```

> **Đánh đổi của cách này so với Queue**: đơn giản, không cần thêm hạ tầng Redis — nhưng **không có retry tự động**, và nếu server bị restart đúng lúc mail đang gửi dở, mail đó sẽ mất hẳn. Đây là lý do Queue vẫn là giải pháp được khuyến nghị cho hệ thống production nghiêm túc.

**Bảng so sánh nhanh 2 cách tiếp cận**:

| Tiêu chí | Không dùng Queue (`catch` đơn giản) | Dùng BullMQ Queue |
|---|---|---|
| Độ phức tạp triển khai | Thấp | Trung bình — cần thêm Redis |
| Retry tự động khi thất bại | ❌ Không có | ✅ Có, cấu hình được số lần và độ trễ |
| An toàn khi server restart giữa chừng | ❌ Mail đang gửi dở sẽ mất | ✅ Job vẫn còn trong Redis, worker khác/worker sau khi restart có thể tiếp tục xử lý |
| Theo dõi trạng thái từng mail (đã gửi/đang chờ/thất bại) | Khó, phải tự log thủ công | ✅ Có sẵn qua Bull Board hoặc truy vấn trực tiếp Redis |
| Phù hợp giai đoạn | Demo, dự án nhỏ, giai đoạn đầu | Production, hệ thống có lượng mail đáng kể |

#### 5.4. Đính kèm file (Attachment)

```typescript
async sendInvoiceEmail(toEmail: string, pdfPath: string): Promise<void> {
  await this.mailerService.sendMail({
    to: toEmail,
    subject: 'Hóa đơn của bạn',
    template: './invoice',
    context: { invoiceIssuedAt: new Date().toLocaleDateString('vi-VN') },
    attachments: [
      {
        filename: 'invoice.pdf',
        path: pdfPath, // đường dẫn file trên server, hoặc dùng "content" nếu đã có Buffer sẵn
      },
    ],
  });
}
```

> Liên hệ trực tiếp tới kiến thức **Upload File** đã học ở tài liệu trước: nếu file đính kèm đến từ `Buffer` (ví dụ PDF vừa được sinh động), dùng option `content: buffer` thay vì `path` — tương tự cách xử lý `file.buffer` khi dùng `memoryStorage`.

---

### Phần 6: Testing & Kiểm thử khi phát triển

#### 6.1. Dùng Mailtrap hoặc Ethereal Email cho môi trường dev

Trong lúc phát triển, **không nên gửi mail thật** ra hộp thư người dùng thật mỗi lần test — vừa gây phiền, vừa tốn giới hạn gửi mail. Có 2 giải pháp phổ biến:

**Mailtrap**: dịch vụ tạo "hộp thư giả lập" — mail gửi tới sẽ không đi ra Internet thật, mà hiển thị trong dashboard của Mailtrap để kiểm tra nội dung, giao diện HTML render ra sao trên các mail client khác nhau.

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=<mailtrap_user>
MAIL_PASSWORD=<mailtrap_password>
```

**Ethereal Email**: dịch vụ test tích hợp sẵn trong Nodemailer, tự động tạo tài khoản SMTP giả lập tạm thời — phù hợp khi không muốn đăng ký thêm dịch vụ ngoài.

```typescript
import * as nodemailer from 'nodemailer';

const testAccount = await nodemailer.createTestAccount();
console.log(testAccount); // dùng user/pass này để cấu hình transport tạm thời khi test
```

> **Khuyến nghị cho lớp học**: dùng **Mailtrap** cho môi trường dev xuyên suốt khóa học — giao diện trực quan hơn, học viên dễ dàng xem lại email đã gửi, kiểm tra HTML render đúng/sai mà không cần hộp thư Gmail thật nào cả.

#### 6.2. Viết Unit Test cho MailService bằng cách mock `MailerService`

Đây là ứng dụng thực tế rõ ràng nhất của tư duy **Interface + Dependency Injection** đã học trước: vì `MailService` chỉ phụ thuộc vào `MailerService` thông qua constructor injection, ta hoàn toàn có thể **thay thế** `MailerService` thật bằng một bản giả lập (mock) khi test, mà không cần gửi mail thật.

```typescript
// mail.service.spec.ts
import { Test } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

describe('MailService', () => {
  let mailService: MailService;
  let mailerService: { sendMail: jest.Mock };

  beforeEach(async () => {
    mailerService = { sendMail: jest.fn().mockResolvedValue(true) };

    const module = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MailerService, useValue: mailerService }, // thay thế bằng bản giả lập
      ],
    }).compile();

    mailService = module.get(MailService);
  });

  it('gọi sendMail với đúng template và context khi gửi mail chào mừng', async () => {
    await mailService.sendWelcomeEmail('test@example.com', 'An');

    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        template: './welcome',
        context: expect.objectContaining({ name: 'An' }),
      }),
    );
  });
});
```

> **Điểm mấu chốt cần nhấn mạnh khi giảng**: nhờ `MailService` không tự tạo `new MailerService()` bên trong mà **nhận nó qua constructor** (Dependency Injection), test có thể "tiêm" một bản giả (`{ sendMail: jest.fn() }`) vào thay thế — đây chính xác là lý do vì sao tư duy DI được nhấn mạnh xuyên suốt từ đầu khóa học TypeScript/NestJS.

---

### Phần 7: Bảo mật & Best Practice khi gửi mail

#### 7.1. Validate địa chỉ email đầu vào

```typescript
import { IsEmail } from 'class-validator';

export class SendOtpDto {
  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ' })
  email: string;
}
```

Validate chặt đầu vào giúp tránh lãng phí tài nguyên gửi mail tới địa chỉ sai định dạng, đồng thời hạn chế rủi ro hệ thống bị lợi dụng làm công cụ gửi mail rác tới địa chỉ tùy ý.

#### 7.2. Escape dữ liệu người dùng khi đưa vào template

Handlebars **mặc định tự động escape** dữ liệu khi dùng cú pháp `{{ value }}` (2 dấu ngoặc nhọn) — biến HTML đặc biệt như `<`, `>` sẽ được chuyển thành `&lt;`, `&gt;`, giúp tránh chèn HTML/script độc hại vào nội dung mail nếu dữ liệu đến từ input người dùng (ví dụ tên người dùng chứa `<script>`).

```handlebars
<!-- AN TOÀN — 2 dấu ngoặc, tự động escape -->
<p>Xin chào {{ name }}</p>

<!-- NGUY HIỂM — 3 dấu ngoặc ({{{ }}}) BỎ QUA escape, chỉ dùng khi CHẮC CHẮN dữ liệu đáng tin cậy -->
<p>{{{ customHtmlContent }}}</p>
```

> **Quy tắc**: chỉ dùng `{{{ }}}` (triple-stash) khi nội dung đó **do chính hệ thống sinh ra** (ví dụ HTML template con được ghép sẵn), **không bao giờ** dùng cho dữ liệu do người dùng nhập trực tiếp.

#### 7.3. Rate limiting cho API có gửi mail

Các API gửi OTP, gửi link đặt lại mật khẩu... rất dễ bị lạm dụng để "gửi mail rác" hàng loạt (spam) hoặc để tấn công dò tài khoản. Nên áp dụng giới hạn tần suất gọi (rate limit) bằng `@nestjs/throttler`:

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 3, ttl: 60000 } }) // tối đa 3 lần gọi / 60 giây / mỗi IP
@Post('send-otp')
async sendOtp(@Body() dto: SendOtpDto) {
  // ...
}
```

#### 7.4. Không để lộ thông tin nhạy cảm trong nội dung mail hoặc log

- Không gửi mật khẩu thật qua email (kể cả mật khẩu tạm) — nên gửi link đặt lại mật khẩu có token hết hạn thay vì gửi thẳng mật khẩu
- Khi log lỗi gửi mail (mục 5.2/5.3), tuyệt đối không log kèm nội dung OTP/token nhạy cảm ra console hoặc file log — chỉ log địa chỉ email và mã lỗi kỹ thuật

---

### Phần 8: Mở rộng ra Provider khác — SendGrid, Resend...

#### 8.1. Vì sao cần cân nhắc chuyển khỏi Gmail SMTP cho production

Đã đề cập ở mục 2.4 — nhắc lại và bổ sung góc nhìn production:

| Vấn đề của Gmail SMTP ở production | Giải pháp từ dịch vụ email chuyên dụng |
|---|---|
| Giới hạn gửi thấp, dễ bị khóa | Giới hạn cao hơn nhiều, theo gói trả phí rõ ràng |
| Không có thống kê tỉ lệ mở/click/bounce | Dashboard chi tiết, webhook báo sự kiện realtime |
| Không hỗ trợ xác thực domain riêng | Hỗ trợ SPF/DKIM/DMARC — tăng tỉ lệ mail vào Inbox thay vì Spam |
| Không thiết kế cho việc gửi số lượng lớn | Tối ưu hạ tầng riêng cho gửi mail hàng loạt (transactional/marketing email) |

#### 8.2. Tư duy thiết kế để dễ dàng đổi Provider — áp dụng Interface

Đây là điểm quan trọng nhất của Phần 8: nếu `MailService` viết cứng logic gọi Nodemailer trực tiếp, việc đổi sang SendGrid/Resend sau này sẽ phải **sửa lại toàn bộ code gọi mail** ở khắp nơi trong hệ thống. Giải pháp là áp dụng đúng tư duy **Interface** đã học ở Phần 2.3 của tài liệu TypeScript:

```typescript
// mail-provider.interface.ts
export interface SendMailData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export interface IMailProvider {
  sendMail(data: SendMailData): Promise<void>;
}
```

```typescript
// providers/gmail-smtp.provider.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { IMailProvider, SendMailData } from '../mail-provider.interface';

@Injectable()
export class GmailSmtpProvider implements IMailProvider {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(data: SendMailData): Promise<void> {
    await this.mailerService.sendMail({
      to: data.to,
      subject: data.subject,
      template: data.template,
      context: data.context,
    });
  }
}
```

```typescript
// providers/resend.provider.ts
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { IMailProvider, SendMailData } from '../mail-provider.interface';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';

@Injectable()
export class ResendProvider implements IMailProvider {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendMail(data: SendMailData): Promise<void> {
    // Resend không có sẵn adapter Handlebars như @nestjs-modules/mailer
    // nên cần tự render template thành HTML trước khi gửi
    const templateContent = readFileSync(`${data.template}.hbs`, 'utf-8');
    const html = Handlebars.compile(templateContent)(data.context);

    await this.resend.emails.send({
      from: 'My App <noreply@myapp.com>',
      to: data.to,
      subject: data.subject,
      html,
    });
  }
}
```

Nhờ cả 2 class đều `implements IMailProvider`, `MailService` (nơi các module khác trong hệ thống thực sự dùng) **không cần biết** đang dùng Gmail hay Resend:

```typescript
@Injectable()
export class MailService {
  constructor(
    @Inject('MAIL_PROVIDER') private readonly mailProvider: IMailProvider,
  ) {}

  async sendWelcomeEmail(toEmail: string, userName: string): Promise<void> {
    await this.mailProvider.sendMail({
      to: toEmail,
      subject: 'Chào mừng bạn đến với hệ thống!',
      template: './welcome',
      context: { name: userName },
    });
  }
}
```

> **Đây chính là ví dụ thực tế rõ ràng nhất** cho tư duy "code phụ thuộc vào contract (interface), không phụ thuộc vào triển khai cụ thể" đã học ở Phần 2.3 tài liệu TypeScript — không còn là ví dụ minh họa trừu tượng (`KhoLuuTru`, `BoNhoTam`...) nữa, mà là bài toán thật trong dự án thật.

#### 8.3. Tích hợp SendGrid

```bash
npm install @sendgrid/mail
```

```typescript
import * as sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: 'user@example.com',
  from: 'noreply@myapp.com',
  subject: 'Chào mừng',
  html: '<p>Nội dung mail</p>',
});
```

**Khác biệt lớn nhất so với Nodemailer SMTP**: SendGrid dùng **REST API** (gọi qua HTTPS, xác thực bằng API Key) thay vì giao thức SMTP truyền thống — nhanh hơn, dễ theo dõi log/lỗi hơn qua dashboard, nhưng về bản chất tư duy tích hợp (đóng gói thành 1 class `implements IMailProvider`) hoàn toàn giống ví dụ ở mục 8.2.

#### 8.4. Tích hợp Resend

```bash
npm install resend
```

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'My App <noreply@myapp.com>',
  to: 'user@example.com',
  subject: 'Chào mừng',
  html: '<p>Nội dung mail</p>',
});
```

Resend là dịch vụ email hiện đại hơn, được thiết kế đặc biệt thân thiện với hệ sinh thái React/Next.js (hỗ trợ viết template bằng **React Email** — component React biên dịch thành HTML email) — đây là điểm khác biệt lớn nếu đội ngũ đã quen dùng React cho phần frontend, có thể tái sử dụng tư duy component thay vì học thêm cú pháp Handlebars riêng.

#### 8.5. So sánh nhanh các lựa chọn

| Tiêu chí | Gmail SMTP | SendGrid | Resend |
|---|---|---|---|
| Phù hợp giai đoạn | Học tập, demo, dự án nhỏ | Production, quy mô vừa-lớn | Production, dev experience hiện đại |
| Cách xác thực | Username + App Password | API Key (REST API) | API Key (REST API) |
| Theo dõi bounce/open/click | Không có | Có | Có |
| Cấu hình domain riêng (SPF/DKIM) | Không hỗ trợ | Hỗ trợ | Hỗ trợ |
| Hỗ trợ viết template | Cần tự tích hợp Handlebars/MJML | Có template engine riêng trên dashboard | Hỗ trợ React Email |



#### 8.6. Cấu hình chọn Provider linh động qua biến môi trường

Dùng **Factory Provider** của NestJS để tự động chọn implementation phù hợp dựa trên biến môi trường — không cần sửa code khi đổi môi trường (dev dùng Gmail/Mailtrap, production dùng SendGrid/Resend).

```typescript
// mail.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GmailSmtpProvider } from './providers/gmail-smtp.provider';
import { ResendProvider } from './providers/resend.provider';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigModule],
  providers: [
    GmailSmtpProvider,
    ResendProvider,
    {
      provide: 'MAIL_PROVIDER',
      inject: [ConfigService, GmailSmtpProvider, ResendProvider],
      useFactory: (
        config: ConfigService,
        gmailProvider: GmailSmtpProvider,
        resendProvider: ResendProvider,
      ) => {
        const providerName = config.get<string>('MAIL_PROVIDER'); // "gmail" | "resend"
        return providerName === 'resend' ? resendProvider : gmailProvider;
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
```

```env
# .env cho môi trường dev
MAIL_PROVIDER=gmail

# .env cho môi trường production
MAIL_PROVIDER=resend
```

> Đây là ví dụ áp dụng **Factory Provider** — một biến thể nâng cao của Dependency Injection, nơi việc "cung cấp instance nào" được quyết định **lúc chạy** dựa trên điều kiện (ở đây là biến môi trường), thay vì cố định lúc viết code.

---

### Tổng kết Phần Nâng cao (Phần 5 → 8)

| Chủ đề | Điều cần nhớ nhất |
|---|---|
| Queue (BullMQ) | Tách việc gửi mail khỏi luồng request chính, có retry tự động khi thất bại |
| Xử lý không dùng Queue | Không `await`, tự `catch` lỗi — giải pháp tạm thời, không có retry/an toàn khi restart |
| Testing (Mailtrap/Ethereal) | Không gửi mail thật khi dev/test; mock `MailerService` để Unit Test `MailService` |
| Bảo mật | Validate email đầu vào, tận dụng auto-escape của Handlebars, rate limit API gửi mail |
| Đa Provider | Định nghĩa `IMailProvider`, mỗi dịch vụ (Gmail/SendGrid/Resend) là 1 class implement riêng |
| Factory Provider | Chọn Provider theo biến môi trường lúc runtime, không sửa code khi đổi môi trường |

---

## Bài tập tổng hợp cuối khóa

### Bài tập cơ bản (bắt buộc)

Xây dựng `MailModule` với:
- Cấu hình Gmail SMTP qua `ConfigService`, không hardcode
- 2 template Handlebars: `welcome.hbs` (email chào mừng) và `otp.hbs` (email mã xác thực)
- `MailService` với 2 method tương ứng, có dùng Partial cho phần footer chung
- Test gửi thành công bằng Mailtrap, kiểm tra hiển thị đúng trên dashboard

### Bài tập nâng cao (khuyến khích, không bắt buộc)

Mở rộng bài tập cơ bản với:
- Tích hợp BullMQ: việc gửi mail chào mừng/OTP được đẩy qua Queue, có cấu hình `attempts` + `backoff`
- Viết Unit Test cho `MailService` bằng cách mock `MailerService`
- Định nghĩa `IMailProvider`, viết thêm 1 provider thứ 2 (SendGrid hoặc Resend), chọn provider qua biến môi trường `MAIL_PROVIDER`
- Thêm rate limiting cho API gửi OTP (tối đa 3 lần/phút/IP)


