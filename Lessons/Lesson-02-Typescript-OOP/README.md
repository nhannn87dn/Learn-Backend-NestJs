# Lesson 02: TypeScript cho NestJS

## Mục tiêu bài học

Sau bài học này, học viên có thể:
- Cài đặt và cấu hình một dự án TypeScript với `tsconfig.json` ở chế độ `strict`
- Khai báo đúng kiểu dữ liệu cơ bản, union/literal type, và thu hẹp kiểu (narrowing)
- Viết được function có kiểu tham số/giá trị trả về, kể cả hàm `async`
- Dùng được Generics và Utility Types (`Partial`, `Pick`, `Omit`...) để tái sử dụng kiểu dữ liệu
- Viết class với constructor, access modifier, `implements`, `extends` — đúng mức cần thiết để đọc hiểu code NestJS
- Giải thích được vì sao NestJS bắt buộc dùng `class` thay vì `interface` để làm Dependency Injection
- Tự viết được một decorator đơn giản, và giải thích cơ chế `reflect-metadata` đứng sau nó

## Ôn tập nhanh buổi trước

Buổi 1 (Lesson 01) đã giới thiệu Node.js, Event Loop, và cách quản lý package bằng npm/pnpm. TypeScript hôm nay chạy trên nền Node.js đó — mọi khái niệm về module, `package.json`, `node_modules` ở buổi 1 vẫn áp dụng nguyên vẹn, chỉ khác là code được viết bằng cú pháp có kiểu (typed) rồi biên dịch (compile) ra JavaScript trước khi Node.js chạy.

## Phần 1. TypeScript cơ bản

### 1.1. Setup & Kiểu dữ liệu cơ bản

#### TypeScript là gì?

TypeScript (TS) là một "lớp áo" được khoác lên JavaScript (JS), thêm vào **hệ thống kiểu tĩnh (static typing)**. Nói đơn giản: TS giúp bạn khai báo trước "biến này chứa loại dữ liệu gì", và trình biên dịch (compiler) sẽ báo lỗi ngay khi bạn code sai kiểu — thay vì để lỗi đó rơi xuống lúc chạy chương trình (runtime).

```typescript
// JavaScript — không biết lỗi cho tới khi chạy
function cong(a, b) {
  return a + b;
}
cong(5, "10"); // JS chạy được, ra "510" — sai logic nhưng không báo lỗi

// TypeScript — báo lỗi ngay khi gõ code
function congTS(a: number, b: number): number {
  return a + b;
}
congTS(5, "10"); // Lỗi: Argument of type 'string' is not assignable to parameter of type 'number'
```

**Lưu ý quan trọng**: TypeScript chỉ tồn tại lúc *biên dịch (compile-time)*. Khi chạy thật, TS được biên dịch (transpile) thành JS thuần — trình duyệt hay Node.js không hề biết TypeScript là gì.

#### Cài đặt & `tsconfig.json`

```bash
npm install -D typescript
npx tsc --init   # tạo file tsconfig.json
```

File `tsconfig.json` là "luật chơi" cho cả dự án. Một số flag quan trọng nhất:

| Flag | Ý nghĩa |
|---|---|
| `target` | Biên dịch ra phiên bản JS nào (ví dụ `ES2020`) |
| `module` | Hệ thống module dùng (`CommonJS`, `ESNext`...) |
| `strict` | Bật toàn bộ các kiểm tra nghiêm ngặt (nên **luôn bật**) |
| `esModuleInterop` | Cho phép `import express from 'express'` thay vì `import * as express` |
| `outDir` | Thư mục chứa file `.js` sau khi biên dịch |
| `rootDir` | Thư mục chứa file `.ts` gốc |

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

> **Vì sao phải học kỹ phần này?** Mọi dự án NestJS đều khởi tạo sẵn `tsconfig.json` với `strict: true` và các flag riêng cho decorator (sẽ học ở Phần 4). Hiểu được từng flag giúp bạn không "sợ" khi mở file cấu hình của một dự án NestJS thật.

#### Các kiểu nguyên thủy (Primitive Types)

```typescript
let ten: string = "An";
let tuoi: number = 25;
let daHoanThanh: boolean = true;
let khongCoGiaTri: null = null;
let chuaXacDinh: undefined = undefined;
```

TypeScript có khả năng **suy luận kiểu (type inference)** — nghĩa là bạn không bắt buộc phải khai báo kiểu nếu đã gán giá trị ngay lúc khởi tạo:

```typescript
let ten = "An"; // TS tự hiểu ten là string, không cần viết : string
ten = 123;      // Lỗi! vì TS đã "khóa" kiểu string cho biến này
```

#### `any` vs `unknown` vs `never`

Đây là 3 kiểu đặc biệt hay bị nhầm lẫn, và là nơi phân biệt "code TS tốt" với "code TS chỉ có vỏ bọc".

**`any`** — tắt hoàn toàn việc kiểm tra kiểu. Dùng `any` nghĩa là bạn tự nói với TS: "đừng kiểm tra biến này nữa".

```typescript
let duLieu: any = 5;
duLieu = "chuỗi";     // OK, không báo lỗi
duLieu = { a: 1 };    // OK, không báo lỗi
duLieu.hamKhongTonTai(); // Không báo lỗi lúc compile, nhưng CRASH lúc chạy
```

**`unknown`** — cũng chấp nhận mọi giá trị, nhưng **an toàn hơn `any`** vì bắt buộc bạn phải kiểm tra kiểu trước khi sử dụng.

```typescript
let duLieu: unknown = 5;
duLieu = "chuỗi"; // OK

duLieu.length; // Lỗi! TS không cho phép dùng khi chưa biết chắc kiểu

if (typeof duLieu === "string") {
  console.log(duLieu.length); // OK, vì đã kiểm tra (narrowing)
}
```

**`never`** — kiểu đại diện cho giá trị **không bao giờ xảy ra**. Thường gặp ở hàm luôn ném lỗi hoặc vòng lặp vô hạn.

```typescript
function baoLoi(message: string): never {
  throw new Error(message);
}
```

> **Quy tắc thực hành**: Trong dự án thật (và cả NestJS), gần như **cấm dùng `any`** trừ khi thực sự không còn cách nào khác. Muốn nhận dữ liệu chưa rõ kiểu (ví dụ từ API bên ngoài), hãy dùng `unknown` rồi kiểm tra kiểu trước khi xử lý.

---

### 1.2. Cấu trúc dữ liệu có kiểu

#### Array & Tuple

**Array** — danh sách các phần tử cùng kiểu:

```typescript
let danhSachTen: string[] = ["An", "Bình", "Chi"];
let danhSachTuoi: Array<number> = [20, 25, 30]; // cách viết khác, tương đương

danhSachTen.push("Dũng"); // OK
danhSachTen.push(123);    // Lỗi! 123 không phải string
```

**Tuple** — mảng có **số lượng phần tử cố định** và **kiểu của từng vị trí được quy định rõ**:

```typescript
let nguoiDung: [string, number]; // vị trí 0 là string, vị trí 1 là number
nguoiDung = ["An", 25];   // OK
nguoiDung = [25, "An"];   // Lỗi! sai thứ tự kiểu
nguoiDung = ["An", 25, true]; // Lỗi! thừa phần tử
```

> Tuple hữu ích khi bạn muốn trả về nhiều giá trị có ý nghĩa khác nhau từ một hàm, ví dụ `useState()` của React trả về `[value, setValue]`.

#### Object Type & Interface

Khai báo kiểu trực tiếp cho object (object type):

```typescript
let sanPham: { ten: string; gia: number } = {
  ten: "Bàn phím",
  gia: 500000,
};
```

Cách viết trên khá cồng kềnh nếu object phức tạp hoặc dùng lại nhiều lần. Vì vậy ta dùng **`interface`** — giống như một "bản thiết kế" mô tả hình dạng của object:

```typescript
interface SanPham {
  ten: string;
  gia: number;
}

const banPhim: SanPham = { ten: "Bàn phím", gia: 500000 };
const chuot: SanPham = { ten: "Chuột", gia: 200000 };
```

#### Type Alias vs Interface

`type` (type alias) cũng làm được việc tương tự:

```typescript
type SanPham = {
  ten: string;
  gia: number;
};
```

Vậy khi nào dùng `interface`, khi nào dùng `type`? Bảng so sánh nhanh:

| Tiêu chí | `interface` | `type` |
|---|---|---|
| Mô tả hình dạng object/class | ✅ Rất phù hợp | ✅ Cũng được |
| Mở rộng (extend) nhiều lần cùng tên | ✅ Tự động gộp (declaration merging) | ❌ Không cho phép trùng tên |
| Kết hợp Union, Intersection | ❌ Không làm được union | ✅ Làm tốt (`type A = B \| C`) |
| Dùng cho class implement | ✅ Chuẩn nhất | ✅ Được nhưng ít dùng hơn |

> **Quy ước thực hành phổ biến (và cũng là quy ước NestJS)**: dùng `interface` khi định nghĩa "hình dạng" của object hoặc class (ví dụ DTO, contract). Dùng `type` khi cần union, intersection, hoặc kiểu phức tạp khác.

#### Optional Properties & Readonly

```typescript
interface NguoiDung {
  ten: string;
  email?: string;        // dấu ? = optional, có thể không truyền
  readonly id: number;   // readonly = chỉ gán được 1 lần lúc khởi tạo
}

const u: NguoiDung = { ten: "An", id: 1 };
u.id = 2;      // Lỗi! không được sửa readonly property
u.email = "a@gmail.com"; // OK, vì optional vẫn có thể gán sau
```

---

### 1.3. Function

#### Kiểu tham số & kiểu trả về

```typescript
function tinhTong(a: number, b: number): number {
  return a + b;
}

// Arrow function
const tinhHieu = (a: number, b: number): number => a - b;
```

Nếu hàm không trả về gì, dùng kiểu `void`:

```typescript
function logThongBao(message: string): void {
  console.log(message);
}
```

#### Optional & Default Parameters

```typescript
function chao(ten: string, loiChao?: string): string {
  return `${loiChao ?? "Xin chào"}, ${ten}!`;
}
chao("An");                 // "Xin chào, An!"
chao("An", "Chào buổi sáng"); // "Chào buổi sáng, An!"

function chaoV2(ten: string, loiChao: string = "Xin chào"): string {
  return `${loiChao}, ${ten}!`;
}
```

> Lưu ý: tham số optional (`?`) phải luôn nằm **sau** các tham số bắt buộc.

#### Function Overload

Function overload cho phép **một hàm có nhiều "chữ ký" (signature) khác nhau** tùy vào kiểu tham số truyền vào — TS sẽ chọn đúng chữ ký để kiểm tra kiểu.

```typescript
// Các chữ ký khai báo (overload signatures)
function ketHop(a: string, b: string): string;
function ketHop(a: number, b: number): number;

// Phần triển khai thực tế (implementation) — không hiện ra khi gọi hàm
function ketHop(a: any, b: any): any {
  return a + b;
}

ketHop("Xin", "chào");  // OK, trả về string
ketHop(5, 10);          // OK, trả về number
ketHop("Xin", 10);      // Lỗi! không có overload nào khớp
```

> **Vì sao học phần này?** Trong NestJS, nhiều class (ví dụ các thư viện ORM, HTTP client) định nghĩa nhiều overload cho cùng một method để hỗ trợ nhiều cách gọi khác nhau. Hiểu overload giúp bạn đọc hiểu type hint mà IDE gợi ý.

#### Async Function & `Promise<T>`

Một hàm `async` luôn trả về một **Promise** — một "lời hứa" sẽ có giá trị trong tương lai (ví dụ sau khi gọi xong database, gọi xong API). `Promise<T>` là kiểu generic (sẽ học kỹ ở Phần 3): `T` chính là kiểu dữ liệu bên trong Promise đó khi nó hoàn thành.

```typescript
function layNguoiDungCu(id: number): Promise<string> {
  // giả lập gọi bất đồng bộ (ví dụ query database) mất 1 giây
  return new Promise((resolve) => {
    setTimeout(() => resolve(`Người dùng #${id}`), 1000);
  });
}

async function layNguoiDungMoi(id: number): Promise<string> {
  // "await" chờ Promise hoàn thành rồi mới lấy giá trị bên trong
  const ten = await layNguoiDungCu(id);
  return ten;
}

async function main() {
  const ten = await layNguoiDungMoi(1);
  console.log(ten); // "Người dùng #1" (in ra sau 1 giây)
}
```

> **Vì sao quan trọng?** Trong NestJS, gần như mọi method của Service (query database, gọi API bên ngoài, đọc file...) đều là `async` và trả về `Promise<T>` — ví dụ `findOne(id: number): Promise<User>`. NestJS tự động `await` các Promise này ở tầng Controller, bạn chỉ cần khai báo đúng kiểu trả về.

---

### 1.4. Union, Intersection & Literal Types

#### Union Type (`|`)

Một biến có thể là **một trong nhiều kiểu**:

```typescript
function inMaSo(id: string | number): void {
  console.log(`Mã số: ${id}`);
}
inMaSo(123);     // OK
inMaSo("ABC123"); // OK
inMaSo(true);    // Lỗi! boolean không nằm trong union
```

#### Intersection Type (`&`)

Kết hợp **nhiều kiểu thành một**, object phải thỏa mãn tất cả:

```typescript
interface CoTen {
  ten: string;
}
interface CoTuoi {
  tuoi: number;
}

type Nguoi = CoTen & CoTuoi; // phải có CẢ ten VÀ tuoi

const p: Nguoi = { ten: "An", tuoi: 25 }; // OK
const p2: Nguoi = { ten: "An" };          // Lỗi! thiếu tuoi
```

#### Literal Type

Thay vì chấp nhận mọi `string`, ta có thể giới hạn giá trị chỉ được là **một vài chuỗi/số cụ thể**:

```typescript
type TrangThai = "cho_xu_ly" | "dang_xu_ly" | "hoan_thanh";

function capNhatTrangThai(status: TrangThai): void {
  console.log(`Trạng thái mới: ${status}`);
}

capNhatTrangThai("hoan_thanh");   // OK
capNhatTrangThai("da_huy");       // Lỗi! không nằm trong danh sách cho phép
```

#### Type Narrowing (thu hẹp kiểu)

Khi một biến có union type, TS sẽ tự "thu hẹp" kiểu dựa vào các đoạn kiểm tra điều kiện (gọi là **type guard**):

```typescript
function xuLy(giaTri: string | number) {
  if (typeof giaTri === "string") {
    // Trong nhánh này, TS biết chắc giaTri là string
    console.log(giaTri.toUpperCase());
  } else {
    // Trong nhánh này, TS biết chắc giaTri là number
    console.log(giaTri.toFixed(2));
  }
}
```

Một số cách narrowing thường dùng: `typeof`, `instanceof`, `in`, so sánh trực tiếp giá trị (literal check).

```typescript
class Meo {
  keu() { console.log("Meo meo"); }
}
class Cho {
  sua() { console.log("Gâu gâu"); }
}

function taoAmThanh(dongVat: Meo | Cho) {
  if (dongVat instanceof Meo) {
    dongVat.keu();
  } else {
    dongVat.sua();
  }
}
```

---

### 1.5. Enum

#### Numeric Enum

```typescript
enum HuongDi {
  Bac,   // = 0
  Nam,   // = 1
  Dong,  // = 2
  Tay,   // = 3
}

let huong: HuongDi = HuongDi.Bac;
console.log(huong); // 0
```

Bạn có thể gán giá trị bắt đầu tùy ý:

```typescript
enum MaLoi {
  KhongTimThay = 404,
  LoiMayChu = 500,
  ThanhCong = 200,
}
```

#### String Enum

Thường được ưa dùng hơn numeric enum vì **dễ đọc log/debug hơn** (giá trị thật là chuỗi, không phải số vô nghĩa):

```typescript
enum TrangThaiDonHang {
  ChoXuLy = "CHO_XU_LY",
  DangGiao = "DANG_GIAO",
  HoanThanh = "HOAN_THANH",
  DaHuy = "DA_HUY",
}

function inTrangThai(status: TrangThaiDonHang) {
  console.log(`Trạng thái đơn hàng: ${status}`);
}
inTrangThai(TrangThaiDonHang.DangGiao); // "Trạng thái đơn hàng: DANG_GIAO"
```

#### Const Enum

Thêm từ khóa `const` để TS **loại bỏ hoàn toàn code enum khi biên dịch**, giúp giảm dung lượng file JS đầu ra (inline giá trị trực tiếp vào nơi sử dụng):

```typescript
const enum Mau {
  Do,
  Xanh,
  Vang,
}
let m = Mau.Do; // Sau khi biên dịch, dòng này trở thành: let m = 0;
```

> **Ứng dụng thực tế**: NestJS và các thư viện liên quan dùng enum rất nhiều để mô tả các giá trị cố định như HTTP method (`GET`, `POST`...), HTTP status code, role người dùng (`ADMIN`, `USER`...), trạng thái đơn hàng, loại thông báo... Việc dùng enum thay vì chuỗi tự do giúp tránh lỗi gõ sai chính tả (ví dụ gõ nhầm `"Admin"` thay vì `"ADMIN"`) — lỗi này TS sẽ bắt được ngay lúc code, không phải đợi tới lúc chạy.

---

### 1.6. Utility Types

TypeScript có sẵn một số kiểu tiện ích (utility types) giúp **biến đổi một interface/type có sẵn thành kiểu mới**, mà không cần viết lại từ đầu.

```typescript
interface SanPham {
  id: number;
  ten: string;
  gia: number;
  moTa: string;
}
```

**`Partial<T>`** — biến tất cả property thành optional (dùng khi update, chỉ truyền những field muốn sửa):

```typescript
function capNhatSanPham(id: number, thayDoi: Partial<SanPham>): void {
  // thayDoi có thể chỉ chứa { gia: 300000 }, không bắt buộc đủ 4 field
}
```

**`Required<T>`** — ngược lại với `Partial`, biến tất cả property thành bắt buộc.

**`Pick<T, Keys>`** — chỉ lấy ra một số property nhất định:

```typescript
type SanPhamTomTat = Pick<SanPham, "id" | "ten">; // chỉ còn { id: number; ten: string }
```

**`Omit<T, Keys>`** — ngược lại với `Pick`, loại bỏ một số property:

```typescript
type SanPhamKhongCoGia = Omit<SanPham, "gia">; // còn lại { id; ten; moTa }
```

**`Record<Keys, ValueType>`** — tạo nhanh một object type mà mọi key đều cùng kiểu giá trị:

```typescript
type SoLuongTonKho = Record<string, number>;
const tonKho: SoLuongTonKho = { "sp-001": 10, "sp-002": 25 };
```

> **Ứng dụng trực tiếp**: NestJS dùng chính các utility type này (thông qua gói `@nestjs/mapped-types`) để tạo DTO update từ DTO create, ví dụ `class UpdateProductDto extends PartialType(CreateProductDto) {}` — về bản chất `PartialType` chỉ là áp dụng `Partial<T>` lên một class.

---

## Phần 2. Class trong TypeScript (đủ dùng cho NestJS)

> NestJS viết code hoàn toàn bằng `class` (Controller, Service, Module, DTO, Guard...). Phần này **không đi sâu vào lý thuyết OOP** (kế thừa nhiều tầng, đa hình, trừu tượng hóa...) mà chỉ tập trung vào đúng lượng cú pháp class cần biết để đọc hiểu và viết được code NestJS.

### 2.1 Class cở bản

#### Class và Object

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

#### Cấu trúc Class trong TypeScript

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

##### Constructor

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

##### Properties

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

##### Methods

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

### Access Modifiers: `public`, `private`, `protected`

Access modifier quyết định **ai được phép truy cập** một property/method.

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


**Bảng so sánh nhanh**:

| Modifier | Truy cập từ bên trong class | Truy cập từ class con | Truy cập từ bên ngoài |
|---|---|---|---|
| `public` (mặc định) | ✅ | ✅ | ✅ |
| `protected` | ✅ | ✅ | ❌ |
| `private` | ✅ | ❌ | ❌ |

### `readonly` trong class

```typescript
class NguoiDung {
  readonly id: number;
  ten: string;

  constructor(id: number, ten: string) {
    this.id = id; // chỉ gán được trong constructor
    this.ten = ten;
  }
}

const u = new NguoiDung(1, "An");
u.ten = "Bình"; // OK
u.id = 2;       // Lỗi! readonly, không được sửa sau khi khởi tạo
```

> **Vì sao quan trọng?** Tư duy "che giấu dữ liệu" (encapsulation) bằng `private`/`protected` chính là nền tảng của **Service pattern** trong NestJS — nơi logic nghiệp vụ và dữ liệu nội bộ được giấu kín bên trong service, chỉ expose ra bên ngoài thông qua các method public.


### Static

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

> `readonly` với dấu `!` (definite assignment): khi bật `strict` (cụ thể là `strictPropertyInitialization`), TS bắt buộc mọi property phải được gán giá trị trong constructor hoặc lúc khai báo. Với entity TypeORM, giá trị `id`, `createdAt`... thực ra do TypeORM gán sau khi query database, không phải trong constructor bạn tự viết — TS không biết điều đó nên sẽ báo lỗi "Property has no initializer". Thêm dấu `!` ngay sau tên property để nói với TS: "tôi biết, giá trị này chắc chắn sẽ có, đừng bắt tôi khởi tạo nó ở constructor".
>
> ```typescript
> class UserEntity {
>   id!: number;        // dấu ! = "tôi cam kết giá trị này sẽ được gán từ bên ngoài"
>   email!: string;
>   createdAt!: Date;
> }
> ```

---

### 2.2. `extends` và `super()` (kế thừa cơ bản)

Kế thừa cho phép một class **dùng lại** property và method của class khác (class cha), đồng thời có thể thêm/thay đổi hành vi riêng.

```typescript
class DongVat {
  ten: string;

  constructor(ten: string) {
    this.ten = ten;
  }

  keu(): string {
    return `${this.ten} đang kêu...`;
  }
}

class Cho extends DongVat {
  giong: string;

  constructor(ten: string, giong: string) {
    super(ten); // BẮT BUỘC gọi super() trước khi dùng "this" trong class con
    this.giong = giong;
  }
}

const cho = new Cho("Lu", "Golden Retriever");
console.log(cho.ten);      // "Lu" — kế thừa từ DongVat
console.log(cho.keu());    // dùng method kế thừa từ DongVat
```

`super(ten)` gọi đến constructor của class cha (`DongVat`) để khởi tạo phần dữ liệu chung, trước khi class con tiếp tục khởi tạo phần riêng của mình. Class con cũng có thể định nghĩa lại (override) một method đã có ở class cha nếu muốn thay đổi hành vi, chỉ cần khai báo lại method cùng tên.

#### `abstract` (giới thiệu)

`abstract class` là một class **không thể khởi tạo trực tiếp** (`new AbstractClass()` sẽ báo lỗi) — nó chỉ tồn tại để làm "khuôn mẫu" cho các class con kế thừa, tương tự `interface` nhưng có thể chứa sẵn cả code dùng chung.

```typescript
abstract class HinhHoc {
  abstract tinhDienTich(): number; // không có phần thân, bắt buộc class con tự viết

  moTa(): string {
    return `Diện tích: ${this.tinhDienTich()}`;
  }
}

class HinhTron extends HinhHoc {
  constructor(private banKinh: number) {
    super();
  }

  tinhDienTich(): number {
    return Math.PI * this.banKinh ** 2;
  }
}
```

> **Ứng dụng thực tế**: Trong các dự án NestJS lớn, `abstract class` thường được dùng để định nghĩa **base Repository** hoặc **base Service** — khai báo sẵn các method chung (`findById`, `save`...) nhưng để phần triển khai chi tiết cho từng class con tự hiện thực.

---

### 2.3. Interface với Class

#### `implements`

Nếu `extends` là "kế thừa hành vi", thì `implements` là "cam kết tuân theo một hợp đồng (contract)" — class phải tự triển khai **toàn bộ** những gì interface yêu cầu.

```typescript
interface CoTheBay {
  doCaoBay: number;
  bay(): string;
}

class ChimEnh implements CoTheBay {
  doCaoBay: number = 100;

  bay(): string {
    return "Chim đang bay trên trời";
  }
}

class MayBay implements CoTheBay {
  doCaoBay: number = 10000;

  bay(): string {
    return "Máy bay đang bay trong không phận";
  }
}
```

Nếu class thiếu bất kỳ property/method nào interface yêu cầu, TS sẽ báo lỗi ngay:

```typescript
class ThieuSot implements CoTheBay {
  doCaoBay: number = 5;
  // Lỗi! Thiếu method bay() — class không thỏa mãn interface CoTheBay
}
```

#### Một class có thể `implements` nhiều interface

```typescript
interface CoTheBoi {
  boi(): string;
}

class Vit implements CoTheBay, CoTheBoi {
  doCaoBay: number = 20;
  bay(): string { return "Vịt bay thấp"; }
  boi(): string { return "Vịt đang bơi"; }
}
```

#### Vì sao NestJS dùng `class` chứ không dùng `interface`?

Đây là điểm rất hay bị bỏ qua nhưng lại là chìa khóa để hiểu NestJS: **`interface` chỉ tồn tại lúc biên dịch (compile-time)** — sau khi TS biên dịch xong, toàn bộ khai báo `interface` **bị xóa hoàn toàn** khỏi file JS, không để lại dấu vết gì lúc chạy (runtime). Ngược lại, **`class` vẫn tồn tại lúc runtime** — nó thực sự trở thành một hàm/constructor trong JS.

```typescript
interface KhoLuuTru {
  luu(key: string, value: string): void;
}
class BoNhoTam implements KhoLuuTru {
  luu(key: string, value: string): void {}
}

console.log(typeof KhoLuuTru); // Lỗi! KhoLuuTru không tồn tại lúc runtime, đã bị xóa khi biên dịch
console.log(typeof BoNhoTam);  // "function" — class vẫn tồn tại thật sự
```

NestJS cần **đọc được thông tin kiểu dữ liệu lúc chạy chương trình** để biết constructor của một class đang cần "tiêm" (inject) vào những gì (sẽ thấy rõ ở Phần 4 — Reflect Metadata). Vì `interface` biến mất lúc runtime nên NestJS **không thể** dùng interface để khai báo dependency cần inject — bắt buộc phải dùng `class` (DTO, Service...) thì cơ chế Dependency Injection mới hoạt động được.

---

### 2.4. Parameter Properties — cú pháp quan trọng nhất cần nhớ

TypeScript cho phép **rút gọn** việc khai báo property + gán trong constructor thành **một dòng duy nhất**, bằng cách thêm access modifier ngay trước tham số của constructor.

#### Cách viết dài (đã học ở mục 2.1)

```typescript
class NguoiDung {
  private ten: string;
  private tuoi: number;

  constructor(ten: string, tuoi: number) {
    this.ten = ten;
    this.tuoi = tuoi;
  }
}
```

#### Cách viết rút gọn bằng Parameter Properties

```typescript
class NguoiDung {
  constructor(
    private ten: string,
    private tuoi: number,
  ) {}
  // TS TỰ ĐỘNG khai báo 2 property "ten" và "tuoi", và tự gán this.ten = ten, this.tuoi = tuoi
}

const u = new NguoiDung("An", 25);
```

Chỉ cần thêm **bất kỳ access modifier nào** (`public`, `private`, `protected`, hoặc `readonly`) ngay trước tên tham số trong constructor, TS sẽ tự động:
1. Khai báo một property cùng tên trong class
2. Gán giá trị tham số đó cho property tương ứng ngay trong constructor

```typescript
class DichVuThongBao {
  constructor(
    private readonly diaChiEmail: string,
    protected soLuongToiDa: number = 100,
  ) {}
}
```

> **Đây chính là cú pháp NestJS dùng ở MỌI service, controller để thực hiện Dependency Injection**:
> ```typescript
> // Ví dụ minh họa cú pháp (không phải code NestJS thật, chỉ để thấy sự tương đồng)
> class UserController {
>   constructor(private readonly userService: UserService) {}
> }
> ```
> Khi mới học NestJS, rất nhiều học viên tưởng rằng dòng `private readonly userService: UserService` trong constructor là "phép màu" của framework. **Sự thật là nó chỉ đơn thuần là cú pháp Parameter Properties của TypeScript thuần** — NestJS chỉ tận dụng cú pháp này kết hợp với decorator (học ở Phần 4) để biết cần "tiêm" cái gì vào đâu. Hiểu rõ điều này giúp bạn không còn thấy NestJS "khó hiểu" nữa.

---

## Phần 3: Generics

> Generics là công cụ giúp viết code **tái sử dụng được cho nhiều kiểu dữ liệu khác nhau**, mà vẫn giữ được sự an toàn kiểu (type safety). Đây là nền tảng bắt buộc để hiểu Repository pattern, DTO wrapper, và Pipe trong NestJS.

### 3.1. Vấn đề Generics giải quyết

Giả sử bạn muốn viết một hàm "lấy phần tử đầu tiên của mảng", dùng được cho mọi loại mảng:

```typescript
// Cách 1: dùng any — mất an toàn kiểu
function layPhanTuDau(mang: any[]): any {
  return mang[0];
}

const ketQua = layPhanTuDau([1, 2, 3]);
ketQua.toUpperCase(); // Không báo lỗi lúc compile, nhưng CRASH lúc chạy vì number không có toUpperCase
```

```typescript
// Cách 2: dùng Generics — vừa tái sử dụng được, vừa giữ an toàn kiểu
function layPhanTuDauGeneric<T>(mang: T[]): T {
  return mang[0];
}

const soDau = layPhanTuDauGeneric([1, 2, 3]);       // T được suy ra là number
const chuoiDau = layPhanTuDauGeneric(["a", "b"]);   // T được suy ra là string

soDau.toUpperCase(); // Lỗi ngay lúc compile! vì TS biết soDau là number
```

`<T>` là một **tham số kiểu (type parameter)** — giống như tham số bình thường của hàm, nhưng thay vì nhận giá trị, nó nhận **một kiểu dữ liệu**. Tên `T` chỉ là quy ước (viết tắt của "Type"), bạn có thể đặt tên khác.

---

### 3.2. Generic Function

```typescript
function boc<T>(giaTri: T): { value: T } {
  return { value: giaTri };
}

const a = boc(5);        // { value: number }
const b = boc("xin chào"); // { value: string }
```

### Nhiều tham số kiểu cùng lúc

```typescript
function ghepCap<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

const cap = ghepCap("An", 25); // [string, number]
```

#### Generic Constraint — giới hạn kiểu được truyền vào

Đôi khi bạn không muốn `T` là *bất kỳ* kiểu nào, mà phải thỏa mãn một điều kiện nào đó. Dùng `extends` để ràng buộc:

```typescript
interface CoDoDai {
  length: number;
}

function inDoDai<T extends CoDoDai>(giaTri: T): void {
  console.log(`Độ dài: ${giaTri.length}`);
}

inDoDai("xin chào");        // OK, string có length
inDoDai([1, 2, 3]);         // OK, array có length
inDoDai(123);                // Lỗi! number không có property length
```

---

### 3.3. Generic Interface & Generic Class

#### Generic Interface

```typescript
interface HopChua<T> {
  giaTri: T;
  layGiaTri(): T;
}

const hopSo: HopChua<number> = {
  giaTri: 100,
  layGiaTri() { return this.giaTri; },
};

const hopChuoi: HopChua<string> = {
  giaTri: "xin chào",
  layGiaTri() { return this.giaTri; },
};
```

#### Generic Class

```typescript
class NganXep<T> {
  private cacPhanTu: T[] = [];

  day(phanTu: T): void {
    this.cacPhanTu.push(phanTu);
  }

  lay(): T | undefined {
    return this.cacPhanTu.pop();
  }

  get soLuong(): number {
    return this.cacPhanTu.length;
  }
}

const nganXepSo = new NganXep<number>();
nganXepSo.day(1);
nganXepSo.day(2);
console.log(nganXepSo.lay()); // 2

const nganXepChuoi = new NganXep<string>();
nganXepChuoi.day("a");
nganXepChuoi.day("b");
console.log(nganXepChuoi.lay()); // "b"
```

Nhận xét: `NganXep<T>` là **một class duy nhất** nhưng dùng được cho mọi kiểu dữ liệu — không cần viết `NganXepSo`, `NganXepChuoi` riêng biệt.

---

### 3.4. Generic trong thực tế — chuẩn bị tư duy cho NestJS

#### Ví dụ: viết một Response Wrapper dùng chung cho mọi API

Đây là bài toán rất phổ biến: mọi API trong hệ thống đều trả về cấu trúc chung (status, message, data), nhưng phần `data` lại khác nhau tùy API.

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function taoResponseThanhCong<T>(data: T, message: string = "Thành công"): ApiResponse<T> {
  return { success: true, message, data };
}

interface SanPham {
  id: number;
  ten: string;
}

const res1 = taoResponseThanhCong<SanPham>({ id: 1, ten: "Bàn phím" });
// res1.data được TS biết chắc là kiểu SanPham, gợi ý đầy đủ khi gõ res1.data.ten

const res2 = taoResponseThanhCong<SanPham[]>([{ id: 1, ten: "Bàn phím" }]);
// res2.data là mảng SanPham
```

#### Ví dụ: mô phỏng đơn giản một `Repository<T>`

```typescript
class RepositoryDonGian<T extends { id: number }> {
  private items: T[] = [];

  save(item: T): T {
    this.items.push(item);
    return item;
  }

  findById(id: number): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  findAll(): T[] {
    return this.items;
  }
}

interface SanPham {
  id: number;
  ten: string;
}

const sanPhamRepo = new RepositoryDonGian<SanPham>();
sanPhamRepo.save({ id: 1, ten: "Bàn phím" });
console.log(sanPhamRepo.findById(1)); // { id: 1, ten: "Bàn phím" }
```

> **Ứng dụng trực tiếp**: Trong NestJS (khi dùng TypeORM), bạn sẽ thấy các kiểu như `Repository<User>`, `Promise<User[]>` xuất hiện khắp nơi. Đây chính xác là tư duy `RepositoryDonGian<T>` ở trên — một class Repository **dùng chung logic** (save, find, delete...) nhưng áp dụng được cho **bất kỳ entity nào** (`User`, `Product`, `Order`...) nhờ Generics. Việc tự tay viết một `RepositoryDonGian<T>` như trên trước khi học NestJS sẽ giúp bạn không còn thấy `Repository<User>` là điều gì đó xa lạ.


---

## Phần 4: Decorator

### 4.1. Decorator là gì? Cách bật decorator

Decorator là một **hàm đặc biệt**, được gắn vào class, method, property hoặc parameter bằng ký hiệu `@`, dùng để **thêm hành vi hoặc metadata** vào đối tượng đó — mà không cần sửa trực tiếp code bên trong đối tượng.

Để dùng được decorator, cần bật 2 flag sau trong `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

- `experimentalDecorators`: bật cú pháp `@TenDecorator` (tính đến thời điểm hiện tại decorator vẫn là tính năng "thử nghiệm" theo chuẩn TS truyền thống mà NestJS đang dùng)
- `emitDecoratorMetadata`: giữ lại thông tin kiểu dữ liệu (metadata) của property/parameter được decorate, để có thể đọc lại lúc chạy chương trình — flag này chính là thứ giúp NestJS "biết" được kiểu dữ liệu của tham số constructor để tự động inject đúng dependency

---

### 4.2. Các loại Decorator

#### Class Decorator

Nhận vào **constructor của class**, có thể dùng để log, gắn thêm metadata, hoặc thậm chí thay thế class gốc.

```typescript
function GhiLog(constructor: Function) {
  console.log(`Class được khởi tạo: ${constructor.name}`);
}

@GhiLog
class DichVuEmail {
  gui(): void {
    console.log("Đang gửi email...");
  }
}
// Ngay khi file được load, console sẽ in: "Class được khởi tạo: DichVuEmail"
```

#### Method Decorator

Nhận vào 3 tham số: `target` (đối tượng chứa method), `propertyKey` (tên method), `descriptor` (mô tả kỹ thuật của method, có thể sửa được).

```typescript
function GhiLogThoiGian(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const hamGoc = descriptor.value; // lưu lại hàm gốc

  descriptor.value = function (...args: any[]) {
    console.log(`Bắt đầu gọi ${propertyKey}`);
    const ketQua = hamGoc.apply(this, args); // gọi hàm gốc
    console.log(`Kết thúc gọi ${propertyKey}`);
    return ketQua;
  };
}

class TinhToan {
  @GhiLogThoiGian
  cong(a: number, b: number): number {
    return a + b;
  }
}

const tt = new TinhToan();
tt.cong(2, 3);
// In ra:
// "Bắt đầu gọi cong"
// "Kết thúc gọi cong"
```

#### Property Decorator

Nhận vào `target` và `propertyKey`, thường dùng để gắn metadata cho property (không truy cập trực tiếp giá trị property lúc decorator chạy).

```typescript
function BatBuoc(target: any, propertyKey: string) {
  console.log(`Property "${propertyKey}" được đánh dấu là bắt buộc`);
}

class DangKy {
  @BatBuoc
  email: string = "";
}
```

#### Parameter Decorator

Nhận vào `target`, `propertyKey`, và `parameterIndex` (vị trí của tham số trong danh sách tham số), thường dùng để đánh dấu một tham số cụ thể cần xử lý đặc biệt.

```typescript
function ThamSoQuanTrong(target: any, propertyKey: string, parameterIndex: number) {
  console.log(`Tham số vị trí ${parameterIndex} trong "${propertyKey}" được đánh dấu quan trọng`);
}

class DonHang {
  taoDonHang(@ThamSoQuanTrong khachHangId: number, ghiChu: string) {
    // ...
  }
}
```

#### Decorator Factory — decorator có tham số

Nếu muốn decorator nhận thêm tham số tùy chỉnh (giống `@Controller('users')` của NestJS), ta viết một **hàm trả về decorator** — gọi là Decorator Factory.

```typescript
function GhiLogVoiTuKhoa(tuKhoa: string) {
  // Đây là Decorator Factory: một hàm bình thường, trả về decorator thực sự
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const hamGoc = descriptor.value;
    descriptor.value = function (...args: any[]) {
      console.log(`[${tuKhoa}] Gọi ${propertyKey}`);
      return hamGoc.apply(this, args);
    };
  };
}

class KhoHang {
  @GhiLogVoiTuKhoa("KHO")
  nhapHang(soLuong: number) {
    console.log(`Nhập ${soLuong} sản phẩm`);
  }
}

new KhoHang().nhapHang(10);
// In ra: "[KHO] Gọi nhapHang" rồi "Nhập 10 sản phẩm"
```

> Đây chính là lý do vì sao `@Controller('users')`, `@Get(':id')` trong NestJS đều có dấu ngoặc và nhận tham số — chúng đều là **Decorator Factory**, không phải decorator thuần.

---

### 4.3. Tự viết một Decorator đơn giản (bài tập thực hành)

**Bài tập gợi ý**: viết decorator `@DoThoiGianThucThi()` — đo và in ra thời gian (ms) một method chạy hết bao lâu.

```typescript
function DoThoiGianThucThi() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const hamGoc = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const batDau = performance.now();
      const ketQua = hamGoc.apply(this, args);
      const ketThuc = performance.now();
      console.log(`"${propertyKey}" chạy hết ${(ketThuc - batDau).toFixed(2)}ms`);
      return ketQua;
    };
  };
}

class XuLyDuLieu {
  @DoThoiGianThucThi()
  tinhToanNang(): number {
    let tong = 0;
    for (let i = 0; i < 1_000_000; i++) tong += i;
    return tong;
  }
}

new XuLyDuLieu().tinhToanNang();
// In ra: "tinhToanNang" chạy hết 3.42ms (số cụ thể tùy máy)
```

> **Mục tiêu sư phạm**: khi học viên tự tay viết được decorator kiểu này, họ sẽ hiểu rằng `@Injectable()`, `@Get()`, `@Post()` trong NestJS **không phải phép màu** — chỉ là các hàm decorator đã được Nest team viết sẵn, làm những việc phức tạp hơn (đăng ký route, quản lý dependency...) nhưng về bản chất cơ chế hoạt động **giống hệt** ví dụ trên.

---

### 4.4. Reflect Metadata

`reflect-metadata` là một thư viện (polyfill) bổ sung khả năng **gắn và đọc lại metadata** (dữ liệu mô tả) lên class, method, property lúc runtime. Đây chính là cơ chế đứng sau flag `emitDecoratorMetadata` đã bật ở mục 4.1.

```bash
npm install reflect-metadata
```

```typescript
import "reflect-metadata"; // phải import ở file gốc của ứng dụng

const KHOA_METADATA = "vaiTro";

function GanVaiTro(vaiTro: string) {
  return function (target: any) {
    Reflect.defineMetadata(KHOA_METADATA, vaiTro, target);
  };
}

@GanVaiTro("Admin")
class NguoiDungQuanTri {}

const vaiTro = Reflect.getMetadata(KHOA_METADATA, NguoiDungQuanTri);
console.log(vaiTro); // "Admin"
```

#### Ví dụ nâng cao hơn: đọc kiểu dữ liệu của tham số constructor

Đây là ví dụ mô phỏng **chính xác cơ chế** mà NestJS dùng để tự động nhận diện dependency cần inject:

```typescript
import "reflect-metadata";

function Injectable() {
  return function (target: any) {
    // Không cần làm gì thêm, chỉ đánh dấu class này "có thể được inject"
  };
}

class DichVuA {
  hello() { console.log("Xin chào từ DichVuA"); }
}

@Injectable()
class DichVuB {
  constructor(private dichVuA: DichVuA) {}
}

// emitDecoratorMetadata tự động gắn "design:paramtypes" chứa danh sách kiểu tham số constructor
const cacKieuThamSo = Reflect.getMetadata("design:paramtypes", DichVuB);
console.log(cacKieuThamSo); // [DichVuA] — TS "nhớ" được constructor cần một DichVuA
```

Nhờ đọc được `design:paramtypes`, một "DI container" tự viết đơn giản có thể tự động tạo instance đúng thứ tự cần thiết:

```typescript
function taoInstanceTuDong<T>(TargetClass: new (...args: any[]) => T): T {
  const cacKieuThamSo: any[] = Reflect.getMetadata("design:paramtypes", TargetClass) || [];
  const cacInstanceThamSo = cacKieuThamSo.map((Kieu) => new Kieu());
  return new TargetClass(...cacInstanceThamSo);
}

const instanceDichVuB = taoInstanceTuDong(DichVuB);
// DI container tự biết: DichVuB cần DichVuA -> tự tạo DichVuA -> truyền vào constructor của DichVuB
```

> **Đây chính là bản chất Dependency Injection của NestJS**: khi bạn viết `constructor(private readonly userService: UserService) {}` trong một class có `@Injectable()`, NestJS đọc `design:paramtypes` (nhờ `reflect-metadata` + `emitDecoratorMetadata`) để biết constructor cần một `UserService`, rồi tự động tạo (hoặc lấy từ cache) instance đó và truyền vào — hoàn toàn giống ví dụ `taoInstanceTuDong` ở trên, chỉ khác là NestJS làm việc này ở quy mô lớn hơn rất nhiều (quản lý cả cây phụ thuộc, scope, module...).

---

## Phần 5: Module system & cấu hình dự án

### 5.1. Module trong TypeScript

#### `import` / `export`

TypeScript dùng chuẩn ES Module để chia code thành nhiều file, mỗi file là một "module" độc lập.

**Named export** — xuất nhiều thành phần có tên cụ thể:

```typescript
// file: toanHoc.ts
export function cong(a: number, b: number): number {
  return a + b;
}

export const PI = 3.14159;

export interface KetQuaTinhToan {
  giaTri: number;
}
```

```typescript
// file: main.ts
import { cong, PI, KetQuaTinhToan } from "./toanHoc";

console.log(cong(2, 3));
console.log(PI);
```

**Default export** — mỗi file chỉ có **một** default export, dùng khi file đó tập trung xuất ra "một thứ chính".

```typescript
// file: DichVuNguoiDung.ts
export default class DichVuNguoiDung {
  layDanhSach() {
    return ["An", "Bình"];
  }
}
```

```typescript
// file: main.ts
import DichVuNguoiDung from "./DichVuNguoiDung"; // không cần dấu {}, tên tùy đặt

const dv = new DichVuNguoiDung();
```

**So sánh nhanh**:

| | Named export | Default export |
|---|---|---|
| Số lượng mỗi file | Nhiều | Chỉ 1 |
| Cú pháp import | `import { ten } from "..."` (tên phải khớp) | `import tenTuyChon from "..."` (tên tùy đặt) |
| Khi nào dùng | File xuất nhiều tiện ích nhỏ (helper, constant...) | File tập trung xuất 1 class/hàm chính |

> **Quy ước phổ biến trong NestJS**: hầu hết class (Controller, Service, Module, DTO...) đều dùng **named export**, không dùng default export. Lý do: named export giúp IDE tự động import chính xác tên class, tránh nhầm lẫn khi một file có nhiều người cùng sửa.

#### Path Alias — rút gọn đường dẫn import

Khi dự án lớn dần, các đường dẫn import kiểu `../../../services/user.service` rất khó đọc và dễ lỗi khi di chuyển file. TypeScript hỗ trợ khai báo **alias (bí danh)** cho đường dẫn thông qua `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

```typescript
// Thay vì:
import { DichVuNguoiDung } from "../../../services/DichVuNguoiDung";

// Có thể viết:
import { DichVuNguoiDung } from "@services/DichVuNguoiDung";
```

> Lưu ý: `paths` chỉ giúp TypeScript hiểu đường dẫn lúc biên dịch/kiểm tra kiểu — khi chạy thật bằng Node.js cần thêm công cụ hỗ trợ (ví dụ `tsconfig-paths`) để resolve đúng alias lúc runtime, trừ khi dùng bundler tự xử lý việc này.

#### Barrel File (`index.ts`)

Một pattern rất phổ biến: tạo file `index.ts` trong một thư mục, chỉ để **gom và export lại** mọi thứ trong thư mục đó — gọi là "barrel file".

```typescript
// file: services/index.ts
export * from "./DichVuNguoiDung";
export * from "./DichVuSanPham";
export * from "./DichVuDonHang";
```

```typescript
// Nơi khác chỉ cần import 1 dòng thay vì 3 dòng riêng lẻ
import { DichVuNguoiDung, DichVuSanPham, DichVuDonHang } from "./services";
```

> **Ứng dụng trực tiếp**: cấu trúc thư mục chuẩn của NestJS (mỗi module là 1 thư mục chứa controller, service, dto...) rất hay dùng barrel file để gom export, giúp import gọn gàng hơn khi một module được các module khác sử dụng lại.

---

## Common mistakes — lỗi người mới hay gặp

1. **Dùng `any` để "cho qua" lỗi type**: gặp lỗi TS báo đỏ, thay vì đọc hiểu và sửa đúng kiểu, học viên mới thường gõ đại `: any` để tắt lỗi. Hậu quả: mất hết lợi ích của TypeScript, lỗi sẽ nổ ra lúc chạy chương trình thay vì lúc code.
2. **Quên `private readonly` trong constructor rồi thắc mắc sao NestJS "không tự inject được"**: parameter properties (mục 2.4) là cú pháp bắt buộc phải có access modifier (`private`, `public`...) đứng trước tham số thì TS mới tự tạo property — quên modifier thì tham số đó chỉ là biến cục bộ bình thường, không inject được gì cả.
3. **Nhầm lẫn `interface` và `type` rồi không biết khi nào dùng cái nào**: quy tắc đơn giản — dùng `interface` để mô tả hình dạng object/class (DTO, entity), dùng `type` khi cần union/intersection.
4. **Quên bật `strict` trong `tsconfig.json`**: khi thiếu `strict: true`, rất nhiều lỗi tiềm ẩn (property chưa khởi tạo, tham số có thể `null`...) sẽ không được TS cảnh báo, tạo cảm giác "code chạy được" nhưng thực ra tiềm ẩn lỗi runtime.
5. **Viết decorator nhưng quên bật `experimentalDecorators`/`emitDecoratorMetadata`**: code biên dịch lỗi hoặc decorator chạy nhưng không đọc được kiểu tham số — nguyên nhân gần như luôn là thiếu 2 flag này trong `tsconfig.json`.

## Bài tập thực hành trên lớp

**Đề bài**: Viết một chương trình TypeScript quản lý danh sách sản phẩm, gồm:
1. Một `interface Product` mô tả sản phẩm (`id`, `ten`, `gia`, `soLuongTon`).
2. Một `class ProductRepository` dùng Generics (`class ProductRepository<T extends { id: number }>`) với các method `save`, `findById`, `findAll` (tương tự ví dụ `RepositoryDonGian<T>` ở Phần 3.4).
3. Dùng Utility Types tạo ra `CreateProductDto` (`Omit<Product, "id">`) và `UpdateProductDto` (`Partial<CreateProductDto>`).
4. Viết một decorator method đơn giản `@GhiLog()` gắn vào method `save` để in ra console mỗi khi có sản phẩm mới được lưu.

**Gợi ý hướng giải**: bắt đầu từ ví dụ `RepositoryDonGian<T>` đã có sẵn trong bài, thêm ràng buộc generic `extends { id: number }`, rồi áp Utility Types lên `interface Product` đã định nghĩa. Với decorator, tái sử dụng cấu trúc `GhiLogThoiGian` ở mục 4.2.

## Homework

- [ ] Cấu hình một project TypeScript mới từ đầu (`npm init`, cài `typescript`, tạo `tsconfig.json` với `strict: true`).
- [ ] Viết lại bài tập trên lớp, nhưng đổi entity từ `Product` sang `Order` (đơn hàng) có ít nhất 5 field, trong đó có 1 field kiểu union literal (ví dụ trạng thái đơn hàng).
- [ ] Viết thêm một Generic Interface `ApiResponse<T>` (giống mục 3.4) và áp dụng nó để bọc kết quả trả về của `findAll()`.
- [ ] (Nâng cao) Tự viết một decorator factory nhận tham số, ví dụ `@ValidateNotEmpty("ten")`, ném lỗi nếu property được chỉ định rỗng.

## Câu hỏi ôn tập

1. Sự khác nhau giữa `any` và `unknown` là gì? Vì sao nên hạn chế dùng `any`?
2. Viết cú pháp parameter properties tương đương với việc khai báo property + gán trong constructor bằng tay.
3. Vì sao NestJS phải dùng `class` (không dùng `interface`) để khai báo dependency cần inject?
4. `Partial<T>` và `Required<T>` khác nhau như thế nào? Cho một tình huống thực tế nên dùng `Partial<T>`.
5. Hai flag `experimentalDecorators` và `emitDecoratorMetadata` trong `tsconfig.json` dùng để làm gì?

---
