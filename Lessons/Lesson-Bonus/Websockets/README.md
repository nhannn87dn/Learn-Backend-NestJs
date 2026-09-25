# Bonus 05: Realtime với WebSockets

> Tiên quyết: Lesson 09 (JWT, `JwtAuthGuard`, `@CurrentUser()`), Lesson 13 (chạy Redis bằng Docker)

## Mục tiêu bài học

Sau bài này, học viên:

- **Giải thích được** sự khác nhau giữa Polling, Server-Sent Events (SSE) và WebSocket, và chọn được kỹ thuật phù hợp cho từng bài toán.
- **Giải thích được** WebSocket hoạt động thế nào (handshake, kết nối hai chiều lâu dài) và vì sao Socket.IO không phải WebSocket "thuần".
- **Cấu hình được** một WebSocket Gateway trong NestJS với `@nestjs/websockets` và `@nestjs/platform-socket.io`.
- **Viết được** handler nhận event bằng `@SubscribeMessage`, gửi event về client, broadcast và dùng rooms (`book:<id>`).
- **Viết được** cơ chế xác thực JWT cho WebSocket: kiểm tra token trong `handleConnection` và `WsJwtGuard` dùng `context.switchToWs()`.
- **Cấu hình được** Redis adapter để nhiều instance NestJS cùng phát event đúng cho mọi client.

## Ôn tập nhanh

Ở Lesson 09, ta đã xây dựng luồng đăng nhập trả về `accessToken` (JWT), rồi bảo vệ route bằng `JwtAuthGuard` (dựa trên `JwtStrategy` của Passport đọc header `Authorization: Bearer <token>`) và lấy user hiện tại bằng `@CurrentUser()`. Toàn bộ cơ chế đó dựa trên mô hình **request/response của HTTP**: client hỏi, server trả lời, kết nối kết thúc. Ở Lesson 13, ta đã chạy Redis bằng Docker (`docker run -d --name redis-local -p 6379:6379 redis:7-alpine`) để làm cache. Bài này dùng lại cả hai: JWT để xác thực kết nối realtime, và Redis để "nối" nhiều server WebSocket với nhau.

---

## 1. Realtime là gì? So sánh Polling, Server-Sent Events, WebSocket

### 1.1 Realtime là gì?

**Realtime** (thời gian thực) nghĩa là khi dữ liệu thay đổi ở server, client nhận được thay đổi đó **gần như ngay lập tức** mà người dùng không phải bấm F5. Ví dụ quen thuộc: tin nhắn chat, thông báo "có người vừa bình luận sách của bạn", số người đang xem, bảng giá chứng khoán, trạng thái đơn hàng.

Vấn đề là HTTP được thiết kế theo kiểu **client luôn là bên hỏi trước**. Server không có cách "chủ động" gửi dữ liệu cho client khi không có request nào đang mở. Có ba cách phổ biến để vượt qua giới hạn này.

### 1.2 Polling (và Long Polling)

**Short polling**: client cứ mỗi N giây gọi lại API (ví dụ `GET /books/1/comments?since=...`). Cách này đơn giản, dùng lại được toàn bộ REST API đã có, nhưng lãng phí: phần lớn request trả về "không có gì mới", và độ trễ tối đa bằng chu kỳ polling.

**Long polling**: client gửi request, server **giữ request đó lại** cho tới khi có dữ liệu mới (hoặc hết timeout) rồi mới trả lời; client nhận xong lại gửi request mới ngay. Độ trễ thấp hơn nhưng server phải giữ rất nhiều request mở.

```text
Short polling                         Long polling
Client        Server                  Client        Server
  |-- GET ------->|  (không có gì)       |-- GET ------->|
  |<-- [] --------|                      |               |  ...giữ request...
  |   (chờ 5s)    |                      |               |  có comment mới!
  |-- GET ------->|                      |<-- [c1] ------|
  |<-- [c1] ------|                      |-- GET ------->|  (gửi lại ngay)
```

### 1.3 Server-Sent Events (SSE)

**SSE** là chuẩn của trình duyệt (`EventSource`) cho phép server giữ **một** HTTP response mở và **đẩy dữ liệu một chiều** (server → client) dạng text stream. Ưu điểm: vẫn là HTTP thuần, tự reconnect, đi qua proxy dễ. Nhược điểm: **chỉ một chiều**, client muốn gửi dữ liệu lên vẫn phải gọi REST API riêng. NestJS hỗ trợ SSE bằng decorator `@Sse()` trả về một `Observable` — phù hợp cho dashboard, progress bar, thông báo đơn giản.

```typescript
// src/modules/notifications/notifications.controller.ts
import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { interval, map, Observable } from 'rxjs';

@Controller('notifications')
export class NotificationsController {
  // Client: new EventSource('/notifications/stream')
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    // Demo: mỗi 5 giây đẩy một event về client
    return interval(5000).pipe(map((n) => ({ data: { tick: n } })));
  }
}
```

### 1.4 WebSocket

**WebSocket** mở **một kết nối TCP lâu dài, hai chiều (full-duplex)** giữa client và server. Cả hai bên có thể gửi message bất cứ lúc nào, không cần header HTTP cho mỗi message, nên độ trễ và overhead rất thấp.

| Tiêu chí | Short Polling | Long Polling | SSE | WebSocket |
|---|---|---|---|---|
| Chiều dữ liệu | Client hỏi | Client hỏi | Server → Client | Hai chiều |
| Độ trễ | Cao (theo chu kỳ) | Thấp | Thấp | Rất thấp |
| Overhead | Rất cao | Cao | Thấp | Rất thấp |
| Độ phức tạp server | Thấp | Trung bình | Thấp | Cao (giữ state kết nối) |
| Phù hợp | Dữ liệu ít thay đổi | Fallback | Feed, dashboard | Chat, game, collaboration |

**Nguyên tắc chọn:** nếu chỉ cần server đẩy thông báo một chiều → SSE là đủ và đơn giản hơn. Nếu client cũng gửi dữ liệu liên tục (chat, typing indicator, game) → WebSocket. Đừng dùng WebSocket chỉ vì "nghe hiện đại": nó khiến server phải quản lý hàng nghìn kết nối có trạng thái, khó scale hơn REST.

---

## 2. WebSocket là gì?

### 2.1 Handshake và kết nối lâu dài

WebSocket bắt đầu bằng **một HTTP request bình thường** có header `Upgrade: websocket`. Nếu server đồng ý, nó trả về status `101 Switching Protocols`, và từ đó kết nối TCP không còn nói "ngôn ngữ HTTP" nữa mà chuyển sang giao thức WebSocket (`ws://` hoặc `wss://` khi có TLS).

```text
Client                                         Server
  |-- GET /chat HTTP/1.1 ------------------------>|
  |   Upgrade: websocket                          |
  |   Connection: Upgrade                         |
  |<-- HTTP/1.1 101 Switching Protocols ----------|
  |                                               |
  |==========  Kết nối WebSocket mở  =============|
  |-- message "join book:1" --------------------->|
  |<-- message "comment:created" -----------------|
  |<-- message "comment:created" -----------------|  (server chủ động gửi)
  |-- message "typing" -------------------------->|
  |==========  close  ============================|
```

Điểm quan trọng: **mỗi client giữ một kết nối mở với một server cụ thể**. Server biết "ai đang kết nối với mình" — đây là **state** nằm trong bộ nhớ của từng process. Nhớ chi tiết này, nó là gốc rễ của vấn đề scale ở mục 6.

### 2.2 Socket.IO không phải WebSocket thuần

**Socket.IO** là thư viện xây dựng **bên trên** WebSocket, bổ sung những thứ WebSocket thuần không có:

- **Event có tên**: `emit('comment:created', data)` thay vì chỉ gửi chuỗi/binary thô.
- **Acknowledgement**: gửi event và nhận phản hồi như gọi hàm (callback).
- **Rooms và namespaces**: gom client thành nhóm để gửi có chọn lọc.
- **Tự reconnect**, heartbeat phát hiện kết nối chết.
- **Fallback HTTP long-polling** khi mạng/proxy chặn WebSocket.

Đổi lại, Socket.IO có **giao thức riêng** trên WebSocket. Hệ quả: client phải dùng thư viện `socket.io-client` (hoặc thư viện tương thích Socket.IO); bạn **không thể** kết nối bằng `new WebSocket('ws://...')` của trình duyệt hay công cụ WebSocket thuần. Nếu cần WebSocket thuần (ví dụ thiết bị IoT), NestJS có `@nestjs/platform-ws` — nhưng bài này dùng Socket.IO vì nó phổ biến nhất và có sẵn rooms.

---

## 3. WebSocket Gateway trong NestJS (`@WebSocketGateway`)

### 3.1 Gateway là gì?

Trong NestJS, **Gateway** đóng vai trò giống **Controller** nhưng cho WebSocket: controller nhận HTTP request theo route, gateway nhận **event** theo tên. Gateway là một class có `@WebSocketGateway()` và bản chất là một **provider** — nên nó được inject dependency (service, repository) qua constructor như mọi provider khác (Lesson 05), và cũng có thể được inject vào service khác.

```text
                     ┌──────────────── NestJS app (port 3000) ────────────────┐
HTTP  GET /books ───►│ BooksController ──► BooksService ──► TypeORM (Postgres) │
                     │                            │                           │
Socket.IO /books ───►│ BookFeedGateway ◄──────────┘ (service gọi gateway      │
 event "book:join"   │   @SubscribeMessage          để phát event)           │
                     └────────────────────────────────────────────────────────┘
```

Mặc định gateway chạy **chung port** với HTTP server (Socket.IO gắn vào HTTP server của Express), nên không cần mở thêm port.

### 3.2 Cài đặt

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
# Phía client (React/Node script test)
npm install socket.io-client
```

### 3.3 Gateway đầu tiên và lifecycle hooks

Ví dụ xuyên suốt: **feed bình luận realtime cho từng cuốn sách**. Khi ai đó bình luận sách `id = 1`, mọi người đang xem trang sách đó nhận bình luận mới ngay lập tức.

```typescript
// src/modules/realtime/book-feed.gateway.ts
import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/books', // client kết nối tới http://localhost:3000/books
  cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }, // CORS riêng cho Socket.IO
})
export class BookFeedGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BookFeedGateway.name);

  // Instance Socket.IO Server (của namespace /books), dùng để emit tới client
  @WebSocketServer()
  server!: Server;

  // Chạy mỗi khi có client kết nối thành công
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  // Chạy khi client ngắt kết nối (đóng tab, mất mạng, bị disconnect)
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
```

Giải thích:

- `namespace` giống như "prefix route" cho socket: tách kênh `/books` với kênh `/chat` khác, mỗi namespace có event và rooms riêng.
- `@WebSocketServer()` inject đối tượng `Server` của Socket.IO. Dấu `!` là definite assignment (Lesson 02) vì NestJS gán giá trị sau khi khởi tạo, không phải trong constructor.
- `OnGatewayConnection` / `OnGatewayDisconnect` là interface lifecycle, tương tự `OnModuleInit`. Còn có `OnGatewayInit` (`afterInit(server)`) chạy một lần khi server khởi tạo.
- Mỗi `client: Socket` có `client.id` duy nhất cho một kết nối (reconnect sẽ ra id mới).

Đăng ký gateway như một provider:

```typescript
// src/modules/realtime/realtime.module.ts
import { Module } from '@nestjs/common';
import { BookFeedGateway } from './book-feed.gateway';
import { WsAuthService } from './ws-auth.service';

@Module({
  providers: [BookFeedGateway, WsAuthService],
  exports: [BookFeedGateway], // cho CommentsModule inject gateway để phát event
})
export class RealtimeModule {}
```

---

## 4. Socket.IO với NestJS

### 4.1 Emit và listen event (`@SubscribeMessage`)

Luồng hai chiều gồm hai vế:

- **Listen** (server nhận): client gọi `socket.emit('book:join', payload)` → NestJS tìm method có `@SubscribeMessage('book:join')` và gọi nó.
- **Emit** (server gửi): server gọi `client.emit(...)` hoặc `this.server.emit(...)` → client nhận qua `socket.on('tên-event', handler)`.

Trong handler, `@MessageBody()` lấy payload (giống `@Body()`), `@ConnectedSocket()` lấy socket của client đang gửi (giống `@Req()`). **Giá trị return** của handler được gửi lại cho client dưới dạng **acknowledgement** (nếu client truyền callback).

```typescript
// src/modules/realtime/dto/join-book.dto.ts
import { IsInt, Min } from 'class-validator';

export class JoinBookDto {
  @IsInt()
  @Min(1)
  bookId!: number;
}
```

```typescript
// src/modules/realtime/book-feed.gateway.ts (bổ sung)
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WsException } from '@nestjs/websockets';
import { JoinBookDto } from './dto/join-book.dto';

// ValidationPipe mặc định ném BadRequestException (lỗi HTTP) → chuyển thành WsException
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    exceptionFactory: (errors) => new WsException(errors),
  }),
)
@WebSocketGateway({ namespace: '/books' /* ...như trên */ })
export class BookFeedGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // ...

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: { at: number }): { event: string; data: unknown } {
    // Cách 1: return object { event, data } → NestJS emit event 'pong' về đúng client này
    return { event: 'pong', data: { at: data.at, serverTime: Date.now() } };
  }
}
```

Phía client:

```typescript
// client/src/socket.ts  (React hoặc script Node)
import { io } from 'socket.io-client';

export const socket = io('http://localhost:3000/books');

socket.on('connect', () => console.log('connected', socket.id));
socket.on('pong', (data) => console.log('pong', data));
socket.emit('ping', { at: Date.now() });
```

### 4.2 Broadcast

**Broadcast** là gửi một event tới **nhiều client cùng lúc**. Socket.IO có ba mức:

| Cú pháp | Ai nhận |
|---|---|
| `client.emit(ev, data)` | Chỉ client hiện tại |
| `this.server.emit(ev, data)` | Tất cả client trong namespace |
| `client.broadcast.emit(ev, data)` | Tất cả client **trừ** client gửi |

Ví dụ: thông báo toàn hệ thống khi có sách mới được thêm (mọi người đang online đều thấy).

```typescript
// src/modules/realtime/book-feed.gateway.ts (bổ sung)
notifyNewBook(book: { id: number; title: string }): void {
  // Gửi cho mọi client đang kết nối namespace /books
  this.server.emit('book:created', book);
}
```

Hàm này **không** có `@SubscribeMessage` — nó được gọi từ service khi REST API tạo sách thành công. Đây là pattern rất phổ biến: **ghi dữ liệu qua REST, nhận thay đổi qua WebSocket**.

### 4.3 Rooms

Broadcast cho tất cả thường quá rộng: người đang xem sách 1 không cần bình luận của sách 2. **Room** là một nhóm socket có tên, do server quản lý. Một socket có thể ở nhiều room; mỗi socket mặc định tự ở trong room mang tên chính `client.id` của nó.

```text
Namespace /books
 ├── room "book:1"   → [socketA, socketB]
 ├── room "book:2"   → [socketC]
 └── room "user:42"  → [socketA, socketD]   (một user mở 2 tab)

server.to('book:1').emit('comment:created', c)  → socketA, socketB
```

Quy ước đặt tên room có prefix (`book:<id>`, `user:<id>`) giúp tránh trùng và dễ debug.

```typescript
// src/modules/realtime/book-feed.gateway.ts (bổ sung)
@SubscribeMessage('book:join')
async handleJoinBook(
  @MessageBody() dto: JoinBookDto,
  @ConnectedSocket() client: Socket,
): Promise<{ joined: string }> {
  const room = `book:${dto.bookId}`;
  await client.join(room); // thêm socket vào room
  return { joined: room }; // Cách 2: return giá trị → gửi về callback ack của client
}

@SubscribeMessage('book:leave')
async handleLeaveBook(
  @MessageBody() dto: JoinBookDto,
  @ConnectedSocket() client: Socket,
): Promise<{ left: string }> {
  const room = `book:${dto.bookId}`;
  await client.leave(room);
  return { left: room };
}

@SubscribeMessage('book:typing')
handleTyping(@MessageBody() dto: JoinBookDto, @ConnectedSocket() client: Socket): void {
  // Gửi cho mọi người trong room TRỪ người đang gõ
  client.to(`book:${dto.bookId}`).emit('book:typing', { socketId: client.id });
}

// Được gọi từ CommentsService sau khi lưu comment vào database
emitCommentCreated(bookId: number, comment: { id: number; content: string; userId: number }): void {
  this.server.to(`book:${bookId}`).emit('comment:created', comment);
}
```

Nối REST với realtime: `CommentsService` lưu bình luận bằng TypeORM rồi gọi gateway. Không lưu dữ liệu qua socket khi đã có REST API chuẩn — REST dễ validate, test, và có status code rõ ràng.

```typescript
// src/modules/comments/comments.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { BookFeedGateway } from '../realtime/book-feed.gateway';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private readonly commentRepo: Repository<Comment>,
    private readonly bookFeed: BookFeedGateway, // inject gateway như provider thường
  ) {}

  async create(bookId: number, userId: number, dto: CreateCommentDto): Promise<Comment> {
    const comment = await this.commentRepo.save(
      this.commentRepo.create({ bookId, userId, content: dto.content }),
    );
    // Chỉ phát event SAU khi ghi DB thành công
    this.bookFeed.emitCommentCreated(bookId, {
      id: comment.id,
      content: comment.content,
      userId,
    });
    return comment;
  }
}
```

(`CommentsModule` cần `imports: [RealtimeModule, TypeOrmModule.forFeature([Comment])]`; controller `POST /books/:bookId/comments` dùng `JwtAuthGuard` và `@CurrentUser()` như Lesson 09.)

Client dùng acknowledgement:

```typescript
// client/src/book-page.ts
socket.emit('book:join', { bookId: 1 }, (res: { joined: string }) => {
  console.log('Đã vào room', res.joined);
});
socket.on('comment:created', (c) => console.log('Bình luận mới:', c));
socket.on('exception', (err) => console.error('Lỗi từ server:', err)); // WsException
```

---

## 5. Xác thực WebSocket bằng JWT (Guard cho Gateway)

### 5.1 Token được gửi ở đâu?

Với HTTP, mỗi request gửi kèm `Authorization: Bearer <token>`. Với WebSocket, **chỉ có một lần HTTP duy nhất là lúc handshake**; sau đó chỉ còn message. Vì vậy token phải được gửi **trong handshake**. Socket.IO client có option `auth` dành cho việc này (trình duyệt không cho set header tùy ý khi mở WebSocket, nên `auth` là cách chuẩn):

```typescript
// client/src/socket.ts
import { io } from 'socket.io-client';

const accessToken = localStorage.getItem('accessToken'); // token lấy từ POST /auth/login (Lesson 09)

export const socket = io('http://localhost:3000/books', {
  auth: { token: accessToken }, // server đọc ở client.handshake.auth.token
});

socket.on('connect_error', (err) => console.error('Không kết nối được:', err.message));
socket.on('disconnect', (reason) => console.warn('Mất kết nối:', reason));
```

### 5.2 Vì sao không dùng lại `JwtAuthGuard` của Lesson 09?

`JwtAuthGuard` extends `AuthGuard('jwt')` của Passport, và `JwtStrategy` dùng `ExtractJwt.fromAuthHeaderAsBearerToken()` — tức là nó gọi `context.switchToHttp().getRequest()` rồi đọc header của **HTTP request**. Trong gateway, `ExecutionContext` có type là `'ws'`, không có `request`, không có header `Authorization` cho từng message. Dùng nguyên `JwtAuthGuard` sẽ lỗi hoặc luôn trả 401. Tương tự, `@CurrentUser()` đọc `request.user` nên cũng không dùng được.

Giải pháp: tự verify token bằng `JwtService` (đã đăng ký `global: true` ở Lesson 09) và lấy client bằng `context.switchToWs().getClient()`.

### 5.3 Hai lớp bảo vệ

```text
Client ──handshake (auth.token)──► handleConnection()
                                     ├─ token sai/hết hạn → emit 'exception' + disconnect()
                                     └─ token đúng → client.data.user = {...}; join room "user:<id>"
Client ──emit 'book:join'────────► WsJwtGuard (switchToWs) ──► @SubscribeMessage handler
                                     └─ không có user → throw WsException('Unauthorized')
```

- **Lớp 1 — `handleConnection`**: chặn ngay từ lúc kết nối. Lưu ý quan trọng: **Guard không chạy cho `handleConnection`**, guard chỉ áp dụng cho các method `@SubscribeMessage`. Nên muốn từ chối kết nối, phải tự verify và gọi `client.disconnect()`.
- **Lớp 2 — `WsJwtGuard`**: bảo vệ từng event handler, giống cách `@UseGuards(JwtAuthGuard)` bảo vệ từng route.

Tách logic verify vào một service để hai nơi dùng chung:

```typescript
// src/modules/realtime/ws-auth.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

export interface WsUser {
  userId: number;
  email: string;
}

interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class WsAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Đọc token từ handshake: ưu tiên auth.token, fallback header Authorization (client Node/Postman)
  private extractToken(client: Socket): string | undefined {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    const header = client.handshake.headers.authorization;
    return fromAuth ?? header?.replace(/^Bearer\s+/i, '');
  }

  async verifyClient(client: Socket): Promise<WsUser> {
    const token = this.extractToken(client);
    if (!token) throw new WsException('Missing token');
    try {
      // Dùng CÙNG secret đã ký access token ở Lesson 09
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      return { userId: payload.sub, email: payload.email }; // cùng shape với JwtStrategy.validate()
    } catch {
      throw new WsException('Invalid or expired token');
    }
  }
}
```

```typescript
// src/modules/realtime/book-feed.gateway.ts (cập nhật handleConnection)
constructor(private readonly wsAuth: WsAuthService) {}

async handleConnection(client: Socket): Promise<void> {
  try {
    const user = await this.wsAuth.verifyClient(client);
    client.data.user = user;               // client.data: chỗ lưu dữ liệu riêng của socket
    await client.join(`user:${user.userId}`); // room cá nhân để gửi notification riêng
    this.logger.log(`User ${user.userId} connected (${client.id})`);
  } catch (err) {
    const message = err instanceof WsException ? err.message : 'Unauthorized';
    client.emit('exception', { status: 'error', message });
    client.disconnect(true); // ngắt kết nối client không hợp lệ
  }
}
```

Guard cho event handler:

```typescript
// src/modules/realtime/guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsAuthService } from '../ws-auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly wsAuth: WsAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // switchToWs() thay cho switchToHttp() của Lesson 09
    const client = context.switchToWs().getClient<Socket>();
    if (client.data.user) return true; // đã verify lúc connect

    // Phòng trường hợp gateway khác không verify ở handleConnection
    client.data.user = await this.wsAuth.verifyClient(client); // ném WsException nếu sai
    return true;
  }
}
```

Tương đương `@CurrentUser()` cho WebSocket:

```typescript
// src/modules/realtime/decorators/ws-current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WsUser } from '../ws-auth.service';

export const WsCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WsUser => {
    const client = ctx.switchToWs().getClient<Socket>();
    return client.data.user as WsUser;
  },
);
```

```typescript
// src/modules/realtime/book-feed.gateway.ts (sử dụng)
@UseGuards(WsJwtGuard)
@SubscribeMessage('book:join')
async handleJoinBook(
  @MessageBody() dto: JoinBookDto,
  @ConnectedSocket() client: Socket,
  @WsCurrentUser() user: WsUser,
): Promise<{ joined: string }> {
  const room = `book:${dto.bookId}`;
  await client.join(room);
  this.logger.log(`User ${user.userId} joined ${room}`);
  return { joined: room };
}

// Gửi notification riêng cho 1 user (mọi tab/thiết bị của họ)
notifyUser(userId: number, payload: { message: string }): void {
  this.server.to(`user:${userId}`).emit('notification', payload);
}
```

Khi `WsJwtGuard` ném `WsException`, NestJS bắt lại bằng `BaseWsExceptionFilter` và emit event `exception` về client — **không có status code 401** như HTTP. Client phải lắng nghe `socket.on('exception', ...)`.

**Lưu ý về token hết hạn:** token chỉ được kiểm tra lúc handshake. Nếu access token sống 15 phút, socket vẫn mở sau 15 phút. Với hệ thống cần chặt chẽ, client nên refresh token (Lesson 09) rồi reconnect với token mới, hoặc server định kỳ ngắt các kết nối có token đã hết hạn.

---

## 6. Chạy nhiều instance với Redis adapter

### 6.1 Vấn đề: rooms và broadcast chỉ sống trong một process

Khi traffic tăng, ta chạy nhiều instance (PM2 cluster, nhiều container) phía sau load balancer (Lesson 16). Với REST, việc này vô hại vì mỗi request độc lập. Với WebSocket thì **hỏng**: danh sách room và socket được lưu **trong RAM của từng instance**.

```text
                    Load Balancer
                 ┌───────┴───────┐
            Instance A        Instance B
       room book:1: [Alice]   room book:1: [Bob]

Charlie POST /books/1/comments → rơi vào Instance B
Instance B: server.to('book:1').emit(...)  → chỉ Bob nhận
Alice (kết nối ở A) KHÔNG nhận được gì!
```

Instance B không biết Alice tồn tại, vì Alice kết nối với A.

### 6.2 Giải pháp: Redis adapter (Pub/Sub)

**Adapter** trong Socket.IO là thành phần quyết định "emit tới room thì gửi cho ai". Adapter mặc định chỉ nhìn trong bộ nhớ. `@socket.io/redis-adapter` dùng **Redis Pub/Sub**: khi một instance emit tới room, nó **publish** message lên Redis; mọi instance khác **subscribe** kênh đó, nhận message và tự emit cho các socket trong room của mình.

```text
Instance B: to('book:1').emit ──publish──► Redis ──subscribe──► Instance A ──► Alice
             └──► Bob (local)                     └──────────► Instance C ──► ...
```

```bash
npm install @socket.io/redis-adapter redis
# Redis đã chạy bằng Docker từ Lesson 13 (redis-local, port 6379)
```

Viết một custom `IoAdapter`:

```typescript
// src/common/adapters/redis-io.adapter.ts
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    // Pub/Sub cần 2 connection riêng: một để publish, một để subscribe
    const pubClient = createClient({ url: this.redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  // NestJS gọi hàm này khi tạo Socket.IO server cho mỗi gateway
  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(this.adapterConstructor); // thay adapter in-memory bằng Redis adapter
    return server;
  }
}
```

Nối vào `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const host = config.get<string>('REDIS_HOST', 'localhost');
  const port = config.get<string>('REDIS_PORT', '6379');

  const redisIoAdapter = new RedisIoAdapter(app, `redis://${host}:${port}`);
  await redisIoAdapter.connectToRedis(); // phải kết nối Redis TRƯỚC khi app.listen()
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(config.get<number>('PORT', 3000));
}
bootstrap();
```

Code gateway **không cần thay đổi gì**: `server.to('book:1').emit(...)` giờ tự động đến mọi instance.

### 6.3 Sticky sessions

Socket.IO mặc định kết nối bằng **HTTP long-polling trước**, rồi mới "upgrade" lên WebSocket. Trong giai đoạn polling, client gửi **nhiều HTTP request** cùng một session id. Nếu load balancer chia các request đó sang instance khác nhau, instance thứ hai không biết session → lỗi `Session ID unknown` (HTTP 400) và client reconnect liên tục.

Hai cách xử lý:

1. **Bật sticky sessions** ở load balancer (Nginx `ip_hash`, cookie-based affinity trên cloud LB) để mọi request của một client luôn về cùng instance.
2. **Tắt fallback polling**: client dùng `io(url, { transports: ['websocket'] })`. Không cần sticky session nữa, nhưng mất khả năng fallback khi mạng chặn WebSocket.

Redis adapter giải quyết chuyện **phát event xuyên instance**; sticky session giải quyết chuyện **giữ một client ở một instance** trong lúc polling. Hai vấn đề khác nhau, thường cần cả hai.

---

## Common mistakes

1. **Dùng `new WebSocket()` hoặc tool WebSocket thuần để test server Socket.IO.**
   *Vì sao sai:* Socket.IO có giao thức riêng bên trên WebSocket, client thuần không hiểu được handshake và format message → kết nối bị đóng ngay hoặc không nhận được event nào.
   *Cách sửa:* dùng `socket.io-client` (hoặc Postman chế độ "Socket.IO"). Nếu bắt buộc cần WebSocket thuần, đổi sang `@nestjs/platform-ws`.

2. **Gắn `@UseGuards(JwtAuthGuard)` (HTTP) lên gateway, hoặc nghĩ guard sẽ chặn kết nối.**
   *Vì sao sai:* `JwtAuthGuard`/`JwtStrategy` đọc header của HTTP request qua `switchToHttp()`, trong khi context của gateway là `ws`. Hơn nữa guard chỉ chạy cho `@SubscribeMessage`, không chạy cho `handleConnection` — client không có token vẫn kết nối được và vẫn nhận broadcast.
   *Cách sửa:* verify token trong `handleConnection` và `client.disconnect()` nếu sai; dùng `WsJwtGuard` với `context.switchToWs()` cho từng event; ném `WsException` thay vì `UnauthorizedException`.

3. **Ném HTTP exception hoặc để ValidationPipe mặc định trong gateway.**
   *Vì sao sai:* `BadRequestException`, `NotFoundException`... là exception HTTP; trong context WebSocket, `BaseWsExceptionFilter` chỉ hiểu `WsException`, các lỗi khác bị biến thành `"Internal server error"` chung chung. Ngoài ra `app.useGlobalPipes()` không áp dụng cho gateway.
   *Cách sửa:* ném `WsException`; khai báo `@UsePipes(new ValidationPipe({ exceptionFactory: (errors) => new WsException(errors) }))` ngay trên gateway.

4. **Chạy nhiều instance mà không có Redis adapter.**
   *Vì sao sai:* rooms nằm trong RAM của từng process; chạy local 1 instance thì chạy đúng, lên production với PM2 cluster/nhiều container thì client "lúc nhận lúc không".
   *Cách sửa:* cấu hình `RedisIoAdapter` như mục 6 và bật sticky sessions (hoặc `transports: ['websocket']`).

5. **Emit event trước khi ghi database thành công.**
   *Vì sao sai:* nếu `save()` lỗi (vi phạm constraint, mất kết nối DB), client đã hiển thị một bình luận không tồn tại.
   *Cách sửa:* chỉ emit sau khi `await repository.save()` xong; với transaction (Lesson 07), emit sau khi commit.

---

## Bài tập thực hành trên lớp

**Đề bài:** Xây dựng tính năng "bình luận sách realtime".

1. Tạo entity `Comment` (`id`, `content`, `bookId`, `userId`, `createdAt`) với quan hệ `ManyToOne` tới `Book` và `User`.
2. Tạo API `POST /books/:bookId/comments` (có `JwtAuthGuard`, lấy user bằng `@CurrentUser()`) và `GET /books/:bookId/comments`.
3. Tạo `BookFeedGateway` namespace `/books`:
   - Xác thực JWT trong `handleConnection`, client không có token bị disconnect.
   - Event `book:join` / `book:leave` (có `WsJwtGuard`, validate `bookId` bằng DTO).
   - Sau khi tạo comment qua REST, emit `comment:created` tới room `book:<bookId>`.
4. Viết một script Node (`scripts/client.ts`) mở **hai** client với hai token khác nhau, cùng join `book:1`; một client gọi REST tạo bình luận, client còn lại phải in ra bình luận mới.

**Gợi ý hướng giải:**

- Làm REST trước, test bằng Postman cho chắc, rồi mới thêm gateway.
- `CommentsModule` import `RealtimeModule` để inject `BookFeedGateway` vào `CommentsService`.
- Trong script Node, dùng `fetch('http://localhost:3000/auth/login', ...)` lấy token, rồi `io('http://localhost:3000/books', { auth: { token } })`. Chạy bằng `npx tsx scripts/client.ts`.
- Gặp lỗi CORS khi test từ React: kiểm tra option `cors` trong `@WebSocketGateway` (khác với `app.enableCors()` của HTTP).
- Không nhận được event? In `client.rooms` trong handler `book:join` để xác nhận socket đã vào room.

---

## Homework

- [ ] Hoàn thiện bài tập trên lớp; client in ra lỗi rõ ràng khi token sai (lắng nghe `connect_error` và `exception`).
- [ ] Thêm event `book:typing`: khi một người gõ, những người khác trong room thấy "Ai đó đang nhập...", người gõ không nhận lại event của chính mình.
- [ ] Hiển thị **số người đang xem** mỗi cuốn sách: khi join/leave/disconnect, emit `book:viewers` với số lượng socket trong room (gợi ý: `await this.server.in(room).fetchSockets()`).
- [ ] Gửi notification riêng: khi có người bình luận vào sách do user X tạo, emit `notification` tới room `user:<X>` (mọi tab của X đều nhận).
- [ ] Viết một trang React nhỏ (như Mini project Lesson 08) hiển thị danh sách bình luận, tự thêm bình luận mới qua socket mà không reload.
- [ ] (Nâng cao) Cấu hình `RedisIoAdapter`, chạy 2 instance ở port 3000 và 3001 (`PORT=3001 npm run start`), cho client A kết nối 3000, client B kết nối 3001; chứng minh bình luận tạo qua 3001 vẫn đến client A. Sau đó thử tắt adapter để quan sát lỗi, và giải thích trong README vì sao cần sticky session khi đặt sau Nginx.

---

## Câu hỏi ôn tập

1. So sánh Short Polling, SSE và WebSocket về chiều dữ liệu và overhead. Với tính năng "thông báo đơn hàng đã giao" (chỉ server gửi xuống), bạn chọn kỹ thuật nào và vì sao?
2. Vì sao `new WebSocket('ws://localhost:3000/books')` của trình duyệt không nói chuyện được với gateway dùng `@nestjs/platform-socket.io`?
3. Phân biệt `this.server.emit()`, `client.broadcast.emit()` và `this.server.to('book:1').emit()`. Mỗi cái phù hợp cho tình huống nào?
4. Vì sao không dùng lại được `JwtAuthGuard` của Lesson 09 cho gateway? Token JWT được gửi ở đâu, và vì sao phải verify trong `handleConnection` chứ không chỉ dựa vào guard?
5. Khi chạy 3 instance sau load balancer, vì sao room bị "mất" message? Redis adapter và sticky session lần lượt giải quyết vấn đề gì?
