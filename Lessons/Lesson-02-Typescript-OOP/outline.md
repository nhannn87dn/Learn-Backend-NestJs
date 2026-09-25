# Lesson 02: TypeScript cho NestJS

* Cài đặt và cấu hình TypeScript
  * TypeScript là gì? Vì sao NestJS dùng TypeScript?
  * Cài đặt `typescript`, chạy code với `tsc` và `tsx`
  * `tsconfig.json` và chế độ `strict`
* Kiểu dữ liệu cơ bản
  * `string`, `number`, `boolean`, `null`, `undefined`
  * Array và Tuple
  * `any` vs `unknown` vs `never`
  * Type inference (suy luận kiểu)
* Kết hợp kiểu dữ liệu
  * Union và Literal types
  * Type narrowing (`typeof`, `in`, `instanceof`)
  * Type alias vs Interface
  * Optional (`?`) và `readonly`
* Function trong TypeScript
  * Kiểu cho tham số và giá trị trả về
  * Tham số optional và default
  * Async function và `Promise<T>`
* Enum
  * Enum vs Union literal
* Generics
  * Generics là gì? (`Array<T>`, `Promise<T>`)
  * Viết function và interface generic
* Utility Types
  * `Partial`, `Required`, `Pick`, `Omit`, `Record`
* Module: `import` / `export`
* Class trong TypeScript (đủ dùng cho NestJS)
  * Class, Constructor, Properties, Methods
  * Access Modifier: `public`, `private`, `protected`, `readonly`
  * Parameter properties: `constructor(private readonly service: Service)`
  * `implements` interface
  * `extends` và `super` (kế thừa cơ bản)
  * `abstract` và `static` (giới thiệu)
  * Definite assignment (`!`) với `strictPropertyInitialization`
  * Vì sao NestJS dùng class: interface bị xóa khi compile, class tồn tại lúc runtime
* Decorators
  * Decorator là gì?
  * Class, Method, Property, Parameter decorator
  * Tự viết một decorator đơn giản
  * `experimentalDecorators`, `emitDecoratorMetadata` và `reflect-metadata`
  * Decorator trong NestJS: `@Controller`, `@Injectable`, `@Get`, `@IsString`
