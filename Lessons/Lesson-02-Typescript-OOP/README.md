# Lesson 02: TypeScript và Lập trình OOP

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

## Phần 2. Phần 2: OOP trong TypeScript

> Đây là phần **quan trọng nhất** trong toàn bộ lộ trình, vì NestJS được xây dựng hoàn toàn trên tư duy hướng đối tượng (OOP) kết hợp Dependency Injection. Nếu học viên chưa vững OOP trong TS, học NestJS sẽ chỉ là "copy code mẫu" mà không hiểu bản chất.

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


---

### 2.2. Kế thừa & Đa hình (Inheritance & Polymorphism)

#### `extends` và `super()`

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

`super(ten)` gọi đến constructor của class cha (`DongVat`) để khởi tạo phần dữ liệu chung, trước khi class con tiếp tục khởi tạo phần riêng của mình.

#### Method Overriding (ghi đè phương thức)

Class con có thể **định nghĩa lại** một method đã có ở class cha để thay đổi hành vi:

```typescript
class Meo extends DongVat {
  keu(): string {
    // Ghi đè lại method keu() của DongVat
    return `${this.ten} kêu: Meo meo!`;
  }
}

const meo = new Meo("Mun");
console.log(meo.keu()); // "Mun kêu: Meo meo!" — dùng bản ghi đè, không dùng bản gốc
```

Đây chính là **tính đa hình (polymorphism)**: cùng một method `keu()`, nhưng mỗi class con có thể có hành vi khác nhau.

```typescript
const danhSachDongVat: DongVat[] = [new Cho("Lu", "Golden"), new Meo("Mun")];

danhSachDongVat.forEach((dv) => {
  console.log(dv.keu()); // mỗi phần tử tự "biết" cách kêu của riêng mình
});
```

#### Abstract Class & Abstract Method

Trừu tượng hóa là định nghĩa phần "cần làm gì", còn chi tiết "làm như thế nào" để class cụ thể xử lý.

`abstract class` là một class **không thể khởi tạo trực tiếp** (`new AbstractClass()` sẽ báo lỗi) — nó chỉ tồn tại để làm "khuôn mẫu" cho các class con kế thừa. `abstract method` là method **chỉ khai báo chữ ký, bắt buộc class con phải tự triển khai**.

```typescript
abstract class HinhHoc {
  abstract tinhDienTich(): number; // không có phần thân, chỉ khai báo

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

const hinh = new HinhHoc(); // Lỗi! không thể khởi tạo abstract class trực tiếp
const tron = new HinhTron(5);
console.log(tron.moTa()); // "Diện tích: 78.53..."
```

> **Ứng dụng thực tế**: Trong các dự án NestJS lớn, `abstract class` thường được dùng để định nghĩa **base Repository** hoặc **base Service** — ví dụ một `BaseRepository` khai báo sẵn các method chung (`findById`, `save`...) nhưng để phần triển khai chi tiết (kết nối database cụ thể) cho từng class con tự hiện thực.

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

#### Tư duy "thiết kế contract trước khi code"

Một thói quen tốt là **viết interface trước**, mô tả rõ "class này cần làm được gì", rồi mới viết class triển khai. Cách làm này giúp:
- Nhiều người có thể làm việc song song (một người định nghĩa interface, người khác triển khai)
- Dễ dàng thay thế một triển khai bằng triển khai khác miễn là tuân theo cùng interface

```typescript
interface KhoLuuTru {
  luu(key: string, value: string): void;
  doc(key: string): string | null;
}

// Triển khai 1: lưu trong bộ nhớ
class BoNhoTam implements KhoLuuTru {
  private data: Record<string, string> = {};
  luu(key: string, value: string): void { this.data[key] = value; }
  doc(key: string): string | null { return this.data[key] ?? null; }
}

// Triển khai 2: giả lập lưu file (thực tế sẽ đọc/ghi file thật)
class LuuFile implements KhoLuuTru {
  luu(key: string, value: string): void { console.log(`Ghi "${value}" vào file ${key}`); }
  doc(key: string): string | null { console.log(`Đọc file ${key}`); return null; }
}
```

> **Vì sao quan trọng?** Đây chính xác là tư duy đứng sau **Dependency Injection** trong NestJS: một service chỉ cần biết "tôi cần một thứ tuân theo interface `KhoLuuTru`", còn việc nó thực sự là `BoNhoTam` hay `LuuFile` sẽ được "tiêm vào" (inject) từ bên ngoài, giúp code dễ test và dễ thay đổi triển khai mà không sửa logic chính.

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

### 2.5. Static Members

Static property/method thuộc về **chính class**, không thuộc về từng instance (object) được tạo ra từ class đó. Gọi trực tiếp qua tên class, không cần `new`.

```typescript
class BoDemNguoiDung {
  static soLuong: number = 0;

  constructor(public ten: string) {
    BoDemNguoiDung.soLuong++; // mỗi lần tạo mới, tăng biến static dùng chung
  }

  static thongKe(): string {
    return `Đã có ${BoDemNguoiDung.soLuong} người dùng được tạo`;
  }
}

new BoDemNguoiDung("An");
new BoDemNguoiDung("Bình");
console.log(BoDemNguoiDung.thongKe()); // "Đã có 2 người dùng được tạo"
```

Static thường dùng cho:
- Biến đếm / trạng thái dùng chung cho toàn bộ class
- Hàm tiện ích (utility) không phụ thuộc vào dữ liệu riêng của từng object

```typescript
class ToanHoc {
  static PI: number = 3.14159;

  static tinhChuVi(banKinh: number): number {
    return 2 * ToanHoc.PI * banKinh;
  }
}

console.log(ToanHoc.tinhChuVi(5)); // dùng trực tiếp qua tên class, không cần new
```


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

> **Ứng dụng trực tiếp**: Trong NestJS (đặc biệt khi dùng TypeORM/Prisma), bạn sẽ thấy các kiểu như `Repository<User>`, `Promise<User[]>`, `Model<Product>` xuất hiện khắp nơi. Đây chính xác là tư duy `RepositoryDonGian<T>` ở trên — một class Repository **dùng chung logic** (save, find, delete...) nhưng áp dụng được cho **bất kỳ entity nào** (`User`, `Product`, `Order`...) nhờ Generics. Việc tự tay viết một `RepositoryDonGian<T>` như trên trước khi học NestJS sẽ giúp bạn không còn thấy `Repository<User>` là điều gì đó xa lạ.


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

### 5.2. Namespace vs Module

`namespace` là cách **cũ** để tổ chức code TypeScript trước khi ES Module trở thành chuẩn phổ biến — dùng để nhóm code lại dưới một tên chung, tránh xung đột tên biến toàn cục.

```typescript
namespace ValidationUtils {
  export function laSoDuong(n: number): boolean {
    return n > 0;
  }
}

console.log(ValidationUtils.laSoDuong(5)); // true
```

**So sánh nhanh**:

| | Namespace | Module (import/export) |
|---|---|---|
| Cách chia file | Không bắt buộc, có thể gộp nhiều namespace trong 1 file | Mỗi file là 1 module riêng biệt |
| Mức độ phổ biến hiện nay | Rất hiếm dùng | Chuẩn phổ biến, được toàn bộ hệ sinh thái JS/TS hiện đại dùng |
| Công cụ bundler hỗ trợ | Hạn chế | Hỗ trợ đầy đủ (Webpack, Vite, esbuild...) |

> **Lưu ý cho học viên**: NestJS (và hầu như toàn bộ dự án Node.js hiện đại) **không dùng `namespace`**. Phần này chỉ cần biết để không bỡ ngỡ nếu gặp trong code cũ hoặc một số thư viện định nghĩa kiểu (`.d.ts`) lâu đời — không cần luyện tập viết `namespace` trong thực hành.

---

## Phần 6: Advanced Types

> Phần này tập trung vào các kiểu dữ liệu nâng cao giúp bạn *tái sử dụng và biến đổi type* thay vì viết lại từ đầu — đây chính là nền tảng để hiểu cách NestJS xử lý DTO (Data Transfer Object) sau này.



### 6.1. Utility Types

Utility Type là các "type có sẵn" trong TypeScript, dùng để **biến đổi một type đã có thành một type mới** mà không cần viết lại toàn bộ.

Giả sử ta có interface gốc sau, dùng xuyên suốt các ví dụ bên dưới:

```typescript
interface NguoiDung {
  id: number;
  ten: string;
  email: string;
  tuoi: number;
}
```

#### `Partial<T>` — biến tất cả property thành optional

```typescript
type CapNhatNguoiDung = Partial<NguoiDung>;
// Tương đương:
// { id?: number; ten?: string; email?: string; tuoi?: number }

function capNhat(id: number, duLieu: CapNhatNguoiDung) {
  // cho phép chỉ truyền một vài field muốn cập nhật
}

capNhat(1, { ten: "Tên mới" }); // OK, không cần truyền đủ cả 4 field
```

**Tình huống thực tế**: khi viết API cập nhật (update), người dùng thường chỉ muốn sửa 1-2 trường thay vì gửi lại toàn bộ object. `Partial<T>` giải quyết đúng bài toán này.

#### `Required<T>` — ngược lại với Partial, bắt buộc tất cả property

```typescript
interface TuyChon {
  mau?: string;
  kichThuoc?: string;
}

type TuyChonBatBuoc = Required<TuyChon>;
// { mau: string; kichThuoc: string } — không còn dấu ? nữa
```

#### `Readonly<T>` — biến tất cả property thành chỉ đọc

```typescript
type NguoiDungChiDoc = Readonly<NguoiDung>;

const u: NguoiDungChiDoc = { id: 1, ten: "An", email: "a@gmail.com", tuoi: 25 };
u.ten = "Bình"; // Lỗi! không được sửa vì đã readonly
```

#### `Pick<T, Keys>` — chọn ra một vài property

```typescript
type ThongTinCongKhai = Pick<NguoiDung, "ten" | "email">;
// { ten: string; email: string } — chỉ giữ lại 2 field được chọn

const thongTin: ThongTinCongKhai = { ten: "An", email: "a@gmail.com" };
```

**Tình huống thực tế**: khi trả dữ liệu người dùng ra ngoài API, ta thường không muốn lộ hết mọi field (ví dụ mật khẩu). `Pick` giúp định nghĩa nhanh kiểu dữ liệu "public" từ kiểu dữ liệu gốc đầy đủ.

#### `Omit<T, Keys>` — loại bỏ một vài property (ngược lại với Pick)

```typescript
type NguoiDungKhongCoId = Omit<NguoiDung, "id">;
// { ten: string; email: string; tuoi: number }

function taoMoi(duLieu: NguoiDungKhongCoId) {
  // id sẽ do hệ thống tự sinh, không cần client truyền lên
}
```

**So sánh nhanh Pick vs Omit**:

| | Cách hoạt động | Ví dụ |
|---|---|---|
| `Pick<T, K>` | Giữ lại các key trong `K` | `Pick<NguoiDung, "ten">` → chỉ có `ten` |
| `Omit<T, K>` | Loại bỏ các key trong `K`, giữ phần còn lại | `Omit<NguoiDung, "id">` → có tất cả trừ `id` |

#### `Record<Keys, Type>` — tạo object type với key và value có kiểu xác định

```typescript
type BangGia = Record<string, number>;

const gia: BangGia = {
  banPhim: 500000,
  chuot: 200000,
};

// Kết hợp với literal type để giới hạn cả tên key:
type MauSac = "do" | "xanh" | "vang";
type MaHex = Record<MauSac, string>;

const bangMau: MaHex = {
  do: "#FF0000",
  xanh: "#0000FF",
  vang: "#FFFF00",
  // thieu bat ky mau nao cung se bao loi, vi Record bat buoc du key
};
```

#### Ví dụ tổng hợp: kết hợp nhiều Utility Type

```typescript
interface SanPham {
  id: number;
  ten: string;
  gia: number;
  moTa: string;
  tonKho: number;
}

// DTO tạo mới: không cần id (server tự sinh)
type TaoSanPhamDto = Omit<SanPham, "id">;

// DTO cập nhật: dựa trên DTO tạo mới, nhưng mọi field đều optional
type CapNhatSanPhamDto = Partial<TaoSanPhamDto>;

// DTO hiển thị danh sách rút gọn: chỉ cần vài field
type SanPhamRutGon = Pick<SanPham, "id" | "ten" | "gia">;
```

> **Ứng dụng trực tiếp trong NestJS**: gói `@nestjs/mapped-types` cung cấp các hàm `PartialType()`, `PickType()`, `OmitType()`, `IntersectionType()` — về bản chất chính là áp dụng các Utility Type ở trên (`Partial`, `Pick`, `Omit`...) nhưng có tích hợp thêm validation decorator. Ví dụ điển hình: `UpdateUserDto` thường được viết bằng cách kế thừa `CreateUserDto` và bọc trong `PartialType()` — chính là tư duy `Partial<TaoSanPhamDto>` ở trên, chỉ khác là NestJS "wrap" nó lại thành một class thực thụ thay vì chỉ là type.

---

### 6.2. Mapped Types & Conditional Types

#### Mapped Types — tự viết Utility Type của riêng bạn

Thực chất `Partial<T>`, `Readonly<T>`... ở trên **không phải phép màu** — chúng được TypeScript định nghĩa sẵn bằng cú pháp gọi là **Mapped Type**. Ta hoàn toàn có thể tự viết một cái tương tự:

```typescript
// Đây là cách TypeScript định nghĩa Partial<T> (rút gọn)
type PartialCuaToi<T> = {
  [Key in keyof T]?: T[Key];
};

// keyof T: lấy ra tất cả tên property của T dưới dạng union
// [Key in ...]: lặp qua từng key đó để tạo property mới
// ?: thêm dấu optional cho mỗi property

interface SanPham {
  ten: string;
  gia: number;
}

type SanPhamOptional = PartialCuaToi<SanPham>;
// { ten?: string; gia?: number }
```

Một ví dụ khác — tự viết `Readonly<T>`:

```typescript
type ReadonlyCuaToi<T> = {
  readonly [Key in keyof T]: T[Key];
};
```

Hoặc biến tất cả property thành kiểu `string` (dùng để hiển thị dạng form nhập liệu chẳng hạn):

```typescript
type DangChuoi<T> = {
  [Key in keyof T]: string;
};

type SanPhamDangForm = DangChuoi<SanPham>;
// { ten: string; gia: string } — gia dù gốc là number cũng thành string
```

#### Conditional Types — "if/else" ở mức kiểu dữ liệu

Conditional Type cho phép định nghĩa một kiểu **phụ thuộc vào điều kiện**, dùng cú pháp giống toán tử ba ngôi:

```
KieuA extends KieuB ? KetQuaNeuDung : KetQuaNeuSai
```

```typescript
type LaChuoi<T> = T extends string ? "co" : "khong";

type A = LaChuoi<string>; // "co"
type B = LaChuoi<number>; // "khong"
```

Ví dụ thực tế hơn — tạo type loại bỏ `null`/`undefined`:

```typescript
type LoaiBoRong<T> = T extends null | undefined ? never : T;

type KetQua = LoaiBoRong<string | null | undefined>;
// KetQua = string (đã loại bỏ null và undefined)
```

Kết hợp Mapped Type + Conditional Type — chỉ lấy ra các property có kiểu là `string`:

```typescript
type ChiLayKieuChuoi<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface HoSo {
  ten: string;
  tuoi: number;
  email: string;
}

type ChiCacFieldChuoi = ChiLayKieuChuoi<HoSo>;
// { ten: string; email: string } — tuoi bị loại vì là number
```

> **Mức độ cần thiết**: Ở giai đoạn học để dùng NestJS, bạn **không cần tự viết** Mapped Type hay Conditional Type phức tạp. Mục tiêu của phần này là để khi mở file `.d.ts` của một thư viện (ví dụ đọc source code `@nestjs/mapped-types` hoặc các thư viện ORM) và thấy cú pháp `[K in keyof T]` hay `extends ... ? ... : ...`, bạn **không hoảng** — mà hiểu được đây là TS đang "biến đổi type", tương tự cách ta viết logic biến đổi dữ liệu bình thường.

---

### 6.3. Type Inference với `infer`

`infer` là từ khóa dùng **bên trong** Conditional Type, cho phép TS **"đoán" và lấy ra** một kiểu con nằm bên trong một kiểu phức tạp hơn.

#### Ví dụ dễ hiểu nhất: lấy kiểu trả về của hàm

TypeScript có sẵn Utility Type tên `ReturnType<T>`, được định nghĩa (rút gọn) như sau:

```typescript
type ReturnTypeCuaToi<T> = T extends (...args: any[]) => infer R ? R : never;

function laySanPham() {
  return { ten: "Bàn phím", gia: 500000 };
}

type KetQuaLaySanPham = ReturnTypeCuaToi<typeof laySanPham>;
// { ten: string; gia: number }
```

Giải thích: `infer R` nói với TS rằng "hãy tự suy ra kiểu trả về của hàm này và gán tạm vào biến kiểu tên `R`", sau đó `R` được dùng làm kết quả trả về của cả conditional type.

#### Ví dụ khác: lấy kiểu phần tử bên trong mảng

```typescript
type PhanTuCuaMang<T> = T extends (infer Item)[] ? Item : never;

type A = PhanTuCuaMang<string[]>; // string
type B = PhanTuCuaMang<number[]>; // number
```

#### Ví dụ khác: lấy kiểu dữ liệu "bên trong" một Promise

```typescript
type LayKieuTrongPromise<T> = T extends Promise<infer U> ? U : T;

async function layDuLieu(): Promise<{ id: number; ten: string }> {
  return { id: 1, ten: "An" };
}

type KetQua = LayKieuTrongPromise<ReturnType<typeof layDuLieu>>;
// { id: number; ten: string } — đã "bóc" ra khỏi Promise<...>
```

> **Vì sao cần biết `infer` dù chỉ ở mức giới thiệu?** Khi làm việc với các hàm bất đồng bộ (rất phổ biến trong NestJS — service, repository đều trả về `Promise<T>`), đôi khi bạn cần một kiểu mô tả "dữ liệu thật sự bên trong Promise" để dùng ở nơi khác (ví dụ viết một Generic Response wrapper). `infer` chính là công cụ đứng sau các Utility Type như `ReturnType`, `Parameters`, `Awaited` mà bạn sẽ dùng (chứ không cần tự viết) trong quá trình code thực tế.

---


## Phần 7: Async & Error handling

> Phần này không phải kiến thức "riêng của NestJS", nhưng là nền tảng bắt buộc để hiểu **Exception Filter** — cơ chế xử lý lỗi tập trung của NestJS — cũng như để viết mọi service/controller vốn hầu như luôn là hàm bất đồng bộ (`async`).

---

### 7.1. Promise, async/await với kiểu dữ liệu

#### `Promise<T>` là gì?

`Promise` đại diện cho **một giá trị sẽ có trong tương lai** (kết quả của một tác vụ bất đồng bộ như gọi API, đọc file, truy vấn database). Tham số generic `T` mô tả **kiểu dữ liệu sẽ nhận được khi Promise hoàn thành thành công**.

```typescript
function doiMotGiay(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Đã đợi xong 1 giây");
    }, 1000);
  });
}
```

`Promise<string>` nghĩa là: "đây là một Promise, và khi nó hoàn thành (resolve), giá trị trả về sẽ có kiểu `string`".

#### `async` / `await`

`async`/`await` là cú pháp giúp viết code bất đồng bộ **trông giống code đồng bộ**, dễ đọc hơn nhiều so với `.then()/.catch()`.

```typescript
async function layThongBao(): Promise<string> {
  const ketQua = await doiMotGiay(); // "tạm dừng" tại đây cho tới khi Promise hoàn thành
  return ketQua.toUpperCase();
}

layThongBao().then((tb) => console.log(tb)); // "ĐÃ ĐỢI XONG 1 GIÂY"
```

Quy tắc quan trọng: **một hàm được khai báo `async` luôn trả về `Promise<T>`**, dù bên trong bạn `return` một giá trị "thường" (không phải Promise), TS vẫn tự động bọc nó thành `Promise<T>`.

```typescript
async function laySo(): Promise<number> {
  return 42; // TS tự hiểu: hàm này trả về Promise<number>, không phải number
}

const ketQua = laySo(); // kiểu là Promise<number>, KHÔNG phải number
ketQua.toFixed(2); // Lỗi! Promise không có method toFixed — phải await trước
```

#### Kiểu dữ liệu khi làm việc với nhiều Promise

```typescript
interface SanPham {
  id: number;
  ten: string;
}

async function laySanPham(id: number): Promise<SanPham> {
  return { id, ten: `Sản phẩm ${id}` };
}

async function layNhieuSanPham(): Promise<SanPham[]> {
  // Promise.all chạy song song, kiểu trả về tự động là mảng đúng kiểu
  const ketQua = await Promise.all([laySanPham(1), laySanPham(2), laySanPham(3)]);
  return ketQua; // SanPham[]
}
```

---

### 7.2. Custom Error Class

#### Vì sao không nên chỉ `throw` chuỗi hoặc `Error` chung chung?

```typescript
// Cách không tốt — mất hết ngữ cảnh về loại lỗi
throw new Error("Không tìm thấy người dùng");
```

Khi code lớn dần, bạn cần **phân biệt được loại lỗi** để xử lý khác nhau (ví dụ: lỗi "không tìm thấy" trả về HTTP 404, lỗi "không có quyền" trả về HTTP 403). Giải pháp là **tự định nghĩa class lỗi riêng**, kế thừa từ `Error` gốc.

#### Tự viết Custom Error Class

```typescript
class KhongTimThayError extends Error {
  constructor(message: string) {
    super(message); // gọi constructor của Error gốc để gán message
    this.name = "KhongTimThayError"; // đặt tên riêng để dễ phân biệt khi log/debug
    Object.setPrototypeOf(this, KhongTimThayError.prototype); // đảm bảo instanceof hoạt động đúng khi biên dịch xuống ES5
  }
}

class KhongCoQuyenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KhongCoQuyenError";
    Object.setPrototypeOf(this, KhongCoQuyenError.prototype);
  }
}
```

#### Sử dụng và bắt lỗi theo từng loại (dùng `instanceof` — đã học ở Phần 1.4)

```typescript
function timNguoiDung(id: number): { id: number; ten: string } {
  if (id !== 1) {
    throw new KhongTimThayError(`Không tìm thấy người dùng với id = ${id}`);
  }
  return { id: 1, ten: "An" };
}

try {
  timNguoiDung(99);
} catch (error) {
  if (error instanceof KhongTimThayError) {
    console.log(`Lỗi 404: ${error.message}`);
  } else if (error instanceof KhongCoQuyenError) {
    console.log(`Lỗi 403: ${error.message}`);
  } else {
    console.log("Lỗi không xác định:", error);
  }
}
```

#### Custom Error kèm thêm dữ liệu (property riêng)

Bạn có thể mở rộng Custom Error để mang theo thêm thông tin hữu ích, ví dụ mã lỗi HTTP tương ứng:

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public readonly maLoiHttp: number, // Parameter Property — đã học ở Phần 2.4
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

class KhongTimThayError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

class KhongCoQuyenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

function xuLyLoi(error: unknown): void {
  if (error instanceof AppError) {
    console.log(`[HTTP ${error.maLoiHttp}] ${error.message}`);
  } else {
    console.log("Lỗi hệ thống không xác định");
  }
}

xuLyLoi(new KhongTimThayError("Không tìm thấy sản phẩm"));
// "[HTTP 404] Không tìm thấy sản phẩm"
```

#### Xử lý lỗi trong hàm `async`

```typescript
async function layDuLieuAnToan(id: number): Promise<string> {
  try {
    const nguoiDung = timNguoiDung(id);
    return nguoiDung.ten;
  } catch (error) {
    if (error instanceof KhongTimThayError) {
      return "Người dùng ẩn danh"; // xử lý fallback thay vì để crash cả ứng dụng
    }
    throw error; // lỗi không lường trước — ném tiếp cho tầng cao hơn xử lý
  }
}
```

> **Ứng dụng trực tiếp trong NestJS**: cơ chế **Exception Filter** của NestJS hoạt động dựa trên đúng tư duy `instanceof` + Custom Error Class ở trên. Các lớp lỗi có sẵn như `NotFoundException`, `ForbiddenException`, `BadRequestException`... về bản chất đều là các Custom Error Class kế thừa từ một lớp lỗi gốc (tương tự `AppError` ở ví dụ trên), mỗi lớp mang theo sẵn mã HTTP tương ứng. Khi bạn `throw new NotFoundException('Không tìm thấy sản phẩm')` trong một service, NestJS ở tầng framework sẽ bắt lỗi đó bằng `instanceof`, đọc mã HTTP đi kèm, và tự động trả về đúng response — hoàn toàn giống cách hàm `xuLyLoi()` ở ví dụ trên phân loại và xử lý lỗi.
