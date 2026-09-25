# Bonus 04: Queue & Task Scheduling

> Tiên quyết: Lesson 13 (Redis chạy bằng Docker), Bonus 03 (Events với EventEmitter). Ví dụ dùng lại `MailService` từ Lesson 14.

## Mục tiêu bài học

Sau buổi học, học viên có thể:

- **Giải thích được** Queue là gì, nhận diện được tác vụ nào nên đưa vào Queue (gửi mail, xử lý ảnh, tác vụ chạy lâu) và tác vụ nào không.
- **Mô tả được** kiến trúc Producer → Queue → Consumer/Worker và vòng đời của một Job.
- **Cấu hình được** BullMQ với NestJS (`@nestjs/bullmq`) dùng Redis làm backend; **viết được** Producer thêm Job và Processor xử lý Job.
- **Cấu hình được** retry, backoff, delay cho Job và theo dõi Job bằng Bull Board, có bảo vệ route dashboard.
- **Viết được** tác vụ định kỳ với `@nestjs/schedule` (`@Cron`, `@Interval`, `@Timeout`).
- **Giải thích và xử lý được** vấn đề cron chạy trùng khi app chạy nhiều instance.

## Ôn tập nhanh

Ở Lesson 13, ta chạy Redis bằng Docker (`redis:7-alpine`, cổng `6379`) và dùng nó làm cache store chung cho nhiều instance NestJS. Redis không chỉ làm cache: nó còn là backend phổ biến nhất cho Queue trong hệ sinh thái Node.js. Ở Bonus 03, ta tách việc gửi mail chào mừng ra khỏi `UsersService` bằng `UserCreatedEvent` và `@OnEvent()`, nhưng cuối bài đã chỉ ra giới hạn: event nằm trong RAM của process nên **mất khi app restart**, **không có retry**, không chia tải được và không quan sát được. Bài này giữ nguyên event và listener, nhưng thay vì gửi mail ngay trong listener, ta đẩy một **job** vào Queue lưu trong Redis.

---

## 1. Queue là gì? Khi nào cần Queue

### 1.1 Khái niệm

**Queue** (hàng đợi) là nơi lưu các **tác vụ cần làm** theo thứ tự, để một tiến trình khác lấy ra và xử lý **sau**, độc lập với request đã tạo ra tác vụ đó.

Hình dung một quán cà phê: thu ngân nhận order, ghi phiếu, đặt phiếu lên quầy rồi phục vụ khách tiếp theo ngay. Pha chế lấy phiếu theo thứ tự và làm. Thu ngân không đứng chờ ly cà phê pha xong. Nếu một pha chế nghỉ, phiếu vẫn nằm trên quầy, người khác làm tiếp. Phiếu order chính là **job**, quầy là **queue**, thu ngân là **producer**, pha chế là **worker**.

```text
Không có Queue (xử lý trong request):
Client ── POST /users ──> API: save user ── gửi mail (2s) ── resize ảnh (3s) ──> 201 sau ~5s

Có Queue:
Client ── POST /users ──> API: save user ── add job vào Redis (~2ms) ──> 201 sau ~50ms
                                                   │
                                        Worker lấy job ──> gửi mail / resize ảnh
                                        (lỗi thì retry, restart app job vẫn còn trong Redis)
```

Khác biệt cốt lõi so với EventEmitter ở Bonus 03: job được **lưu bền vững trong Redis**, tách khỏi vòng đời của process. App có restart, job vẫn chờ ở đó.

### 1.2 Khi nào cần Queue?

Một tác vụ nên đưa vào Queue khi nó **chậm** (client không cần chờ), **có thể lỗi tạm thời** (phụ thuộc SMTP, API ngoài nên cần retry), **tốn tài nguyên** (không nên chạy chung với luồng phục vụ request), **cần giới hạn tốc độ**, hoặc **cần chạy sau một khoảng thời gian**.

| Use case | Vì sao dùng Queue |
| --- | --- |
| Gửi mail (xác thực, reset password, hóa đơn) | SMTP chậm, hay lỗi tạm thời, cần retry |
| Xử lý ảnh sau upload (Lesson 14): resize, tạo thumbnail | Tốn CPU, vài giây mỗi ảnh |
| Export báo cáo CSV/Excel, import file lớn | Chạy hàng chục giây đến vài phút |
| Gọi webhook / API bên thứ ba | Bên kia có thể down, cần retry có backoff |
| Gửi thông báo hàng loạt | Cần giới hạn tốc độ, chia nhiều worker |

**Không cần Queue** khi client cần kết quả ngay trong response (tính tổng đơn hàng, kiểm tra đăng nhập), hoặc tác vụ rất nhanh và mất cũng không sao (ghi log debug, xóa một cache key) — lúc đó gọi trực tiếp hoặc dùng EventEmitter là đủ.

---

## 2. Queue architecture

```text
   PRODUCER(S)                        REDIS: queue "mail"                    CONSUMER(S) / WORKER(S)
┌────────────────────┐  add(job)  ┌──────────────────────────────┐  lấy job  ┌──────────────────────┐
│ API instance #1    │ ─────────> │ waiting : [job3][job2][job1] │ ────────> │ Worker A (5 job/lúc) │
│ API instance #2    │            │ delayed : [job4 chạy +24h]   │           │ Worker B (5 job/lúc) │
│ Listener / Cron    │            │ active / completed / failed  │ <──────── │ báo thành công/lỗi   │
└────────────────────┘            └──────────────────────────────┘           └──────────────────────┘
```

Ba thành phần này **không biết trực tiếp về nhau**; chúng chỉ cùng biết tên queue (`'mail'`) và địa chỉ Redis. Đây là lý do Queue giúp hệ thống vừa bền vững vừa dễ scale.

### 2.1 Producer

**Producer** là code **tạo job và đẩy vào queue**. Trong NestJS, producer thường là một service, một event listener (như `UserCreatedListener` của Bonus 03) hoặc một cron job. Producer chỉ cần trả lời: job tên gì, dữ liệu gì, tùy chọn gì (retry bao nhiêu lần, delay bao lâu). Producer **không chờ** job chạy xong — `add()` resolve ngay khi job đã được ghi vào Redis.

### 2.2 Consumer / Worker

**Worker** (còn gọi là consumer) là tiến trình **lấy job ra khỏi queue và xử lý**. Một số đặc điểm quan trọng:

- Có thể có **nhiều worker** cùng nghe một queue, chạy ở nhiều instance hoặc nhiều máy. Redis đảm bảo **mỗi job chỉ được một worker lấy** tại một thời điểm.
- Mỗi worker có **concurrency**: số job xử lý song song trong cùng process (ví dụ 5 mail cùng lúc).
- Worker có thể chạy **cùng process với API** (đơn giản, phù hợp dự án nhỏ) hoặc **process riêng** (API không bị ảnh hưởng khi worker bận).
- Nếu worker chết giữa chừng khi đang xử lý, job bị đánh dấu **stalled** và được trả lại hàng đợi cho worker khác.

### 2.3 Job

**Job** là một đơn vị công việc, được lưu trong Redis dưới dạng JSON. Mỗi job có:

| Thuộc tính | Ý nghĩa |
| --- | --- |
| `id` | Định danh, tự sinh hoặc tự đặt (`jobId`) để chống trùng |
| `name` | Loại công việc trong queue, ví dụ `'welcome'`, `'reset-password'` |
| `data` | Dữ liệu đầu vào, **phải serialize được thành JSON** |
| `opts` | Tùy chọn: `attempts`, `backoff`, `delay`, `priority`, `removeOnComplete`... |
| `attemptsMade` | Đã thử bao nhiêu lần |
| `progress`, `returnvalue`, `failedReason` | Tiến độ, kết quả, lý do lỗi |

Vòng đời của job:

```text
 queue.add() ──(không delay)──> waiting ──── worker lấy job ────> active ──thành công──> completed
      │                           ▲                                 │
      └──(có delay)──> delayed ───┘ (hết thời gian chờ)             │
                          ▲                                         │
                          └───── lỗi, còn lượt retry (chờ backoff) ─┤
                                                                    └── lỗi, hết lượt ──> failed
```

---

## 3. BullMQ với NestJS (`@nestjs/bullmq`), dùng Redis làm backend

**BullMQ** là thư viện queue cho Node.js, viết bằng TypeScript, lưu toàn bộ trạng thái job trong Redis. NestJS cung cấp gói tích hợp `@nestjs/bullmq`. Lưu ý: nhiều tutorial cũ dùng `@nestjs/bull` + `bull` — đó là thế hệ trước, đang ở chế độ bảo trì; API khác nhau (decorator `@Process()`...), **không trộn lẫn hai bộ này**.

### 3.1 Cài đặt và kết nối Redis

```bash
# terminal
npm install @nestjs/bullmq bullmq
```

Dùng lại Redis từ Lesson 13. Thêm `command` để đảm bảo Redis không tự xóa key khi đầy bộ nhớ — với cache thì xóa bớt là bình thường, nhưng với queue, key bị xóa nghĩa là **mất job**.

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    container_name: redis-local
    ports:
      - '6379:6379'
    command: ['redis-server', '--maxmemory-policy', 'noeviction']
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
```

Kết nối BullMQ tới Redis **một lần** ở `AppModule`, đồng thời đặt tùy chọn mặc định cho mọi job:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
        },
        defaultJobOptions: {
          attempts: 3,                                   // mặc định thử tối đa 3 lần
          backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, ...
          removeOnComplete: 1000, // chỉ giữ 1000 job thành công gần nhất
          removeOnFail: 5000,     // giữ nhiều job lỗi hơn để điều tra
        },
      }),
    }),
    // EventEmitterModule, TypeOrmModule, UsersModule, MailModule... như các bài trước
  ],
})
export class AppModule {}
```

`removeOnComplete` / `removeOnFail` rất quan trọng: không đặt thì mọi job hoàn thành nằm mãi trong Redis, bộ nhớ tăng dần theo thời gian.

### 3.2 Tạo Queue, thêm Job

Mỗi queue được đăng ký trong **feature module** sở hữu nó bằng `BullModule.registerQueue()`. Tên queue và tên job nên là hằng số, cùng lý do với tên event ở Bonus 03.

```typescript
// src/mail/mail.constants.ts
export const MAIL_QUEUE = 'mail';

export const MAIL_JOBS = {
  WELCOME: 'welcome',
  PROFILE_REMINDER: 'profile-reminder',
} as const;

// Dữ liệu job chỉ chứa giá trị đơn giản, serialize được thành JSON
export interface WelcomeMailJobData {
  userId: number;
  email: string;
  name: string;
  verifyToken: string;
}

export interface ProfileReminderJobData {
  userId: number;
  email: string;
  name: string;
}

export type MailJobData = WelcomeMailJobData | ProfileReminderJobData;
```

```typescript
// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MAIL_QUEUE } from './mail.constants';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { UserCreatedListener } from './listeners/user-created.listener';

@Module({
  imports: [
    // MailerModule.forRootAsync({...}) giữ nguyên như Lesson 14
    BullModule.registerQueue({ name: MAIL_QUEUE }),
  ],
  providers: [MailService, MailProcessor, UserCreatedListener],
  exports: [MailService, BullModule], // export BullModule để module khác inject được queue 'mail'
})
export class MailModule {}
```

**Làm lại ví dụ Bonus 03**: listener giờ đóng vai **producer**. Nó không gửi mail nữa mà chỉ thêm job vào queue — việc này chỉ mất vài ms.

```typescript
// src/mail/listeners/user-created.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { USER_EVENTS } from '../../common/events/event-names';
import { UserCreatedEvent } from '../../modules/users/events/user-created.event';
import { MAIL_JOBS, MAIL_QUEUE, MailJobData } from '../mail.constants';

@Injectable()
export class UserCreatedListener {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue<MailJobData>) {}

  @OnEvent(USER_EVENTS.CREATED)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    // Producer: chỉ ghi job vào Redis, việc gửi mail để worker lo
    await this.mailQueue.add(
      MAIL_JOBS.WELCOME,
      {
        userId: event.userId,
        email: event.email,
        name: event.name,
        verifyToken: event.verifyToken,
      },
      {
        jobId: `welcome-${event.userId}`, // cùng jobId -> không tạo job trùng
        attempts: 5,                      // mail quan trọng: thử nhiều hơn mặc định
      },
    );

    // Nhắc hoàn thiện hồ sơ sau 24 giờ (xem mục 3.5)
    await this.mailQueue.add(
      MAIL_JOBS.PROFILE_REMINDER,
      { userId: event.userId, email: event.email, name: event.name },
      { jobId: `profile-reminder-${event.userId}`, delay: 24 * 60 * 60 * 1000 },
    );
  }
}
```

`UsersService` và `UsersController` của Bonus 03 **không đổi một dòng nào** — đây chính là lợi ích của việc đã tách bằng event từ trước.

Vì sao cách này đáng tin cậy hơn? So sánh cùng các tình huống:

| Tình huống | Bonus 03 (gửi mail trong listener) | Bonus 04 (listener thêm job) |
| --- | --- | --- |
| SMTP lỗi 30 giây | Log lỗi, mail mất | Job retry sau 2s, 4s, 8s... đến khi thành công |
| Deploy/restart khi mail đang chờ gửi | Mail mất, không ai biết | Job vẫn nằm trong Redis; job đang chạy dở bị đánh dấu stalled và được chạy lại |
| 1000 user đăng ký cùng lúc | 1000 kết nối SMTP trong process API | Worker xử lý dần với concurrency cố định |
| Muốn biết mail nào lỗi | Lục log | Xem danh sách failed trên Bull Board, bấm retry |

Vẫn còn một khoảng hở vài ms giữa lúc lưu user và lúc `add()` job. Muốn job chắc chắn nằm trong Redis trước khi trả `201`, `UsersService` dùng `await this.eventEmitter.emitAsync(...)` thay cho `emit()`; muốn tuyệt đối thì tìm hiểu thêm pattern **Transactional Outbox**.

**Tác vụ chạy lâu với pattern `202 Accepted`**: với việc mất vài chục giây như export báo cáo, API trả ngay `jobId` để client hỏi lại trạng thái sau.

```typescript
// src/modules/reports/reports.constants.ts
export const REPORTS_QUEUE = 'reports';

export const REPORT_JOBS = {
  EXPORT_USERS: 'export-users',
  DAILY_SUMMARY: 'daily-summary',
} as const;

export interface ExportUsersJobData {
  requestedBy: number; // userId của người yêu cầu, dùng để kiểm tra ownership
}
```

```typescript
// src/modules/reports/reports.controller.ts
import {
  Controller, ForbiddenException, Get, HttpCode, HttpStatus,
  NotFoundException, Param, Post, UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { REPORT_JOBS, REPORTS_QUEUE, ExportUsersJobData } from './reports.constants';

// Shape do JwtStrategy.validate() trả về ở Lesson 09
interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    @InjectQueue(REPORTS_QUEUE) private readonly reportsQueue: Queue<ExportUsersJobData>,
  ) {}

  @Post('users/export')
  @HttpCode(HttpStatus.ACCEPTED) // 202: đã nhận yêu cầu, sẽ xử lý sau
  async exportUsers(@CurrentUser() user: AuthUser) {
    const job = await this.reportsQueue.add(REPORT_JOBS.EXPORT_USERS, {
      requestedBy: user.userId,
    });
    return { jobId: job.id };
  }

  @Get('jobs/:id')
  async getJobStatus(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const job = await this.reportsQueue.getJob(id);
    if (!job) throw new NotFoundException('Không tìm thấy job');
    // Ownership check (Lesson 10): chỉ người tạo job được xem
    if (job.data.requestedBy !== user.userId) throw new ForbiddenException();

    return {
      id: job.id,
      state: await job.getState(), // waiting | active | completed | failed | delayed
      progress: job.progress,
      result: job.returnvalue,     // { fileUrl } khi hoàn thành
      failedReason: job.failedReason ?? null,
    };
  }
}
```

```json
// POST /reports/users/export -> 202
{ "success": true, "statusCode": 202, "data": { "jobId": "15" } }

// GET /reports/jobs/15 -> 200 (vài giây sau)
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "15",
    "state": "completed",
    "progress": 100,
    "result": { "fileUrl": "http://localhost:3000/uploads/reports/users-15.csv" },
    "failedReason": null
  }
}
```

### 3.3 Processor xử lý Job

**Processor** là worker trong NestJS: một class gắn `@Processor(tênQueue)`, kế thừa `WorkerHost` và cài đặt method `process(job)`. Khi app khởi động, `@nestjs/bullmq` tạo một BullMQ `Worker` cho class này. Quy tắc quan trọng nhất:

- `process()` **resolve** → job `completed`, giá trị trả về lưu vào `job.returnvalue`.
- `process()` **throw / reject** → job lỗi, BullMQ retry nếu còn lượt, hết lượt thì `failed`.

Một queue có thể chứa nhiều loại job, nên ta `switch` theo `job.name`.

```typescript
// src/mail/mail.processor.ts
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import {
  MAIL_JOBS, MAIL_QUEUE, MailJobData,
  ProfileReminderJobData, WelcomeMailJobData,
} from './mail.constants';

@Processor(MAIL_QUEUE, {
  concurrency: 5,                         // xử lý tối đa 5 job song song trong process này
  limiter: { max: 10, duration: 1000 },   // tối đa 10 job/giây (giới hạn của nhà cung cấp mail)
})
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super(); // bắt buộc vì kế thừa WorkerHost
  }

  async process(job: Job<MailJobData>): Promise<void> {
    switch (job.name) {
      case MAIL_JOBS.WELCOME: {
        const data = job.data as WelcomeMailJobData; // job.name đã xác định loại dữ liệu
        await this.mailService.sendWelcomeEmail(
          { name: data.name, email: data.email },
          data.verifyToken,
        );
        return;
      }
      case MAIL_JOBS.PROFILE_REMINDER: {
        const data = job.data as ProfileReminderJobData;
        await this.mailService.sendPlainText(
          data.email,
          'Hoàn thiện hồ sơ của bạn',
          `Chào ${data.name}, hãy cập nhật ảnh đại diện và thông tin cá nhân nhé!`,
        );
        return;
      }
      default:
        // Không nuốt lỗi: throw để job vào failed và được nhìn thấy trên dashboard
        throw new Error(`Job không được hỗ trợ: ${job.name}`);
    }
  }

  // Lắng nghe sự kiện của Worker để log (không bắt buộc)
  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Job ${job.name}#${job.id} xong sau ${job.attemptsMade} lần thử`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(`Job ${job?.name}#${job?.id} lỗi (lần ${job?.attemptsMade}): ${error.message}`);
  }
}
```

Processor là provider bình thường, nên phải có trong `providers` của module (đã khai báo ở `MailModule`), và nó inject được mọi service như bình thường.

Processor cho báo cáo dùng `job.updateProgress()` để client thấy tiến độ qua endpoint `GET /reports/jobs/:id`:

```typescript
// src/modules/reports/reports.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { User } from '../users/entities/user.entity';
import { REPORT_JOBS, REPORTS_QUEUE } from './reports.constants';

@Processor(REPORTS_QUEUE, { concurrency: 1 }) // báo cáo nặng: mỗi process chỉ chạy 1 cái
export class ReportsProcessor extends WorkerHost {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ fileUrl: string } | void> {
    if (job.name === REPORT_JOBS.EXPORT_USERS) return this.exportUsers(job);
    if (job.name === REPORT_JOBS.DAILY_SUMMARY) return; // cài đặt ở mục 4.4
    throw new Error(`Job không được hỗ trợ: ${job.name}`);
  }

  private async exportUsers(job: Job): Promise<{ fileUrl: string }> {
    const users = await this.usersRepository.find({ select: { id: true, name: true, email: true } });
    await job.updateProgress(50);

    const csv = ['id,name,email', ...users.map((u) => `${u.id},"${u.name}",${u.email}`)].join('\n');
    const dir = join(process.cwd(), 'uploads', 'reports');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `users-${job.id}.csv`), csv, 'utf8');
    await job.updateProgress(100);

    // Giá trị trả về được lưu vào job.returnvalue
    const baseUrl = this.config.get<string>('BASE_URL', 'http://localhost:3000');
    return { fileUrl: `${baseUrl}/uploads/reports/users-${job.id}.csv` }; // static serving Lesson 14
  }
}
```

```typescript
// src/modules/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { MailModule } from '../../mail/mail.module';
import { REPORTS_QUEUE } from './reports.constants';
import { ReportsController } from './reports.controller';
import { ReportsProcessor } from './reports.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: REPORTS_QUEUE }),
    TypeOrmModule.forFeature([User]),
    MailModule, // dùng MailService ở mục 4.4
  ],
  controllers: [ReportsController],
  providers: [ReportsProcessor],
})
export class ReportsModule {}
```

### 3.4 Job retry và backoff

**Retry** là chạy lại job khi lỗi; **backoff** là khoảng thời gian chờ trước mỗi lần chạy lại. Không chờ mà retry ngay thì gần như chắc chắn lỗi tiếp (SMTP vẫn đang down), còn làm quá tải thêm hệ thống bên kia.

- `attempts`: **tổng số lần chạy**, tính cả lần đầu. `attempts: 1` (mặc định của BullMQ nếu không cấu hình) nghĩa là không retry.
- `backoff: { type: 'fixed', delay: 5000 }`: luôn chờ 5 giây.
- `backoff: { type: 'exponential', delay: 2000 }`: chờ tăng gấp đôi sau mỗi lần lỗi.

Với `attempts: 5` và exponential `delay: 2000`, timeline như sau:

```text
Lần 1 (t=0s)  lỗi ── chờ 2s ──> Lần 2 (t=2s)  lỗi ── chờ 4s ──> Lần 3 (t=6s)  lỗi
     ── chờ 8s ──> Lần 4 (t=14s) lỗi ── chờ 16s ──> Lần 5 (t=30s) lỗi ──> failed
```

Exponential backoff là lựa chọn tốt cho lỗi mạng và dịch vụ ngoài: vài lần đầu retry nhanh, sau đó giãn dần để bên kia kịp hồi phục.

**Không phải lỗi nào cũng nên retry.** Email không tồn tại hay dữ liệu sai thì retry 5 lần vẫn sai. Khi đó throw `UnrecoverableError` để BullMQ chuyển job sang `failed` ngay:

```typescript
// src/mail/mail.processor.ts (trích đoạn trong case MAIL_JOBS.WELCOME)
import { UnrecoverableError } from 'bullmq';

if (!data.email.includes('@')) {
  throw new UnrecoverableError(`Email không hợp lệ: ${data.email}`); // không retry
}
```

**Idempotency (chạy nhiều lần vẫn an toàn)**: retry nghĩa là một job **có thể chạy hơn một lần**. Ví dụ SMTP đã nhận mail nhưng mất kết nối trước khi trả kết quả → job bị tính là lỗi → retry → user nhận 2 mail. Với mail chào mừng thì chấp nhận được; với "trừ tiền" hay "cộng điểm thưởng" thì không. Cách phòng: trước khi làm, kiểm tra đã làm chưa (ví dụ cột `welcomeMailSentAt` trong bảng users), làm xong thì đánh dấu.

**Stalled job**: khi worker đang xử lý mà process chết (crash, bị kill khi deploy), job giữ "khóa" trong Redis. Sau khi khóa hết hạn, một worker khác phát hiện job bị **stalled** và đưa về `waiting` để chạy lại. Để giảm tình huống này khi deploy, bật `app.enableShutdownHooks()` trong `main.ts` (Bonus 01) để worker được đóng gọn gàng khi nhận SIGTERM.

### 3.5 Job delay

`delay` (milliseconds) khiến job nằm ở trạng thái `delayed`, chỉ chuyển sang `waiting` khi hết thời gian chờ. Ta đã dùng nó ở mục 3.2 cho mail nhắc hoàn thiện hồ sơ sau 24 giờ. Khác với `setTimeout`, delay được lưu trong Redis nên app restart không làm mất lịch.

Muốn chạy vào **một thời điểm cụ thể**, tính khoảng cách tới thời điểm đó. Nhớ ghi rõ múi giờ (ở đây GMT+7):

```typescript
// src/modules/campaigns/campaigns.service.ts
// Gửi mail khuyến mãi lúc 09:00 ngày 01/10/2026 giờ Việt Nam
// campaignQueue: queue 'campaign' đăng ký bằng BullModule.registerQueue như mục 3.2
const sendAt = new Date('2026-10-01T09:00:00+07:00');
await this.campaignQueue.add(
  'send-promotion',
  { campaignId: 7 },
  { delay: Math.max(sendAt.getTime() - Date.now(), 0) }, // không để delay âm
);
```

Vì job nhắc hồ sơ có `jobId` cố định, ta **hủy được** khi không còn cần — ví dụ user đã hoàn thiện hồ sơ trước 24 giờ:

```typescript
// src/modules/users/users.service.ts (trích đoạn)
async completeProfile(userId: number, dto: UpdateProfileDto): Promise<User> {
  const user = await this.updateProfile(userId, dto);
  await this.mailQueue.remove(`profile-reminder-${userId}`); // hủy job delayed nếu còn
  return user;
}
```

Để inject được queue `'mail'`, `UsersModule` phải import `MailModule` (đã export `BullModule`); cách sạch hơn là phát event `user.profile_completed` và để listener trong `MailModule` gọi `remove()`.

### 3.6 Job monitoring (Bull Board)

Khi job chạy ngầm, ta cần một nơi để xem: bao nhiêu job đang chờ, job nào lỗi, lỗi gì, và retry thủ công. **Bull Board** là dashboard web cho BullMQ.

```bash
# terminal
npm install @bull-board/nestjs @bull-board/api @bull-board/express express-basic-auth
```

```typescript
// src/app.module.ts (bổ sung)
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    // ... BullModule.forRootAsync như mục 3.1
    BullBoardModule.forRoot({
      route: '/queues',        // dashboard tại http://localhost:3000/queues
      adapter: ExpressAdapter, // project dùng Express (mặc định của Nest)
    }),
  ],
})
export class AppModule {}
```

Mỗi queue muốn hiện trên dashboard được đăng ký ở module sở hữu nó:

```typescript
// src/mail/mail.module.ts (bổ sung vào imports)
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

BullModule.registerQueue({ name: MAIL_QUEUE }),
BullBoardModule.forFeature({ name: MAIL_QUEUE, adapter: BullMQAdapter }),
```

Trên dashboard, bạn thấy các tab `Waiting`, `Active`, `Delayed`, `Completed`, `Failed`; mở từng job để xem `data`, số lần thử, stack trace lỗi, log; và có nút **Retry** / **Clean**.

**Cảnh báo bảo mật**: dashboard hiển thị toàn bộ `job.data` (email, token xác thực...) và cho phép xóa/retry job. Bull Board được gắn vào app dưới dạng **middleware Express**, không đi qua Guard, nên `JwtAuthGuard` global (Lesson 09) **không bảo vệ nó**. Ở production bắt buộc phải bảo vệ route này, tối thiểu bằng basic auth, và tốt hơn là chỉ mở trong mạng nội bộ/VPN:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import basicAuth from 'express-basic-auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Đăng ký TRƯỚC khi app.listen() để chạy trước middleware của Bull Board
  app.use(
    '/queues',
    basicAuth({
      users: { [process.env.BULL_BOARD_USER ?? 'admin']: process.env.BULL_BOARD_PASSWORD ?? '' },
      challenge: true, // trình duyệt hiện hộp thoại đăng nhập
    }),
  );

  app.enableShutdownHooks(); // đóng worker gọn gàng khi deploy (mục 3.4)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Không commit mật khẩu vào code; đặt `BULL_BOARD_USER`, `BULL_BOARD_PASSWORD` trong `.env` và dùng mật khẩu mạnh.

---

## 4. Task Scheduling với `@nestjs/schedule`

Queue trả lời câu hỏi "làm việc này **ở đâu**, bền vững thế nào". **Task scheduling** trả lời câu hỏi "làm việc này **khi nào**": mỗi đêm dọn file tạm, mỗi sáng gửi báo cáo, mỗi 10 phút cập nhật tỷ giá.

### 4.1 Cài đặt

```bash
# terminal
npm install @nestjs/schedule
```

```typescript
// src/app.module.ts (bổ sung)
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // quét các method có @Cron / @Interval / @Timeout
  ],
})
export class AppModule {}
```

Giống `@OnEvent`, các decorator này chỉ hoạt động trên method của **provider đã đăng ký** trong một module.

### 4.2 Cron jobs (`@Cron`)

**Cron expression** mô tả lịch chạy lặp lại. `@nestjs/schedule` hỗ trợ 6 trường (trường giây là tùy chọn):

```text
┌──────────── giây (0-59, tùy chọn)
│ ┌────────── phút (0-59)
│ │ ┌──────── giờ (0-23)
│ │ │ ┌────── ngày trong tháng (1-31)
│ │ │ │ ┌──── tháng (1-12)
│ │ │ │ │ ┌── thứ trong tuần (0-7, 0 và 7 là Chủ nhật)
* * * * * *

'0 0 2 * * *'     -> 02:00:00 mỗi ngày
'0 */10 * * * *'  -> mỗi 10 phút
'0 0 8 * * 1-5'   -> 08:00 từ thứ Hai đến thứ Sáu
```

Có sẵn enum `CronExpression` cho các lịch phổ biến. Luôn đặt `timeZone`, nếu không cron chạy theo giờ của server (thường là UTC trên cloud, lệch 7 tiếng so với giờ Việt Nam).

```typescript
// src/modules/reports/tasks/cleanup.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class CleanupTask {
  private readonly logger = new Logger(CleanupTask.name);
  private readonly reportsDir = join(process.cwd(), 'uploads', 'reports');

  // 02:00 sáng mỗi ngày theo giờ Việt Nam: xóa file báo cáo cũ hơn 7 ngày
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'cleanup-old-reports',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async removeOldReports(): Promise<void> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const files = await readdir(this.reportsDir).catch(() => [] as string[]);
    let removed = 0;

    for (const file of files) {
      const filePath = join(this.reportsDir, file);
      if ((await stat(filePath)).mtimeMs < sevenDaysAgo) {
        await unlink(filePath);
        removed++;
      }
    }
    this.logger.log(`Đã xóa ${removed} file báo cáo cũ`);
  }
}
```

Nhớ thêm `CleanupTask` vào `providers` của `ReportsModule`. Cron handler nên **ngắn gọn**: nếu việc cần làm nặng, handler chỉ nên thêm job vào Queue và để worker xử lý (mục 4.4 sẽ thấy lý do thứ hai).

### 4.3 Interval, Timeout

- **`@Interval(name, ms)`**: chạy lặp lại sau mỗi khoảng thời gian cố định, bắt đầu tính từ lúc app khởi động (không gắn với giờ đồng hồ như cron).
- **`@Timeout(name, ms)`**: chạy **một lần** sau khi app khởi động được `ms` milliseconds — hợp để "làm nóng" cache.

```typescript
// src/modules/products/tasks/products.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Interval, Timeout } from '@nestjs/schedule';
import { ProductsService } from '../products.service';

@Injectable()
export class ProductsTask {
  private readonly logger = new Logger(ProductsTask.name);
  private isSyncing = false; // cờ chống chạy chồng

  constructor(private readonly productsService: ProductsService) {}

  // Mỗi 10 phút đồng bộ giá từ hệ thống kho
  @Interval('sync-prices', 10 * 60 * 1000)
  async syncPrices(): Promise<void> {
    if (this.isSyncing) {
      this.logger.warn('Lần đồng bộ trước chưa xong, bỏ qua lần này');
      return;
    }
    this.isSyncing = true;
    try {
      await this.productsService.syncPricesFromWarehouse();
    } finally {
      this.isSyncing = false; // luôn reset kể cả khi lỗi
    }
  }

  // 5 giây sau khi khởi động: nạp sẵn sản phẩm nổi bật vào Redis cache (Lesson 13)
  @Timeout('warm-up-featured-cache', 5000)
  async warmUpCache(): Promise<void> {
    await this.productsService.findFeatured(); // Cache Aside: lần gọi đầu sẽ ghi cache
    this.logger.log('Đã làm nóng cache products:featured');
  }
}
```

Chú ý cờ `isSyncing`: `@Interval` **không chờ** lần chạy trước kết thúc. Nếu một lần đồng bộ mất 12 phút mà interval là 10 phút, hai lần sẽ chạy chồng lên nhau. Cron cũng có nguy cơ tương tự khi lịch dày.

Muốn dừng/bật task lúc runtime (ví dụ endpoint admin tạm dừng đồng bộ), inject `SchedulerRegistry` và dùng `getCronJob(name)`, `getInterval(name)`, `deleteInterval(name)`... — đó là lý do nên đặt `name` cho mọi task.

### 4.4 Lưu ý khi chạy nhiều instance: job bị chạy trùng

`ScheduleModule` chạy **trong từng process**, và mỗi process không hề biết process khác tồn tại. Khi scale lên nhiều instance (PM2 cluster ở Lesson 16, nhiều container Docker, nhiều server sau load balancer), **mỗi instance đều tự chạy cron của nó**:

```text
08:00:00 GMT+7
  API instance #1 ── @Cron('0 0 8 * * *') ──> gửi báo cáo cho admin
  API instance #2 ── @Cron('0 0 8 * * *') ──> gửi báo cáo cho admin
  API instance #3 ── @Cron('0 0 8 * * *') ──> gửi báo cáo cho admin
                                                 => admin nhận 3 mail giống nhau
```

Với task **idempotent** như `CleanupTask` (xóa file cũ — chạy 3 lần thì lần 2, 3 không còn gì để xóa), trùng chỉ lãng phí. Với task **không idempotent** (gửi mail, tính lương, cộng điểm), trùng là bug. Lưu ý: điều này **khác với worker của Queue** — worker chạy ở mọi instance là điều ta **muốn** (chia tải), vì Redis đảm bảo mỗi job chỉ một worker lấy.

Có 3 hướng xử lý thực tế:

**Cách 1 — Chỉ bật scheduler ở một instance chuyên dụng.** Dùng biến môi trường để quyết định instance nào import `ScheduleModule`. Khi không import module này, các decorator `@Cron` chỉ là metadata, không có gì chạy.

```typescript
// src/app.module.ts (bổ sung)
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Chỉ instance có RUN_SCHEDULER=true mới chạy @Cron/@Interval/@Timeout
    ConditionalModule.registerWhen(
      ScheduleModule.forRoot(),
      (env: NodeJS.ProcessEnv) => env.RUN_SCHEDULER === 'true',
    ),
  ],
})
export class AppModule {}
```

```yaml
# docker-compose.yml (trích đoạn)
services:
  api-1:
    build: .
    environment: { RUN_SCHEDULER: 'false' }
  api-2:
    build: .
    environment: { RUN_SCHEDULER: 'false' }
  scheduler:          # instance duy nhất chạy cron, không cần mở port ra ngoài
    build: .
    environment: { RUN_SCHEDULER: 'true' }
```

Với PM2 cluster trên cùng một máy, có thể kiểm tra `process.env.NODE_APP_INSTANCE === '0'` để chỉ instance đầu tiên chạy scheduler. Ưu điểm: đơn giản, dễ hiểu. Nhược điểm: instance scheduler chết thì không có cron nào chạy cho tới khi nó được khởi động lại (single point of failure).

**Cách 2 — Dùng BullMQ Job Scheduler để Redis điều phối.** Thay `@Cron` bằng một "lịch" lưu trong Redis. Mỗi instance khi khởi động đều gọi `upsertJobScheduler()` với **cùng một id** — thao tác này idempotent, nên dù 3 instance cùng gọi thì Redis vẫn chỉ có **một** scheduler. Đến giờ, BullMQ tạo đúng **một** job cho mỗi mốc thời gian, và chỉ **một** worker lấy được job đó. Bonus: job có retry, backoff và hiện trên Bull Board như mọi job khác.

```typescript
// src/modules/reports/reports.scheduler.ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { REPORT_JOBS, REPORTS_QUEUE } from './reports.constants';

@Injectable()
export class ReportsScheduler implements OnApplicationBootstrap {
  constructor(@InjectQueue(REPORTS_QUEUE) private readonly reportsQueue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    // Gọi ở mọi instance cũng an toàn: cùng id -> cập nhật, không tạo thêm
    await this.reportsQueue.upsertJobScheduler(
      'daily-summary-scheduler',                            // id của lịch
      { pattern: '0 0 8 * * *', tz: 'Asia/Ho_Chi_Minh' },   // 08:00 mỗi ngày, GMT+7
      {
        name: REPORT_JOBS.DAILY_SUMMARY,                    // job được tạo ra mỗi lần
        data: {},
        opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      },
    );
  }
}
```

Hoàn thiện nhánh `DAILY_SUMMARY` trong `ReportsProcessor` (mục 3.3):

```typescript
// src/modules/reports/reports.processor.ts (bổ sung)
// constructor inject thêm: private readonly mailService: MailService
private async sendDailySummary(): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newUsers = await this.usersRepository.count({
    where: { createdAt: MoreThanOrEqual(since) }, // import MoreThanOrEqual từ 'typeorm'
  });

  // Định dạng dd/mm/yyyy theo giờ Việt Nam
  const today = new Date().toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  await this.mailService.sendPlainText(
    this.config.get<string>('ADMIN_EMAIL', 'admin@example.com'),
    `Báo cáo ngày ${today}`,
    `Có ${newUsers} user mới trong 24 giờ qua.`,
  );
}
// Trong process(): if (job.name === REPORT_JOBS.DAILY_SUMMARY) return this.sendDailySummary();
```

Nhớ thêm `ReportsScheduler` vào `providers` của `ReportsModule`. Muốn xóa lịch: `reportsQueue.removeJobScheduler('daily-summary-scheduler')`. (Tài liệu cũ dùng `queue.add(name, data, { repeat: {...} })` — đó là "repeatable job", cách viết trước khi có Job Scheduler.)

**Cách 3 — Distributed lock bằng Redis.** Giữ `@Cron` ở mọi instance, nhưng trước khi chạy, instance nào đặt được khóa trong Redis (`SET lock:daily-summary <instanceId> NX EX 300` — chỉ thành công nếu key chưa tồn tại) thì mới chạy, các instance khác bỏ qua. Cách này đúng nhưng dễ sai ở chi tiết (thời hạn khóa, giải phóng khóa), nên chỉ dùng khi không có BullMQ.

| Tiêu chí | Cách 1: instance riêng | Cách 2: BullMQ Job Scheduler | Cách 3: Redis lock |
| --- | --- | --- | --- |
| Độ phức tạp | Thấp | Trung bình (đã có BullMQ thì thấp) | Trung bình, dễ sai |
| Instance chết | Cron dừng | Instance khác xử lý tiếp | Instance khác xử lý tiếp |
| Retry khi lỗi | Tự viết | Có sẵn | Tự viết |
| Theo dõi | Log | Bull Board | Log |

Khuyến nghị: dự án đã dùng BullMQ thì chọn **Cách 2** cho task quan trọng; dùng `@Cron` cho task idempotent, nhẹ (dọn file, làm nóng cache) kết hợp **Cách 1** nếu cần.

---

## Common mistakes

1. **Trộn `@nestjs/bull` với `bullmq`, hoặc chép code từ tutorial cũ.**
   - **Tại sao:** `@Process()`, `@nestjs/bull`, `bull` là thế hệ cũ; import `Processor` từ gói này nhưng `Queue` từ `bullmq` sẽ khiến worker không bao giờ nhận job, hoặc lỗi DI khó hiểu.
   - **Cách sửa:** chỉ dùng `@nestjs/bullmq` + `bullmq`; processor phải `extends WorkerHost` và cài đặt `process(job)`.

2. **Bắt lỗi trong `process()` rồi không throw lại.**
   - **Tại sao:** `process()` resolve bình thường thì BullMQ coi job là `completed` — không retry, không hiện ở tab Failed, mail lặng lẽ biến mất như ở Bonus 03.
   - **Cách sửa:** chỉ `try/catch` để thêm ngữ cảnh vào log rồi **throw lại**; dùng `UnrecoverableError` khi muốn fail ngay mà không retry.

3. **Nhét entity hoặc dữ liệu lớn vào `job.data`.**
   - **Tại sao:** job được lưu dạng JSON trong Redis; entity mất method, `Date` thành string, relation có thể vòng lặp; file Buffer làm Redis phình to. Truyền nguyên `User` còn lộ password hash trên Bull Board.
   - **Cách sửa:** chỉ truyền id và vài field cần thiết (`userId`, `email`), file thì truyền đường dẫn / URL (Lesson 14), worker tự query lại dữ liệu mới nhất.

4. **Dùng `@Cron` cho task không idempotent khi chạy nhiều instance.**
   - **Tại sao:** mỗi instance tự chạy cron, user/admin nhận mail trùng (mục 4.4). Lỗi này không xuất hiện ở local vì local chỉ có 1 instance.
   - **Cách sửa:** dùng BullMQ Job Scheduler hoặc chỉ bật `ScheduleModule` ở một instance.

5. **Để Bull Board công khai ở production.**
   - **Tại sao:** ai biết URL `/queues` cũng xem được email, token trong job và có thể xóa toàn bộ job; Guard của Nest không áp dụng cho route này.
   - **Cách sửa:** basic auth với mật khẩu mạnh trong `.env`, giới hạn mạng nội bộ, hoặc tắt hẳn ở production.

---

## Bài tập thực hành trên lớp

**Đề bài**: Chuyển tính năng xử lý avatar (Lesson 14) và cảnh báo đổi mật khẩu (bài tập Bonus 03) sang Queue.

1. Tạo queue `image`. Endpoint `POST /users/me/avatar` (bảo vệ bằng `JwtAuthGuard`, lấy user bằng `@CurrentUser()`) lưu file gốc bằng Multer như Lesson 14, rồi thêm job `create-thumbnails` với `data: { userId, filePath }` và trả `202 Accepted` kèm `jobId`.
2. Viết `ImageProcessor` (`concurrency: 2`) tạo 2 thumbnail 64x64 và 256x256 bằng thư viện `sharp`, gọi `job.updateProgress()` sau mỗi kích thước, trả về URL các thumbnail.
3. Viết `GET /users/me/avatar/jobs/:id` trả trạng thái job, chỉ chủ sở hữu job được xem.
4. Sửa `PasswordChangedListener` của Bonus 03 để thêm job vào queue `mail` thay vì gửi mail trực tiếp, `attempts: 5`, backoff exponential.
5. Đăng ký cả 2 queue lên Bull Board, bảo vệ bằng basic auth. Cố tình sai SMTP, quan sát job retry trên dashboard rồi sửa SMTP và bấm Retry.

**Gợi ý hướng giải**:

- Cài `sharp` (`npm install sharp`). Trong processor: `await sharp(filePath).resize(64, 64).toFile(outputPath)`.
- Job chỉ chứa `filePath` (chuỗi), không chứa `file.buffer` — nếu thấy mình đưa Buffer vào `add()`, đó là mistake số 3.
- Kiểm tra ownership giống `GET /reports/jobs/:id` ở mục 3.2: so sánh `job.data.userId` với `user.userId` từ `@CurrentUser()`.
- Với bước 4, chỉ phải sửa listener và `MailProcessor` (thêm `case`); `UsersService` không đổi — nếu phải sửa service, xem lại thiết kế event.

---

## Homework

- [ ] Hoàn thiện bài tập trên lớp, chụp màn hình Bull Board với ít nhất 1 job `completed`, 1 job `failed` và 1 job `delayed`.
- [ ] Thêm `@Cron` chạy lúc 23:00 mỗi ngày (giờ Việt Nam) xóa thumbnail của những user đã bị xóa; giải thích bằng 2-3 câu vì sao task này chạy trùng vẫn an toàn.
- [ ] Thêm endpoint admin (dùng `RolesGuard` Lesson 10) `POST /admin/queues/mail/retry-failed` lấy các job lỗi bằng `mailQueue.getFailed()` và gọi `job.retry()` cho từng job.
- [ ] Chuyển báo cáo hằng ngày sang BullMQ Job Scheduler (mục 4.4, Cách 2). Chạy 2 instance app trên 2 port khác nhau, đặt lịch mỗi phút để test, chứng minh admin chỉ nhận **1** mail mỗi phút.
- [ ] (Nâng cao) Tách worker ra process riêng: tạo `src/worker.ts` dùng `NestFactory.createApplicationContext(WorkerModule)` chỉ chứa các Processor và Job Scheduler, còn `AppModule` của API chỉ chứa Producer. Viết `docker-compose.yml` gồm Redis, PostgreSQL, 2 container API và 1 container worker; đo thời gian response của `POST /reports/users/export` khi worker đang xử lý báo cáo nặng, so sánh với khi worker chạy chung process API.

---

## Câu hỏi ôn tập

1. Nêu 3 tiêu chí để quyết định một tác vụ nên đưa vào Queue. Cho một ví dụ tác vụ **không** nên đưa vào Queue và giải thích.
2. Mô tả vai trò của Producer, Worker và Job. Vì sao chạy nhiều worker cho cùng một queue không làm job bị xử lý trùng?
3. Với `attempts: 4` và `backoff: { type: 'exponential', delay: 1000 }`, job lỗi liên tục sẽ được chạy vào những thời điểm nào? Khi nào nên dùng `UnrecoverableError`?
4. Vì sao listener thêm job vào queue (Bonus 04) đáng tin cậy hơn listener gửi mail trực tiếp (Bonus 03)? Nêu ít nhất 2 tình huống cụ thể.
5. Tại sao `@Cron` chạy trùng khi app có nhiều instance, còn worker BullMQ chạy ở nhiều instance thì không? Trình bày 2 cách xử lý cron chạy trùng.
