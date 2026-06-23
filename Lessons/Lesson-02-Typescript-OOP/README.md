# Lesson 02: TypeScript và Lập trình OOP

> **Mục tiêu buổi học**
>
> Sau bài này, người học sẽ:
>
> * Hiểu vai trò của **TypeScript** trong hệ sinh thái NestJS
> * Nắm được các kiểu dữ liệu, `function`, `type`, `interface`, `enum`, `generics`, `module`, `decorator`
> * Hiểu cách xây dựng `class`, `object`, `constructor`, `properties`, `methods`
> * Hiểu 4 tính chất OOP: **Encapsulation, Inheritance, Abstraction, Polymorphism**
> * Biết cách áp dụng OOP khi viết **DTO, Entity, Controller, Service, Repository** trong NestJS

---

## Thứ tự học đề xuất

Bài này nên đi theo thứ tự sau:

```txt
TypeScript là gì
  -> Kiểu dữ liệu
  -> Function
  -> Type, Interface, Enum, Generics
  -> Module, Namespace, Decorator
  -> Class và Object
  -> Access Modifier, Static
  -> 4 tính chất OOP
  -> Áp dụng vào NestJS
```

Lý do: người học cần hiểu kiểu dữ liệu và function trước, sau đó mới học cách gom dữ liệu và hành vi vào `class`. Khi đã hiểu `class`, các khái niệm OOP như đóng gói, kế thừa, trừu tượng và đa hình sẽ dễ tiếp thu hơn.

---

## 1. TypeScript cơ bản

### 1.1 TypeScript là gì?

**TypeScript** là một ngôn ngữ được xây dựng trên JavaScript.

Nói đơn giản:

* JavaScript chạy được trên Node.js và trình duyệt
* TypeScript thêm **kiểu dữ liệu tĩnh** vào JavaScript
* TypeScript cần được biên dịch về JavaScript trước khi chạy

```txt
TypeScript code (.ts)
        |
        | tsc / build
        v
JavaScript code (.js)
        |
        | node
        v
Runtime
```

Ví dụ JavaScript:

```js
function sum(a, b) {
  return a + b;
}

sum(1, '2'); // "12"
```

Ví dụ TypeScript:

```ts
function sum(a: number, b: number): number {
  return a + b;
}

sum(1, 2);
// sum(1, '2'); // Lỗi ngay khi viết code
```

TypeScript giúp backend dễ bảo trì hơn vì lỗi kiểu dữ liệu được phát hiện sớm, IDE gợi ý tốt hơn và việc refactor an toàn hơn.

Trong NestJS, TypeScript là ngôn ngữ chính. Hầu hết code NestJS đều được viết bằng class, decorator, interface và type.

---

### 1.2 Cài đặt TypeScript

Cài TypeScript ở môi trường global:

```bash
npm install -g typescript
```

Kiểm tra phiên bản:

```bash
tsc --version
```

Tạo file cấu hình TypeScript:

```bash
tsc --init
```

Một file `tsconfig.json` cơ bản:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist"
  }
}
```

Chạy biên dịch:

```bash
tsc
```

Trong NestJS, dự án đã có sẵn TypeScript và `tsconfig.json`, nên thông thường ta không cần tự cấu hình từ đầu.

---

### 1.3 Kiểu dữ liệu trong TypeScript

TypeScript hỗ trợ các kiểu dữ liệu cơ bản của JavaScript và thêm hệ thống kiểm tra kiểu.

```ts
let name: string = 'Tomy';
let age: number = 25;
let isActive: boolean = true;
let tags: string[] = ['nestjs', 'typescript'];
let scores: Array<number> = [8, 9, 10];
```

#### Object

```ts
const user: {
  id: number;
  name: string;
  email: string;
} = {
  id: 1,
  name: 'Tomy',
  email: 'tomy@example.com',
};
```

#### Union type

Union cho phép một biến nhận nhiều kiểu dữ liệu.

```ts
let userId: string | number;

userId = 1;
userId = 'user_001';
```

#### Literal type

Literal type giới hạn giá trị được phép nhận.

```ts
let role: 'admin' | 'user' | 'guest';

role = 'admin';
// role = 'super-admin'; // Lỗi
```

#### Any và Unknown

`any` tắt gần như toàn bộ kiểm tra kiểu, nên cần hạn chế dùng.

```ts
let value: any = 10;
value = 'hello';
value.toUpperCase();
```

`unknown` an toàn hơn `any` vì bắt buộc kiểm tra kiểu trước khi dùng.

```ts
let value: unknown = 'hello';

if (typeof value === 'string') {
  console.log(value.toUpperCase());
}
```

Trong backend, nên ưu tiên type rõ ràng để giảm lỗi khi xử lý request, response và dữ liệu database.

---

### 1.4 Function và Arrow Function

Function là khối xử lý có thể nhận input và trả output. Trước khi học class, cần nắm function vì method trong class thực chất cũng là function.

#### Function thường

```ts
function createUser(name: string, age: number): string {
  return `${name} - ${age}`;
}
```

#### Arrow function

```ts
const createUser = (name: string, age: number): string => {
  return `${name} - ${age}`;
};
```

Nếu function chỉ có một expression, có thể viết ngắn hơn:

```ts
const sum = (a: number, b: number): number => a + b;
```

#### Optional parameter

```ts
function greet(name?: string): string {
  return `Hello ${name ?? 'Guest'}`;
}
```

#### Default parameter

```ts
function paginate(page = 1, limit = 10): string {
  return `page=${page}&limit=${limit}`;
}
```

#### Rest parameter

```ts
function logMessages(...messages: string[]): void {
  messages.forEach((message) => console.log(message));
}

logMessages('Hello', 'World', '!');
```

Arrow function thường được dùng nhiều trong callback, array method và xử lý dữ liệu.

```ts
const users = [
  { id: 1, name: 'Tomy' },
  { id: 2, name: 'Anna' },
];

const names = users.map((user) => user.name);
```

---

### 1.5 Interface và Type

`interface` và `type` đều dùng để mô tả hình dạng dữ liệu. Nên học phần này sau kiểu dữ liệu cơ bản, vì đây là cách gom nhiều kiểu dữ liệu lại thành một cấu trúc có tên.

#### Interface

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: 'Tomy',
  email: 'tomy@example.com',
};
```

Interface thường dùng khi mô tả object hoặc contract mà class cần tuân theo.

```ts
interface MailService {
  send(to: string, subject: string, content: string): Promise<void>;
}
```

#### Type

```ts
type UserRole = 'admin' | 'user' | 'guest';

type User = {
  id: number;
  name: string;
  role: UserRole;
};
```

`type` mạnh ở union, intersection và alias cho kiểu phức tạp.

```ts
type PaginationQuery = {
  page: number;
  limit: number;
};

type SearchQuery = PaginationQuery & {
  keyword: string;
};
```

#### So sánh nhanh

| Tiêu chí | `interface` | `type` |
| --- | --- | --- |
| Mô tả object | Tốt | Tốt |
| Extend | Có | Có, qua intersection |
| Declaration merging | Có | Không |
| Union type | Không trực tiếp | Có |
| Hay dùng cho class contract | Có | Ít hơn |

Trong NestJS:

* DTO thường được viết bằng `class`
* Contract có thể dùng `interface`
* Union, role, status, config type có thể dùng `type`

---

### 1.6 Enum

Enum dùng để định nghĩa một tập giá trị cố định.

```ts
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

const role: UserRole = UserRole.Admin;
```

Ví dụ trạng thái đơn hàng:

```ts
enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Shipping = 'shipping',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

function canCancelOrder(status: OrderStatus): boolean {
  return status === OrderStatus.Pending || status === OrderStatus.Paid;
}
```

Trong NestJS, enum thường dùng cho role, permission, status, provider type hoặc loại notification.

---

### 1.7 Generics

Generics giúp viết code tái sử dụng nhưng vẫn giữ được type an toàn. Nên học generics sau `type` và `interface`, vì generics thường được dùng để làm cho type/interface linh hoạt hơn.

Ví dụ không dùng generics:

```ts
function identity(value: string): string {
  return value;
}
```

Nếu muốn dùng cho nhiều kiểu dữ liệu, ta có thể dùng generics:

```ts
function identity<T>(value: T): T {
  return value;
}

const name = identity<string>('Tomy');
const age = identity<number>(25);
```

Ví dụ response API:

```ts
type ApiResponse<T> = {
  statusCode: number;
  message: string;
  data: T;
};

type User = {
  id: number;
  name: string;
};

const response: ApiResponse<User> = {
  statusCode: 200,
  message: 'Success',
  data: {
    id: 1,
    name: 'Tomy',
  },
};
```

Generics rất hữu ích khi làm repository, pagination, response wrapper và service dùng chung.

```ts
interface Repository<T> {
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  create(data: T): Promise<T>;
}
```

---

### 1.8 Module và Namespace

#### Module

Module giúp tách code thành nhiều file để dễ quản lý.

```ts
// math.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

```ts
// app.ts
import { add } from './math';

console.log(add(2, 3));
```

Có hai kiểu export phổ biến.

Named export:

```ts
export const APP_NAME = 'NestJS Course';

export function getAppName(): string {
  return APP_NAME;
}
```

Default export:

```ts
export default class User {}
```

```ts
import User from './user';
```

#### Namespace

Namespace là cách gom code vào một vùng tên.

```ts
namespace Payment {
  export type Method = 'cash' | 'banking' | 'credit_card';

  export function isOnline(method: Method): boolean {
    return method === 'banking' || method === 'credit_card';
  }
}

Payment.isOnline('banking');
```

Trong dự án Node.js/NestJS hiện đại, ta thường ưu tiên **ES Modules** (`import/export`) hơn namespace.

---

### 1.9 Decorators

Decorator là cú pháp dùng để gắn metadata hoặc thay đổi hành vi của class, method, property hoặc parameter.

NestJS dùng decorator rất nhiều.

```ts
@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }
}
```

Trong ví dụ trên:

* `@Controller('users')` khai báo route prefix
* `@Get()` khai báo HTTP method GET
* Metadata này được NestJS đọc để tạo routing

Ví dụ decorator thường gặp:

```ts
@Injectable()
export class UsersService {}

@Post()
create(@Body() body: CreateUserDto) {
  return body;
}
```

Decorators nên học sau module và trước NestJS, vì đây là cú pháp xuất hiện liên tục trong Controller, Service, Module, Guard, Pipe và DTO validation.

---

## 2. Class và Object trong TypeScript

### 2.1 Class và Object

Class là bản thiết kế để tạo object.

```ts
class User {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  getInfo(): string {
    return `${this.name} - ${this.age}`;
  }
}

const user = new User('Tomy', 25);

console.log(user.getInfo());
```

Trong ví dụ trên:

* `User` là class
* `user` là object hoặc instance
* `constructor` chạy khi tạo object bằng `new`
* `this` trỏ tới instance hiện tại
* `getInfo` là method của class

---

### 2.2 Cấu trúc Class trong TypeScript

Một class thường có:

* Constructor
* Properties
* Methods

```ts
class Product {
  id: number;
  name: string;
  price: number;

  constructor(id: number, name: string, price: number) {
    this.id = id;
    this.name = name;
    this.price = price;
  }

  getDisplayName(): string {
    return `${this.name} - ${this.price}`;
  }
}
```

#### Constructor

Constructor là method đặc biệt chạy khi tạo instance.

```ts
const product = new Product(1, 'Keyboard', 500000);
```

TypeScript có cú pháp rút gọn constructor bằng access modifier:

```ts
class Product {
  constructor(
    public id: number,
    public name: string,
    private price: number,
  ) {}

  getPrice(): number {
    return this.price;
  }
}
```

#### Properties

Property là dữ liệu nằm trong class.

```ts
class User {
  id: number;
  email: string;
  isActive = true;
}
```

Truy cập property:

```ts
const user = new User();
user.id = 1;
user.email = 'tomy@example.com';
console.log(user.isActive);
```

#### Methods

Method là function nằm trong class.

```ts
class User {
  constructor(public firstName: string, public lastName: string) {}

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

Gọi method:

```ts
const user = new User('Tomy', 'Nguyen');
console.log(user.getFullName());
```

---

### 2.3 Access Modifier

Access modifier kiểm soát phạm vi truy cập của property và method trong class. Nên học phần này trước 4 tính chất OOP, vì `private` và `protected` là nền tảng của đóng gói và kế thừa.

| Modifier | Ý nghĩa |
| --- | --- |
| `public` | Truy cập được từ mọi nơi, là mặc định |
| `private` | Chỉ truy cập được bên trong class hiện tại |
| `protected` | Truy cập được trong class hiện tại và class con |

#### Public

```ts
class User {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }
}

const user = new User('Tomy');
console.log(user.name);
```

Nếu không ghi modifier, TypeScript mặc định là `public`.

#### Private

```ts
class User {
  private password: string;

  constructor(password: string) {
    this.password = password;
  }

  checkPassword(password: string): boolean {
    return this.password === password;
  }
}
```

`password` không nên được truy cập trực tiếp từ bên ngoài.

#### Protected

```ts
class BaseService {
  protected log(message: string): void {
    console.log(`[Service] ${message}`);
  }
}

class UsersService extends BaseService {
  findAll(): string[] {
    this.log('Find all users');
    return [];
  }
}
```

`protected` phù hợp khi class cha cung cấp logic dùng chung cho class con.

---

### 2.4 Static

`static` khai báo property hoặc method thuộc về class, không thuộc về instance.

```ts
class MathUtil {
  static sum(a: number, b: number): number {
    return a + b;
  }
}

console.log(MathUtil.sum(1, 2));
```

Không cần tạo object:

```ts
// Không cần:
// const math = new MathUtil();
```

Ví dụ constant:

```ts
class AppConfig {
  static readonly DEFAULT_PAGE_SIZE = 10;
  static readonly MAX_PAGE_SIZE = 100;
}

const limit = AppConfig.DEFAULT_PAGE_SIZE;
```

Ví dụ factory method:

```ts
class User {
  constructor(
    public id: number,
    public name: string,
  ) {}

  static fromPlainObject(data: { id: number; name: string }): User {
    return new User(data.id, data.name);
  }
}

const user = User.fromPlainObject({ id: 1, name: 'Tomy' });
```

Trong NestJS, không nên lạm dụng `static` cho business logic cần dependency injection. Service bình thường vẫn nên được inject qua constructor.

---

## 3. Lập trình hướng đối tượng OOP

### 3.1 OOP là gì?

**OOP** là viết tắt của **Object-Oriented Programming**, nghĩa là lập trình hướng đối tượng.

Thay vì chỉ viết các function rời rạc, OOP tổ chức chương trình thành các object có:

* **State**: dữ liệu hoặc thuộc tính
* **Behavior**: hành động hoặc method

Ví dụ:

```ts
class User {
  constructor(
    public id: number,
    public name: string,
  ) {}

  rename(newName: string): void {
    this.name = newName;
  }
}
```

Object `User` có dữ liệu `id`, `name` và hành vi `rename`.

OOP có 4 tính chất chính:

| Tính chất | Ý nghĩa |
| --- | --- |
| Encapsulation | Đóng gói dữ liệu và logic vào trong class |
| Inheritance | Class con kế thừa class cha |
| Abstraction | Che chi tiết phức tạp, chỉ lộ phần cần dùng |
| Polymorphism | Cùng một interface, nhiều cách triển khai khác nhau |

---

### 3.2 Encapsulation - Tính đóng gói

Đóng gói là che giấu dữ liệu nội bộ và chỉ cho phép tương tác qua method được kiểm soát.

```ts
class BankAccount {
  private balance = 0;

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    this.balance += amount;
  }

  withdraw(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > this.balance) {
      throw new Error('Insufficient balance');
    }

    this.balance -= amount;
  }

  getBalance(): number {
    return this.balance;
  }
}

const account = new BankAccount();
account.deposit(100);
account.withdraw(40);

console.log(account.getBalance());
// account.balance = 999999; // Lỗi vì balance là private
```

Lợi ích:

* Tránh sửa dữ liệu trực tiếp từ bên ngoài
* Gom rule xử lý vào đúng class
* Giúp code dễ kiểm soát hơn

---

### 3.3 Inheritance - Tính kế thừa

Kế thừa cho phép class con dùng lại thuộc tính và method từ class cha.

Lợi ích:

* Tái sử dụng code
* Mở rộng chức năng
* Gom logic chung vào class cha

```ts
class Animal {
  constructor(protected name: string) {}

  speak(): string {
    return `${this.name} makes a sound.`;
  }
}

class Dog extends Animal {
  constructor(name: string, private breed: string) {
    super(name);
  }

  speak(): string {
    return `${this.name} barks.`;
  }

  getBreed(): string {
    return this.breed;
  }
}
```

Trong ví dụ trên:

* `extends`: kế thừa
* `Dog extends Animal`: `Dog` kế thừa từ `Animal`
* `super(name)`: gọi constructor của class cha
* `speak()` trong `Dog` override lại method của class cha

Kế thừa hữu ích, nhưng không nên lạm dụng. Trong NestJS, nhiều trường hợp dùng composition thông qua service injection sẽ linh hoạt hơn.

---

### 3.4 Abstraction - Tính trừu tượng

Trừu tượng hóa là định nghĩa phần "cần làm gì", còn chi tiết "làm như thế nào" để class cụ thể xử lý.

Có hai cách phổ biến để biểu diễn abstraction trong TypeScript:

* `interface`
* `abstract class`

#### Interface

```ts
interface EmailSender {
  send(to: string, subject: string, content: string): Promise<void>;
}

class SmtpEmailSender implements EmailSender {
  async send(to: string, subject: string, content: string): Promise<void> {
    console.log(`Send SMTP email to ${to}`);
  }
}

class SendGridEmailSender implements EmailSender {
  async send(to: string, subject: string, content: string): Promise<void> {
    console.log(`Send SendGrid email to ${to}`);
  }
}

class AuthService {
  constructor(private readonly emailSender: EmailSender) {}

  async forgotPassword(email: string): Promise<void> {
    await this.emailSender.send(email, 'Reset password', 'Click this link...');
  }
}
```

`AuthService` không cần biết email được gửi bằng SMTP, SendGrid hay AWS SES. Nó chỉ cần biết dependency có method `send`.

#### Abstract class

```ts
abstract class PaymentProvider {
  abstract pay(amount: number): Promise<boolean>;

  protected log(amount: number): void {
    console.log(`Paying ${amount}`);
  }
}

class MomoPaymentProvider extends PaymentProvider {
  async pay(amount: number): Promise<boolean> {
    this.log(amount);
    return true;
  }
}
```

`PaymentProvider` không dùng trực tiếp để tạo object. Nó là một khuôn mẫu, định nghĩa những gì class con cần có.

---

### 3.5 Polymorphism - Tính đa hình

Đa hình là khả năng một interface hoặc class cha có nhiều cách triển khai khác nhau.

```ts
interface StorageService {
  upload(fileName: string, buffer: Buffer): Promise<string>;
}

class LocalStorageService implements StorageService {
  async upload(fileName: string, buffer: Buffer): Promise<string> {
    return `/uploads/${fileName}`;
  }
}

class S3StorageService implements StorageService {
  async upload(fileName: string, buffer: Buffer): Promise<string> {
    return `https://s3.example.com/${fileName}`;
  }
}

class FilesService {
  constructor(private readonly storageService: StorageService) {}

  async uploadAvatar(fileName: string, buffer: Buffer): Promise<string> {
    return this.storageService.upload(fileName, buffer);
  }
}
```

`FilesService` có thể dùng `LocalStorageService` khi dev local và `S3StorageService` khi production mà không cần đổi logic chính.

Một ví dụ đa hình qua kế thừa:

```ts
class Cat extends Animal {
  speak(): string {
    return `${this.name} meows.`;
  }
}

const animals: Animal[] = [new Dog('Lucky', 'Corgi'), new Cat('Milo')];

animals.forEach((animal) => {
  console.log(animal.speak());
});
```

`Dog` và `Cat` đều là `Animal`, nhưng `speak()` trả về kết quả khác nhau.

---

## 4. TypeScript và OOP trong NestJS

### 4.1 NestJS dùng class như thế nào?

NestJS được xây dựng xoay quanh class và Dependency Injection.

```ts
@Controller('users')
export class UsersController {}

@Injectable()
export class UsersService {}

export class CreateUserDto {}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

Trong NestJS:

* Controller nhận request và trả response
* Service chứa business logic
* DTO mô tả dữ liệu đầu vào
* Entity mô tả dữ liệu lưu trong database
* Module gom các thành phần liên quan lại với nhau

---

### 4.2 Constructor Injection trong NestJS

Cú pháp constructor rút gọn của TypeScript được NestJS dùng rất nhiều.

```ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): string[] {
    return this.usersService.findAll();
  }
}
```

Trong ví dụ trên:

* `private` tạo property chỉ dùng trong class
* `readonly` không cho gán lại dependency sau khi inject
* `usersService` được NestJS inject thông qua Dependency Injection container

Ví dụ service:

```ts
@Injectable()
export class UsersService {
  private readonly users: string[] = [];

  findAll(): string[] {
    return this.users;
  }

  create(name: string): string {
    this.users.push(name);
    return name;
  }
}
```

---

### 4.3 Ví dụ tổng hợp: OOP theo phong cách NestJS

Ví dụ dưới đây mô phỏng một module quản lý users ở mức đơn giản.

#### DTO

```ts
export class CreateUserDto {
  name: string;
  email: string;
  password: string;
}
```

DTO dùng để mô tả dữ liệu đầu vào.

#### Entity

```ts
export class User {
  constructor(
    public id: number,
    public name: string,
    public email: string,
    private password: string,
  ) {}

  checkPassword(password: string): boolean {
    return this.password === password;
  }
}
```

Entity đóng gói dữ liệu và hành vi liên quan đến user.

#### Repository contract

```ts
export interface UsersRepository {
  findAll(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
```

Interface mô tả repository cần làm gì.

#### Service

```ts
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existedUser = await this.usersRepository.findByEmail(dto.email);

    if (existedUser) {
      throw new Error('Email already exists');
    }

    const user = new User(Date.now(), dto.name, dto.email, dto.password);

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }
}
```

Service chứa business logic: kiểm tra email trùng, tạo user, gọi repository để lưu.

#### Controller

```ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }
}
```

Controller chỉ nhận request, gọi service và trả response. Đây là cách tách trách nhiệm rất quan trọng trong NestJS.

---

## 5. Tổng kết

Các ý cần nhớ:

* Nên học TypeScript theo thứ tự: kiểu dữ liệu, function, type/interface, enum, generics, module/decorator, class, OOP, NestJS
* TypeScript giúp JavaScript có kiểu dữ liệu tĩnh và an toàn hơn
* `type` phù hợp với union, alias và kiểu phức tạp
* `interface` phù hợp để mô tả contract cho object hoặc class
* `class` là nền tảng rất quan trọng trong NestJS
* `public`, `private`, `protected` giúp kiểm soát truy cập
* `static` dùng cho utility hoặc constant, không nên thay thế service có dependency injection
* OOP giúp code backend rõ trách nhiệm, dễ mở rộng và dễ test
* NestJS áp dụng OOP thông qua Controller, Service, DTO, Entity, Provider và Module

---

## 6. Bài tập thực hành

### Bài 1: TypeScript cơ bản

Tạo các type sau:

* `UserRole` gồm `admin`, `user`, `guest`
* `UserStatus` gồm `active`, `inactive`, `blocked`
* `UserProfile` gồm `id`, `name`, `email`, `role`, `status`

Viết function `isAdmin(user: UserProfile): boolean`.

### Bài 2: Class và Access Modifier

Tạo class `BankAccount` có:

* `private balance`
* method `deposit(amount: number)`
* method `withdraw(amount: number)`
* method `getBalance()`

Không cho phép nạp hoặc rút số tiền nhỏ hơn hoặc bằng 0.

### Bài 3: Interface và Polymorphism

Tạo interface `NotificationSender` có method:

```ts
send(to: string, message: string): Promise<void>;
```

Tạo 2 class:

* `EmailNotificationSender`
* `SmsNotificationSender`

Hai class này cùng implements `NotificationSender`, nhưng log ra nội dung khác nhau.

### Bài 4: Generics

Tạo type generic:

```ts
type PaginatedResponse<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
};
```

Áp dụng cho danh sách users và danh sách products.
