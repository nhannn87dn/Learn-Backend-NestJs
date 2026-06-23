# Lesson 15: Testing với Jest và Supertest


## Mục lục

1. [Unit Testing](#1-unit-testing)
2. [Integration Testing](#2-integration-testing)
3. [E2E Testing](#3-e2e-testing)
4. [Testing Controller](#4-testing-controller)
5. [Testing Service](#5-testing-service)
6. [Supertest test API](#6-supertest-test-api)

---

## Chuẩn bị

NestJS đã cài sẵn Jest khi `nest new`, bạn không cần cài thêm. Kiểm tra `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

Cấu trúc project ví dụ dùng xuyên suốt bài:

```
src/
├── users/
│   ├── users.controller.ts
│   ├── users.controller.spec.ts
│   ├── users.service.ts
│   ├── users.service.spec.ts
│   └── users.module.ts
└── app.module.ts

test/
├── users.e2e-spec.ts
└── jest-e2e.json
```

---

## 1. Unit Testing

### 1.1 Unit Testing là gì?

**Unit Test** kiểm tra từng đơn vị nhỏ nhất của code (thường là một function/method) **hoàn toàn độc lập** — không phụ thuộc vào database, network hay các service khác. Các dependency bên ngoài được thay bằng **mock** (giả lập).

```
Unit Test
  └── Test 1 function/method
  └── Mock toàn bộ dependency
  └── Nhanh, chạy được offline
  └── File: *.spec.ts nằm cạnh file gốc
```

### 1.2 Các khái niệm cốt lõi của Jest

```typescript
// Nhóm các test liên quan
describe('tên nhóm', () => {

  // Setup chạy 1 lần trước tất cả test
  beforeAll(async () => { ... });

  // Setup chạy trước mỗi test
  beforeEach(async () => { ... });

  // Cleanup sau mỗi test
  afterEach(() => { ... });

  // Một test case
  it('mô tả điều cần test', () => {
    // Arrange → Act → Assert
    const result = doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

**Các matcher phổ biến:**

```typescript
expect(value).toBe(5)               // so sánh bằng === (primitive)
expect(obj).toEqual({ name: 'a' })  // so sánh deep equal (object)
expect(value).toBeTruthy()          // truthy
expect(value).toBeFalsy()           // falsy
expect(value).toBeNull()            // null
expect(value).toBeUndefined()       // undefined
expect(arr).toContain('item')       // mảng chứa phần tử
expect(str).toMatch(/regex/)        // match regex
expect(fn).toThrow()                // hàm throw error
expect(fn).toThrow('message')       // throw với message cụ thể

// Async
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow('error')
```

### 1.3 Mock trong Jest

Mock là cách tạo ra một phiên bản giả lập của một function/module để kiểm soát hành vi và theo dõi cách nó được gọi trong quá trình test.

```typescript
// Mock một function
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ id: 1 }); // async
mockFn.mockRejectedValue(new Error('fail')); // async throw

// Kiểm tra mock đã được gọi chưa
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

// Mock toàn bộ module
jest.mock('../users/users.service');

// Spy — mock một method của object thật
jest.spyOn(service, 'findAll').mockResolvedValue([]);
```

### 1.4 Ví dụ Unit Test

#### 1.4.1. Testing Controller

Controller test kiểm tra logic route: nhận request, gọi đúng service, trả về đúng response. Service được **mock hoàn toàn**.

**UsersController**

```typescript
// src/users/users.controller.ts
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, ParseIntPipe, NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
```

**Controller Spec**

```typescript
// src/users/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Dữ liệu dùng chung trong test
const mockUsers = [
  { userId: 1, username: 'john', email: 'john@example.com' },
  { userId: 2, username: 'maria', email: 'maria@example.com' },
];

// Mock toàn bộ UsersService
const mockUsersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('nên trả về mảng users', async () => {
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUsers);
    });

    it('nên trả về mảng rỗng nếu không có user', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toHaveLength(0);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('nên trả về user theo id', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUsers[0]);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUsers[0]);
    });

    it('nên throw NotFoundException nếu không tìm thấy user', async () => {
      mockUsersService.findOne.mockResolvedValue(undefined);

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(999)).rejects.toThrow('User #999 not found');
    });
  });

  // ── create ─────────────────────────────────────────────────────────
  describe('create()', () => {
    it('nên tạo user mới và trả về user đó', async () => {
      const dto = { username: 'new', email: 'new@example.com', password: 'pass123' };
      const created = { userId: 3, ...dto };
      mockUsersService.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  // ── update ─────────────────────────────────────────────────────────
  describe('update()', () => {
    it('nên cập nhật user theo id', async () => {
      const dto = { username: 'john_updated' };
      const updated = { ...mockUsers[0], ...dto };
      mockUsersService.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result.username).toBe('john_updated');
    });
  });

  // ── remove ─────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('nên xóa user theo id', async () => {
      mockUsersService.remove.mockResolvedValue({ affected: 1 });

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
```

---

#### 1.4.2 Testing Service

Service test kiểm tra business logic: tính toán, validation, xử lý lỗi. Repository/external dependency được **mock**.

**UsersService**

```typescript
// src/users/users.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOne(userId: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { userId } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.usersRepository.findOne({
      where: { username: dto.username },
    });
    if (exists) {
      throw new ConflictException('Username already taken');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({ ...dto, password: hashed });
    return this.usersRepository.save(user);
  }

  async update(userId: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(userId);
    if (!user) throw new NotFoundException(`User #${userId} not found`);
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async remove(userId: number): Promise<void> {
    const user = await this.findOne(userId);
    if (!user) throw new NotFoundException(`User #${userId} not found`);
    await this.usersRepository.delete(userId);
  }
}
```

**Service Spec**

```typescript
// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

// Mock Repository — chỉ mock các method dùng đến
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('nên trả về mảng tất cả users', async () => {
      const users: User[] = [
        { userId: 1, username: 'john', email: 'john@example.com', password: 'hashed' },
      ];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual(users);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('nên trả về user nếu tìm thấy', async () => {
      const user = { userId: 1, username: 'john', email: 'john@example.com' };
      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { userId: 1 } });
      expect(result).toEqual(user);
    });

    it('nên trả về null nếu không tìm thấy', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  // ── create ─────────────────────────────────────────────────────────
  describe('create()', () => {
    const dto = {
      username: 'new_user',
      email: 'new@example.com',
      password: 'plaintext',
    };

    it('nên tạo user mới, hash password trước khi lưu', async () => {
      mockRepository.findOne.mockResolvedValue(null); // username chưa tồn tại
      mockRepository.create.mockImplementation(data => data);
      mockRepository.save.mockImplementation(user => Promise.resolve({ userId: 1, ...user }));

      const result = await service.create(dto);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      // Password đã được hash, không còn là plaintext
      expect(result.password).not.toBe(dto.password);
      expect(result.password).toMatch(/^\$2b\$/); // bcrypt hash prefix
    });

    it('nên throw ConflictException nếu username đã tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue({ userId: 1, username: dto.username });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow('Username already taken');

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  // ── update ─────────────────────────────────────────────────────────
  describe('update()', () => {
    it('nên cập nhật và trả về user đã thay đổi', async () => {
      const existing = { userId: 1, username: 'john', email: 'john@example.com' };
      const dto = { username: 'john_v2' };
      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue({ ...existing, ...dto });

      const result = await service.update(1, dto);

      expect(result.username).toBe('john_v2');
    });

    it('nên throw NotFoundException nếu user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('nên gọi delete() khi user tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue({ userId: 1 });
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(1);

      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('nên throw NotFoundException khi user không tồn tại', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});
```

Chạy test:

```bash
npm run test
```

---

## 2. Integration Testing

### 2.1 Integration Testing là gì?

**Integration Test** kiểm tra sự phối hợp giữa nhiều thành phần (Service + Repository, Controller + Service...). Không mock tất cả — chỉ mock những thứ bên ngoài hệ thống (database, HTTP external).

```
Unit Test        Integration Test     E2E Test
   │                    │                │
1 function        2+ components     Toàn bộ app
Mock tất cả      Mock một phần      Không mock
Rất nhanh            Trung bình         Chậm
```

### 2.2 Testing Module trong NestJS

NestJS cung cấp `Test.createTestingModule()` để tạo một module test cô lập — đây là nền tảng cho cả Unit và Integration test:

```typescript
import { Test, TestingModule } from '@nestjs/testing';

// Tạo module với đầy đủ dependency thật
const moduleRef: TestingModule = await Test.createTestingModule({
  imports: [UsersModule],         // Import module thật
  providers: [UsersService],      // Hoặc khai báo provider thật
}).compile();

const service = moduleRef.get(UsersService);
```

### 2.3 Ví dụ Integration Test: Service + Repository

```typescript
// src/users/users.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersService — Integration', () => {
  let service: UsersService;
  let repo: Repository<User>;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepo,   // Mock repository, dùng service thật
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll() gọi repo.find() và trả về danh sách', async () => {
    const users = [{ userId: 1, username: 'john' }];
    mockRepo.find.mockResolvedValue(users);

    const result = await service.findAll();

    expect(repo.find).toHaveBeenCalledTimes(1);
    expect(result).toEqual(users);
  });

  it('findOne() trả về undefined khi không tìm thấy user', async () => {
    mockRepo.findOne.mockResolvedValue(undefined);

    const result = await service.findOne(999);

    expect(result).toBeUndefined();
  });
});
```

---

## 3. E2E Testing

### 3.1 E2E Testing là gì?

**E2E (End-to-End) Test** khởi động toàn bộ ứng dụng NestJS và gửi HTTP request thật, kiểm tra response từ đầu đến cuối — giống người dùng thật dùng API. Dùng **Supertest** để gửi request.

```
Client (Supertest)
      │  HTTP Request
      ▼
  NestJS App (thật)
      │
  Controller → Service → Repository
                              │
                         (thường mock DB
                          hoặc dùng DB test)
      │  HTTP Response
      ▼
  Assert status, body
```

### 3.2 Cấu hình jest-e2e.json

```json
// test/jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

Chạy E2E test:

```bash
npm run test:e2e
```

### 3.3 Khởi tạo app trong E2E test

```typescript
// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Users API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Phải thiết lập y chang main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /users → 200', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect(res => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

---

## 6. Supertest test API

**Supertest** gửi HTTP request thật đến app NestJS đang chạy trong môi trường test, kiểm tra toàn bộ stack từ routing → controller → service → response.

### 6.1 Cài đặt

```bash
npm install --save-dev supertest @types/supertest
```

### 6.2 E2E Test CRUD Users

```typescript
// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';

describe('Users API (e2e)', () => {
  let app: INestApplication;

  // Mock repository dùng trong toàn bộ E2E test
  const mockUsersRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override repository bằng mock để không cần database thật
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUsersRepo)
      .compile();

    app = moduleFixture.createNestApplication();

    // Phải cấu hình y chang main.ts
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  // ── GET /users ─────────────────────────────────────────────────────
  describe('GET /users', () => {
    it('200 — trả về danh sách users', async () => {
      const users = [{ userId: 1, username: 'john', email: 'john@example.com' }];
      mockUsersRepo.find.mockResolvedValue(users);

      const res = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(res.body).toEqual(users);
    });

    it('200 — trả về mảng rỗng khi không có user', async () => {
      mockUsersRepo.find.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  // ── GET /users/:id ─────────────────────────────────────────────────
  describe('GET /users/:id', () => {
    it('200 — trả về user theo id', async () => {
      const user = { userId: 1, username: 'john', email: 'john@example.com' };
      mockUsersRepo.findOne.mockResolvedValue(user);

      const res = await request(app.getHttpServer())
        .get('/users/1')
        .expect(200);

      expect(res.body).toEqual(user);
    });

    it('404 — user không tồn tại', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/users/999')
        .expect(404);

      expect(res.body.message).toBe('User #999 not found');
    });

    it('400 — id không phải số', async () => {
      await request(app.getHttpServer())
        .get('/users/abc')
        .expect(400);
    });
  });

  // ── POST /users ────────────────────────────────────────────────────
  describe('POST /users', () => {
    it('201 — tạo user thành công', async () => {
      const dto = { username: 'new', email: 'new@example.com', password: 'pass1234' };
      const saved = { userId: 2, username: 'new', email: 'new@example.com' };

      mockUsersRepo.findOne.mockResolvedValue(null); // username chưa tồn tại
      mockUsersRepo.create.mockReturnValue(dto);
      mockUsersRepo.save.mockResolvedValue(saved);

      const res = await request(app.getHttpServer())
        .post('/users')
        .send(dto)
        .expect(201);

      expect(res.body.username).toBe('new');
      expect(res.body.password).toBeUndefined(); // Không trả về password
    });

    it('400 — thiếu field bắt buộc', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ username: 'no-email' }) // thiếu email và password
        .expect(400);

      expect(res.body.message).toBeInstanceOf(Array);
    });

    it('400 — email không hợp lệ', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ username: 'u', email: 'not-an-email', password: 'pass1234' })
        .expect(400);

      expect(res.body.message).toContain('email must be an email');
    });

    it('409 — username đã tồn tại', async () => {
      mockUsersRepo.findOne.mockResolvedValue({ userId: 1, username: 'existing' });

      const res = await request(app.getHttpServer())
        .post('/users')
        .send({ username: 'existing', email: 'a@example.com', password: 'pass1234' })
        .expect(409);

      expect(res.body.message).toBe('Username already taken');
    });
  });

  // ── PUT /users/:id ─────────────────────────────────────────────────
  describe('PUT /users/:id', () => {
    it('200 — cập nhật user thành công', async () => {
      const existing = { userId: 1, username: 'john', email: 'john@example.com' };
      const updated = { ...existing, username: 'john_v2' };

      mockUsersRepo.findOne.mockResolvedValue(existing);
      mockUsersRepo.save.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .put('/users/1')
        .send({ username: 'john_v2' })
        .expect(200);

      expect(res.body.username).toBe('john_v2');
    });

    it('404 — user không tồn tại', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put('/users/999')
        .send({ username: 'x' })
        .expect(404);
    });
  });

  // ── DELETE /users/:id ──────────────────────────────────────────────
  describe('DELETE /users/:id', () => {
    it('200 — xóa user thành công', async () => {
      mockUsersRepo.findOne.mockResolvedValue({ userId: 1 });
      mockUsersRepo.delete.mockResolvedValue({ affected: 1 });

      await request(app.getHttpServer())
        .delete('/users/1')
        .expect(200);
    });

    it('404 — xóa user không tồn tại', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/users/999')
        .expect(404);
    });
  });
});
```

### 6.3 E2E Test Auth (có JWT)

```typescript
// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /auth/register → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'pass1234' })
      .expect(201);

    expect(res.body.username).toBe('testuser');
    expect(res.body.password).toBeUndefined();
  });

  it('POST /auth/login → 200 + trả về tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'pass1234' })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /auth/login với sai password → 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testuser', password: 'wrong' })
      .expect(401);
  });

  it('GET /auth/profile với token hợp lệ → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`) // đính kèm token
      .expect(200);

    expect(res.body.username).toBe('testuser');
  });

  it('GET /auth/profile không có token → 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/profile')
      .expect(401);
  });

  it('POST /auth/refresh → 200 + cặp token mới', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    // Token mới phải khác token cũ (Token Rotation)
    expect(res.body.accessToken).not.toBe(accessToken);
    expect(res.body.refreshToken).not.toBe(refreshToken);

    accessToken = res.body.accessToken; // cập nhật token mới
  });

  it('POST /auth/logout → 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.message).toBe('Logged out successfully');
  });
});
```

---

## Chạy test và xem coverage

```bash
# Chạy tất cả unit test
npm run test

# Chạy test ở chế độ watch (tự chạy lại khi có thay đổi)
npm run test:watch

# Chạy test + xuất báo cáo coverage
npm run test:cov

# Chỉ chạy test của một file cụ thể
npx jest users.service.spec.ts

# Chạy E2E test
npm run test:e2e
```

Kết quả coverage mẫu:

```
 PASS  src/users/users.service.spec.ts
 PASS  src/users/users.controller.spec.ts

----------|---------|----------|---------|---------|
File      | % Stmts | % Branch | % Funcs | % Lines |
----------|---------|----------|---------|---------|
All files |   95.24 |    88.89 |     100 |   95.12 |
 users/   |         |          |         |         |
  ctrl.ts |   100   |    100   |     100 |   100   |
  svc.ts  |   92.86 |    83.33 |     100 |   92.59 |
----------|---------|----------|---------|---------|
```

---

## Tóm tắt so sánh 3 loại test

| | Unit Test | Integration Test | E2E Test |
|---|---|---|---|
| **Phạm vi** | 1 function/method | 2+ components | Toàn bộ app |
| **Mock** | Tất cả dependency | Chỉ external (DB...) | Thường mock DB |
| **Tốc độ** | Rất nhanh (ms) | Trung bình | Chậm (s) |
| **File** | `*.spec.ts` | `*.spec.ts` | `test/*.e2e-spec.ts` |
| **Công cụ** | Jest | Jest + TestingModule | Jest + Supertest |
| **Phát hiện lỗi** | Logic đơn lẻ | Tương tác components | Luồng người dùng |
| **Tỉ lệ nên có** | ~70% | ~20% | ~10% |

> **Quy tắc vàng:** Viết nhiều Unit Test, ít Integration Test, và một số ít E2E Test cho các luồng quan trọng nhất — đây là mô hình **Testing Pyramid**.