# Bonus 06: GraphQL với NestJS

> Tiên quyết: Lesson 06 (TypeORM, Repository, DTO + class-validator), Lesson 07 (relations, N+1)

## Mục tiêu bài học

Sau bài này, học viên:

- **Giải thích được** GraphQL là gì, và **so sánh được** REST với GraphQL một cách khách quan (over-fetching, under-fetching, caching, độ phức tạp).
- **Giải thích được** các khái niệm Schema, Type, Query, Mutation và đọc/viết được một query GraphQL cơ bản.
- **Phân biệt được** hai cách tiếp cận code-first và schema-first trong NestJS.
- **Cấu hình được** `@nestjs/graphql` với Apollo driver, tự sinh file schema.
- **Viết được** resolver với `@ObjectType`, `@Field`, `@InputType`, `@Args`, `@ResolveField` kết hợp TypeORM repository cho `Book` và `Author`.
- **Phát hiện và khắc phục được** vấn đề N+1 query trong GraphQL bằng DataLoader.

## Ôn tập nhanh

Ở Lesson 06, ta đã tạo entity `Book` với TypeORM, dùng Repository pattern (`@InjectRepository(Book)`) và validate input bằng DTO + class-validator qua `ValidationPipe` global. Ở Lesson 07, ta thêm quan hệ **One-to-Many** (`@OneToMany` / `@ManyToOne`), load quan hệ bằng `relations` hoặc Query Builder, và đã gặp **N+1 problem**: lấy danh sách N bản ghi cha bằng 1 query, rồi mỗi bản ghi lại chạy thêm 1 query để lấy dữ liệu liên quan. Lesson 07 cũng đã nhắc qua DataLoader như một giải pháp "nâng cao" — bài này sẽ dùng nó thật sự, vì trong GraphQL, N+1 xuất hiện gần như **mặc định**.

---

## 1. GraphQL là gì? So sánh REST và GraphQL

### 1.1 GraphQL là gì?

**GraphQL** là một **query language cho API** (do Facebook tạo ra, nay thuộc GraphQL Foundation). Thay vì server định nghĩa sẵn nhiều endpoint, mỗi endpoint trả về một hình dạng dữ liệu cố định, GraphQL cho phép **client mô tả chính xác dữ liệu mình cần**, và server trả về đúng hình dạng đó.

Toàn bộ API thường chỉ có **một endpoint** (`POST /graphql`). Client gửi một chuỗi query:

```graphql
# Client chỉ cần tên sách và tên tác giả
query {
  books {
    title
    author {
      name
    }
  }
}
```

Server trả về JSON có **cùng hình dạng** với query:

```json
{
  "data": {
    "books": [
      { "title": "Clean Code", "author": { "name": "Robert C. Martin" } },
      { "title": "Refactoring", "author": { "name": "Martin Fowler" } }
    ]
  }
}
```

### 1.2 Vấn đề của REST mà GraphQL giải quyết

Với REST (Lesson 04), ta có `GET /books` và `GET /authors/:id`. Hai vấn đề thường gặp:

- **Over-fetching** (lấy thừa): màn hình danh sách chỉ cần `title`, nhưng `GET /books` trả về cả `description`, `price`, `createdAt`... tốn băng thông, đặc biệt trên mobile.
- **Under-fetching** (lấy thiếu): cần thêm tên tác giả nhưng `GET /books` chỉ có `authorId` → client phải gọi thêm `GET /authors/:id` cho từng sách (N+1 ở phía client), hoặc backend phải tạo thêm endpoint `GET /books-with-authors`.

```text
REST                                   GraphQL
Client                Server           Client                     Server
  |-- GET /books ------->|               |-- POST /graphql -------->|
  |<-- 20 books ---------|               |   { books { title        |
  |-- GET /authors/1 --->|               |       author { name } } }|
  |-- GET /authors/2 --->|               |<-- đúng dữ liệu cần -----|
  |-- ...  (N lần) ----->|               |   (1 round-trip)         |
```

### 1.3 So sánh REST và GraphQL — GraphQL không phải lúc nào cũng tốt hơn

| Tiêu chí | REST | GraphQL |
|---|---|---|
| Endpoint | Nhiều endpoint theo resource | Thường 1 endpoint `/graphql` |
| Hình dạng response | Server quyết định | Client quyết định |
| Over/under-fetching | Hay gặp | Hạn chế được |
| HTTP caching | Dễ: `GET` + CDN + `Cache-Control`, `CacheInterceptor` (Lesson 13) | Khó: query gửi bằng `POST` cùng một URL; cần cache ở client (Apollo Client) hoặc persisted queries |
| Status code | Có ý nghĩa (404, 401, 422...) | Thường trả `200` kèm mảng `errors`; monitoring khó hơn |
| Upload file | Đơn giản (multipart, Lesson 14) | Không có sẵn trong spec, thường vẫn dùng REST |
| Kiểu dữ liệu / tài liệu | Cần thêm OpenAPI/Swagger (Bonus 02) | Schema có sẵn type, tự làm tài liệu |
| Bảo mật / hiệu năng | Mỗi endpoint dễ đoán chi phí | Client có thể gửi query lồng rất sâu → cần giới hạn depth/complexity |
| Độ phức tạp backend | Thấp | Cao hơn (resolver, DataLoader, schema) |

**Khi nào nên dùng GraphQL?** Khi có nhiều loại client (web, mobile, đối tác) cần các "lát cắt" dữ liệu khác nhau, dữ liệu có nhiều quan hệ lồng nhau, và frontend thay đổi màn hình thường xuyên. **Khi nào REST vẫn tốt hơn?** API CRUD đơn giản, API public cần cache CDN, upload/download file, webhook, hoặc team nhỏ chưa cần sự linh hoạt đó. Rất nhiều hệ thống thực tế dùng **cả hai**: REST cho auth, upload, webhook; GraphQL cho màn hình đọc dữ liệu phức tạp.

---

## 2. Schema, Query, Mutation

### 2.1 Schema — "hợp đồng" giữa client và server

**Schema** mô tả toàn bộ những gì API cung cấp: có những **type** nào, mỗi type có **field** gì, kiểu gì, và client được phép gọi những thao tác nào. Schema viết bằng **SDL (Schema Definition Language)**:

```graphql
# schema.gql
type Author {
  id: Int!
  name: String!
  books: [Book!]!
}

type Book {
  id: Int!
  title: String!
  price: Float!
  description: String      # không có ! → có thể null
  author: Author!
}

type Query {
  books(page: Int = 1, limit: Int = 10): [Book!]!
  book(id: Int!): Book!
}

type Mutation {
  createBook(input: CreateBookInput!): Book!
}

input CreateBookInput {
  title: String!
  price: Float!
  authorId: Int!
}
```

Các điểm cần nắm:

- **Scalar type** có sẵn: `Int`, `Float`, `String`, `Boolean`, `ID`.
- Dấu `!` nghĩa là **non-null** (bắt buộc có giá trị). `[Book!]!` là "mảng không null, mỗi phần tử không null".
- `type` dùng cho dữ liệu **trả về**, `input` dùng cho dữ liệu **đầu vào** (không trộn lẫn được).
- `Query` và `Mutation` là hai **root type** đặc biệt — điểm vào của mọi thao tác.

### 2.2 Query — đọc dữ liệu

**Query** tương đương `GET` trong REST: chỉ đọc, không thay đổi dữ liệu. Có thể truyền argument và dùng **variables** để tránh nối chuỗi:

```graphql
query GetBook($id: Int!) {
  book(id: $id) {
    title
    price
    author { name }
  }
}
# variables: { "id": 1 }
```

### 2.3 Mutation — ghi dữ liệu

**Mutation** tương đương `POST/PATCH/DELETE`: tạo, sửa, xóa. Điểm hay là mutation cũng trả về dữ liệu, và client chọn field muốn nhận lại:

```graphql
mutation CreateBook($input: CreateBookInput!) {
  createBook(input: $input) {
    id
    title
  }
}
# variables: { "input": { "title": "DDD", "price": 30, "authorId": 2 } }
```

> GraphQL còn có **Subscription** (realtime, thường chạy trên WebSocket — xem Bonus 05), nhưng không nằm trong phạm vi bài này.

---

## 3. Code-first vs Schema-first

NestJS hỗ trợ hai cách để có schema:

**Schema-first:** viết file `.graphql` (SDL) trước, rồi viết resolver khớp với schema. NestJS đọc file qua option `typePaths: ['./**/*.graphql']` và có thể sinh TypeScript interface từ SDL (`GraphQLDefinitionsFactory`). Phù hợp khi team frontend/backend thống nhất schema trước, hoặc schema được dùng chung giữa nhiều ngôn ngữ.

**Code-first:** viết **class TypeScript với decorator** (`@ObjectType`, `@Field`...), NestJS đọc metadata và **tự sinh file schema** (`autoSchemaFile`). Chỉ có một "nguồn sự thật" là code, không phải giữ hai thứ đồng bộ, tận dụng được class-validator trên input.

```text
Schema-first:   schema.graphql ──(sinh typings)──► TS interfaces ──► Resolver
Code-first:     TS class + decorators ──(NestJS)──► schema.gql (tự sinh) + Resolver
```

| | Schema-first | Code-first |
|---|---|---|
| Nguồn sự thật | File `.graphql` | Class TypeScript |
| Đồng bộ type | Phải chạy lệnh sinh typings | Tự động |
| Validate input | Tự viết thêm | Dùng lại class-validator |
| Hợp với | Team thiết kế API trước, đa ngôn ngữ | Team TypeScript thuần, quen DTO |

Khóa học đã quen với DTO + decorator (Lesson 06), nên **toàn bộ bài này dùng code-first**.

---

## 4. Cài đặt `@nestjs/graphql` với Apollo

### 4.1 Cài package

```bash
npm install @nestjs/graphql @nestjs/apollo @apollo/server @as-integrations/express5 graphql
```

- `@nestjs/graphql`: decorator và module GraphQL của NestJS.
- `@nestjs/apollo`: driver dùng **Apollo Server** làm GraphQL server bên dưới.
- `@apollo/server`, `graphql`: thư viện lõi.
- `@as-integrations/express5`: cầu nối giữa Apollo Server và Express 5 (NestJS 11 chạy trên Express 5; Apollo Server bản mới không còn tích hợp sẵn Express nên phải cài riêng).

### 4.2 Đăng ký `GraphQLModule`

```typescript
// src/app.module.ts
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksModule } from './modules/books/books.module';
import { AuthorsModule } from './modules/authors/authors.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // cấu hình PostgreSQL như Lesson 06 (đọc từ ConfigService)
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Code-first: NestJS tự sinh schema từ decorator và ghi ra file này
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true, // sắp xếp type theo alphabet, diff git dễ đọc
      // Tắt GraphQL Playground cũ, dùng Apollo Sandbox tại http://localhost:3000/graphql
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
    BooksModule,
    AuthorsModule,
  ],
})
export class AppModule {}
```

Chạy `npm run start:dev`, mở `http://localhost:3000/graphql` trên trình duyệt để có giao diện viết query, có autocomplete dựa theo schema. Ở production, nên tắt landing page và introspection nếu API không public.

`ValidationPipe` global đã đăng ký ở `main.ts` (Lesson 06) **vẫn áp dụng cho resolver**, vì GraphQL chạy chung HTTP app.

---

## 5. Resolver, `@ObjectType`, `@Field`, `@InputType`

### 5.1 Luồng xử lý một GraphQL request

**Resolver** trong GraphQL tương đương **Controller** trong REST: nó là nơi nhận query/mutation và gọi service. Khác biệt lớn: GraphQL resolve **từng field**. Nếu một field là object (như `author`), GraphQL gọi thêm một **field resolver** cho field đó.

```text
POST /graphql { books { title author { name } } }
      │
      ▼
GraphQLModule (Apollo) ── parse + validate query theo schema
      │
      ▼
BooksResolver.books()          ──► BooksService ──► Repository<Book> ──► PostgreSQL
      │  trả về Book[] (entity)
      ▼
Với MỖI book: BooksResolver.author(@Parent() book) ──► AuthorsService ──► Repository<Author>
      │
      ▼
Apollo chỉ giữ lại các field client yêu cầu (title, author.name) → JSON response
```

### 5.2 Entity (TypeORM) — giữ nguyên như Lesson 07

```typescript
// src/modules/authors/entities/author.entity.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Book } from '../../books/entities/book.entity';

@Entity('authors')
export class Author {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @OneToMany(() => Book, (book) => book.author)
  books!: Book[];
}
```

```typescript
// src/modules/books/entities/book.entity.ts
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Author } from '../../authors/entities/author.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  price!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column()
  authorId!: number; // lưu FK riêng để field resolver dùng mà không cần JOIN

  @ManyToOne(() => Author, (author) => author.books, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: Author;
}
```

### 5.3 `@ObjectType` và `@Field` — type trả về

Trong code-first, có thể đặt decorator GraphQL thẳng lên entity để bớt code. Nhưng theo quy ước của khóa học (DTO tách khỏi entity), ta tạo **model** riêng cho GraphQL. Lợi ích: schema công khai không bị dính chặt vào cấu trúc bảng; field nhạy cảm của entity (ví dụ `password` của `User`) không bao giờ lọt ra ngoài vì GraphQL **chỉ trả về field được khai báo `@Field`**.

```typescript
// src/modules/authors/models/author.model.ts
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Author') // tên type trong schema là "Author"
export class AuthorModel {
  @Field(() => Int) // number mặc định là Float → phải ghi rõ Int
  id!: number;

  @Field()
  name!: string; // string → String! (tự suy ra từ TypeScript)
}
```

```typescript
// src/modules/books/models/book.model.ts
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { AuthorModel } from '../../authors/models/author.model';

@ObjectType('Book', { description: 'Một cuốn sách trong hệ thống' })
export class BookModel {
  @Field(() => Int)
  id!: number;

  @Field()
  title!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => String, { nullable: true }) // union type → phải khai báo type rõ ràng
  description!: string | null;

  // Không khai báo authorId → client không thấy FK kỹ thuật này
  @Field(() => AuthorModel) // sẽ được resolve bằng @ResolveField
  author!: AuthorModel;
}
```

Vì sao lại là `() => Int` (hàm) chứ không phải `Int`? Vì TypeScript xóa type khi compile (Lesson 02), `emitDecoratorMetadata` chỉ biết "đây là Number", không phân biệt được `Int`/`Float`, không biết phần tử của mảng, và hàm giúp tránh lỗi import vòng (circular) giữa `Book` và `Author`.

### 5.4 `@InputType` — input có validate

`@InputType` là "DTO của GraphQL". Kết hợp decorator class-validator y hệt Lesson 06:

```typescript
// src/modules/books/dto/create-book.input.ts
import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateBookInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @Field(() => Float)
  @IsPositive()
  price!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  authorId!: number;
}
```

```typescript
// src/modules/books/dto/update-book.input.ts
import { InputType, PartialType } from '@nestjs/graphql'; // PartialType của @nestjs/graphql, KHÔNG phải @nestjs/mapped-types
import { CreateBookInput } from './create-book.input';

@InputType()
export class UpdateBookInput extends PartialType(CreateBookInput) {}
```

Khi input sai (ví dụ `price: -5`), `ValidationPipe` ném `BadRequestException`, Apollo trả về HTTP 200 với `errors[0].extensions.code = "BAD_REQUEST"` kèm danh sách message — client cần đọc mảng `errors`, không dựa vào status code.

---

## 6. Query và Mutation kết hợp TypeORM

### 6.1 Service — giống hệt REST

Điểm hay của kiến trúc NestJS: **service không biết mình được gọi từ REST hay GraphQL**. Có thể dùng chung một `BooksService` cho cả `BooksController` và `BooksResolver`.

```typescript
// src/modules/books/books.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookInput } from './dto/create-book.input';
import { UpdateBookInput } from './dto/update-book.input';

@Injectable()
export class BooksService {
  constructor(@InjectRepository(Book) private readonly bookRepo: Repository<Book>) {}

  findAll(page: number, limit: number): Promise<Book[]> {
    return this.bookRepo.find({
      order: { id: 'ASC' },
      skip: (page - 1) * limit, // pagination như Lesson 07
      take: limit,
    });
  }

  async findOne(id: number): Promise<Book> {
    const book = await this.bookRepo.findOneBy({ id });
    if (!book) throw new NotFoundException(`Book #${id} not found`);
    return book;
  }

  create(input: CreateBookInput): Promise<Book> {
    return this.bookRepo.save(this.bookRepo.create(input));
  }

  async update(id: number, input: UpdateBookInput): Promise<Book> {
    const book = await this.findOne(id);
    return this.bookRepo.save(this.bookRepo.merge(book, input));
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.bookRepo.delete(id);
    if (!result.affected) throw new NotFoundException(`Book #${id} not found`);
    return true;
  }
}
```

```typescript
// src/modules/authors/authors.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Author } from './entities/author.entity';

@Injectable()
export class AuthorsService {
  constructor(@InjectRepository(Author) private readonly authorRepo: Repository<Author>) {}

  async findById(id: number): Promise<Author> {
    const author = await this.authorRepo.findOneBy({ id });
    if (!author) throw new NotFoundException(`Author #${id} not found`);
    return author;
  }

  // Dùng cho DataLoader ở mục 7: 1 query cho nhiều id
  findByIds(ids: number[]): Promise<Author[]> {
    return this.authorRepo.findBy({ id: In(ids) });
  }
}
```

### 6.2 Resolver với `@Query`, `@Mutation`, `@Args`, `@ResolveField`

```typescript
// src/modules/books/books.resolver.ts
import { Args, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { BooksService } from './books.service';
import { AuthorsService } from '../authors/authors.service';
import { BookModel } from './models/book.model';
import { AuthorModel } from '../authors/models/author.model';
import { Book } from './entities/book.entity';
import { Author } from '../authors/entities/author.entity';
import { CreateBookInput } from './dto/create-book.input';
import { UpdateBookInput } from './dto/update-book.input';

@Resolver(() => BookModel) // resolver này phụ trách type Book
export class BooksResolver {
  constructor(
    private readonly booksService: BooksService,
    private readonly authorsService: AuthorsService,
  ) {}

  // query { books(page: 1, limit: 10) { ... } }
  @Query(() => [BookModel], { name: 'books' })
  findAll(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<Book[]> {
    return this.booksService.findAll(page, Math.min(limit, 50)); // chặn limit quá lớn
  }

  // query { book(id: 1) { ... } }
  @Query(() => BookModel, { name: 'book' })
  findOne(@Args('id', { type: () => Int }) id: number): Promise<Book> {
    return this.booksService.findOne(id);
  }

  // mutation { createBook(input: {...}) { id } }
  @Mutation(() => BookModel)
  createBook(@Args('input') input: CreateBookInput): Promise<Book> {
    return this.booksService.create(input);
  }

  @Mutation(() => BookModel)
  updateBook(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateBookInput,
  ): Promise<Book> {
    return this.booksService.update(id, input);
  }

  @Mutation(() => Boolean)
  deleteBook(@Args('id', { type: () => Int }) id: number): Promise<boolean> {
    return this.booksService.remove(id);
  }

  // Field resolver: chỉ chạy khi client có yêu cầu field "author"
  @ResolveField('author', () => AuthorModel)
  author(@Parent() book: Book): Promise<Author> {
    return this.authorsService.findById(book.authorId); // ⚠️ sẽ gây N+1 — xem mục 7
  }
}
```

Giải thích:

- `@Args('input')` lấy argument tên `input`; kiểu `CreateBookInput` được NestJS dùng để sinh `input CreateBookInput` trong schema và để `ValidationPipe` validate.
- Method trả về **entity** `Book`, còn schema là `BookModel`. Điều này hợp lệ vì GraphQL chỉ serialize các field khai báo trong `BookModel`; TypeScript cũng không phàn nàn vì cấu trúc tương thích.
- `@ResolveField` + `@Parent()`: `@Parent()` là object cha đã resolve xong (ở đây là một `Book` entity). Nhờ đó, khi client không hỏi `author`, không có query nào tới bảng `authors` — đây là lợi thế so với luôn `relations: ['author']`.
- `NotFoundException` từ service vẫn dùng được: Apollo chuyển nó thành phần tử trong mảng `errors` với `extensions.code`.

### 6.3 Đăng ký module

```typescript
// src/modules/authors/authors.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from './entities/author.entity';
import { AuthorsService } from './authors.service';
import { AuthorsLoader } from './authors.loader';

@Module({
  imports: [TypeOrmModule.forFeature([Author])],
  providers: [AuthorsService, AuthorsLoader],
  exports: [AuthorsService, AuthorsLoader],
})
export class AuthorsModule {}
```

```typescript
// src/modules/books/books.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { BooksService } from './books.service';
import { BooksResolver } from './books.resolver';
import { AuthorsModule } from '../authors/authors.module';

@Module({
  imports: [TypeOrmModule.forFeature([Book]), AuthorsModule],
  providers: [BooksService, BooksResolver], // resolver là provider, KHÔNG đặt vào controllers
})
export class BooksModule {}
```

(`AuthorsLoader` sẽ được viết ở mục 7.) Sau khi chạy app, mở `src/schema.gql` để xem schema NestJS tự sinh — đối chiếu với SDL ở mục 2.

---

## 7. Vấn đề N+1 trong GraphQL và DataLoader

### 7.1 Tái hiện N+1

Bật `logging: true` trong cấu hình TypeORM rồi chạy query:

```graphql
query {
  books(limit: 10) {
    title
    author { name }
  }
}
```

Log SQL sẽ giống như sau:

```text
SELECT ... FROM "books" ORDER BY "id" ASC LIMIT 10          -- 1 query
SELECT ... FROM "authors" WHERE "id" = $1  -- params: [1]    -- book 1
SELECT ... FROM "authors" WHERE "id" = $1  -- params: [2]    -- book 2
SELECT ... FROM "authors" WHERE "id" = $1  -- params: [1]    -- book 3 (lặp lại tác giả 1!)
... (tổng cộng 1 + 10 = 11 query)
```

Nguyên nhân: GraphQL gọi field resolver `author()` **độc lập cho từng book**. Mỗi lần gọi không biết các lần khác đang cần gì. Với `limit: 50` và query lồng thêm `author { books { ... } }`, số query tăng theo cấp số nhân.

Vì sao không dùng `relations: ['author']` trong `findAll()` như Lesson 07? Được, nhưng khi đó **mọi** request `books` đều JOIN bảng `authors`, kể cả khi client không cần tác giả — đi ngược tinh thần "lấy đúng thứ cần" của GraphQL. Và với field lồng nhiều cấp, JOIN trở nên khó kiểm soát.

### 7.2 DataLoader hoạt động thế nào?

**DataLoader** là thư viện nhỏ với hai cơ chế:

1. **Batching**: trong cùng một "tick" của event loop (Lesson 01), mọi lời gọi `loader.load(id)` được **gom lại**; khi tick kết thúc, DataLoader gọi **một lần** batch function với toàn bộ danh sách id.
2. **Caching per request**: cùng một id được `load` nhiều lần chỉ lấy một lần (tác giả 1 ở ví dụ trên).

```text
author(book1) → loader.load(1) ┐
author(book2) → loader.load(2) ├─ cùng tick ──► batchFn([1, 2]) ──► SELECT ... WHERE id IN (1, 2)
author(book3) → loader.load(1) ┘  (id 1 đã có trong cache)        │
                                                                  ▼
                              trả về theo ĐÚNG thứ tự keys: [Author1, Author2]
```

Quy tắc bắt buộc của batch function: **mảng trả về phải có cùng độ dài và cùng thứ tự với mảng keys**. Database không đảm bảo thứ tự của `WHERE id IN (...)`, nên phải tự sắp xếp lại (dùng `Map`).

### 7.3 Cài đặt và viết loader request-scoped

```bash
npm install dataloader
```

Loader phải được tạo **mới cho mỗi request**. Nếu dùng một loader singleton cho cả app, cache của nó sống mãi: user A sửa tên tác giả nhưng user B vẫn thấy tên cũ, và dữ liệu của request này có thể lẫn sang request khác. NestJS cho phép khai báo provider **request-scoped** (xem thêm Bonus 01 — Scope của Providers):

```typescript
// src/modules/authors/authors.loader.ts
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { AuthorsService } from './authors.service';
import { Author } from './entities/author.entity';

@Injectable({ scope: Scope.REQUEST }) // mỗi GraphQL request có một instance riêng → cache riêng
export class AuthorsLoader {
  constructor(private readonly authorsService: AuthorsService) {}

  readonly byId = new DataLoader<number, Author>(async (ids: readonly number[]) => {
    // 1 query duy nhất: SELECT ... FROM authors WHERE id IN (...)
    const authors = await this.authorsService.findByIds([...ids]);

    // Sắp xếp lại đúng thứ tự keys; id không tồn tại → trả Error cho riêng key đó
    const authorMap = new Map(authors.map((a) => [a.id, a]));
    return ids.map((id) => authorMap.get(id) ?? new Error(`Author #${id} not found`));
  });
}
```

Cập nhật field resolver:

```typescript
// src/modules/books/books.resolver.ts (cập nhật)
import { AuthorsLoader } from '../authors/authors.loader';

@Resolver(() => BookModel)
export class BooksResolver {
  constructor(
    private readonly booksService: BooksService,
    private readonly authorsLoader: AuthorsLoader, // request-scoped
  ) {}

  // ... các @Query/@Mutation giữ nguyên

  @ResolveField('author', () => AuthorModel)
  author(@Parent() book: Book): Promise<Author> {
    return this.authorsLoader.byId.load(book.authorId); // được gom batch
  }
}
```

Chạy lại query, log chỉ còn **2 query** bất kể `limit` là bao nhiêu:

```text
SELECT ... FROM "books" ORDER BY "id" ASC LIMIT 10
SELECT ... FROM "authors" WHERE "id" IN ($1, $2, $3)
```

**Lưu ý về scope:** khi inject một provider request-scoped, NestJS làm cho `BooksResolver` cũng trở thành request-scoped (scope "lan" lên theo chuỗi inject). Điều này đúng về mặt logic nhưng tốn thêm chi phí tạo instance mỗi request. Với hệ thống lớn, một cách khác phổ biến là tạo các loader trong hàm `context` của `GraphQLModule` (ví dụ `context: () => ({ loaders: createLoaders(...) })`) và lấy ra bằng `@Context()`. Cả hai cách chung một nguyên tắc: **một bộ loader cho một request**.

### 7.4 Chiều ngược lại: One-to-Many

Với field `Author.books` (một tác giả có nhiều sách), batch function nhận danh sách `authorId` và phải trả về **mảng của mảng**: `findBy({ authorId: In(ids) })`, sau đó group theo `authorId` và trả về `ids.map((id) => grouped.get(id) ?? [])`. Đây là phần của Homework.

---

## Common mistakes

1. **Quên khai báo `() => Int` cho field/argument kiểu `number`.**
   *Vì sao sai:* TypeScript metadata chỉ biết `Number`, NestJS mặc định map thành `Float`. Schema sinh ra `id: Float!`, client gửi `book(id: 1)` vẫn chạy, nhưng ID và FK mang kiểu số thực là sai ngữ nghĩa, client sinh type (TypeScript codegen) sẽ nhận `number` kiểu Float, và giá trị như `1.5` lọt qua tầng schema.
   *Cách sửa:* luôn ghi rõ `@Field(() => Int)` và `@Args('id', { type: () => Int })`. Tương tự, field `string | null` phải ghi `@Field(() => String, { nullable: true })`.

2. **Đặt resolver vào `controllers` hoặc quên đăng ký vào `providers`.**
   *Vì sao sai:* resolver là provider; nếu không nằm trong `providers` của một module được import, NestJS không quét nó → schema không có query đó, hoặc báo lỗi `Query root type must be provided`.
   *Cách sửa:* `providers: [BooksService, BooksResolver]`, và module chứa resolver phải được import vào `AppModule`.

3. **Để field resolver gọi repository trực tiếp cho từng object (N+1), hoặc dùng DataLoader dạng singleton.**
   *Vì sao sai:* N+1 khiến một query danh sách 50 phần tử sinh ra 51+ SQL query. Còn DataLoader singleton giữ cache vĩnh viễn → dữ liệu cũ, lẫn dữ liệu giữa các user.
   *Cách sửa:* dùng DataLoader với `Scope.REQUEST` (hoặc tạo trong `context`), batch function dùng `In(ids)`.

4. **Batch function trả về sai thứ tự hoặc sai số lượng phần tử.**
   *Vì sao sai:* `findBy({ id: In(ids) })` trả về theo thứ tự database tùy ý và bỏ qua id không tồn tại. DataLoader ghép kết quả theo **vị trí** → sách hiển thị nhầm tác giả, hoặc lỗi `The function did not return a Promise of an Array of the same length as the Array of keys`.
   *Cách sửa:* build `Map` từ kết quả, rồi `return ids.map((id) => map.get(id) ?? new Error(...))`.

5. **Import `PartialType` từ `@nestjs/mapped-types` cho `@InputType`.**
   *Vì sao sai:* bản của `mapped-types` không copy metadata GraphQL, input mới sinh ra không có field nào trong schema.
   *Cách sửa:* với GraphQL, import `PartialType`, `PickType`, `OmitType` từ `@nestjs/graphql`.

---

## Bài tập thực hành trên lớp

**Đề bài:** Xây dựng GraphQL API cho hệ thống sách, chạy song song với REST API đã có.

1. Cài đặt `GraphQLModule` với Apollo driver, code-first, sinh `src/schema.gql`.
2. Tạo `AuthorModel`, `BookModel`, `CreateBookInput`, `UpdateBookInput` (có class-validator).
3. Viết `BooksResolver` với query `books(page, limit)`, `book(id)` và mutation `createBook`, `updateBook`, `deleteBook`, dùng lại `BooksService` qua TypeORM repository.
4. Thêm `@ResolveField('author')`, bật `logging: true` của TypeORM và **đếm** số SQL query khi gọi `books(limit: 10) { title author { name } }`.
5. Sửa N+1 bằng `AuthorsLoader`, đếm lại số query và ghi kết quả trước/sau vào comment đầu file resolver.

**Gợi ý hướng giải:**

- Seed khoảng 3 tác giả, 15 cuốn sách (Lesson 07 — Seeding) để thấy rõ N+1 và cache của DataLoader (nhiều sách chung tác giả).
- Nếu app không khởi động, đọc kỹ lỗi sinh schema: thường là thiếu `() => Type` ở field union/array hoặc resolver chưa đăng ký.
- Test validate: gửi `createBook(input: { title: "", price: -1, authorId: 1 })` và xem `errors[0].extensions`.
- Dùng tab "Variables" của Apollo Sandbox thay vì viết giá trị trực tiếp trong query.

---

## Homework

- [ ] Hoàn thiện bài tập trên lớp; thêm query `authors` và `author(id)` trong `AuthorsResolver`, mutation `createAuthor` với `CreateAuthorInput`.
- [ ] Thêm `@ResolveField('books')` cho `Author` (One-to-Many) và viết `BooksByAuthorLoader` trả về `Book[][]` đúng thứ tự `authorId`.
- [ ] Thêm argument lọc cho query `books`: `filter: BookFilterInput` gồm `titleContains`, `minPrice`, `maxPrice` (validate bằng class-validator), dùng `ILike`, `Between` của TypeORM (Lesson 07).
- [ ] Bảo vệ các mutation bằng JWT: tạo `GqlAuthGuard` extends `JwtAuthGuard` của Lesson 09, override `getRequest()` bằng `GqlExecutionContext.create(context).getContext().req`; và một `@GqlCurrentUser()` decorator tương tự. Nhớ thêm `context: ({ req }) => ({ req })` vào `GraphQLModule`.
- [ ] Viết bảng so sánh ngắn (trong README project): cùng một màn hình "chi tiết tác giả + 5 sách mới nhất", REST cần những endpoint nào, GraphQL cần query gì, số request/SQL query mỗi bên.
- [ ] (Nâng cao) Giới hạn độ phức tạp query: chặn query lồng quá 5 cấp (ví dụ dùng package `graphql-depth-limit` qua option `validationRules`), và chứng minh bằng một query `author { books { author { books { ... } } } }` bị từ chối. Giải thích vì sao đây là vấn đề bảo mật đặc thù của GraphQL mà REST ít gặp.

---

## Câu hỏi ôn tập

1. Over-fetching và under-fetching là gì? Cho một ví dụ với API sách và giải thích GraphQL xử lý thế nào.
2. Nêu ít nhất hai điểm REST làm tốt hơn GraphQL. Vì sao HTTP caching với GraphQL khó hơn?
3. Khác nhau giữa `@ObjectType` và `@InputType`? Vì sao trong code-first phải viết `@Field(() => Int)` thay vì chỉ `@Field()` cho `id: number`?
4. `@ResolveField` + `@Parent()` hoạt động thế nào, và vì sao nó dẫn tới N+1 khi query danh sách?
5. DataLoader giải quyết N+1 bằng hai cơ chế nào? Vì sao loader phải được tạo mới cho mỗi request, và batch function phải tuân thủ quy tắc gì về kết quả trả về?
