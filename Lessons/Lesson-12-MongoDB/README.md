# Lesson 12: Làm việc với MongoDB và Mongoose

---

## 1. Tổng quan về NoSQL

### Khái niệm

**NoSQL** (Not Only SQL) là thuật ngữ chỉ các hệ quản trị cơ sở dữ liệu phi quan hệ, được thiết kế để giải quyết những hạn chế của SQL truyền thống trong bối cảnh ứng dụng hiện đại cần xử lý dữ liệu lớn, phân tán và có cấu trúc linh hoạt.

### Tại sao ra đời NoSQL?

**Vấn đề 1: Schema cứng nhắc**

SQL yêu cầu định nghĩa schema trước, mọi thay đổi đều phải `ALTER TABLE` — rất rủi ro trên production:

```sql
-- Thêm field mới trong SQL
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
-- Có thể gây lock table, downtime với dữ liệu lớn
```

NoSQL cho phép mỗi document có cấu trúc khác nhau, không cần migration:

```javascript
// Hai documents cùng collection, khác structure — hoàn toàn hợp lệ
{ name: "John", email: "john@example.com" }
{ name: "Jane", email: "jane@example.com", phone: "0987654321", address: { city: "Hanoi" } }
```

**Vấn đề 2: Khó scale ngang (Horizontal Scaling)**


SQL databases thường scale theo chiều dọc (vertical scaling - tăng RAM, CPU của một server):

```
SQL Traditional Scaling:
┌─────────────┐
│  Server 1   │  → Tăng RAM: 16GB → 32GB → 64GB
│  (MySQL)    │  → Tăng CPU: 4 cores → 8 cores
└─────────────┘
Giới hạn: Chi phí tăng theo cấp số nhân, có điểm giới hạn phần cứng
```

NoSQL được thiết kế để scale ngang (horizontal scaling - thêm nhiều server):

```
NoSQL Horizontal Scaling:
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ Node1│  │ Node2│  │ Node3│  │ Node4│
└──────┘  └──────┘  └──────┘  └──────┘
   ↓         ↓         ↓         ↓
Dữ liệu được phân tán tự động (Sharding)
Chi phí tuyến tính, không có giới hạn lý thuyết
```

**Vấn đề 3: Performance với Big Data**

SQL JOIN nhiều bảng rất chậm khi dữ liệu lớn. 

```sql
-- Query này có thể mất vài giây với millions records
SELECT u.name, p.title, c.content
FROM users u
JOIN posts p ON u.id = p.user_id
JOIN comments c ON p.id = c.post_id
WHERE u.country = 'Vietnam';
```

NoSQL dùng denormalization — nhúng dữ liệu liên quan vào cùng một document, đọc một lần không cần JOIN:

```javascript
// Thay vì JOIN 3 bảng, đọc 1 document duy nhất
{
  title: "My Post",
  author: { name: "John", country: "Vietnam" },
  comments: [
    { content: "Great!", author: "Jane" }
  ]
}
```
---

## 2. Các loại cơ sở dữ liệu NoSQL

Có 4 loại NoSQL phổ biến, mỗi loại phù hợp với từng use case khác nhau:

### Document Store (MongoDB, CouchDB)

Lưu dữ liệu dạng JSON/BSON. Phù hợp nhất cho hầu hết ứng dụng web.

```javascript
// MongoDB document
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  addresses: [
    { type: "home", city: "Hanoi" },
    { type: "work", city: "HCMC" }
  ]
}
```

**Use cases:** CMS, e-commerce catalog, user profiles.

### Key-Value Store (Redis, DynamoDB)

Đơn giản nhất: mỗi key ánh xạ tới một value. Cực kỳ nhanh nhờ lưu in-memory.

```
SET session:abc123 '{"userId": 1, "role": "admin"}' EX 3600
GET session:abc123
```

**Use cases:** Caching, session management, rate limiting.

### Column-Family (Cassandra, HBase)

Lưu dữ liệu theo cột thay vì hàng — tối ưu cho analytical queries.

**Use cases:** Time-series data, IoT sensor data, analytics.

### Graph Database (Neo4j)

Lưu trữ và truy vấn các mối quan hệ (relationships) giữa các entities.

```cypher
(john)-[:FRIEND_WITH]->(jane)
(john)-[:WORKS_AT]->(google)
```

**Use cases:** Social networks, recommendation engines, fraud detection.

---

## 3. MongoDB là gì?

MongoDB là document-oriented NoSQL database phổ biến nhất hiện nay, lưu dữ liệu dưới dạng **BSON** (Binary JSON).

### Cấu trúc dữ liệu trong MongoDB

| Khái niệm MongoDB | Tương đương SQL | Mô tả |
|---|---|---|
| Database | Database | Tập hợp các collections |
| Collection | Table | Tập hợp các documents |
| Document | Row | Một bản ghi dữ liệu (JSON) |
| Field | Column | Một thuộc tính của document |
| `_id` | Primary Key | Tự động tạo, kiểu `ObjectId` |

```
MongoDB Structure:
Database: myapp
  └── Collection: users
        ├── Document: { _id: ObjectId, name: "John", email: "..." }
        └── Document: { _id: ObjectId, name: "Jane", email: "..." }
  └── Collection: posts
        └── Document: { _id: ObjectId, title: "...", authorId: ObjectId }
```

### Các lệnh cơ bản với MongoDB

```javascript
// Kết nối và chọn database
use myapp

// INSERT
db.users.insertOne({ name: "John", email: "john@example.com", age: 25 })
db.users.insertMany([{ name: "Jane" }, { name: "Bob" }])

// READ
db.users.find()                          // Tất cả documents
db.users.find({ age: { $gte: 18 } })    // Có điều kiện
db.users.findOne({ email: "john@example.com" })

// UPDATE
db.users.updateOne(
  { _id: ObjectId("...") },
  { $set: { age: 26 } }
)

// DELETE
db.users.deleteOne({ _id: ObjectId("...") })
db.users.deleteMany({ age: { $lt: 18 } })

// INDEX
db.users.createIndex({ email: 1 }, { unique: true })
```

### MongoDB Atlas — Dịch vụ MongoDB trên Cloud

**MongoDB Atlas** là dịch vụ MongoDB được quản lý hoàn toàn trên cloud (AWS, GCP, Azure). Không cần tự cài đặt và vận hành server.

**Cách tạo cluster miễn phí:**

1. Truy cập [cloud.mongodb.com](https://cloud.mongodb.com) → Sign up
2. Tạo **Free Cluster** (M0 Sandbox — 512MB)
3. Vào **Database Access** → Tạo user/password
4. Vào **Network Access** → Thêm IP `0.0.0.0/0` (allow all) cho dev
5. Lấy **Connection String**:

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>
```

---

## 4. Mongoose là gì?

### Khái niệm

**Mongoose** là thư viện ODM (Object Document Mapper) cho MongoDB trong Node.js. Nó cung cấp một layer abstraction giúp làm việc với MongoDB theo hướng schema-based, có validation và middleware.

### Tại sao cần Mongoose? (vs MongoDB Native Driver)

| Tiêu chí | MongoDB Native Driver | Mongoose |
|---|---|---|
| Schema | Không có | Có — định nghĩa rõ ràng |
| Validation | Tự viết | Built-in validators |
| Middleware | Không có | Pre/Post hooks |
| Populate (JOIN) | Tự viết | `populate()` |
| Type Safety | Kém | Tốt hơn (kết hợp TypeScript) |
| Boilerplate | Ít | Nhiều hơn một chút |

```typescript
// ❌ Native Driver: không có schema, không validate
await db.collection('users').insertOne({ name: 123, email: 'not-an-email' });
// Lưu thành công dù data sai!

// ✅ Mongoose: validate trước khi lưu
const user = new User({ name: 123, email: 'not-an-email' });
await user.save(); // Throw ValidationError!
```

---

## 5. Cài đặt và cấu hình MongoDB với NestJS

**Cài đặt dependencies:**

```bash
npm install @nestjs/mongoose mongoose
npm install -D @types/mongoose
```

**Cấu hình trong `AppModule`:**

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Kết nối MongoDB dùng ConfigService (async)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

**File `.env`:**

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/myapp
```

**Đăng ký Schema trong Feature Module:**

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [MongooseModule], // Export nếu module khác cần dùng
})
export class UsersModule {}
```

---

## 6. Tạo Schema với Mongoose

### Embedded Document (Nhúng trực tiếp)

Dùng khi dữ liệu liên quan **luôn được truy cập cùng nhau**, số lượng nhỏ và không cần query độc lập.

```typescript
// schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Sub-schema cho Address
@Schema({ _id: false }) // Không cần _id cho embedded doc
export class Address {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ default: 'Vietnam' })
  country: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Main schema
export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Tự thêm createdAt, updatedAt
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ min: 0, max: 120 })
  age: number;

  // Embed Address array
  @Prop({ type: [AddressSchema], default: [] })
  addresses: Address[];
}

export const UserSchema = SchemaFactory.createForClass(User);
```


### Reference Document (Tham chiếu)

Dùng khi quan hệ là **one-to-many lớn**, dữ liệu được query độc lập hoặc dùng chung nhiều nơi.

Use case:

- User có nhiều Post → nên reference để tránh document quá lớn
- Post có nhiều Tag → nên reference để tái sử dụng tags
- Comment có thể rất nhiều → nên reference để tránh document quá lớn
- Category có nhiều Product → nên reference để tái sử dụng category


Ví dụ thực tế:

```typescript
// schemas/post.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  // Reference tới User
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  authorId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tags: Types.ObjectId[];

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ enum: ['draft', 'published', 'archived'], default: 'draft' })
  status: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

### Best Practices cho Schema Design

```typescript
// ✅ 1. Embed khi: dữ liệu nhỏ, luôn dùng cùng nhau, ít thay đổi
@Prop({ type: [AddressSchema] })
addresses: Address[]; // Địa chỉ của user — hợp lý để embed

// ✅ 2. Reference khi: unbounded (có thể rất nhiều), query độc lập
@Prop({ type: Types.ObjectId, ref: 'User' })
authorId: Types.ObjectId; // Bài post của user — nên reference

// ✅ 3. Thêm index cho các field hay query
PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ status: 1 });

// ✅ 4. Dùng timestamps tự động
@Schema({ timestamps: true })

// ✅ 5. Dùng enum để giới hạn giá trị
@Prop({ enum: ['draft', 'published', 'archived'], default: 'draft' })
status: string;

// ❌ Tránh: embed unbounded array (comments có thể lên tới hàng nghìn)
@Prop({ type: [CommentSchema] }) // BAD nếu comments nhiều
comments: Comment[];
```

### Một số truy vấn cơ bản với Mongoose

```typescript
//select các trường cần thiết
const posts = await this.postModel.find().select('title authorId').exec();
//sắp xếp theo createdAt giảm dần
const recentPosts = await this.postModel.find().sort({ createdAt: -1 }).exec(); //sort({ field: 1 }) cho tăng dần, -1 cho giảm dần
//lọc theo điều kiện
const publishedPosts = await this.postModel.find({ status: 'published' }).exec();
//kết hợp filter + sort + select
const topPosts = await this.postModel.find({ status: 'published' })
  .sort({ viewCount: -1 })
  .select('title viewCount')
  .exec();
//toán tử so sánh và logic
const popularPosts = await this.postModel.find({
  viewCount: { $gte: 1000 }, //viewCount >= 1000
  status: { $in: ['published', 'archived'] }, //status là published hoặc archived
}).exec();
//Phân trang
const page = 2;
const limit = 10;
const paginatedPosts = await this.postModel.find({ status: 'published' })
  .select('title createdAt')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .exec();

```

---

## 7. Validation và Middleware trong Mongoose

### Validation

Mongoose hỗ trợ validation built-in và custom:

```typescript
@Schema()
export class User {
  // Built-in validators
  @Prop({
    required: [true, 'Name is required'],
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name must not exceed 50 characters'],
    trim: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  })
  email: string;

  @Prop({
    min: [0, 'Age cannot be negative'],
    max: [120, 'Age seems too large'],
  })
  age: number;

  @Prop({
    enum: {
      values: ['user', 'admin', 'moderator'],
      message: '{VALUE} is not a valid role',
    },
    default: 'user',
  })
  role: string;

  // Custom validator
  @Prop({
    validate: {
      validator: (v: string) => v.startsWith('+84') || v.startsWith('0'),
      message: 'Phone number must start with +84 or 0',
    },
  })
  phone: string;
}
```

Kết hợp với **class-validator** ở DTO layer để validate từ request:

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;
}
```

### Pre/Post Hooks (Middleware)

Hooks cho phép thực thi logic **trước (pre)** hoặc **sau (post)** các operations.

```typescript
// schemas/user.schema.ts
import * as bcrypt from 'bcrypt';

export const UserSchema = SchemaFactory.createForClass(User);

// Pre-save hook: Hash password trước khi lưu
UserSchema.pre('save', async function (next) {
  // 'this' là document đang được lưu
  if (!this.isModified('password')) return next(); // Chỉ hash khi password thay đổi

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Pre-save hook: Tự động tạo slug từ title
PostSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
  }
  next();
});

// Post-save hook: Log sau khi lưu thành công
UserSchema.post('save', function (doc) {
  console.log(`User saved: ${doc._id}`);
});

// Pre-deleteOne hook: Xóa dữ liệu liên quan (cascade delete)
UserSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  const userId = this._id;
  // Xóa tất cả posts của user khi xóa user
  await mongoose.model('Post').deleteMany({ authorId: userId });
  next();
});

// Pre-find hook: Tự động exclude soft-deleted documents
UserSchema.pre(/^find/, function (next) {
  // 'this' là query
  this.where({ deletedAt: null });
  next();
});
```

---

## 8. CRUD cơ bản với Mongoose

Inject Model vào Service:

```typescript
// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}
}
```

### Tạo document mới

```typescript
// Cách 1: Dùng create()
async create(createUserDto: CreateUserDto): Promise<User> {
  const user = await this.userModel.create(createUserDto);
  return user;
}

// Cách 2: Dùng new + save() — hữu ích khi cần xử lý trước khi lưu
async create(createUserDto: CreateUserDto): Promise<User> {
  const user = new this.userModel(createUserDto);
  // Có thể xử lý thêm ở đây
  return user.save();
}

// Tạo nhiều documents cùng lúc
async createMany(users: CreateUserDto[]): Promise<User[]> {
  return this.userModel.insertMany(users);
}
```

### Đọc dữ liệu

```typescript
// Lấy tất cả
async findAll(): Promise<User[]> {
  return this.userModel.find().exec();
}

// Lấy theo ID
async findOne(id: string): Promise<User> {
  const user = await this.userModel.findById(id).exec();
  if (!user) throw new NotFoundException(`User #${id} not found`);
  return user;
}

// Lấy theo điều kiện
async findByEmail(email: string): Promise<User> {
  return this.userModel.findOne({ email }).exec();
}

// Chỉ lấy một số fields (projection)
async findAllNames(): Promise<User[]> {
  return this.userModel.find().select('name email -_id').exec();
}
```

### Cập nhật dữ liệu

```typescript
// findByIdAndUpdate — trả về document sau khi update
async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
  const user = await this.userModel.findByIdAndUpdate(
    id,
    { $set: updateUserDto },
    { new: true, runValidators: true }, // new: true → trả về doc mới
  ).exec();

  if (!user) throw new NotFoundException(`User #${id} not found`);
  return user;
}

// updateOne — chỉ cập nhật, không trả về document
async incrementViewCount(postId: string): Promise<void> {
  await this.postModel.updateOne(
    { _id: postId },
    { $inc: { viewCount: 1 } },
  );
}

// updateMany — cập nhật nhiều documents
async deactivateOldUsers(): Promise<void> {
  await this.userModel.updateMany(
    { lastLoginAt: { $lt: new Date('2023-01-01') } },
    { $set: { isActive: false } },
  );
}
```

### Xóa dữ liệu

```typescript
// Hard delete
async remove(id: string): Promise<void> {
  const result = await this.userModel.findByIdAndDelete(id).exec();
  if (!result) throw new NotFoundException(`User #${id} not found`);
}

// Soft delete — chỉ đánh dấu, không xóa thật
async softDelete(id: string): Promise<User> {
  return this.userModel.findByIdAndUpdate(
    id,
    { $set: { deletedAt: new Date() } },
    { new: true },
  ).exec();
}

// Xóa theo điều kiện
async removeMany(filter: object): Promise<void> {
  await this.userModel.deleteMany(filter);
}
```

---

## 9. Truy vấn nâng cao với Mongoose


### Population

`populate()` là cách Mongoose thực hiện "JOIN" — thay thế ObjectId bằng document thực tế.

```typescript
// Lấy post kèm thông tin author
async findPostWithAuthor(id: string): Promise<Post> {
  return this.postModel
    .findById(id)
    .populate('authorId', 'name email') // Chỉ lấy name và email của author
    .exec();
}

// Populate nhiều fields
async findPostFull(id: string): Promise<Post> {
  return this.postModel
    .findById(id)
    .populate('authorId', 'name avatar')
    .populate('tags', 'name slug')
    .exec();
}

// Nested populate (populate bên trong populate)
async findPostDeep(id: string): Promise<Post> {
  return this.postModel
    .findById(id)
    .populate({
      path: 'authorId',
      select: 'name',
      populate: {
        path: 'addresses', // Populate nested field
        select: 'city',
      },
    })
    .exec();
}
```

### Pagination

```typescript
// dto/pagination.dto.ts
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

// Interface kết quả phân trang
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

```typescript
// Service: Phân trang với đầy đủ metadata
async findAllPaginated(paginationDto: PaginationDto): Promise<PaginatedResult<User>> {
  const { page, limit } = paginationDto;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.userModel.find().skip(skip).limit(limit).exec(),
    this.userModel.countDocuments(),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

### Filtering

```typescript
// dto/filter-user.dto.ts
export class FilterUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string; // Tìm theo tên (partial match)

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxAge?: number;
}
```

```typescript
// Service: Build dynamic filter
async findWithFilter(filterDto: FilterUserDto): Promise<PaginatedResult<User>> {
  const { page, limit, name, role, minAge, maxAge } = filterDto;
  const skip = (page - 1) * limit;

  // Build filter object động
  const filter: any = {};

  if (name) {
    filter.name = { $regex: name, $options: 'i' }; // Case-insensitive search
  }
  if (role) {
    filter.role = role;
  }
  if (minAge !== undefined || maxAge !== undefined) {
    filter.age = {};
    if (minAge !== undefined) filter.age.$gte = minAge;
    if (maxAge !== undefined) filter.age.$lte = maxAge;
  }

  const [data, total] = await Promise.all([
    this.userModel.find(filter).skip(skip).limit(limit).exec(),
    this.userModel.countDocuments(filter),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

### Sorting

```typescript
// dto/sort.dto.ts
export class SortDto {
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt'; // Field để sort

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

```typescript
// Service: Kết hợp filter + sort + pagination
async findAll(
  filterDto: FilterUserDto,
  sortDto: SortDto,
): Promise<PaginatedResult<User>> {
  const { page, limit, name, role } = filterDto;
  const { sortBy, sortOrder } = sortDto;
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = {};
  if (name) filter.name = { $regex: name, $options: 'i' };
  if (role) filter.role = role;

  // Build sort object: { createdAt: -1 } hoặc { name: 1 }
  const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    this.userModel
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-password') // Loại bỏ field nhạy cảm
      .exec(),
    this.userModel.countDocuments(filter),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

**Controller tổng hợp:**

```typescript
// users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query() filterDto: FilterUserDto,
    @Query() sortDto: SortDto,
  ) {
    return this.usersService.findAll(filterDto, sortDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```
