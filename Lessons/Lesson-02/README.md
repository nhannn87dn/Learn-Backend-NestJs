# Cơ bản về TypeScript

## **Giới thiệu về TypeScript**

TypeScript là một ngôn ngữ lập trình mã nguồn mở, được phát triển và duy trì bởi Microsoft. Nó là một superset của JavaScript, nghĩa là bất kỳ mã JavaScript hợp lệ nào cũng là TypeScript hợp lệ. Tuy nhiên, TypeScript cung cấp các tính năng mạnh mẽ hơn như kiểu dữ liệu tĩnh, lập trình hướng đối tượng, giao diện (interface), generics và nhiều hơn nữa.

Mục đích chính của TypeScript là giúp phát triển các ứng dụng lớn và phức tạp hiệu quả hơn bằng cách cung cấp các công cụ để kiểm tra và phát hiện lỗi trong giai đoạn biên dịch, thay vì chỉ được phát hiện trong thời gian chạy như JavaScript truyền thống. Điều này giúp tăng năng suất và dễ dàng bảo trì mã nguồn hơn.

##  **Cài đặt và Cấu hình**

Để bắt đầu với TypeScript, bạn cần cài đặt Node.js và TypeScript Compiler (tsc). Bạn có thể cài đặt TypeScript toàn cầu trên máy hoặc cài đặt như một dependency trong dự án của bạn.

```bash
pnpm init
pnpm i typescript --save-dev
```

Sau khi cài đặt, bạn có thể khởi tạo một dự án TypeScript mới bằng cách tạo một thư mục và khởi tạo file `tsconfig.json`. Đây là file cấu hình cho TypeScript Compiler, nơi bạn có thể định cấu hình các tùy chọn biên dịch, đường dẫn nguồn, đường dẫn đầu ra và nhiều hơn nữa.

```bash
npx tsc --init
```

Một file `tsconfig.json` tại ra với thuộc tính mặc định được kích hoạt như sau:

```json
  target: es2016
  module: commonjs
  strict: true
  esModuleInterop: true
  skipLibCheck: true
  forceConsistentCasingInFileNames: true
```
Bạn edit file này và bổ sung thêm như sau

```json
{
  "include": ["src"],
  "compilerOptions": {
    "outDir": "./build"
  }
}
```

##  **Cấu trúc cơ bản**

Cấu trúc cơ bản của TypeScript tương tự như JavaScript, bao gồm biến, kiểu dữ liệu, toán tử, câu lệnh điều kiện, vòng lập và hàm.

```typescript
// Biến và kiểu dữ liệu
let x: number = 5;
let y: string = "Hello";
let z: boolean = true;
let arr: number[] = [1, 2, 3];
let obj: { name: string, age: number } = { name: "John", age: 30 };

// Toán tử và câu lệnh điều kiện
if (x > 3) {
    console.log("x is greater than 3");
} else {
    console.log("x is not greater than 3");
}

// Vòng lặp
for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
}

// Hàm
function add(a: number, b: number): number {
    return a + b;
}
```

Chi tiết xem tại: https://www.w3schools.com/typescript/typescript_simple_types.php

##  **Lập trình hướng đối tượng**

TypeScript hỗ trợ lập trình hướng đối tượng (OOP) thông qua khái niệm lớp (class) và đối tượng (object). Bạn có thể định nghĩa các lớp với thuộc tính và phương thức, kế thừa từ lớp khác, và áp dụng các nguyên tắc OOP như đa hình và trừu tượng.

```typescript
class Person {
    name: string;
    age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    greet() {
        console.log(`Hello, my name is ${this.name} and I'm ${this.age} years old.`);
    }
}

class Employee extends Person {
    job: string;

    constructor(name: string, age: number, job: string) {
        super(name, age);
        this.job = job;
    }

    work() {
        console.log(`I'm working as a ${this.job}.`);
    }
}

let person = new Person("John", 30);
person.greet(); // Hello, my name is John and I'm 30 years old.

let employee = new Employee("Jane", 25, "Engineer");
employee.greet(); // Hello, my name is Jane and I'm 25 years old.
employee.work(); // I'm working as a Engineer.
```

Xem thêm tại: https://www.w3schools.com/typescript/typescript_classes.php

##  **Interface**

Interfaces trong TypeScript được sử dụng để định nghĩa cấu trúc của một đối tượng. Chúng giúp đảm bảo rằng các đối tượng tuân thủ một cấu trúc nhất định và cung cấp hệ thống kiểu dữ liệu mạnh mẽ cho TypeScript.

```typescript
interface Person {
    name: string;
    age: number;
    greet(): void;
}

let person: Person = {
    name: "John",
    age: 30,
    greet() {
        console.log(`Hello, my name is ${this.name} and I'm ${this.age} years old.`);
    }
};

person.greet(); // Hello, my name is John and I'm 30 years old.
```

Xem thêm tại: https://www.w3schools.com/typescript/typescript_aliases_and_interfaces.php

##  **Decorators**

Decorators trong TypeScript là một tính năng mạnh mẽ cho phép thêm metadata hoặc hành vi đặc biệt vào lớp, phương thức, thuộc tính hoặc tham số. Chúng được sử dụng rộng rãi trong các framework như Angular và NestJS.

```typescript
function logClass(target: any) {
    console.log(`New instance of ${target.name} created.`);
}

function logMethod(target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function(...args: any[]) {
        console.log(`Calling method ${key} with arguments: ${args.join(", ")}`);
        const result = originalMethod.apply(this, args);
        console.log(`Method ${key} returned: ${result}`);
        return result;
    };
    return descriptor;
}

@logClass
class Person {
    name: string;
    age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    @logMethod
    greet() {
        console.log(`Hello, my name is ${this.name} and I'm ${this.age} years old.`);
    }
}

let person = new Person("John", 30);
person.greet();
```

##  **Generics**

Generics trong TypeScript cho phép tạo ra các component có thể hoạt động với nhiều loại dữ liệu khác nhau. Chúng giúp viết mã nguồn linh hoạt hơn và có thể tái sử dụng.

```typescript
function identity<T>(arg: T): T {
    return arg;
}

let result1 = identity<string>("Hello");
let result2 = identity<number>(42);

console.log(result1); // "Hello"
console.log(result2); // 42

interface KeyValuePair<T, U> {
    key: T;
    value: U;
}

let pair1: KeyValuePair<string, number> = { key: "foo", value: 42 };
let pair2: KeyValuePair<number, string> = { key: 42, value: "bar" };

console.log(pair1); // { key: 'foo', value: 42 }
console.log(pair2); // { key: 42, value: 'bar' }
```

Xem thêm tại: https://www.w3schools.com/typescript/typescript_basic_generics.php

##  **Modules và Namespaces**

TypeScript hỗ trợ khái niệm modules để tổ chức và quản lý mã nguồn. Bạn có thể chia mã nguồn thành nhiều file và import/export các phần tử cần thiết giữa các file.

```typescript
// person.ts
export class Person {
    name: string;
    age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }

    greet() {
        console.log(`Hello, my name is ${this.name} and I'm ${this.age} years old.`);
    }
}

// app.ts
import { Person } from "./person";

let person = new Person("John", 30);
person.greet(); // Hello, my name is John and I'm 30 years old.
```

Namespaces cũng được sử dụng để tổ chức mã nguồn, nhưng khác với modules, chúng không được biên dịch thành các module JavaScript riêng biệt mà được đóng gói vào một file JavaScript duy nhất.

Trong bài học này, bạn đã được giới thiệu về các khái niệm cơ bản của TypeScript, từ biến và kiểu dữ liệu đến lập trình hướng đối tượng, interface, decorators, generics, modules và namespaces. Điều này sẽ giúp bạn có nền tảng vững chắc để học và làm việc với NestJS, vì NestJS được xây dựng trên nền tảng TypeScript.