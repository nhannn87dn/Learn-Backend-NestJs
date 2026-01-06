# Làm việc với Cơ sở dữ liệu

Dưới đây là bài viết chi tiết về **Làm việc với Cơ sở dữ liệu trong NestJS** với **TypeORM**, bao gồm các phần:  

- **Giới thiệu TypeORM trong NestJS**  
- **Cấu hình kết nối với cơ sở dữ liệu**  
- **Tạo Entities và Repositories**  
- **Thực hiện các thao tác CRUD**  

---

## **1. Giới thiệu về TypeORM trong NestJS**  

TypeORM là một **ORM (Object Relational Mapper)** cho TypeScript và JavaScript, hỗ trợ nhiều hệ quản trị cơ sở dữ liệu như:  

✅ MySQL  
✅ PostgreSQL  
✅ SQLite  
✅ MongoDB  
✅ MSSQL  

TypeORM giúp bạn làm việc với cơ sở dữ liệu **một cách trực quan** thông qua **Entities**, **Repositories**, và **Migrations**, thay vì viết trực tiếp các câu lệnh SQL.  

---

## **2. Cấu hình kết nối cơ sở dữ liệu**  

### **📌 Cài đặt TypeORM**  

Để sử dụng TypeORM trong NestJS, trước tiên bạn cần cài đặt gói TypeORM cùng với driver tương ứng với cơ sở dữ liệu bạn đang dùng.  

📌 **Ví dụ: Cài đặt TypeORM với MySQL**  

```bash
npm install @nestjs/typeorm typeorm mysql2
```

📌 **Hoặc với PostgreSQL:**  

```bash
npm install @nestjs/typeorm typeorm pg
```

---

### **📌 Cấu hình kết nối cơ sở dữ liệu**  

Trong NestJS, bạn có thể thiết lập kết nối với TypeORM trong **module chính** (`AppModule`).  

📌 **Cấu hình kết nối trong `app.module.ts`**  

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql', // Hoặc 'postgres', 'sqlite', ...
      host: 'localhost',
      port: 3306, // 5432 nếu dùng PostgreSQL
      username: 'root',
      password: 'password',
      database: 'nestjs_db',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'], // Tự động load entities
      synchronize: true, // Chỉ dùng trong môi trường phát triển
    }),
  ],
})
export class AppModule {}
```

📌 **Giải thích:**  
- `type: 'mysql'` → Chọn hệ quản trị CSDL.  
- `host, port, username, password` → Thông tin kết nối.  
- `entities` → Định nghĩa thư mục chứa các entity.  
- `synchronize: true` → Tự động cập nhật schema (không nên dùng trong production).  

---

## **3. Tạo Entities và Repositories**  

### **📌 Tạo một Entity (Bảng trong CSDL)**  

Entities trong TypeORM là các **lớp TypeScript** được ánh xạ thành **bảng trong database**.  

📌 **Tạo file `user.entity.ts`**  

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;
}
```

📌 **Giải thích:**  
- `@Entity()` → Định nghĩa một bảng.  
- `@PrimaryGeneratedColumn()` → ID tự động tăng.  
- `@Column()` → Cột dữ liệu trong bảng.  

---

### **📌 Đăng ký Entity vào Module**  

Bạn cần đăng ký entity này vào `TypeOrmModule` để sử dụng repository của nó.  

📌 **Trong `user.module.ts`**  

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Đăng ký entity
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

---

## **4. Thực hiện các thao tác CRUD**  

### **📌 Inject Repository trong Service**  

Sử dụng `InjectRepository` để làm việc với **Repository** của entity.  

📌 **Trong `user.service.ts`**  

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  // Create User
  async createUser(name: string, email: string, password: string) {
    const newUser = this.userRepository.create({ name, email, password });
    return this.userRepository.save(newUser);
  }

  // Get all users
  async getUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  // Get user by ID
  async getUserById(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  // Update user
  async updateUser(id: number, name: string) {
    return this.userRepository.update(id, { name });
  }

  // Delete user
  async deleteUser(id: number) {
    return this.userRepository.delete(id);
  }
}
```

---

### **📌 Tạo Controller để sử dụng Service**  

📌 **Trong `user.controller.ts`**  

```typescript
import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  createUser(@Body() body) {
    return this.userService.createUser(body.name, body.email, body.password);
  }

  @Get()
  getAllUsers() {
    return this.userService.getUsers();
  }

  @Get(':id')
  getUser(@Param('id') id: number) {
    return this.userService.getUserById(id);
  }

  @Put(':id')
  updateUser(@Param('id') id: number, @Body() body) {
    return this.userService.updateUser(id, body.name);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: number) {
    return this.userService.deleteUser(id);
  }
}
```

---

## **Tổng kết**  

| **Bước** | **Nội dung** |
|----------|------------|
| **1. Cài đặt** | Cài TypeORM và driver database (`mysql2`, `pg`, v.v.) |
| **2. Cấu hình kết nối** | Sử dụng `TypeOrmModule.forRoot()` trong `AppModule` |
| **3. Tạo Entity** | Định nghĩa bảng trong CSDL với decorators TypeORM |
| **4. Đăng ký Entity** | Dùng `TypeOrmModule.forFeature([Entity])` trong module |
| **5. CRUD với Repository** | Inject `Repository<T>` trong Service để thao tác dữ liệu |
| **6. Controller** | Sử dụng service để tạo API endpoints |

Với cách tiếp cận này, bạn có thể dễ dàng làm việc với cơ sở dữ liệu trong NestJS một cách **hiệu quả và có tổ chức**! 🚀