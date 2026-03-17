# 📘 Lesson 01 – Kiến thức nền cho NestJS RESTful API

> **Mục tiêu buổi học**
> Sau bài này, người học sẽ:
>
> * Hiểu **Backend là gì** và vai trò của Backend Developer
> * Hiểu **Node.js** hoạt động như thế nào (Event Loop, Non-blocking I/O)
> * Nắm vững **JavaScript ES6+** cần thiết cho NestJS
> * Nắm vững **TypeScript cơ bản** – ngôn ngữ chính của NestJS
> * Phân biệt **NPM, Yarn, PNPM** và biết cách dùng Package.json

---

## 1️⃣ Backend là gì?

### 1.1 Kiến trúc tổng thể của Web Application

Một ứng dụng web hiện đại gồm 3 tầng chính:

```
┌─────────────────┐        HTTP Request         ┌─────────────────┐
│    Frontend     │  ─────────────────────────► │    Backend      │
│  (Browser/App)  │ ◄─────────────────────────  │    (Server)     │
└─────────────────┘        HTTP Response         └────────┬────────┘
   HTML/CSS/JS                                            │
   React/Vue/Angular                                      │ SQL / ORM
                                                 ┌────────▼────────┐
                                                 │    Database     │
                                                 │ PostgreSQL/     │
                                                 │ MongoDB/Redis   │
                                                 └─────────────────┘
```

📌 **Frontend** (Client-side):
* Chạy trên trình duyệt hoặc mobile app
* Hiển thị giao diện cho người dùng
* Giao tiếp với Backend qua HTTP/API

📌 **Backend** (Server-side):
* Chạy trên server, **không hiển thị trực tiếp** với người dùng
* Xử lý toàn bộ business logic
* Kết nối và thao tác với database

📌 **Database**:
* Lưu trữ dữ liệu lâu dài
* Trả dữ liệu theo yêu cầu của Backend

---

### 1.2 Backend làm gì?

| Nhiệm vụ | Ví dụ cụ thể |
| -------- | ------------ |
| Nhận & xử lý request | `POST /auth/login` – kiểm tra thông tin đăng nhập |
| Business logic | Tính phí vận chuyển, kiểm tra tồn kho |
| Truy xuất database | Lấy danh sách sản phẩm từ PostgreSQL |
| Authentication | Tạo và xác thực JWT token |
| Authorization | Kiểm tra quyền truy cập dữ liệu |
| Trả response (JSON) | `{ "data": [...], "statusCode": 200 }` |

📌 **Ví dụ luồng đăng nhập:**

```
Client                    Backend                   Database
  │                          │                          │
  │  POST /auth/login        │                          │
  │  { email, password }     │                          │
  │─────────────────────────►│                          │
  │                          │  SELECT * FROM users     │
  │                          │  WHERE email = ?         │
  │                          │─────────────────────────►│
  │                          │◄─────────────────────────│
  │                          │  (user record)           │
  │                          │                          │
  │                          │  bcrypt.compare(pw)      │
  │                          │  → sign JWT token        │
  │◄─────────────────────────│                          │
  │  200 { accessToken }     │                          │
```

---

### 1.3 So sánh Frontend vs Backend

| Tiêu chí | Frontend | Backend |
| -------- | -------- | ------- |
| Chạy ở đâu | Trình duyệt | Server |
| Ngôn ngữ phổ biến | HTML/CSS/JS, React, Vue | Node.js, Java, Python, Go |
| Người dùng thấy được | ✅ | ❌ |
| Xử lý dữ liệu | Hiển thị | Lưu trữ, xử lý, bảo mật |
| Giao tiếp | Gọi API | Kết nối Database, Services |

---

### 1.4 Các thành phần của một Backend hiện đại

```
┌─────────────────────────────────────────────┐
│                  Backend Layer               │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  API     │  │  Auth    │  │  Queue   │  │
│  │ (NestJS) │  │  Server  │  │ (BullMQ) │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Database │  │  Cache   │  │  Storage │  │
│  │(Postgres)│  │  (Redis) │  │  (S3)    │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

---

### 1.5 Vai trò của Backend Developer

* Thiết kế và xây dựng **RESTful API**
* Thiết kế **schema database**, viết migrations
* Triển khai **Authentication & Authorization**
* Tối ưu **hiệu suất truy vấn** (indexing, caching)
* Đảm bảo **bảo mật** ứng dụng (validation, SQL injection prevention...)
* **Deploy** lên server/cloud (Docker, PM2, CI/CD)

👉 **NestJS là framework Node.js hiện đại, kiến trúc rõ ràng, được thiết kế cho backend production-ready**

---

## 2️⃣ Node.js là gì?

### 2.1 Khái niệm Node.js

**Node.js** là một **môi trường thực thi JavaScript phía server (Server-side JavaScript Runtime)**, được xây dựng trên **V8 JavaScript Engine** của Google Chrome.

📌 Trước khi Node.js ra đời:

* JavaScript **chỉ chạy trong trình duyệt**
* Backend thường dùng:

  * PHP
  * Java (Spring)
  * .NET
  * Python

📌 Node.js cho phép:

* Viết **backend bằng JavaScript**
* Xây dựng **server xử lý HTTP request**
* Giao tiếp database, file system, network

📌 Về mặt kiến trúc:

* Node.js **không phải là framework**
* Node.js là **runtime + API hệ thống**

👉 **NestJS là một framework chạy trên Node.js**

---

### 2.2 Kiến trúc Event Loop 

#### 2.2.1 Vấn đề của mô hình truyền thống (Thread-per-request)

Trong các backend truyền thống:

* Mỗi request → tạo một thread
* Thread xử lý toàn bộ logic
* Khi số lượng request tăng:

  * Tốn RAM
  * Tốn CPU context switching
  * Dễ quá tải

📌 Đây là vấn đề lớn với hệ thống:

* Chat
* API nhiều client
* Real-time

---

#### 2.2.2 Mô hình Event Loop của Node.js

Node.js sử dụng mô hình:

> **Single-threaded + Event Loop + Asynchronous I/O**

📌 Thành phần chính:

* Call Stack
* Event Loop
* Callback Queue
* Background Thread Pool (libuv)

📊 Luồng hoạt động:

1. JavaScript chạy trên **1 thread chính**
2. Gặp tác vụ I/O (DB, file, HTTP):

   * Gửi sang background
3. Khi tác vụ hoàn tất:

   * Callback được đưa vào queue
4. Event Loop kiểm tra:

   * Call Stack rỗng → lấy callback xử lý

📌 Ý nghĩa:

* **Không block server**
* Xử lý hàng nghìn request đồng thời
* Hiệu quả với I/O-bound task

---

### 2.3 Event-driven Programming

**Event-driven** là mô hình lập trình trong đó:

> Chương trình phản ứng lại các **sự kiện (event)** thay vì chạy tuần tự từ trên xuống.

📌 Ví dụ các event:

* HTTP request đến server
* Database query hoàn tất
* File được đọc xong
* User gửi message

📌 Trong Node.js:

* Mọi thứ đều là event
* HTTP server = event listener

```js
server.on('request', (req, res) => {
  res.end('Hello');
});
```

📌 Khi:

* Client gửi request
* Event `request` được phát
* Callback được gọi

👉 NestJS **xây dựng toàn bộ framework xoay quanh event-driven**

---

### 2.4 Non-blocking I/O

#### 2.4.1 Blocking I/O là gì?

Blocking I/O là khi:

* Một tác vụ I/O **chặn luồng xử lý chính**
* Các request khác **phải chờ**

📌 Ví dụ:

```ts
readFileSync('data.txt'); // block
```

---

#### 2.4.2 Non-blocking I/O là gì?

Non-blocking I/O cho phép:

* Gửi tác vụ I/O đi xử lý
* Tiếp tục xử lý request khác

```ts
readFile('data.txt', callback);
```

📌 Node.js được thiết kế **non-blocking từ gốc**

👉 Đây là lý do Node.js phù hợp để làm API

---

### 2.5 Ưu điểm và nhược điểm của Node.js 

#### ✅ Ưu điểm

* Hiệu suất cao với I/O
* Một ngôn ngữ cho cả frontend & backend
* Ecosystem npm rất lớn
* Phù hợp REST API, Microservices

#### ❌ Nhược điểm

* Không phù hợp cho CPU-bound task (AI, xử lý ảnh nặng)
* Dễ viết code khó bảo trì nếu không có structure
* Cần framework (NestJS) để tổ chức tốt

👉 **NestJS ra đời để giải quyết nhược điểm này**

---

### 2.6 Built-in Modules trong Node.js

Node.js cung cấp sẵn **API truy cập hệ thống**:

| Module   | Vai trò                |
| -------- | ---------------------- |
| `http`   | Tạo HTTP server        |
| `fs`     | Đọc/ghi file           |
| `path`   | Xử lý đường dẫn        |
| `events` | Hệ thống event         |
| `crypto` | Hash, mã hóa           |
| `os`     | Thông tin hệ điều hành |

👉 NestJS **bọc lại** những API này theo hướng OOP

---

## 3️⃣ JavaScript ES6+ 

Xem thêm tại đây: https://www.w3schools.com/nodejs/nodejs_es6.asp

### 3.1 `let` và `const` – Quản lý scope

📌 ES6 giới thiệu **block scope**

* `var`: function scope (dễ bug)
* `let`, `const`: block scope

```ts
if (true) {
  let x = 10;
}
// x không tồn tại ở đây
```

👉 Giúp code an toàn, dễ dự đoán

---

### 3.2 Arrow Function & Lexical `this`

Arrow function:

* Không có `this` riêng
* Kế thừa `this` từ scope cha

```ts
const fn = () => {
  console.log(this);
};
```

👉 Quan trọng khi dùng callback, decorator trong NestJS

---

### 3.3 Destructuring Assignment

Destructuring giúp:

* Truy cập dữ liệu ngắn gọn
* Tăng tính rõ ràng

```ts
const { body } = req;
```

👉 NestJS dùng rất nhiều khi làm controller

---

### 3.4 Spread & Rest Operator

📌 Spread (`...`):

```ts
// Clone object
const userCopy = { ...user };

// Merge objects
const merged = { ...defaults, ...overrides };
```

📌 Rest (`...`):

```ts
// Gom nhiều tham số
function log(first: string, ...rest: string[]) {
  console.log(first, rest);
}
```

👉 Quan trọng khi xử lý DTO, payload trong NestJS

---

### 3.5 Template Literals

Template literals cho phép nhúng biểu thức vào chuỗi với cú pháp rõ ràng hơn.

```ts
const name = 'Tomy';
const age = 25;

// Cách cũ (string concatenation)
const msg1 = 'Hello ' + name + ', age: ' + age;

// Template literals (ES6+)
const msg2 = `Hello ${name}, age: ${age}`;
```

📌 Hỗ trợ **multiline string**:

```ts
const query = `
  SELECT *
  FROM users
  WHERE id = ${userId}
`;
```

👉 Dùng nhiều khi tạo SQL query, log message, email template trong NestJS

---

### 3.6 Promise & Async/Await

Đây là kiến thức **quan trọng nhất** khi làm việc với NestJS, vì hầu hết các tác vụ (database, HTTP, file I/O) đều **bất đồng bộ**.

#### 3.6.1 Promise là gì?

Promise đại diện cho một **giá trị chưa có ngay** – sẽ có sau khi tác vụ bất đồng bộ hoàn thành.

```ts
// Trạng thái của Promise
// pending  → đang xử lý
// fulfilled → thành công (resolve)
// rejected  → thất bại (reject)

function fetchUser(id: number): Promise<User> {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE id = ?', [id], (err, result) => {
      if (err) reject(err);
      else resolve(result[0]);
    });
  });
}
```

#### 3.6.2 Async/Await

`async/await` là cú pháp giúp viết code bất đồng bộ **như đồng bộ**, dễ đọc hơn Promise chain.

```ts
// ❌ Callback hell (khó đọc)
getUser(id, (user) => {
  getOrders(user.id, (orders) => {
    sendEmail(user.email, orders, () => {
      console.log('Done');
    });
  });
});

// ✅ Async/Await (dễ đọc)
async function processUser(id: number) {
  const user = await getUser(id);
  const orders = await getOrders(user.id);
  await sendEmail(user.email, orders);
  console.log('Done');
}
```

📌 **Xử lý lỗi với try/catch:**

```ts
async function createBook(dto: CreateBookDto) {
  try {
    const book = await this.bookRepository.save(dto);
    return book;
  } catch (error) {
    throw new InternalServerErrorException('Lưu dữ liệu thất bại');
  }
}
```

👉 **Toàn bộ Service trong NestJS đều dùng async/await** khi thao tác database

---

### 3.7 Optional Chaining & Nullish Coalescing

#### 3.7.1 Optional Chaining (`?.`)

Truy cập property an toàn – **không bị lỗi** nếu object là `null` hoặc `undefined`.

```ts
// ❌ Dễ bị lỗi TypeError
const city = user.address.city;

// ✅ An toàn
const city = user?.address?.city;
// Nếu address là null/undefined → trả về undefined (không throw lỗi)
```

#### 3.7.2 Nullish Coalescing (`??`)

Trả về giá trị mặc định khi giá trị là `null` hoặc `undefined` (khác với `||` – không bị ảnh hưởng bởi `0` hay `''`).

```ts
const limit = query.limit ?? 10;  // Nếu limit là null/undefined → dùng 10
const name = user.name ?? 'Anonymous';
```

📌 So sánh:

```ts
const a = 0 || 'default';   // → 'default' (0 bị coi là falsy)
const b = 0 ?? 'default';   // → 0         (chỉ null/undefined mới dùng default)
```

👉 Thường dùng trong NestJS khi đọc config, query params, optional DTO fields

---

### 3.8 Array Methods (map, filter, reduce)

Các phương thức array là nền tảng xử lý dữ liệu trong backend.

```ts
const users = [
  { id: 1, name: 'Alice', age: 25, active: true },
  { id: 2, name: 'Bob',   age: 17, active: false },
  { id: 3, name: 'Carol', age: 30, active: true },
];

// map: chuyển đổi từng phần tử → trả về array mới
const names = users.map(u => u.name);
// → ['Alice', 'Bob', 'Carol']

// filter: lọc phần tử thỏa điều kiện
const adults = users.filter(u => u.age >= 18 && u.active);
// → [{ id: 1, ... }, { id: 3, ... }]

// reduce: gộp array thành một giá trị duy nhất
const totalAge = users.reduce((sum, u) => sum + u.age, 0);
// → 72
```

👉 Dùng nhiều khi transform dữ liệu từ database trước khi trả về response

---

## 4️⃣ TypeScript cơ bản 

Tìm hiểu thêm tại link: https://www.w3schools.com/typescript/

### 4.1 TypeScript là gì?

TypeScript là:

* Superset của JavaScript
* Thêm **Static Typing**
* Compile về JavaScript

📌 Lợi ích:

* Phát hiện lỗi sớm
* Code dễ bảo trì
* Tối ưu IDE, refactor

👉 NestJS **bắt buộc dùng TypeScript**

---

### 4.2 `type` và `interface` (Phân biệt rõ)

| Tiêu chí | type | interface |
| -------- | ---- | --------- |
| Extend   | Có   | Có        |
| Merge    | ❌    | ✅         |
| Union    | ✅    | ❌         |

👉 DTO trong NestJS thường dùng `class` + `interface`

---

### 4.3 Class & Access Modifier

#### 4.3.1 Class trong JavaScript


Trong ES6, **class** là một cú pháp (syntax sugar) được giới thiệu để:

* Viết JavaScript theo phong cách **Object-Oriented Programming (OOP)**
* Giúp code:

  * Dễ đọc
  * Dễ tổ chức
  * Dễ mở rộng

📌 **Lưu ý quan trọng**
JavaScript **không phải ngôn ngữ OOP thuần** như Java hay C#
👉 `class` trong JS thực chất được xây dựng **trên prototype**


#### 4.3.2 Vì sao backend (NestJS) cần Class?

Backend API cần:

* Đóng gói logic
* Quản lý trạng thái
* Dependency Injection
* Tái sử dụng code

👉 NestJS **xây dựng toàn bộ framework dựa trên class**

#### 4.3.3 Khai báo Class trong ES6

**Cú pháp cơ bản**

```ts
class User {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  getInfo() {
    return `${this.name} - ${this.age}`;
  }
}
```

📌 Giải thích:

* `class User`: định nghĩa kiểu đối tượng
* `constructor`: hàm khởi tạo
* `this`: tham chiếu tới instance

#### 4.3.4 Tạo object từ class


```js
const user1 = new User('Tomy', 25);
console.log(user1.getInfo());
```

👉 Mỗi request trong backend **có thể làm việc với object kiểu này**

#### 4.3.5 Cấu trúc Class trong TypeScript

📌**Constructor là gì?**

Constructor là một phương thức đặc biệt trong class, được gọi khi tạo một instance của class. Nó dùng để khởi tạo các thuộc tính của đối tượng.

Ví dụ:

```ts
class User {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}
```

Khi tạo object:

```ts
const user1 = new User('Tomy', 25);
```

📌**Method trong class**

Method là các hàm được định nghĩa bên trong class, dùng để thực hiện các hành động liên quan đến đối tượng.

Ví dụ:

```ts
class User {
  // ...
  getInfo(): string {
    return `${this.name} - ${this.age}`;
  }
}
```

Gọi method:

```ts
console.log(user1.getInfo());
```



#### 4.3.6 Access Modifier trong TypeScript

TypeScript thêm **access modifier** để kiểm soát truy cập:

* Đóng gói logic
* Bảo vệ dữ liệu nội bộ

| Modifier   | Mô tả                          |
| ---------- | ------------------------------ |
| `public`   | Mặc định, truy cập từ bên ngoài |
| `private`  | Chỉ truy cập trong class       |
| `protected`| Truy cập trong class & subclass |

Ví dụ:

```ts
class User {
    public name: string;
    private age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    protected getAge(): number {
        return this.age;
    }
    }
```

Giải thích:
* `name` có thể truy cập từ bên ngoài
* `age` chỉ truy cập trong class qua method `getAge()`
* `protected` dùng khi kế thừa class
* Giúp bảo vệ dữ liệu, tránh truy cập trực tiếp
* Tăng tính an toàn và rõ ràng cho class

👉 NestJS dùng access modifier để quản lý service, controller

---

#### 4.3.7 Inheritance (Kế thừa) trong ES6 Class

Kế thừa cho phép một class (subclass) nhận lại các thuộc tính và phương thức từ class khác (superclass).

Lợi ích:
* Tái sử dụng code
* Mở rộng chức năng

Ví dụ:

```ts
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} makes a sound.`);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }

  speak() {
    console.log(`${this.name} barks.`);
  }
}
```

📌 Giải thích:

* `extends`: kế thừa
* `class Dog extends Animal`: `Dog` kế thừa từ `Animal`
* `super(name)`: gọi constructor của lớp cha
* `speak()` trong `Dog` override lại phương thức của lớp cha

👉 NestJS dùng kế thừa để tạo các service, controller kế thừa từ lớp cha

---

#### 4.3.8 Abstract Class trong TypeScript

**Abstract class** là một lớp không thể được khởi tạo trực tiếp. Nó được thiết kế để làm lớp cha cho các lớp con khác.

Ví dụ:

```ts
abstract class Animal {
  abstract makeSound(): void;

  move(): void {
    console.log('Moving along!');
  }
}
class Dog extends Animal {
  makeSound(): void {
    console.log('Bark!');
  }
}
```

📌 Giải thích:
* `abstract class Animal`: định nghĩa lớp trừu tượng
* `abstract makeSound()`: phương thức trừu tượng, phải được lớp con triển khai
* `Dog` kế thừa `Animal` và triển khai `makeSound()`
* Giúp định nghĩa giao diện chung cho các lớp con

#### 4.3.9 Interface trong TypeScript
**Interface** định nghĩa cấu trúc của một đối tượng hoặc lớp mà không cung cấp triển khai cụ thể.
Ví dụ:

```ts
interface IUser {
  name: string;
  age: number;
  getInfo(): string;
}
class User implements IUser {
  constructor(public name: string, public age: number) {}

  getInfo(): string {
    return `${this.name} - ${this.age}`;
  }
}
```

📌 Giải thích:
* `interface IUser`: định nghĩa giao diện
* `class User implements IUser`: lớp `User` tuân theo giao diện `IUser
* Giúp đảm bảo lớp tuân theo cấu trúc đã định nghĩa
---

#### 4.3.10 Static Members trong TypeScript

**Static members** là các thuộc tính và phương thức thuộc về lớp thay vì các instance của lớp đó.

Ví dụ:

```ts
class MathUtil {
  static sum(a, b) {
    return a + b;
  }
}
```

📌 Gọi:

```js
MathUtil.sum(1, 2);
```

Giải thích:
* `static sum`: phương thức tĩnh
* Gọi trực tiếp từ lớp, không cần tạo instance
* Thường dùng cho các hàm tiện ích

### 4.4 Generics

Generics giúp:

* Tái sử dụng code
* Giữ an toàn kiểu dữ liệu

👉 NestJS dùng generics cho:

* Response
* Repository pattern

Ví dụ:

```ts
function response<T>(data: T): T {
  return data;
}
```

Gọi hàm với kiểu cụ thể:

```ts
response<string>('Hello');
response<number>(123);
```


---

### 4.5 Modules trong TypeScript

Modules là cách tổ chức code thành các file riêng biệt, giúp:

* Quản lý tốt hơn
* Tái sử dụng

Ví dụ:

```ts
// math.ts
export function add(a: number, b: number): number {
  return a + b;
}

// app.ts
import { add } from './math';
console.log(add(2, 3));
```

Giải thích:
* `export`: xuất hàm, biến từ module
* `import`: nhập hàm, biến từ module khác
* Giúp tách biệt logic, dễ bảo trì

📌 Default Export là gì?

Mỗi module chỉ có thể có một default export, được sử dụng khi muốn xuất một giá trị chính từ module đó.

Ví dụ:

```ts
// math.ts
function add(a: number, b: number): number {
  return a + b;
}

function subtract(a: number, b: number): number {
  return a - b;
}
export default { add, subtract };
```
Gọi default export:

```ts
import math from './math';
console.log(math.add(2, 3));
console.log(math.subtract(5, 2));
```

* Mỗi file chỉ có **1 default export**
* Import không cần ngoặc `{}`

---

## 5️⃣ NPM vs Yarn vs PNPM

### 5.1 Package Manager là gì?

**Package Manager** là công cụ giúp:

* **Cài đặt** thư viện bên ngoài (dependencies)
* **Quản lý phiên bản** thư viện
* **Chạy scripts** (build, test, dev server)
* **Khóa phiên bản** với lockfile

📌 Khi tạo một dự án NestJS:

```bash
pnpm install @nestjs/core @nestjs/common
```

→ Package manager sẽ:
1. Tải package từ npmjs.com
2. Lưu vào `node_modules/`
3. Ghi lại vào `package.json` và lockfile

---

### 5.2 So sánh NPM vs Yarn vs PNPM

| Tiêu chí | NPM | Yarn | PNPM |
| -------- | --- | ---- | ---- |
| Phát triển bởi | Node.js team | Meta (Facebook) | Community |
| Tốc độ cài đặt | Trung bình | Nhanh | **Nhanh nhất** |
| Dung lượng disk | Nhiều | Nhiều | **Ít nhất** (dùng hard links) |
| Lockfile | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |
| Cài kèm Node.js | ✅ | ❌ | ❌ |
| Strict dependencies | ❌ | ❌ | ✅ |

📌 **PNPM tiết kiệm disk như thế nào?**

* NPM/Yarn: mỗi project có bản copy riêng của package trong `node_modules`
* PNPM: tất cả package được lưu **một lần** trong global store, các project dùng **hard link** → tiết kiệm GB dung lượng

---

### 5.3 Lệnh cơ bản

| Tác vụ | NPM | Yarn | PNPM |
| ------ | --- | ---- | ---- |
| Cài đặt tất cả | `npm install` | `yarn` | `pnpm install` |
| Thêm package | `npm install pkg` | `yarn add pkg` | `pnpm add pkg` |
| Thêm devDependency | `npm install -D pkg` | `yarn add -D pkg` | `pnpm add -D pkg` |
| Xóa package | `npm uninstall pkg` | `yarn remove pkg` | `pnpm remove pkg` |
| Chạy script | `npm run dev` | `yarn dev` | `pnpm dev` |
| Xem outdated | `npm outdated` | `yarn outdated` | `pnpm outdated` |

---

### 5.4 Cài đặt PNPM

```bash
# Cài PNPM qua npm
npm install -g pnpm

# Kiểm tra phiên bản
pnpm --version
```

👉 **Khóa học này dùng PNPM** – tất cả dự án NestJS sẽ được khởi tạo bằng PNPM

---

## 6️⃣ Package.json & Dependency Management

### 6.1 Package.json là gì?

`package.json` là **file định nghĩa dự án Node.js**. Nó chứa:

* Metadata của dự án (name, version, description)
* Danh sách **dependencies**
* Các **scripts** để chạy dự án
* Cấu hình engine (yêu cầu Node.js version)

📌 **Ví dụ package.json của một dự án NestJS:**

```json
{
  "name": "my-nestjs-api",
  "version": "1.0.0",
  "description": "RESTful API với NestJS",
  "scripts": {
    "start":       "node dist/main",
    "start:dev":   "nest start --watch",
    "start:prod":  "node dist/main",
    "build":       "nest build",
    "test":        "jest",
    "test:e2e":    "jest --config ./test/jest-e2e.json",
    "lint":        "eslint \"{src,apps,libs,test}/**/*.ts\""
  },
  "dependencies": {
    "@nestjs/common":   "^10.0.0",
    "@nestjs/core":     "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs":             "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli":      "^10.0.0",
    "@nestjs/testing":  "^10.0.0",
    "@types/node":      "^20.0.0",
    "typescript":       "^5.0.0",
    "jest":             "^29.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

### 6.2 dependencies vs devDependencies

| | `dependencies` | `devDependencies` |
|-|---------------|-------------------|
| Là gì | Package cần khi **chạy production** | Package chỉ cần khi **phát triển** |
| Ví dụ | `@nestjs/core`, `typeorm`, `bcrypt` | `jest`, `eslint`, `typescript`, `@types/*` |
| Khi `npm install --production` | ✅ Được cài | ❌ Bị bỏ qua |

📌 **Quy tắc:**
* Thư viện runtime → `dependencies`
* Tool build, test, lint → `devDependencies`

---

### 6.3 Semantic Versioning (SemVer)

Phiên bản package theo format: **`MAJOR.MINOR.PATCH`**

| Phần | Ý nghĩa | Ví dụ |
| ---- | ------- | ----- |
| MAJOR | Breaking changes – không tương thích | `10.0.0 → 11.0.0` |
| MINOR | Tính năng mới – tương thích ngược | `10.0.0 → 10.1.0` |
| PATCH | Bug fixes – tương thích ngược | `10.0.0 → 10.0.1` |

📌 **Ký hiệu version range:**

```
"@nestjs/core": "^10.3.0"   // Caret: >=10.3.0 <11.0.0  (tương thích minor/patch)
"rxjs":         "~7.8.1"    // Tilde: >=7.8.1 <7.9.0    (chỉ tương thích patch)
"typescript":   "5.3.2"      // Chính xác version này
```

---

### 6.4 Lockfile – Tại sao quan trọng?

Lockfile ghi lại **chính xác phiên bản** của mọi package (kể cả dependencies của dependencies).

📌 **Tại sao cần lockfile?**

Không có lockfile:
* Dev A chạy `pnpm install` → cài `express@4.18.0`
* Dev B chạy `pnpm install` 2 tuần sau → cài `express@4.18.2`
* → **Khác nhau!** Có thể gây bug môi trường

Có lockfile (`pnpm-lock.yaml`):
* Mọi người cài **đúng cùng phiên bản** → consistent environment

👉 **Luôn commit lockfile vào git** – không thêm vào `.gitignore`

