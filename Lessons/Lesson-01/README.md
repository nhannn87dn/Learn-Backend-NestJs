# 📘 Lesson 01 – Kiến thức nền cho NestJS RESTful API


## 1️⃣ Node.js là gì?

### 1.1 Khái niệm Node.js

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

### 1.2 Kiến trúc Event Loop 

#### 1.2.1 Vấn đề của mô hình truyền thống (Thread-per-request)

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

#### 1.2.2 Mô hình Event Loop của Node.js

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

### 1.3 Event-driven Programming

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

### 1.4 Non-blocking I/O

#### 1.4.1 Blocking I/O là gì?

Blocking I/O là khi:

* Một tác vụ I/O **chặn luồng xử lý chính**
* Các request khác **phải chờ**

📌 Ví dụ:

```ts
readFileSync('data.txt'); // block
```

---

#### 1.4.2 Non-blocking I/O là gì?

Non-blocking I/O cho phép:

* Gửi tác vụ I/O đi xử lý
* Tiếp tục xử lý request khác

```ts
readFile('data.txt', callback);
```

📌 Node.js được thiết kế **non-blocking từ gốc**

👉 Đây là lý do Node.js phù hợp để làm API

---

### 1.5 Ưu điểm và nhược điểm của Node.js 

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

### 1.6 Built-in Modules trong Node.js

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

## 2️⃣ JavaScript ES6+ 

Xem thêm tại đây: https://www.w3schools.com/nodejs/nodejs_es6.asp

### 2.1 `let` và `const` – Quản lý scope

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

### 2.2 Arrow Function & Lexical `this`

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

### 2.3 Destructuring Assignment

Destructuring giúp:

* Truy cập dữ liệu ngắn gọn
* Tăng tính rõ ràng

```ts
const { body } = req;
```

👉 NestJS dùng rất nhiều khi làm controller

---

### 2.4 Spread & Rest Operator

📌 Spread:

* Clone object
* Merge data

📌 Rest:

* Gom nhiều tham số

👉 Quan trọng khi xử lý DTO, payload

---

## 3️⃣ TypeScript cơ bản 

Tìm hiểu thêm tại link: https://www.w3schools.com/typescript/

### 3.1 TypeScript là gì?

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

### 3.2 `type` và `interface` (Phân biệt rõ)

| Tiêu chí | type | interface |
| -------- | ---- | --------- |
| Extend   | Có   | Có        |
| Merge    | ❌    | ✅         |
| Union    | ✅    | ❌         |

👉 DTO trong NestJS thường dùng `class` + `interface`

---

### 3.3 Class & Access Modifier

#### 3.3.1 Class trong JavaScript


Trong ES6, **class** là một cú pháp (syntax sugar) được giới thiệu để:

* Viết JavaScript theo phong cách **Object-Oriented Programming (OOP)**
* Giúp code:

  * Dễ đọc
  * Dễ tổ chức
  * Dễ mở rộng

📌 **Lưu ý quan trọng**
JavaScript **không phải ngôn ngữ OOP thuần** như Java hay C#
👉 `class` trong JS thực chất được xây dựng **trên prototype**


#### 3.3.2 Vì sao backend (NestJS) cần Class?

Backend API cần:

* Đóng gói logic
* Quản lý trạng thái
* Dependency Injection
* Tái sử dụng code

👉 NestJS **xây dựng toàn bộ framework dựa trên class**

#### 3.3.3 Khai báo Class trong ES6

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

#### 3.3.4 Tạo object từ class


```js
const user1 = new User('Tomy', 25);
console.log(user1.getInfo());
```

👉 Mỗi request trong backend **có thể làm việc với object kiểu này**

#### 3.3.5 Cấu trúc Class trong TypeScript

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



#### 3.3.6 Access Modifier trong TypeScript

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
    pro
    
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

#### 3.3.7 Inheritance (Kế thừa) trong ES6 Class

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

#### 3.3.8 Abstract Class trong TypeScript

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

#### 3.3.9 Interface trong TypeScript
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

#### 3.3.10 Static Members trong TypeScript

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

### 3.4 Generics

Generics giúp:

* Tái sử dụng code
* Giữ an toàn kiểu dữ liệu

👉 NestJS dùng generics cho:

* Response
* Repository pattern

Ví dụ:

```ts
function response<T>(data: T): data: T {
  return data
}
```

Gọi hàm với kiểu cụ thể:

```ts
response<string>('Hello');
response<number>(123);
```


---

### 3.5 Modules trong TypeScript

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

## 4️⃣ RESTful API là gì? (Giải thích chuẩn lý thuyết)

### 4.1 REST là gì?

**REST (Representational State Transfer)** là một kiến trúc thiết kế cho các hệ thống phân tán, đặc biệt là web services.

📌 Nguyên tắc:

* Stateless - không lưu trạng thái
* Resource-based - tài nguyên là trung tâm
* Client-Server - tách biệt client và server
* Uniform Interface - giao diện đồng nhất
* Layered System - hệ thống phân lớp
* Cacheable - có thể lưu cache
👉 REST không phải là “API thông thường”


---

### 4.2 Resource & HTTP Method

📌 Resource:

```
/users
/products
/orders
```

📌 HTTP Method biểu thị hành động:

* GET → Read
* POST → Create
* PUT → Update
* DELETE → Remove

👉 NestJS map trực tiếp controller với REST

---

## 5️⃣ HTTP, Request / Response, Status Code

### 5.1 HTTP Protocol

HTTP là:

* Giao thức client-server
* Stateless
* Request → Response

---

### 5.2 Request

Gồm:

* Method
* URL
* Headers
* Body

---

### 5.3 Response

Gồm:

* Status Code
* Body
* Headers

---

### 5.4 HTTP Status Code

📌 Status code phản ánh **kết quả xử lý**

| Mã  | Ý nghĩa                |
| ---- | ---------------------- |
| 200  | OK                     |
| 201  | Created                |
| 400  | Bad Request            |
| 401  | Unauthorized           |
| 403  | Forbidden              |
| 404  | Not Found              |
| 500  | Internal Server Error  |

Dùng đúng status code giúp client hiểu rõ kết quả.


---
