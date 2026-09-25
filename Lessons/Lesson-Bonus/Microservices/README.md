# Bonus 07: Microservices với NestJS

> Tiên quyết: Lesson 13 (Redis, Docker), Bonus 03 (Events), Bonus 04 (Queue)

## Mục tiêu bài học

Sau bài này, học viên:

- **Giải thích được** microservices khác monolith thế nào, và **liệt kê được** các dấu hiệu cho thấy nên (hoặc chưa nên) tách service.
- **Vẽ được** kiến trúc gồm API Gateway và các service, mỗi service sở hữu một database riêng.
- **Cấu hình được** một microservice bằng `@nestjs/microservices` với `NestFactory.createMicroservice()` và `ClientsModule`.
- **So sánh được** các transport TCP, Redis, NATS, RabbitMQ, gRPC theo delivery guarantee, persistence và use case.
- **Viết được** handler request-response (`@MessagePattern`) và event-based (`@EventPattern`), và **gọi được** chúng qua `ClientProxy` bằng `send()` / `emit()`.
- **Xây dựng được** demo `api-gateway` (HTTP) giao tiếp với `orders-service` qua RabbitMQ, có timeout và chuyển lỗi RPC về HTTP status đúng.

## Ôn tập nhanh

Ở Lesson 13, chúng ta chạy Redis bằng Docker và dùng nó làm cache store chung cho nhiều instance. Bonus 03 dùng `@nestjs/event-emitter` để tách logic bằng event, nhưng event đó chỉ sống **trong cùng một process**: app restart là mất, và process khác không nghe được. Bonus 04 giải quyết một phần vấn đề đó bằng Queue (BullMQ + Redis): job được lưu lại, có retry, và worker có thể chạy ở process khác. Bài này đi thêm một bước nữa: thay vì một ứng dụng đẩy job cho chính nó xử lý, ta có **nhiều ứng dụng NestJS độc lập** nói chuyện với nhau qua mạng, mỗi ứng dụng có codebase, database và lịch deploy riêng.

---

## 1. Microservices là gì? Monolith vs Microservices

### 1.1 Định nghĩa

**Monolith** là cách chúng ta làm suốt khóa học: một project NestJS, một process, một database. Bên trong vẫn chia module (`UsersModule`, `BooksModule`, `OrdersModule`...), các module gọi nhau bằng dependency injection, tức là một lời gọi hàm trong bộ nhớ, gần như không tốn thời gian và không bao giờ "mất mạng".

**Microservices** là kiến trúc chia hệ thống thành nhiều **service** nhỏ, mỗi service:

- là một ứng dụng chạy độc lập (process/container riêng),
- phụ trách một nghiệp vụ rõ ràng (orders, payments, notifications...),
- sở hữu dữ liệu của riêng mình,
- giao tiếp với service khác qua mạng bằng một **transport** (TCP, message broker, gRPC...).

```text
MONOLITH                                MICROSERVICES

┌──────────────────────────┐            ┌──────────┐   ┌──────────┐   ┌──────────┐
│        NestJS App        │            │  users   │   │  orders  │   │ payments │
│ ┌──────┐┌──────┐┌──────┐ │            │ service  │   │ service  │   │ service  │
│ │Users ││Orders││Paymnt│ │            └────┬─────┘   └────┬─────┘   └────┬─────┘
│ └──────┘└──────┘└──────┘ │                 │   network    │   network    │
│   gọi nhau bằng DI       │            ┌────▼───┐     ┌────▼───┐     ┌────▼───┐
└────────────┬─────────────┘            │users_db│     │orders_db│    │pay_db  │
             │                          └────────┘     └────────┘     └────────┘
      ┌──────▼──────┐
      │  1 database │
      └─────────────┘
```

### 1.2 So sánh

| Tiêu chí | Monolith (modular) | Microservices |
|---|---|---|
| Deploy | Một lần cho cả hệ thống | Từng service độc lập |
| Gọi giữa các phần | Function call, nhanh, không lỗi mạng | Network call: chậm hơn, có thể timeout, mất message |
| Transaction | Một DB transaction là xong (Lesson 07) | Không có transaction xuyên service, phải dùng eventual consistency, saga |
| Debug, trace | Một log, một stack trace | Log rải rác nhiều service, cần correlation id, tracing |
| Scale | Scale cả app | Scale riêng service đang nóng |
| Hạ tầng | Một app + DB | Nhiều app, nhiều DB, broker, gateway, monitoring |
| Phù hợp | Team nhỏ, sản phẩm mới, domain chưa rõ | Nhiều team, domain đã ổn định, yêu cầu scale khác nhau |

### 1.3 Lời khuyên thực tế: bắt đầu bằng modular monolith

Microservices **không phải** là bản "nâng cấp" của monolith. Nó đổi độ phức tạp trong code lấy độ phức tạp trong vận hành: mạng chập chờn, dữ liệu không nhất quán tạm thời, versioning giữa các service, deploy nhiều thứ cùng lúc. Với phần lớn team, nhất là team dưới 10 người, lựa chọn đúng mặc định là **modular monolith**: một app NestJS nhưng chia module thật rõ ràng, module không truy cập thẳng entity của module khác, chỉ gọi qua service được `exports`. Khi cần, một module như vậy có thể được "nhấc" ra thành service riêng mà không phải viết lại.

Các **dấu hiệu** cho thấy việc tách service là hợp lý:

- Nhiều team cùng sửa một codebase, thường xuyên giẫm chân nhau và phải chờ nhau để deploy.
- Một phần hệ thống có nhu cầu tài nguyên rất khác (ví dụ xử lý video cần CPU lớn, còn API đọc sản phẩm thì không).
- Một phần cần độ ổn định cao hơn phần còn lại: lỗi ở module báo cáo không được phép làm sập luồng thanh toán.
- Ranh giới nghiệp vụ (bounded context) đã ổn định, ít khi phải sửa đồng thời hai bên.
- Có nhu cầu dùng công nghệ khác cho một phần (ví dụ service AI viết bằng Python, giao tiếp bằng gRPC).

Ngược lại, nếu lý do chỉ là "microservices nghe hiện đại", hoặc sản phẩm còn đang tìm hướng đi, domain thay đổi mỗi tuần, thì tách service sớm gần như chắc chắn làm chậm team.

---

## 2. Kiến trúc Microservices

### 2.1 API Gateway

Frontend (ReactJS ở Lesson 08, 11) không nên biết có bao nhiêu service phía sau. Ta đặt một **API Gateway** làm cửa ngõ duy nhất:

- Nhận HTTP request từ client, xác thực JWT (Lesson 09), kiểm tra quyền (Lesson 10), rate limit (Lesson 16).
- Chuyển request thành message gửi tới service phù hợp.
- Gom kết quả, chuẩn hóa response `{ success, statusCode, data }` như Lesson 08.

Các service phía sau **không mở HTTP ra ngoài**, chỉ lắng nghe message từ transport nội bộ.

```text
                 HTTP (JSON)
 ReactJS  ─────────────────────▶  ┌───────────────┐
                                  │  api-gateway  │  JWT, Guard, ValidationPipe,
                                  │   (NestJS)    │  TransformInterceptor
                                  └───────┬───────┘
                                          │ message (transport: TCP / RabbitMQ / gRPC...)
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
           ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
           │users-service│         │orders-service│        │notif-service│
           └──────┬──────┘         └──────┬──────┘         └─────────────┘
                  ▼                       ▼
             ┌────────┐              ┌─────────┐
             │users_db│              │orders_db│
             └────────┘              └─────────┘
```

### 2.2 Mỗi service một database (database per service)

Nguyên tắc quan trọng nhất: **service chỉ đọc/ghi database của chính nó**. `orders-service` không được `JOIN` sang bảng `users` của `users-service`. Nếu hai service cùng dùng chung một database, bạn có "distributed monolith": vẫn phải deploy cùng nhau mỗi khi đổi schema, nhưng lại chịu thêm toàn bộ chi phí mạng.

Hệ quả cần chấp nhận:

- Cần dữ liệu của service khác thì **hỏi qua message** (request-response) hoặc **lưu bản sao** những field cần thiết (ví dụ `orders` lưu `customerName` tại thời điểm đặt hàng) và cập nhật bản sao khi nhận event.
- Không có transaction ACID xuyên service. Dữ liệu sẽ **nhất quán sau một khoảng thời gian** (eventual consistency). Các quy trình nhiều bước (trừ kho, thanh toán, tạo đơn) dùng pattern **saga**: mỗi bước có hành động bù trừ khi bước sau thất bại. Saga nằm ngoài phạm vi bài này, bạn chỉ cần biết tên và lý do nó tồn tại.

### 2.3 Hai kiểu giao tiếp

- **Đồng bộ (request-response)**: gateway gửi "cho tôi đơn hàng #5" và **chờ** trả lời. Dễ hiểu, nhưng nếu service kia chậm thì gateway chậm theo.
- **Bất đồng bộ (event)**: service phát "đơn hàng #5 đã thanh toán" rồi đi tiếp, không chờ ai. Các service quan tâm tự xử lý. Giảm phụ thuộc giữa các service, nhưng khó theo dõi luồng hơn.

NestJS hỗ trợ cả hai qua `@MessagePattern` và `@EventPattern` (mục 5).

---

## 3. Cài đặt Microservice với `@nestjs/microservices`

### 3.1 Tạo monorepo

Nest CLI hỗ trợ **monorepo mode**: nhiều app trong cùng một repo, dùng chung `node_modules` và có thể chia sẻ code qua `libs/`. Rất tiện để học, vì gateway và service nằm cạnh nhau.

```bash
# Tạo project, app đầu tiên sẽ là api-gateway
npx @nestjs/cli new api-gateway
cd api-gateway

# Thêm app thứ hai -> CLI tự chuyển sang monorepo: apps/api-gateway, apps/orders-service
npx nest generate app orders-service

# Thư viện dùng chung giữa các app (pattern, DTO) -> libs/contracts, import bằng '@app/contracts'
npx nest generate library contracts

npm install @nestjs/microservices
```

Cấu trúc sau khi tạo:

```text
api-gateway/
├── apps/
│   ├── api-gateway/src/       # HTTP app, cổng 3000
│   └── orders-service/src/    # microservice, không mở HTTP
├── libs/
│   └── contracts/src/         # message pattern, DTO dùng chung
└── nest-cli.json
```

Chạy từng app ở hai terminal:

```bash
# Chạy ở thư mục gốc monorepo, mỗi lệnh một terminal
npx nest start orders-service --watch
npx nest start api-gateway --watch
```

### 3.2 Contract dùng chung

Hai phía phải thống nhất **tên pattern** và **hình dạng payload**. Gõ sai một ký tự trong chuỗi pattern là message không có ai nhận, nên ta đặt chúng thành hằng số trong `libs/contracts`.

```typescript
// libs/contracts/src/orders/orders.patterns.ts
export const ORDERS_SERVICE = 'ORDERS_SERVICE'; // injection token cho ClientProxy

export const ORDER_PATTERNS = {
  CREATE: 'orders.create',                       // request-response
  FIND_ONE: 'orders.find_one',                   // request-response
  PAYMENT_CONFIRMED: 'orders.payment_confirmed', // event
} as const;
```

```typescript
// libs/contracts/src/orders/order.types.ts
// Dữ liệu đi qua transport được serialize thành JSON:
// Date sẽ thành string, class instance thành plain object.
export interface OrderResponse {
  id: number;
  productName: string;
  quantity: number;
  status: 'pending' | 'paid';
  createdAt: string;
}

export interface PaymentConfirmedEvent {
  orderId: number;
  paidAt: string;
}
```

```typescript
// libs/contracts/src/orders/create-order.dto.ts
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

// DTO được validate ở gateway (ValidationPipe, Lesson 06) trước khi gửi đi
export class CreateOrderDto {
  @IsString()
  @MinLength(2)
  productName!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}
```

```typescript
// libs/contracts/src/index.ts
export * from './orders/orders.patterns';
export * from './orders/order.types';
export * from './orders/create-order.dto';
```

### 3.3 Service phía nhận: `createMicroservice()` với TCP

TCP là transport đơn giản nhất, không cần broker, nên ta dùng nó để hiểu cơ chế trước. Khác với `NestFactory.create()` (tạo HTTP app), `NestFactory.createMicroservice()` tạo một app **chỉ lắng nghe message** trên transport được cấu hình.

```typescript
// apps/orders-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { OrdersServiceModule } from './orders-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrdersServiceModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3001 }, // cổng nội bộ, không phải HTTP
    },
  );
  await app.listen(); // không truyền port: cấu hình đã nằm trong options
}
bootstrap();
```

Handler vẫn đặt trong class có `@Controller()`, nhưng thay vì `@Get()`/`@Post()` ta dùng decorator của microservices:

```typescript
// apps/orders-service/src/orders/orders.controller.ts (phiên bản TCP, dữ liệu giả)
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { ORDER_PATTERNS, OrderResponse, PaymentConfirmedEvent } from '@app/contracts';

@Controller()
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  // Request-response: giá trị return được gửi ngược về cho bên gọi
  @MessagePattern(ORDER_PATTERNS.FIND_ONE)
  findOne(@Payload() id: number): OrderResponse {
    return {
      id,
      productName: 'Keyboard',
      quantity: 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  // Event: không có response, bên phát không chờ
  @EventPattern(ORDER_PATTERNS.PAYMENT_CONFIRMED)
  onPaymentConfirmed(@Payload() event: PaymentConfirmedEvent): void {
    this.logger.log(`Order #${event.orderId} đã thanh toán`);
  }
}
```

### 3.4 Gateway phía gửi: `ClientsModule.register()`

Gateway đăng ký một **client** trỏ tới service. `name` là injection token, dùng với `@Inject()` như custom provider (Bonus 01).

```typescript
// apps/api-gateway/src/orders/orders.module.ts (phiên bản TCP)
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ORDERS_SERVICE } from '@app/contracts';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: ORDERS_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 }, // phải khớp với orders-service
      },
    ]),
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}
```

```typescript
// apps/api-gateway/src/orders/orders.controller.ts (phiên bản TCP, rút gọn)
import { Controller, Get, HttpCode, Inject, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ORDER_PATTERNS, ORDERS_SERVICE, OrderResponse } from '@app/contracts';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(ORDERS_SERVICE) private readonly client: ClientProxy) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OrderResponse> {
    // send() trả về Observable -> firstValueFrom() đổi thành Promise để dùng await
    return firstValueFrom(this.client.send<OrderResponse, number>(ORDER_PATTERNS.FIND_ONE, id));
  }

  @Post(':id/pay')
  @HttpCode(202) // 202 Accepted: đã nhận, xử lý sau
  pay(@Param('id', ParseIntPipe) id: number): { accepted: true } {
    // emit() fire-and-forget: không chờ kết quả
    this.client.emit(ORDER_PATTERNS.PAYMENT_CONFIRMED, { orderId: id, paidAt: new Date().toISOString() });
    return { accepted: true };
  }
}
```

Gọi `GET http://localhost:3000/orders/5` thì gateway gửi message `orders.find_one` với payload `5` qua TCP, `orders-service` trả về object, gateway trả về client.

> **Hybrid application**: nếu một app vừa cần mở HTTP vừa nghe message, dùng `NestFactory.create()` rồi `app.connectMicroservice({...})`, `await app.startAllMicroservices()` trước `app.listen(3000)`. Hữu ích khi tách dần từ monolith.

---

## 4. Transport giữa các service

### 4.1 So sánh nhanh

Transport là "đường dây" chở message. Điểm hay của NestJS: code handler (`@MessagePattern`, `@EventPattern`) và code gọi (`send`, `emit`) **gần như không đổi** khi đổi transport, chỉ đổi phần cấu hình.

| Transport | Cần broker? | Delivery guarantee | Persistence | Package cần cài | Dùng khi |
|---|---|---|---|---|---|
| TCP | Không | At-most-once: service tắt là mất | Không | (có sẵn) | Học, nội bộ đơn giản, ít service |
| Redis | Redis (Pub/Sub) | At-most-once: không ai subscribe là mất | Không | `ioredis` | Đã có Redis (Lesson 13), cần nhẹ, chấp nhận mất message |
| NATS | NATS server | At-most-once (core NATS) | Không (trừ khi dùng JetStream) | `nats` | Latency rất thấp, nhiều service, cần load balance bằng queue group |
| RabbitMQ | RabbitMQ | At-least-once khi bật ack | Có (durable queue, persistent message) | `amqplib`, `amqp-connection-manager` | Lệnh quan trọng không được mất, cần retry, xử lý nền |
| gRPC | Không | Như một HTTP/2 call, không lưu | Không | `@grpc/grpc-js`, `@grpc/proto-loader` | Gọi đồng bộ hiệu năng cao, contract chặt bằng `.proto`, đa ngôn ngữ |

- **At-most-once**: message được gửi tối đa một lần, có thể mất.
- **At-least-once**: message chắc chắn tới, nhưng có thể tới **hơn một lần** (ví dụ service xử lý xong nhưng crash trước khi ack). Handler cần **idempotent**, giống seeder ở Lesson 07: xử lý lặp lại không làm sai dữ liệu.

NestJS còn hỗ trợ Kafka và MQTT, cách cấu hình tương tự.

### 4.2 TCP

Đã dùng ở mục 3. Gateway phải biết chính xác `host:port` của service, không có hàng đợi ở giữa: nếu `orders-service` đang restart, request thất bại ngay.

### 4.3 Redis

Dùng cơ chế Pub/Sub của Redis. Không cần dựng thêm hạ tầng nếu đã có Redis từ Lesson 13.

```typescript
// apps/orders-service/src/main.ts (Redis transport)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(OrdersServiceModule, {
  transport: Transport.REDIS,
  options: { host: 'localhost', port: 6379 },
});
```

Lưu ý: Pub/Sub không lưu message. Nếu chạy 3 instance `orders-service`, **cả 3 đều nhận** cùng một message, vì Pub/Sub là broadcast. Với event thì có thể chấp nhận, nhưng với request-response thì một yêu cầu bị xử lý 3 lần.

### 4.4 NATS

NATS là message broker gọn nhẹ, rất nhanh. Điểm mạnh là **queue group**: các instance cùng `queue` sẽ chia nhau message, mỗi message chỉ một instance nhận.

```typescript
// apps/orders-service/src/main.ts (NATS transport)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(OrdersServiceModule, {
  transport: Transport.NATS,
  options: {
    servers: ['nats://localhost:4222'],
    queue: 'orders-service', // queue group: load balance giữa các instance
  },
});
```

### 4.5 RabbitMQ

RabbitMQ lưu message trong **queue** cho tới khi consumer xử lý xong. Service tắt 5 phút thì message vẫn nằm chờ, bật lên sẽ xử lý tiếp. Đây là transport ta dùng trong demo (mục 7).

```typescript
// apps/orders-service/src/main.ts (RabbitMQ transport, chi tiết ở mục 7)
const app = await NestFactory.createMicroservice<MicroserviceOptions>(OrdersServiceModule, {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://admin:admin@localhost:5672'],
    queue: 'orders_queue',
    queueOptions: { durable: true },
  },
});
```

So với BullMQ ở Bonus 04: BullMQ là **job queue** trong một hệ thống (có retry, backoff, delay, dashboard), còn RabbitMQ transport ở đây là **kênh giao tiếp giữa các service**. Hai thứ có thể cùng tồn tại.

### 4.6 gRPC

gRPC dùng HTTP/2 và **Protocol Buffers** (binary, nhỏ và nhanh hơn JSON). Contract được mô tả trong file `.proto`, cả hai phía dùng chung file này, nên sai kiểu dữ liệu sẽ lộ ra sớm. gRPC không dùng chuỗi pattern mà dùng tên service và tên method trong `.proto`.

```protobuf
// libs/contracts/src/proto/orders.proto
syntax = "proto3";

package orders;

service OrdersService {
  rpc FindOne (OrderById) returns (Order);
}

message OrderById {
  int32 id = 1;
}

message Order {
  int32 id = 1;
  string productName = 2;
  int32 quantity = 3;
  string status = 4;
}
```

```typescript
// apps/orders-service/src/main.ts (gRPC transport)
import { join } from 'node:path';

const app = await NestFactory.createMicroservice<MicroserviceOptions>(OrdersServiceModule, {
  transport: Transport.GRPC,
  options: {
    package: 'orders', // khớp với `package orders;`
    protoPath: join(__dirname, 'proto/orders.proto'),
    url: '0.0.0.0:5000',
  },
});
```

```typescript
// apps/orders-service/src/orders/orders.grpc.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class OrdersGrpcController {
  @GrpcMethod('OrdersService', 'FindOne') // tên service + tên rpc trong .proto
  findOne(data: { id: number }) {
    return { id: data.id, productName: 'Keyboard', quantity: 1, status: 'pending' };
  }
}
```

Phía gateway dùng `ClientGrpc` và `getService<...>('OrdersService')` thay cho `ClientProxy`. File `.proto` không phải TypeScript nên cần khai báo trong `nest-cli.json` (`"assets": ["**/*.proto"]`) để được copy sang `dist/`.

---

## 5. Message patterns

### 5.1 Request-response với `@MessagePattern`

Bên gọi gửi message kèm pattern và **chờ phản hồi**. NestJS tự tạo một kênh trả lời (với RabbitMQ là reply queue) và ghép response đúng với request qua id nội bộ.

- Handler có thể trả về giá trị thường, `Promise` hoặc `Observable`.
- Pattern có thể là chuỗi (`'orders.find_one'`) hoặc object (`{ cmd: 'find_one' }`). Chuỗi có namespace dễ đọc hơn khi debug trên RabbitMQ UI.
- Dùng cho **truy vấn** hoặc **lệnh cần biết kết quả ngay** (tạo đơn và trả về id).

### 5.2 Event-based với `@EventPattern`

Bên phát chỉ báo "điều gì đó đã xảy ra" và **không chờ**. Handler không trả response, lỗi trong handler cũng không quay về bên phát.

- Dùng cho **thông báo sự kiện**: đơn đã thanh toán, user đã đăng ký, cần gửi mail.
- Có thể có nhiều service quan tâm cùng một event (tùy transport, xem mục 4).

Đây chính là ý tưởng của `@OnEvent()` ở Bonus 03, nhưng đi **qua mạng giữa các process** thay vì trong cùng một process.

| | `@MessagePattern` | `@EventPattern` |
|---|---|---|
| Gọi bằng | `client.send()` | `client.emit()` |
| Có response | Có | Không |
| Bên gọi chờ | Có (cần timeout) | Không |
| Lỗi quay về bên gọi | Có | Không |
| Ví dụ | `orders.find_one`, `orders.create` | `orders.payment_confirmed` |

---

## 6. ClientProxy

`ClientProxy` là object mà `ClientsModule` inject vào gateway, đại diện cho kết nối tới một service.

### 6.1 `send()`: Observable "lạnh"

`send()` trả về một **cold Observable** (RxJS): message **chưa được gửi** cho tới khi có ai subscribe. Vì chúng ta quen `async/await`, cách gọn nhất là `firstValueFrom()` từ `rxjs`: nó subscribe, lấy giá trị đầu tiên và trả về Promise.

Lỗi hay gặp: gọi `this.client.send(...)` mà không `await firstValueFrom(...)`, không `return` về cho Nest, cũng không `.subscribe()`. Khi đó message không bao giờ được gửi đi.

### 6.2 `emit()`: Observable "nóng"

`emit()` trả về **hot Observable**: message được gửi ngay khi gọi, không cần subscribe. Vì không có response nên thường không cần chờ.

### 6.3 Timeout

Nếu service chết hoặc treo, `send()` có thể chờ rất lâu, request HTTP của user treo theo. **Luôn** đặt timeout bằng operator `timeout()` của RxJS. Khi hết giờ, Observable báo lỗi `TimeoutError`.

```typescript
// Ví dụ ngắn
const order = await firstValueFrom(
  this.client.send<OrderResponse, number>(ORDER_PATTERNS.FIND_ONE, id).pipe(timeout(5000)),
);
```

### 6.4 Lỗi từ service: `RpcException`

Trong microservice, các `HttpException` như `NotFoundException` (Lesson 05) **không có ý nghĩa**, vì không có HTTP response nào ở đó. Service nên ném `RpcException` với object mô tả lỗi. Object đó được gửi về gateway như một lỗi của Observable. Gateway phải tự **map** lỗi đó thành `HttpException` để `HttpExceptionFilter` của Lesson 08 trả về `{ success: false, statusCode, message }`. Code cụ thể ở mục 7.5.

### 6.5 Kết nối

`ClientProxy` tự kết nối ở lần gọi đầu tiên (lazy). Muốn phát hiện lỗi kết nối ngay khi khởi động, có thể gọi `await this.client.connect()` trong `onApplicationBootstrap()` (lifecycle hook ở Bonus 01).

---

## 7. Demo: API Gateway + orders-service qua RabbitMQ

Mục tiêu: `POST /orders` tạo đơn (request-response), `GET /orders/:id` lấy đơn (request-response), `POST /orders/:id/pay` phát event thanh toán (event-based). `orders-service` lưu dữ liệu vào PostgreSQL **riêng** của nó.

```text
Client ─HTTP─▶ api-gateway ──send('orders.create')──────▶ ┌──────────────┐        ┌─────────────┐
                    ▲                                      │  RabbitMQ    │─────▶  │orders-service│──▶ orders_db
                    └────────── reply queue ◀───────────── │ orders_queue │        └─────────────┘
               api-gateway ──emit('orders.payment_confirmed')──▶ (không chờ reply)
```

### 7.1 Chạy RabbitMQ và database bằng Docker

```yaml
# docker-compose.yml (đặt ở thư mục gốc monorepo)
services:
  rabbitmq:
    image: rabbitmq:management   # bản có kèm Management UI
    container_name: rabbitmq
    ports:
      - '5672:5672'     # AMQP: app kết nối vào cổng này
      - '15672:15672'   # Management UI: http://localhost:15672
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin

  orders-db:
    image: postgres:alpine
    container_name: orders-db
    ports:
      - '5433:5432'     # 5433 để không đụng PostgreSQL của các bài trước
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: orders_db
    volumes:
      - orders_data:/var/lib/postgresql/data

volumes:
  orders_data:
```

```bash
# Chạy ở thư mục gốc monorepo
docker compose up -d
npm install amqplib amqp-connection-manager
npm install @nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer
```

Mở `http://localhost:15672`, đăng nhập `admin/admin`, tab **Queues** sẽ hiện `orders_queue` sau khi service khởi động.

### 7.2 orders-service: chuyển sang RMQ

Chỉ phần cấu hình transport thay đổi so với bản TCP ở mục 3.

```typescript
// apps/orders-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { OrdersServiceModule } from './orders-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(OrdersServiceModule, {
    transport: Transport.RMQ,
    options: {
      // Options đọc trước khi module khởi tạo nên dùng process.env trực tiếp, có fallback cho local
      urls: [process.env.RABBITMQ_URL ?? 'amqp://admin:admin@localhost:5672'],
      queue: 'orders_queue',            // mỗi service một queue riêng
      queueOptions: { durable: true },  // queue sống sót khi RabbitMQ restart
    },
  });
  await app.listen();
}
bootstrap();
```

```typescript
// apps/orders-service/src/orders-service.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.ORDERS_DB_HOST ?? 'localhost',
      port: Number(process.env.ORDERS_DB_PORT ?? 5433),
      username: 'postgres',
      password: 'postgres',
      database: 'orders_db',      // database CỦA RIÊNG orders-service
      autoLoadEntities: true,
      synchronize: true,          // chỉ cho demo; production dùng migration (Lesson 07)
    }),
    OrdersModule,
  ],
})
export class OrdersServiceModule {}
```

```typescript
// apps/orders-service/src/orders/entities/order.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  productName!: string;

  @Column('int')
  quantity!: number;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'paid';

  @CreateDateColumn()
  createdAt!: Date;
}
```

### 7.3 orders-service: service và controller

```typescript
// apps/orders-service/src/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { CreateOrderDto, OrderResponse, PaymentConfirmedEvent } from '@app/contracts';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(@InjectRepository(Order) private readonly ordersRepository: Repository<Order>) {}

  async create(dto: CreateOrderDto): Promise<OrderResponse> {
    const order = await this.ordersRepository.save(this.ordersRepository.create(dto));
    return this.toResponse(order);
  }

  async findOne(id: number): Promise<OrderResponse> {
    const order = await this.ordersRepository.findOneBy({ id });
    if (!order) {
      // KHÔNG dùng NotFoundException ở đây: gửi object lỗi để gateway tự map sang HTTP
      throw new RpcException({ statusCode: 404, message: `Order #${id} không tồn tại` });
    }
    return this.toResponse(order);
  }

  async markPaid(event: PaymentConfirmedEvent): Promise<void> {
    // Idempotent: nhận event 2 lần thì kết quả vẫn như 1 lần
    await this.ordersRepository.update({ id: event.orderId, status: 'pending' }, { status: 'paid' });
  }

  // Không trả entity trực tiếp ra ngoài (quy ước của khóa học)
  private toResponse(order: Order): OrderResponse {
    return {
      id: order.id,
      productName: order.productName,
      quantity: order.quantity,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    };
  }
}
```

```typescript
// apps/orders-service/src/orders/orders.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { CreateOrderDto, ORDER_PATTERNS, OrderResponse, PaymentConfirmedEvent } from '@app/contracts';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern(ORDER_PATTERNS.CREATE)
  create(@Payload() dto: CreateOrderDto): Promise<OrderResponse> {
    return this.ordersService.create(dto);
  }

  @MessagePattern(ORDER_PATTERNS.FIND_ONE)
  findOne(@Payload() id: number): Promise<OrderResponse> {
    return this.ordersService.findOne(id);
  }

  @EventPattern(ORDER_PATTERNS.PAYMENT_CONFIRMED)
  onPaymentConfirmed(@Payload() event: PaymentConfirmedEvent): Promise<void> {
    return this.ordersService.markPaid(event);
  }
}
```

```typescript
// apps/orders-service/src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

### 7.4 api-gateway: đăng ký client RMQ

Ở gateway, ta dùng `registerAsync` để đọc URL từ `ConfigService` (Lesson 03) thay vì hard-code.

```typescript
// apps/api-gateway/src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ORDERS_SERVICE } from '@app/contracts';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: ORDERS_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL', 'amqp://admin:admin@localhost:5672')],
            queue: 'orders_queue',           // gửi vào đúng queue mà orders-service đang nghe
            queueOptions: { durable: true }, // phải khớp với phía service, nếu không RabbitMQ báo lỗi
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

### 7.5 api-gateway: gọi service, timeout và map lỗi

Toàn bộ logic giao tiếp gom vào `OrdersService` của gateway để controller vẫn mỏng (Controller → Service như cả khóa học).

```typescript
// apps/api-gateway/src/orders/orders.service.ts
import {
  GatewayTimeoutException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { CreateOrderDto, ORDER_PATTERNS, ORDERS_SERVICE, OrderResponse } from '@app/contracts';

interface RpcErrorPayload {
  statusCode: number;
  message: string;
}

// Type guard: kiểm tra lỗi có đúng hình dạng mà orders-service ném ra không
function isRpcErrorPayload(error: unknown): error is RpcErrorPayload {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(ORDERS_SERVICE) private readonly client: ClientProxy) {}

  create(dto: CreateOrderDto): Promise<OrderResponse> {
    return this.request<OrderResponse, CreateOrderDto>(ORDER_PATTERNS.CREATE, dto);
  }

  findOne(id: number): Promise<OrderResponse> {
    return this.request<OrderResponse, number>(ORDER_PATTERNS.FIND_ONE, id);
  }

  confirmPayment(orderId: number): void {
    // Hot Observable: message đi ngay, không cần subscribe
    this.client.emit(ORDER_PATTERNS.PAYMENT_CONFIRMED, { orderId, paidAt: new Date().toISOString() });
  }

  private async request<TResult, TInput>(pattern: string, data: TInput): Promise<TResult> {
    try {
      return await firstValueFrom(
        this.client.send<TResult, TInput>(pattern, data).pipe(timeout(5000)), // tối đa 5 giây
      );
    } catch (error: unknown) {
      throw this.toHttpException(pattern, error);
    }
  }

  private toHttpException(pattern: string, error: unknown): HttpException {
    if (error instanceof TimeoutError) {
      return new GatewayTimeoutException('orders-service không phản hồi kịp');
    }
    if (isRpcErrorPayload(error)) {
      return new HttpException(error.message, error.statusCode); // 404 từ service -> 404 cho client
    }
    this.logger.error(`RPC ${pattern} thất bại`, error instanceof Error ? error.stack : String(error));
    return new ServiceUnavailableException('Không thể kết nối orders-service');
  }
}
```

```typescript
// apps/api-gateway/src/orders/orders.controller.ts
import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateOrderDto, OrderResponse } from '@app/contracts';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto): Promise<OrderResponse> {
    return this.ordersService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OrderResponse> {
    return this.ordersService.findOne(id);
  }

  @Post(':id/pay')
  @HttpCode(202)
  pay(@Param('id', ParseIntPipe) id: number): { accepted: true } {
    this.ordersService.confirmPayment(id);
    return { accepted: true };
  }
}
```

```typescript
// apps/api-gateway/src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';     // Lesson 08
import { TransformInterceptor } from './common/interceptors/transform.interceptor'; // Lesson 08

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiGatewayModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor()); // { success, statusCode, data }
  app.useGlobalFilters(new HttpExceptionFilter());       // { success: false, statusCode, message }
  await app.listen(3000);
}
bootstrap();
```

`ApiGatewayModule` import `ConfigModule.forRoot({ isGlobal: true })` và `OrdersModule`.

### 7.6 Chạy thử

```bash
# Terminal 1 và 2: chạy hai app
npx nest start orders-service --watch
npx nest start api-gateway --watch

# Terminal 3: gọi thử qua gateway
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" \
  -d '{"productName":"Keyboard","quantity":2}'
# {"success":true,"statusCode":201,"data":{"id":1,"productName":"Keyboard","quantity":2,"status":"pending",...}}

curl -X POST http://localhost:3000/orders/1/pay     # 202, orders-service cập nhật status = 'paid'
curl http://localhost:3000/orders/999               # {"success":false,"statusCode":404,"message":"Order #999 không tồn tại"}
```

Thử nghiệm để thấy giá trị của broker: **tắt** `orders-service`, gọi `POST /orders/1/pay` vài lần, rồi mở Management UI: tab Queues hiển thị số message đang chờ (`Ready`). Bật lại service, các message được xử lý tiếp. Trong khi đó `GET /orders/1` lúc service tắt sẽ trả **504** sau 5 giây nhờ `timeout()`, thay vì treo mãi.

### 7.7 Nâng cao: manual acknowledgement

Mặc định RMQ transport dùng **auto-ack**: RabbitMQ xóa message ngay khi giao cho service. Nếu service crash giữa chừng, message đó mất. Với việc quan trọng (thanh toán), bật `noAck: false` ở phía service và tự `ack` sau khi xử lý xong. Nếu service chết trước khi ack, RabbitMQ giao lại message (at-least-once, vì vậy handler cần idempotent như `markPaid` ở trên).

```typescript
// apps/orders-service/src/main.ts (trích options)
options: {
  urls: [process.env.RABBITMQ_URL ?? 'amqp://admin:admin@localhost:5672'],
  queue: 'orders_queue',
  queueOptions: { durable: true },
  noAck: false,      // tắt auto-ack
  prefetchCount: 10, // tối đa 10 message chưa ack cùng lúc
},
```

```typescript
// apps/orders-service/src/orders/orders.controller.ts (trích)
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@EventPattern(ORDER_PATTERNS.PAYMENT_CONFIRMED)
async onPaymentConfirmed(@Payload() event: PaymentConfirmedEvent, @Ctx() context: RmqContext): Promise<void> {
  const channel = context.getChannelRef();
  const message = context.getMessage();
  await this.ordersService.markPaid(event);
  channel.ack(message); // chỉ ack khi đã ghi DB thành công
}
```

Khi bật `noAck: false`, **mọi** handler trên queue đó đều phải ack, kể cả `@MessagePattern`, nếu không message sẽ nằm ở trạng thái `Unacked` mãi. Thêm nữa, `durable: true` chỉ giữ queue; muốn message cũng sống sót khi RabbitMQ restart, cần gửi message ở chế độ persistent (option `persistent: true` phía client).

---

## Common mistakes

1. **Ném `NotFoundException` (HttpException) trong microservice.**
   Tại sao sai: service không có HTTP context, exception filter mặc định của microservices không hiểu `HttpException`, gateway thường chỉ nhận được lỗi chung chung kiểu "Internal server error", và client thấy 500 thay vì 404.
   Cách sửa: ở service ném `RpcException({ statusCode, message })`; ở gateway map lỗi thành `HttpException` như `toHttpException()` ở mục 7.5.

2. **Gọi `client.send()` mà không subscribe/await, hoặc không có timeout.**
   Tại sao sai: `send()` là cold Observable, không subscribe thì message không được gửi. Ngược lại, có await nhưng không timeout thì khi service chết, request HTTP treo cho tới khi client tự bỏ.
   Cách sửa: luôn dùng `await firstValueFrom(this.client.send(...).pipe(timeout(ms)))` và xử lý `TimeoutError`.

3. **Pattern hoặc cấu hình queue không khớp giữa hai phía.**
   Tại sao sai: gõ `'order.create'` ở gateway nhưng service nghe `'orders.create'` dẫn tới lỗi "There is no matching message handler" hoặc timeout. Tương tự, `queueOptions.durable` khác nhau giữa hai phía làm RabbitMQ từ chối khai báo queue (`PRECONDITION_FAILED`).
   Cách sửa: đặt pattern, tên queue trong `libs/contracts`, import ở cả hai app; giữ `queueOptions` giống hệt nhau.

4. **Hai service khác nhau cùng consume một queue.**
   Tại sao sai: RabbitMQ chia message round-robin giữa các consumer, nên `notifications-service` có thể "cướp" message `orders.create` mà nó không có handler.
   Cách sửa: mỗi service một queue riêng (`orders_queue`, `notifications_queue`). Nhiều instance của **cùng** một service thì dùng chung queue để load balance.

5. **Dùng chung database giữa các service "cho nhanh".**
   Tại sao sai: tạo ra distributed monolith, mọi thay đổi schema buộc các service deploy cùng nhau.
   Cách sửa: mỗi service một database; cần dữ liệu thì hỏi qua message hoặc giữ bản sao cập nhật bằng event.

---

## Bài tập thực hành trên lớp

**Đề bài:** Mở rộng demo ở mục 7:

1. Thêm pattern `orders.find_all` trả về danh sách đơn hàng có phân trang (`page`, `limit`, Lesson 07). Gateway mở `GET /orders?page=1&limit=10`.
2. Thêm `DELETE /orders/:id`: nếu đơn đã `paid` thì service ném `RpcException` với `statusCode: 409`, gateway trả về `409 Conflict` đúng format Lesson 08.
3. Tắt `orders-service`, gọi `GET /orders` và chứng minh gateway trả 504 trong vòng 5 giây.

**Gợi ý hướng giải:**

- Thêm hằng số `FIND_ALL`, `REMOVE` vào `ORDER_PATTERNS` trước, rồi mới viết handler hai phía. Payload có thể là `{ page, limit }`, nhớ tạo DTO query ở gateway với `@Type(() => Number)` để ValidationPipe chuyển kiểu.
- Service dùng `findAndCount` với `skip`, `take` và trả `{ items, total, page, limit }`.
- Hàm `toHttpException()` đã xử lý mọi `statusCode` nên không cần sửa, chỉ cần service ném đúng object.
- Quan sát queue trên Management UI trong lúc service tắt để thấy request đang chờ.

---

## Homework

- [ ] Hoàn thiện bài tập trên lớp, viết file `orders.http` (hoặc Postman collection) cho cả 5 endpoint.
- [ ] Đổi transport của demo từ RabbitMQ sang TCP rồi sang Redis (dùng Redis container của Lesson 13). Ghi lại những file phải sửa, xác nhận handler không đổi.
- [ ] Tạo thêm `notifications-service` với queue riêng. Khi `orders-service` tạo đơn thành công, nó `emit('orders.created')` sang `notifications-service` (orders-service cũng cần `ClientsModule`). `notifications-service` log ra "Gửi email xác nhận đơn #id" (có thể tái sử dụng MailModule của Lesson 14).
- [ ] Viết `RpcExceptionFilter` tùy chỉnh ở `orders-service` để mọi lỗi không mong đợi (ví dụ lỗi TypeORM) đều được chuyển thành `{ statusCode: 500, message }` thống nhất.
- [ ] (Nâng cao) Bật `noAck: false` cho `orders-service`, ack thủ công ở mọi handler, cố ý ném lỗi trong `markPaid` rồi dùng `channel.nack(message, false, true)` để message được giao lại. Quan sát trên Management UI, sau đó thêm giới hạn số lần retry để tránh vòng lặp vô hạn.

---

## Câu hỏi ôn tập

1. Nêu 3 dấu hiệu cho thấy một team nên tách service, và giải thích vì sao modular monolith thường là lựa chọn mặc định tốt hơn.
2. Vì sao mỗi service nên có database riêng? Khi `orders-service` cần tên khách hàng thuộc `users-service`, có những cách lấy nào?
3. Khác nhau giữa `client.send()` và `client.emit()` là gì? Vì sao `send()` cần `firstValueFrom()` và `timeout()`?
4. So sánh TCP, Redis và RabbitMQ về delivery guarantee và persistence. Với lệnh "trừ tiền ví" bạn chọn transport nào, tại sao?
5. Vì sao không nên ném `NotFoundException` trong microservice, và gateway nên xử lý lỗi từ service như thế nào?
