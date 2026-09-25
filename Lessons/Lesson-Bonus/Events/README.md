# Bonus 03: Events với EventEmitter

> Tiên quyết: Lesson 05 (Provider, Dependency Injection, Module). Ví dụ cuối bài dùng lại `MailService` đã xây ở Lesson 14.

## Mục tiêu bài học

Sau buổi học, học viên có thể:

- **Giải thích được** event-driven là gì, khác gì so với gọi service trực tiếp, và khi nào nên / không nên tách logic bằng event.
- **Cài đặt và cấu hình được** `@nestjs/event-emitter` (`EventEmitterModule.forRoot()`), kể cả chế độ wildcard.
- **Viết được** event payload class có kiểu rõ ràng, hằng số tên event, emit event từ service và lắng nghe bằng `@OnEvent()`.
- **Phân biệt được** listener sync, listener `async` và option `{ async: true }`; dự đoán được lỗi trong listener có ảnh hưởng tới HTTP response hay không.
- **Áp dụng được** event để gửi mail chào mừng khi user đăng ký, sao cho `UsersService` không cần biết `MailService` tồn tại.
- **Chỉ ra được** giới hạn của event in-process (mất khi app restart, không retry) và lý do cần Queue ở Bonus 04.

## Ôn tập nhanh

Ở Lesson 05, ta biết mỗi provider là một class có `@Injectable()`, được DI container tạo ra (mặc định là singleton) và inject vào nơi cần dùng qua constructor. Module gom các provider lại; module A muốn dùng service của module B thì B phải `exports` service đó và A phải `imports` B. Ở Lesson 14, `MailModule` export `MailService`, nên module nào muốn gửi mail (ví dụ `UsersModule`) phải import `MailModule` rồi inject `MailService`. Cách này đúng nhưng tạo ra **sự phụ thuộc trực tiếp**: `UsersModule` phải biết có mail, có audit log, có thống kê... Bài này trả lời câu hỏi: làm sao để `UsersService` chỉ nói "một user vừa được tạo", còn ai muốn làm gì thì tự lo?

---

## 1. Event-driven là gì? Vì sao nên tách logic bằng event

### 1.1 Vấn đề: service "biết quá nhiều"

Hãy xem một phiên bản `UsersService.create()` rất hay gặp ở dự án thật:

```typescript
// src/modules/users/users.service.ts (phiên bản CHƯA tách event)
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly mailService: MailService,       // phụ thuộc MailModule
    private readonly auditService: AuditService,     // phụ thuộc AuditModule
    private readonly analyticsService: AnalyticsService, // phụ thuộc AnalyticsModule
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = await this.usersRepository.save(this.usersRepository.create(dto));

    await this.mailService.sendWelcomeEmail(user, 'token'); // SMTP chậm 1-3 giây
    await this.auditService.log('user.created', user.id);
    await this.analyticsService.trackSignup(user.id);

    return user;
  }
}
```

Nhìn qua thì không sai, nhưng có 4 vấn đề:

1. **Coupling chặt**: nghiệp vụ chính là "lưu user", nhưng service phải inject thêm 3 dependency. Mỗi khi có yêu cầu mới ("đăng ký xong thì tặng voucher") ta lại phải sửa `UsersService`.
2. **Lỗi phụ làm hỏng việc chính**: SMTP server lỗi → `sendWelcomeEmail` throw → client nhận HTTP 500 dù user **đã được lưu** vào database. Client tưởng đăng ký thất bại, bấm lại, nhận `409 Conflict`.
3. **Response chậm**: client phải chờ gửi mail xong mới nhận response.
4. **Khó test**: unit test (Lesson 15) cho `create()` phải mock cả 3 service.

### 1.2 Event-driven là gì?

**Event-driven** là cách tổ chức code trong đó một thành phần **phát ra (emit) một event** để thông báo "một việc đã xảy ra", và các thành phần khác **lắng nghe (listen)** event đó để phản ứng. Bên phát không biết (và không cần biết) có bao nhiêu listener, listener làm gì.

Bạn đã gặp ý tưởng này ở Lesson 01: Node.js là event-driven, và module `events` của Node có class `EventEmitter`. `@nestjs/event-emitter` là lớp tích hợp NestJS bọc thư viện `eventemitter2` (một bản mở rộng của EventEmitter, hỗ trợ wildcard, async listener...).

```text
            Trước (gọi trực tiếp)                         Sau (event-driven)

UsersService ──> MailService                 UsersService ── emit('user.created') ──┐
     │──────────> AuditService                                                      │
     └──────────> AnalyticsService                        ┌──────────── EventEmitter2 (in-process)
                                                          │               │               │
UsersService phải biết tất cả                   UserCreatedListener  AuditListener  AnalyticsListener
                                                (MailModule)         (AuditModule)  (AnalyticsModule)
```

Các thuật ngữ cần nhớ:

| Thuật ngữ | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| Event | Sự kiện đã xảy ra, đặt tên ở thì quá khứ | "user đã được tạo" |
| Event name | Chuỗi định danh event | `'user.created'` |
| Payload | Dữ liệu đi kèm event | `{ userId, email, name }` |
| Emitter / Publisher | Nơi phát event | `UsersService` |
| Listener / Subscriber | Nơi lắng nghe và xử lý | `UserCreatedListener` |

Điểm quan trọng: event mô tả **sự thật đã xảy ra** (`user.created`), không phải **mệnh lệnh** (`send.welcome.mail`). Nếu đặt tên theo mệnh lệnh, bên phát lại vô tình "biết" bên nghe sẽ làm gì — tức là coupling quay trở lại.

### 1.3 Khi nào nên và không nên dùng event?

**Nên dùng** khi:

- Việc cần làm là **side effect phụ**: gửi mail, ghi audit log, xóa cache (Lesson 13), cập nhật thống kê.
- Có **nhiều module** cùng quan tâm đến một sự kiện, và danh sách này còn tăng.
- Muốn giữ ranh giới module sạch: `UsersModule` không cần import `MailModule`.

**Không nên dùng** khi:

- Bên gọi **cần kết quả** để đi tiếp (tính giá đơn hàng, kiểm tra tồn kho). Hãy gọi service trực tiếp.
- Logic **bắt buộc phải cùng transaction** với việc chính (Lesson 07). Listener chạy sau, không nằm trong transaction của bạn.
- Luồng nghiệp vụ đơn giản, chỉ có một nơi xử lý. Lạm dụng event khiến việc đọc code và debug khó hơn vì không nhìn thấy "ai gọi ai" trên một màn hình.

---

## 2. Cài đặt `@nestjs/event-emitter`

```bash
# terminal
npm install @nestjs/event-emitter
```

Đăng ký module **một lần** ở `AppModule`. `EventEmitterModule` là global, nên các feature module không cần import lại.

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,      // cho phép lắng nghe 'user.*' (mục 4.4)
      delimiter: '.',      // ký tự phân tách namespace trong tên event
      maxListeners: 10,    // cảnh báo khi 1 event có quá nhiều listener (dấu hiệu memory leak)
      verboseMemoryLeak: true, // in tên event trong cảnh báo trên
    }),
    UsersModule,
    MailModule,
  ],
})
export class AppModule {}
```

| Option | Ý nghĩa |
| --- | --- |
| `wildcard` | Bật pattern `*` / `**` trong tên event. Mặc định `false` |
| `delimiter` | Ký tự chia namespace, mặc định `'.'` |
| `maxListeners` | Số listener tối đa trước khi cảnh báo |
| `ignoreErrors` | Nếu `false` (mặc định), emit event tên `'error'` mà không có listener sẽ throw |

Cấu trúc thư mục dùng trong bài:

```text
src/
  common/
    events/
      event-names.ts            # hằng số tên event dùng chung
  modules/
    users/
      events/
        user-created.event.ts   # payload class
      users.service.ts          # nơi emit
      users.module.ts
  mail/
    listeners/
      user-created.listener.ts  # nơi lắng nghe
    mail.module.ts
    mail.service.ts             # từ Lesson 14
```

---

## 3. Emit event và lắng nghe với `@OnEvent()`

### 3.1 Hằng số tên event

Tên event là chuỗi. Nếu bên emit viết `'user.created'` còn bên nghe gõ nhầm `'users.created'`, **không có lỗi nào xảy ra** — listener đơn giản là không bao giờ chạy. Vì vậy ta gom tên event vào một file hằng số, dùng `as const` (Lesson 02) để TypeScript giữ literal type.

```typescript
// src/common/events/event-names.ts
export const USER_EVENTS = {
  CREATED: 'user.created',
  PASSWORD_CHANGED: 'user.password_changed',
} as const;

// Union type của mọi tên event user: 'user.created' | 'user.password_changed'
export type UserEventName = (typeof USER_EVENTS)[keyof typeof USER_EVENTS];
```

### 3.2 Payload class có kiểu rõ ràng

Payload nên là **class** (không phải object literal tùy ý) vì: có kiểu cố định ở cả hai phía, dễ tìm usage, và rõ ràng event mang dữ liệu gì. Chỉ đưa vào **những field listener cần** — tuyệt đối không truyền nguyên entity `User` (có cả `password` hash).

```typescript
// src/modules/users/events/user-created.event.ts
export class UserCreatedEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
    public readonly name: string,
    public readonly verifyToken: string, // token xác thực email, dùng cho mail chào mừng
  ) {}
}
```

### 3.3 Emit event từ service

Inject `EventEmitter2` như mọi provider khác (nhờ `EventEmitterModule` global) rồi gọi `emit(tênEvent, payload)`.

```typescript
// src/modules/users/users.service.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserCreatedEvent } from './events/user-created.event';
import { USER_EVENTS } from '../../common/events/event-names';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2, // không còn MailService ở đây
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existed = await this.usersRepository.findOneBy({ email: dto.email });
    if (existed) throw new ConflictException('Email đã được sử dụng');

    const user = this.usersRepository.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 10), // hash như Lesson 09
    });
    const saved = await this.usersRepository.save(user);

    // Chỉ emit SAU KHI đã lưu thành công. Token lưu DB được lược bỏ cho gọn.
    this.eventEmitter.emit(
      USER_EVENTS.CREATED,
      new UserCreatedEvent(saved.id, saved.email, saved.name, randomUUID()),
    );

    return saved;
  }
}
```

### 3.4 Lắng nghe với `@OnEvent()`

Listener là **một provider bình thường** có method gắn `@OnEvent(tênEvent)`. Khi app khởi động, NestJS quét tất cả provider, tìm method có decorator này và đăng ký chúng với `EventEmitter2`. Hệ quả: class listener **bắt buộc phải nằm trong `providers`** của một module nào đó.

```typescript
// src/mail/listeners/user-created.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_EVENTS } from '../../common/events/event-names';
import { UserCreatedEvent } from '../../modules/users/events/user-created.event';
import { MailService } from '../mail.service';

@Injectable()
export class UserCreatedListener {
  private readonly logger = new Logger(UserCreatedListener.name);

  constructor(private readonly mailService: MailService) {}

  @OnEvent(USER_EVENTS.CREATED)
  handleUserCreated(event: UserCreatedEvent): void {
    // Payload có kiểu UserCreatedEvent -> có autocomplete, sai field là lỗi compile
    this.logger.log(`User #${event.userId} vừa đăng ký: ${event.email}`);
  }
}
```

### 3.5 Mặc định listener chạy như thế nào?

Đây là điểm nhiều người hiểu sai: **mặc định `emit()` gọi các listener một cách đồng bộ (synchronous)**, lần lượt theo thứ tự đăng ký, **ngay bên trong lời gọi `emit()`**. Nghĩa là dòng code sau `emit()` chỉ chạy khi phần đồng bộ của mọi listener đã chạy xong.

```text
UsersService.create()
  │
  ├─ save user
  ├─ emit('user.created') ──> ListenerA (chạy xong) ──> ListenerB (chạy xong)
  │                                                          │
  │<──────────────── emit() trả về (boolean) ────────────────┘
  └─ return saved
```

Vậy nếu listener sync throw lỗi thì sao? NestJS bọc mỗi listener với option `suppressErrors` (mặc định `true`): lỗi bị **bắt và ghi log**, không lan ra ngoài. Nếu bạn đặt `@OnEvent(..., { suppressErrors: false })`, exception trong listener sync sẽ **lan ngược (bubble up) qua `emit()`** về `UsersService.create()`, và client nhận HTTP 500 — dù user đã được lưu. Hãy luôn ý thức rằng listener sync là một phần của request: nó làm chậm response và (khi không suppress) có thể làm hỏng response.

---

## 4. Async listener, wildcard event

### 4.1 Listener có `async` vs option `{ async: true }`

Hai thứ này dễ nhầm, nhưng khác nhau:

- **Method `async`**: `emit()` gọi method, chạy phần code trước `await` đầu tiên một cách đồng bộ, nhận về một Promise và **không chờ Promise đó**. Phần sau `await` chạy sau khi request đã đi tiếp.
- **Option `{ async: true }`**: `eventemitter2` không gọi listener ngay mà **lên lịch gọi ở vòng lặp event sau** (qua `setImmediate`, hoặc `process.nextTick` nếu thêm `nextTick: true`). `emit()` trả về ngay lập tức, không một dòng code nào của listener chạy trong lúc request đang xử lý.

```typescript
// src/mail/listeners/user-created.listener.ts
@OnEvent(USER_EVENTS.CREATED, { async: true })
async handleUserCreated(event: UserCreatedEvent): Promise<void> {
  // Chạy sau khi emit() đã trả về -> không làm chậm response
  await this.mailService.sendWelcomeEmail(
    { name: event.name, email: event.email },
    event.verifyToken,
  );
}
```

| | Sync (mặc định) | Method `async` | `{ async: true }` + method `async` |
| --- | --- | --- | --- |
| Làm chậm response? | Có, toàn bộ listener | Chỉ phần trước `await` đầu tiên | Không |
| `emit()` có chờ không? | Có | Không chờ Promise | Không |
| Lỗi có tới HTTP response? | Chỉ khi `suppressErrors: false` | Không | Không |

Khuyến nghị: với side effect chậm (gửi mail, gọi API ngoài), dùng **`{ async: true }` kết hợp method `async`**.

### 4.2 Lỗi trong async listener không bao giờ tới HTTP response

Khi listener chạy bất đồng bộ, request đã trả response `201 Created` rồi. Lỗi xảy ra sau đó **không thể** biến thành HTTP 500 được nữa — Exception Filter (Lesson 08) không bắt được nó vì nó không nằm trong request lifecycle. Với `suppressErrors: true` (mặc định), NestJS ghi log lỗi; nếu tắt suppress, lỗi trở thành unhandled promise rejection — tệ hơn nhiều. Vì vậy async listener phải **tự chịu trách nhiệm** về lỗi của mình:

```typescript
// src/mail/listeners/user-created.listener.ts
@OnEvent(USER_EVENTS.CREATED, { async: true })
async handleUserCreated(event: UserCreatedEvent): Promise<void> {
  try {
    await this.mailService.sendWelcomeEmail(
      { name: event.name, email: event.email },
      event.verifyToken,
    );
  } catch (error) {
    // Không có ai ở phía trên để bắt lỗi này -> tự log đủ ngữ cảnh để điều tra
    this.logger.error(
      `Gửi mail chào mừng thất bại cho user #${event.userId}`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
```

Để ý: ta **chỉ log được**, không retry được một cách an toàn. Ghi nhớ điểm này, mục 6 sẽ quay lại.

### 4.3 Khi cần chờ listener: `emitAsync()`

Đôi khi bạn muốn chờ tất cả listener xong (ví dụ trong script seed hoặc test). `emitAsync()` trả về Promise resolve khi mọi listener hoàn tất, kèm mảng kết quả:

```typescript
// src/modules/users/users.service.ts
await this.eventEmitter.emitAsync(USER_EVENTS.CREATED, event); // chờ mọi listener xong
```

Dùng có chủ đích: `emitAsync` đưa lại toàn bộ thời gian của listener vào request, và lỗi listener (khi không suppress) sẽ reject Promise này.

### 4.4 Wildcard event

Khi bật `wildcard: true`, tên event được chia thành các "tầng" bởi `delimiter`. Listener có thể nghe theo pattern:

| Pattern | Khớp | Không khớp |
| --- | --- | --- |
| `user.*` | `user.created`, `user.password_changed` | `user.profile.updated` |
| `user.**` | mọi event bắt đầu bằng `user.`, nhiều tầng | `order.created` |
| `*.created` | `user.created`, `order.created` | `user.deleted` |

Ứng dụng điển hình là **audit log**: một listener ghi lại mọi thay đổi liên quan đến user mà không cần biết trước sẽ có những event nào.

```typescript
// src/modules/audit/listeners/user-audit.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class UserAuditListener {
  private readonly logger = new Logger(UserAuditListener.name);

  // Nghe mọi event 1 tầng dưới namespace 'user'
  @OnEvent('user.*', { async: true })
  handleAnyUserEvent(payload: { userId: number }): void {
    // Thực tế: lưu vào bảng audit_logs (TypeORM) hoặc MongoDB (Lesson 12)
    this.logger.log(`[AUDIT] user #${payload.userId} có thay đổi`);
  }
}
```

Lưu ý: wildcard listener nhận payload của **nhiều loại event**, nên kiểu payload phải là phần chung (ở đây `{ userId: number }`). Nếu cần xử lý khác nhau theo từng event, hãy viết listener riêng với tên event cụ thể.

---

## 5. Ví dụ: user đăng ký → gửi mail chào mừng (Lesson 14)

Ghép tất cả lại. Luồng hoàn chỉnh:

```text
Client ── POST /users ──> UsersController ──> UsersService.create()
                                                  │ 1. save user (PostgreSQL)
                                                  │ 2. emit('user.created', UserCreatedEvent)
                                                  │ 3. return user
Client <── 201 { success, statusCode, data } ─────┘
                 (response đã trả về)
                                   ... vòng event loop sau ...
                          UserCreatedListener.handleUserCreated()
                                   └──> MailService.sendWelcomeEmail() ──> SMTP
```

Controller vẫn mỏng như mọi bài trước. Response được `TransformInterceptor` (Lesson 08) bọc lại, và ta trả về DTO thay vì entity:

```typescript
// src/modules/users/users.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto);
    return UserResponseDto.fromEntity(user); // không lộ password
  }
}
```

Listener đặt trong `MailModule` — module "phản ứng" chứ không phải module "phát". Nhờ vậy `UsersModule` **không import** `MailModule`; chiều phụ thuộc đảo ngược.

```typescript
// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { UserCreatedListener } from './listeners/user-created.listener';
// ... MailerModule.forRootAsync(...) giữ nguyên như Lesson 14

@Module({
  imports: [/* MailerModule.forRootAsync({...}) như Lesson 14 */],
  providers: [
    MailService,
    UserCreatedListener, // BẮT BUỘC khai báo, nếu không @OnEvent không được đăng ký
  ],
  exports: [MailService],
})
export class MailModule {}
```

```typescript
// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // không có MailModule
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Kiểm tra:

```bash
# terminal
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Nguyễn Văn A","email":"a@example.com","password":"Secret@123"}'
```

```json
// Response 201 — trả về ngay, không chờ SMTP
{
  "success": true,
  "statusCode": 201,
  "data": { "id": 12, "name": "Nguyễn Văn A", "email": "a@example.com" }
}
```

Trên console sẽ thấy log của `UserAuditListener` và (vài giây sau) mail tới hộp thư. Thử tắt mạng hoặc sai `MAIL_PASSWORD`: API vẫn trả `201`, còn console in lỗi "Gửi mail chào mừng thất bại" — đúng như thiết kế ở mục 4.2.

Muốn thêm yêu cầu "đăng ký xong tặng voucher"? Chỉ cần tạo `VoucherListener` trong `VoucherModule` nghe `USER_EVENTS.CREATED`. `UsersService` không sửa một dòng nào.

---

## 6. Giới hạn của event in-process → dẫn tới Queue ở Bonus 04

`EventEmitter2` là **in-process**: event chỉ tồn tại trong RAM của đúng process Node.js đã emit nó. Không có gì được ghi xuống đĩa hay Redis.

```text
┌─────────────────── NestJS process (RAM) ───────────────────┐
│ UsersService ── emit ──> [event trong bộ nhớ] ──> Listener │
└────────────────────────────────────────────────────────────┘
          ▲ process crash / deploy / restart = event biến mất
```

Hệ quả thực tế:

1. **Mất event khi app restart hoặc crash**: user đăng ký lúc 10:00:00, response `201` trả về, 10:00:01 bạn deploy phiên bản mới (PM2 restart, Lesson 16) trong khi listener đang chờ SMTP → mail chào mừng không bao giờ được gửi, và không ai biết.
2. **Không có retry**: SMTP lỗi tạm thời 30 giây, listener chỉ log lỗi. Muốn retry, bạn phải tự viết vòng lặp + `setTimeout` — và vòng lặp đó cũng nằm trong RAM, restart là mất.
3. **Không chia tải**: mọi listener chạy chung process với API. Nếu listener nặng (resize ảnh, xuất file Excel), nó ăn CPU của chính server đang phục vụ request. Chạy nhiều instance (PM2 cluster) cũng không giúp, vì event của instance nào thì listener của instance đó xử lý.
4. **Không quan sát được**: không có nơi nào xem "có bao nhiêu mail đang chờ gửi, bao nhiêu mail lỗi".

| Tiêu chí | EventEmitter (in-process) | Queue (Redis, Bonus 04) |
| --- | --- | --- |
| Lưu trữ | RAM của process | Redis, độc lập với app |
| App restart | Mất | Job vẫn còn, chạy tiếp |
| Retry khi lỗi | Tự viết, không an toàn | Có sẵn (attempts, backoff) |
| Chia tải nhiều worker | Không | Có |
| Theo dõi | Chỉ có log | Dashboard (Bull Board) |
| Độ phức tạp | Rất thấp | Cần Redis, thêm cấu hình |

Kết luận: EventEmitter rất tốt để **tách module** và cho các side effect "mất cũng không sao" (ghi log, xóa cache). Với việc **phải đảm bảo xảy ra** như gửi mail xác thực, ta cần một nơi lưu tác vụ bền vững, có retry — đó là **Queue**. Ở Bonus 04, ta giữ nguyên `UserCreatedEvent` và listener, chỉ đổi một việc: listener **đẩy job vào queue** thay vì gửi mail trực tiếp.

---

## Common mistakes

1. **Listener không nằm trong `providers` → `@OnEvent` im lặng không chạy.**
   - **Tại sao:** NestJS chỉ quét các provider đã đăng ký trong module để tìm `@OnEvent`. Tạo file listener nhưng quên khai báo thì không có lỗi gì cả, event cứ thế không ai nghe.
   - **Cách sửa:** luôn thêm listener vào `providers` của module chứa nó; khi debug, đặt `Logger.log` trong constructor của listener để chắc nó được khởi tạo.

2. **Quên `EventEmitterModule.forRoot()` → lỗi DI "Nest can't resolve dependencies... EventEmitter2".**
   - **Tại sao:** `EventEmitter2` chỉ trở thành provider sau khi module được đăng ký (Lesson 05: DI container chỉ inject được thứ đã khai báo).
   - **Cách sửa:** gọi `EventEmitterModule.forRoot()` đúng một lần ở `AppModule`, không gọi lại ở feature module.

3. **Gõ tên event bằng chuỗi rải rác, sai một ký tự.**
   - **Tại sao:** `'user.created'` và `'users.created'` đều là string hợp lệ, TypeScript không bắt lỗi, listener không bao giờ chạy.
   - **Cách sửa:** dùng hằng số `USER_EVENTS` + payload class như mục 3.1, 3.2; không viết chuỗi trực tiếp trong `emit()` hay `@OnEvent()`.

4. **Emit event trước khi dữ liệu thực sự được lưu (hoặc trong transaction chưa commit).**
   - **Tại sao:** listener có thể gửi mail cho một user mà ngay sau đó transaction (Lesson 07) bị rollback — user nhận mail chào mừng cho tài khoản không tồn tại.
   - **Cách sửa:** chỉ emit **sau** khi `save()` hoặc transaction commit thành công; nếu dùng `dataSource.transaction(...)`, emit sau khi callback transaction đã trả về.

5. **Bọc `try/catch` quanh `emit()` và nghĩ rằng đã bắt được lỗi gửi mail.**
   - **Tại sao:** với listener async / `{ async: true }`, lỗi xảy ra sau khi `emit()` đã trả về, `try/catch` ở service không bao giờ thấy nó.
   - **Cách sửa:** xử lý lỗi **bên trong listener** (mục 4.2). Nếu thật sự cần biết kết quả, hoặc gọi service trực tiếp, hoặc dùng `emitAsync()` có chủ đích.

6. **Emit event trong `onModuleInit()` và event bị "mất".**
   - **Tại sao:** listener được đăng ký ở giai đoạn `onApplicationBootstrap` (Bonus 01), sau `onModuleInit`, nên event phát quá sớm không có ai nghe.
   - **Cách sửa:** emit trong `onApplicationBootstrap()`, hoặc inject `EventEmitterReadinessWatcher` và `await this.readinessWatcher.waitUntilReady()` trước khi emit.

---

## Bài tập thực hành trên lớp

**Đề bài**: Thêm tính năng đổi mật khẩu và cảnh báo bảo mật bằng event.

1. Tạo endpoint `PATCH /users/me/password`, bảo vệ bằng `JwtAuthGuard`, lấy user hiện tại bằng `@CurrentUser()` (Lesson 09). Body gồm `currentPassword`, `newPassword` (validate bằng class-validator).
2. Sau khi đổi thành công, `UsersService` emit `USER_EVENTS.PASSWORD_CHANGED` với payload class `UserPasswordChangedEvent` (`userId`, `email`, `changedAt: Date`).
3. Viết `PasswordChangedListener` trong `MailModule`, chạy `{ async: true }`, gửi mail plain text bằng `MailService.sendPlainText()` (Lesson 14) với nội dung: "Mật khẩu của bạn đã được thay đổi lúc HH:mm dd/mm/yyyy".
4. Xác nhận `UserAuditListener` (`user.*`) ghi log cho cả `user.created` lẫn `user.password_changed` mà không phải sửa code audit.
5. Cố tình cấu hình sai SMTP, chứng minh API vẫn trả `200` và lỗi chỉ xuất hiện trong log.

**Gợi ý hướng giải**:

- `@CurrentUser()` trả về `{ userId, email, role }` (từ `JwtStrategy.validate()` Lesson 09); dùng `userId` để `findOneBy`, so sánh mật khẩu cũ bằng `bcrypt.compare`, sai thì `throw new BadRequestException(...)`.
- Thêm `PASSWORD_CHANGED` vào `USER_EVENTS` trước, rồi để TypeScript dẫn đường: chỗ nào dùng sai tên sẽ báo lỗi ngay.
- Định dạng thời gian theo giờ Việt Nam: `changedAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })`.
- Không cần sửa `UsersModule.imports` — nếu thấy mình phải import `MailModule` vào `UsersModule`, bạn đang làm sai hướng.

---

## Homework

- [ ] Hoàn thiện bài tập trên lớp, chụp log console cho 2 trường hợp: SMTP đúng và SMTP sai.
- [ ] Thêm event `user.deleted` khi xóa user; viết listener xóa cache `user:{id}:profile` trong Redis (Lesson 13) bằng `cacheManager.del()`.
- [ ] Viết thêm listener `@OnEvent('*.created')` đếm số bản ghi được tạo theo từng loại (user, product...) và in ra mỗi khi đếm, kiểm tra wildcard nhiều namespace.
- [ ] Viết unit test (Lesson 15) cho `UsersService.create()`: mock `EventEmitter2` bằng `{ emit: jest.fn() }`, kiểm tra `emit` được gọi đúng một lần với `USER_EVENTS.CREATED` và một instance `UserCreatedEvent`; và **không** được gọi khi email đã tồn tại.
- [ ] Đo thời gian response của `POST /users` trong 3 cấu hình: listener sync, method `async` không có option, `{ async: true }`. Ghi lại kết quả và giải thích sự khác nhau.
- [ ] (Nâng cao) Tự viết cơ chế retry trong `UserCreatedListener`: thử gửi mail tối đa 3 lần, chờ 2 giây, 4 giây giữa các lần. Sau đó restart app trong lúc đang chờ retry và ghi lại chuyện gì xảy ra. Viết 3-5 câu giải thích vì sao cách này không đủ tin cậy cho production — đây là phần mở đầu cho Bonus 04.

---

## Câu hỏi ôn tập

1. Vì sao nên đặt tên event ở thì quá khứ (`user.created`) thay vì dạng mệnh lệnh (`send.welcome.mail`)? Việc đặt tên sai ảnh hưởng thế nào tới coupling?
2. Mặc định `emit()` gọi listener đồng bộ hay bất đồng bộ? Trong trường hợp nào một exception ở listener có thể khiến client nhận HTTP 500?
3. So sánh listener là method `async` với listener có option `{ async: true }`. Cái nào làm chậm response, cái nào không?
4. Vì sao lỗi trong async listener không thể được Exception Filter (Lesson 08) bắt và trả về client? Listener nên xử lý lỗi như thế nào?
5. Nêu 3 giới hạn của event in-process và cho biết Queue giải quyết từng giới hạn đó ra sao.
