# Lifecycle Events trong NestJS

## 2.1. Lifecycle Events là gì?

`Lifecycle Events` trong NestJS là các hook (móc vòng đời) mà framework cung cấp để bạn có thể thực thi logic vào những thời điểm cụ thể trong vòng đời của một module hoặc service. Những event này giúp quản lý và điều khiển quá trình khởi tạo, xử lý, và hủy của các thành phần trong ứng dụng.

![Lifecycle Events](./img/lifecycle-events.png)

👉 Nói đơn giản:

> Lifecycle Events giúp bạn **can thiệp vào quá trình sống của ứng dụng NestJS**

---

## 2.2 Vì sao cần Lifecycle Events?

Trong backend thực tế, ta thường cần:

* Kết nối database khi app start
* Load config sau khi module init
* Subscribe message queue
* Dọn tài nguyên khi app shutdown
* Close DB connection, Redis, Kafka…

👉 **Lifecycle Events sinh ra để làm những việc này**

---

## 2.3. Các Lifecycle Events trong NestJS

NestJS cung cấp các interface sau:

| Interface                   | Thời điểm được gọi          |
| --------------------------- | --------------------------- |
| `OnModuleInit`              | Khi module đã được khởi tạo |
| `OnApplicationBootstrap`    | Khi toàn app đã sẵn sàng    |
| `OnModuleDestroy`           | Khi module bị huỷ           |
| `BeforeApplicationShutdown` | Trước khi app shutdown      |

---

## 2.4. Thứ tự vòng đời tổng quát

```
Constructor
   ↓
onModuleInit()
   ↓
onApplicationBootstrap()
   ↓
(App đang chạy)
   ↓
onModuleDestroy()
   ↓
beforeApplicationShutdown()
```

---

## 2.5. Chi tiết từng Lifecycle Event

---

## 2.5.1 `constructor()`

```ts
@Injectable()
export class UserService {
  constructor() {
    console.log('Constructor called');
  }
}
```

Ý nghĩa

* Chỉ dùng để **inject dependency**
* ❌ Không nên:

  * Gọi DB
  * Đọc config phức tạp
  * Logic async

👉 Constructor **không phải lifecycle hook chính thức**

---

## 2.5.2 `OnModuleInit`

```ts
@Injectable()
export class DatabaseService implements OnModuleInit {
  onModuleInit() {
    console.log('Module initialized');
  }
}
```

Khi nào chạy?

* Sau khi provider của module được khởi tạo
* Module đó **đã sẵn sàng**

Dùng khi:

* Validate config
* Setup resource cho module
* Kiểm tra dependency

👉 Rất hay dùng với `ConfigModule.forFeature()`

---

## 2.5.3 `OnApplicationBootstrap`

```ts
@Injectable()
export class AppService implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    console.log('Application is ready');
  }
}
```

Khi nào chạy?

* Sau khi **tất cả module** đã init xong
* App **sẵn sàng nhận request**

Dùng khi:

* Connect DB
* Start cron job
* Subscribe queue
* Warm cache

👉 Phù hợp cho **logic toàn app**

---

## 2.5.4 `OnModuleDestroy`

```ts
@Injectable()
export class CacheService implements OnModuleDestroy {
  onModuleDestroy() {
    console.log('Module destroyed');
  }
}
```

Khi nào chạy?

* Khi module bị unload
* Khi app chuẩn bị shutdown

 Dùng khi:

* Cleanup resource của module
* Close connection riêng

---

## 2.5.5 `BeforeApplicationShutdown`

```ts
@Injectable()
export class AppService
  implements BeforeApplicationShutdown {
  beforeApplicationShutdown(signal: string) {
    console.log('App shutting down:', signal);
  }
}
```

Khi nào chạy?

* Trước khi app dừng hẳn
* Nhận signal:

  * SIGTERM
  * SIGINT
  * SIGUSR2

Dùng khi:

* Close DB
* Close Redis
* Flush log
* Graceful shutdown

👉 **RẤT QUAN TRỌNG trong production**

---

## 2.6. Ví dụ thực tế: Database lifecycle

```ts
@Injectable()
export class DatabaseService
  implements OnApplicationBootstrap, BeforeApplicationShutdown {

  async onApplicationBootstrap() {
    console.log('Connect DB');
  }

  async beforeApplicationShutdown() {
    console.log('Close DB');
  }
}
```

👉 Pattern chuẩn cho DB / Redis / MQ

---

## 2.7. Lifecycle Events & Lazy Loading

⚠️ Lưu ý quan trọng:

* Module lazy load:

  * `onModuleInit()` chỉ chạy **khi module được load**
* Không chạy lúc app start

👉 Rất phù hợp cho:

* Admin module
* Report module

---

## 2.8. Những sai lầm phổ biến (RẤT HAY GẶP)

## ❌ Dùng constructor để connect DB

```ts
constructor() {
  connectDatabase(); // SAI
}
```

---

## ❌ Logic async trong constructor

```ts
constructor() {
  await loadConfig(); // SAI
}
```

---

## ✅ Cách đúng

* Constructor → inject
* Lifecycle hook → logic

---

## 2.9. Best Practice 

> ✅ Constructor chỉ để inject
> ✅ onModuleInit → logic module
> ✅ onApplicationBootstrap → logic toàn app
> ✅ beforeApplicationShutdown → cleanup
> ❌ Không business logic trong lifecycle

---

## 2.10. So sánh nhanh các hook

| Hook                      | Phạm vi  |
| ------------------------- | -------- |
| constructor               | Provider |
| onModuleInit              | Module   |
| onApplicationBootstrap    | Toàn app |
| onModuleDestroy           | Module   |
| beforeApplicationShutdown | Toàn app |
