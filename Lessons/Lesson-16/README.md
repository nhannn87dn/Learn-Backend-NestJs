# Lesson 16: Testing trong NestJS

## Phần 1: Testing Fundamentals

### Tại sao cần Testing?

Hãy tưởng tượng bạn đang làm việc trên một dự án e-commerce. Sau 6 tháng phát triển, codebase đã có hàng trăm file. Một hôm, bạn sửa logic tính giá trong `OrderService` để thêm tính năng discount. Ba ngày sau, khách hàng phàn nàn rằng họ không nhận được email xác nhận đơn hàng nữa — hóa ra logic tính giá mới đã vô tình break một điều kiện trong `NotificationService` mà bạn không hề hay biết.

Đây là lý do tồn tại của testing.

**Testing mang lại:**

- **Sự tự tin khi refactor:** Bạn có thể thay đổi code mà không sợ "phá" thứ gì đó ngầm bên trong
- **Tài liệu sống:** Test case mô tả chính xác hành vi mong đợi của hệ thống — rõ hơn bất kỳ comment nào
- **Phát hiện bug sớm:** Bug tìm thấy lúc viết test rẻ hơn bug tìm thấy trên production gấp 10–100 lần
- **Thiết kế tốt hơn:** Code khó test thường là code thiết kế kém. Testing ép bạn viết code modular, loose coupling
- **Onboarding nhanh hơn:** Dev mới đọc test để hiểu hệ thống hoạt động ra sao

### Testing Pyramid

Testing pyramid là một mô hình kinh điển mô tả cách phân bổ các loại test:

```
           /\
          /  \
         / E2E\          ← Ít nhất, chạy chậm, test cả hệ thống
        /------\
       /        \
      /Integration\      ← Vừa phải, test nhiều module cùng nhau
     /------------\
    /              \
   /   Unit Tests   \    ← Nhiều nhất, chạy nhanh, test từng đơn vị nhỏ
  /------------------\
```

| Loại test | Số lượng | Tốc độ | Chi phí | Mục tiêu |
|---|---|---|---|---|
| **Unit Test** | ~70% | Rất nhanh (ms) | Thấp | Test từng function/class riêng lẻ |
| **Integration Test** | ~20% | Vừa (giây) | Trung bình | Test nhiều module phối hợp |
| **E2E Test** | ~10% | Chậm (giây → phút) | Cao | Test toàn bộ flow từ đầu đến cuối |

> 💡 **Nguyên tắc thực tế:** Đừng cố đạt 100% coverage bằng E2E test — vừa tốn thời gian vừa khó maintain. Hãy đẩy phần lớn logic xuống unit test.

### Test Coverage

**Test coverage** là phần trăm dòng code được chạy qua khi test thực thi. Nhưng coverage cao không đồng nghĩa với test chất lượng cao.

```
Coverage 100% ≠ Không có bug
Coverage 0%   = Chắc chắn có nhiều bug tiềm ẩn
```

Các loại coverage metric:

- **Statement coverage:** % câu lệnh được thực thi
- **Branch coverage:** % nhánh điều kiện (if/else, ternary) được thực thi
- **Function coverage:** % hàm được gọi
- **Line coverage:** % dòng code được chạy

> 💡 **Mục tiêu thực tế:** Aim cho 70–80% coverage, tập trung vào business logic phức tạp. Đừng chase số liệu mà bỏ qua chất lượng test.

### AAA Pattern

**Arrange – Act – Assert** là cấu trúc chuẩn của một test case:

```typescript
it('should calculate total price with discount', () => {
  // ARRANGE — Chuẩn bị dữ liệu và điều kiện
  const order = { items: [{ price: 100 }, { price: 200 }] };
  const discountPercent = 10;

  // ACT — Thực thi hành động cần test
  const result = orderService.calculateTotal(order, discountPercent);

  // ASSERT — Kiểm tra kết quả
  expect(result).toBe(270); // 300 - 10% = 270
});
```

Cấu trúc này giúp test dễ đọc và dễ maintain. Mỗi test chỉ nên test **một điều duy nhất**.

### TDD Introduction

**Test-Driven Development (TDD)** là phương pháp viết test TRƯỚC khi viết code implementation:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  1. RED     │ ───► │  2. GREEN   │ ───► │  3. REFACTOR│
│ Viết test   │      │  Viết code  │      │  Tối ưu code│
│ → Fail      │      │  → Pass     │      │  Test vẫn   │
│             │      │             │      │  pass       │
└─────────────┘      └─────────────┘      └─────────────┘
        ▲                                        │
        └────────────────────────────────────────┘
                     Lặp lại
```

TDD phù hợp khi: bạn biết rõ requirement, đang refactor, hoặc fix bug (viết test reproduce bug trước).

---

## Phần 2: Testing Setup

### Jest Configuration

NestJS đã cấu hình sẵn Jest khi bạn tạo project bằng CLI. Nhưng hiểu rõ cấu hình giúp bạn tùy chỉnh linh hoạt hơn.

```json
// package.json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",        // File test phải có đuôi .spec.ts
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"           // Dùng ts-jest để compile TypeScript
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s",
      "!**/*.spec.(t|j)s",                 // Không tính file test vào coverage
      "!**/node_modules/**",
      "!**/dist/**",
      "!src/main.ts"                        // Không tính main.ts
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1"           // Alias path nếu dùng
    }
  }
}
```

Hoặc tách ra file riêng cho gọn:

```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',           // Unit tests
    '<rootDir>/test/**/*.e2e-spec.ts',      // E2E tests
  ],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  // Tách E2E config riêng
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      testEnvironment: 'node',
    },
  ],
};
```

```json
// package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:unit": "jest --testPathPattern=src"
  }
}
```

### Test Environment

```typescript
// src/common/test/test-utils.ts
// Các helper function tái sử dụng cho test

import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';

export async function createTestingApp(
  moduleMetadata: Parameters<typeof Test.createTestingModule>[0],
): Promise<{ app: INestApplication; module: TestingModule }> {
  const module = await Test.createTestingModule(moduleMetadata).compile();

  const app = module.createNestApplication();

  // Apply cùng global config như production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return { app, module };
}
```

### Test Database Setup

Với integration/E2E test cần database, có 3 lựa chọn phổ biến:

```typescript
// Cách 1: SQLite in-memory (đơn giản nhất)
// test/jest-e2e.json
{
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  },
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

```typescript
// Cách 2: Dùng TypeORM với SQLite cho test
// test/test-db.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const testDbConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: ':memory:',   // In-memory, reset sau mỗi test run
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  synchronize: true,      // Tự tạo schema — chỉ dùng cho test
  dropSchema: true,       // Drop và recreate mỗi lần
  logging: false,
};
```

```typescript
// Cách 3: Test database thật (PostgreSQL riêng cho test)
export const testDbConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT) || 5433, // Port khác production
  username: process.env.TEST_DB_USER || 'test',
  password: process.env.TEST_DB_PASS || 'test',
  database: process.env.TEST_DB_NAME || 'todo_test',
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  synchronize: true,
};
```

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  // ...
  coverageThreshold: {
    global: {
      branches: 70,     // Ít nhất 70% branch coverage
      functions: 80,    // Ít nhất 80% function coverage
      lines: 80,
      statements: 80,
    },
    // Threshold cho file/folder cụ thể
    './src/todos/todos.service.ts': {
      lines: 90,        // Service phức tạp cần coverage cao hơn
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],  // Xuất ra nhiều format
};
```

---

## Phần 3: Unit Testing

### 3.1 Jest trong NestJS

Jest là testing framework mặc định của NestJS. Dưới đây là các khái niệm cơ bản:

```typescript
// Cấu trúc cơ bản một test file
describe('TodosService', () => {
  // describe: nhóm các test có liên quan

  let service: TodosService;

  // beforeAll: chạy MỘT LẦN trước tất cả test trong describe block
  beforeAll(async () => {
    // Setup tốn kém (kết nối DB, khởi tạo app)
  });

  // beforeEach: chạy TRƯỚC MỖI test
  beforeEach(async () => {
    // Reset state, tạo fresh instance
    service = new TodosService();
  });

  // afterEach: chạy SAU MỖI test
  afterEach(() => {
    jest.clearAllMocks(); // Xóa mock data sau mỗi test
  });

  // afterAll: chạy MỘT LẦN sau tất cả test
  afterAll(async () => {
    // Dọn dẹp (đóng kết nối DB)
  });

  // it / test: một test case
  it('should do something', () => {
    expect(true).toBe(true);
  });

  // Bỏ qua test tạm thời
  it.skip('work in progress', () => { });

  // Chạy CHỈ test này (dùng khi debug, KHÔNG commit)
  it.only('focus on this', () => { });
});
```

**Các Matcher quan trọng:**

```typescript
// Equality
expect(value).toBe(42);              // Strict equality (===)
expect(obj).toEqual({ id: 1 });      // Deep equality
expect(obj).toStrictEqual({ id: 1 });// Strict deep equality (kiểm tra class)

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThanOrEqual(10);
expect(0.1 + 0.2).toBeCloseTo(0.3); // Floating point

// Strings
expect(str).toContain('hello');
expect(str).toMatch(/pattern/);

// Arrays
expect(arr).toHaveLength(3);
expect(arr).toContain('item');
expect(arr).toEqual(expect.arrayContaining(['a', 'b']));

// Objects
expect(obj).toHaveProperty('name', 'Alice');
expect(obj).toMatchObject({ id: 1 }); // Partial match

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');
expect(() => fn()).toThrow(CustomError);

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow('error');
```

### 3.2 Test Services

Service chứa business logic — đây là nơi cần test kỹ nhất.

```typescript
// src/todos/todos.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './entities/todo.entity';
import { CreateTodoDto } from './dto/create-todo.dto';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
  ) {}

  async findAll(): Promise<Todo[]> {
    return this.todoRepository.find();
  }

  async findOne(id: number): Promise<Todo> {
    const todo = await this.todoRepository.findOne({ where: { id } });
    if (!todo) {
      throw new NotFoundException(`Todo #${id} không tồn tại`);
    }
    return todo;
  }

  async create(dto: CreateTodoDto): Promise<Todo> {
    const todo = this.todoRepository.create(dto);
    return this.todoRepository.save(todo);
  }

  async complete(id: number): Promise<Todo> {
    const todo = await this.findOne(id);
    todo.completed = true;
    todo.completedAt = new Date();
    return this.todoRepository.save(todo);
  }
}
```

```typescript
// src/todos/todos.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TodosService } from './todos.service';
import { Todo } from './entities/todo.entity';

// Factory tạo mock todo để dùng lại
const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 1,
  title: 'Học NestJS',
  description: null,
  completed: false,
  completedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('TodosService', () => {
  let service: TodosService;
  let repository: jest.Mocked<Repository<Todo>>;

  beforeEach(async () => {
    // Tạo mock repository
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        {
          provide: getRepositoryToken(Todo),  // Token của repository
          useValue: mockRepository,            // Thay bằng mock
        },
      ],
    }).compile();

    service = module.get<TodosService>(TodosService);
    repository = module.get(getRepositoryToken(Todo));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── findAll ─────────────────────────────────────────────────────
  describe('findAll', () => {
    it('nên trả về danh sách todos', async () => {
      // Arrange
      const todos = [createMockTodo({ id: 1 }), createMockTodo({ id: 2 })];
      repository.find.mockResolvedValue(todos);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(todos);
      expect(repository.find).toHaveBeenCalledTimes(1);
    });

    it('nên trả về mảng rỗng nếu không có todo', async () => {
      repository.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────
  describe('findOne', () => {
    it('nên trả về todo khi tìm thấy', async () => {
      const todo = createMockTodo();
      repository.findOne.mockResolvedValue(todo);

      const result = await service.findOne(1);

      expect(result).toEqual(todo);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('nên throw NotFoundException khi không tìm thấy', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Todo #999 không tồn tại');
    });
  });

  // ─── create ──────────────────────────────────────────────────────
  describe('create', () => {
    it('nên tạo và trả về todo mới', async () => {
      const dto = { title: 'Viết test', priority: 'medium' };
      const createdTodo = createMockTodo({ title: dto.title });

      repository.create.mockReturnValue(createdTodo);
      repository.save.mockResolvedValue(createdTodo);

      const result = await service.create(dto as any);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(createdTodo);
      expect(result).toEqual(createdTodo);
    });
  });

  // ─── complete ────────────────────────────────────────────────────
  describe('complete', () => {
    it('nên đánh dấu todo là completed', async () => {
      const todo = createMockTodo({ completed: false });
      const savedTodo = { ...todo, completed: true, completedAt: expect.any(Date) };

      repository.findOne.mockResolvedValue(todo);
      repository.save.mockResolvedValue(savedTodo as Todo);

      const result = await service.complete(1);

      expect(result.completed).toBe(true);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ completed: true }),
      );
    });

    it('nên throw NotFoundException nếu todo không tồn tại', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.complete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
```

### 3.3 Mock Dependencies

Hiểu rõ sự khác nhau giữa các loại mock là cực kỳ quan trọng:

```typescript
// ─── Mock (thay thế hoàn toàn) ───────────────────────────────────
const mockEmailService = {
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendResetEmail: jest.fn().mockResolvedValue({ success: true }),
};

// ─── Spy (theo dõi function thật, có thể override) ───────────────
const spy = jest.spyOn(emailService, 'sendWelcomeEmail');
spy.mockResolvedValue({ success: true }); // Override return value
// Hoặc giữ implementation thật:
// spy.mockImplementation(realImplementation);

// Verify
expect(spy).toHaveBeenCalledWith('user@example.com', 'Alice');
spy.mockRestore(); // Khôi phục function gốc

// ─── Stub (trả về giá trị cố định) ───────────────────────────────
jest.fn().mockReturnValue(42);             // Sync
jest.fn().mockResolvedValue({ id: 1 });    // Async resolve
jest.fn().mockRejectedValue(new Error());  // Async reject

// Trả về giá trị khác nhau theo lần gọi:
jest.fn()
  .mockResolvedValueOnce({ id: 1 })  // Lần 1
  .mockResolvedValueOnce({ id: 2 })  // Lần 2
  .mockResolvedValue(null);           // Các lần còn lại
```

**Mock Factories — tái sử dụng mock:**

```typescript
// src/common/test/mock-factories.ts

// Factory cho UserRepository
export const createMockUserRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
  }),
});

// Factory cho EmailService
export const createMockEmailService = () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  sendNotification: jest.fn().mockResolvedValue(undefined),
});

// Factory cho ConfigService
export const createMockConfigService = (overrides: Record<string, any> = {}) => ({
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
      ...overrides,
    };
    return config[key];
  }),
});
```

### 3.4 Test Controllers

Controller test tập trung vào HTTP layer: routing, request parsing, response format, và service calls.

```typescript
// src/todos/todos.controller.ts (simplified)
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll(@Query('completed') completed?: string) {
    return this.todosService.findAll(completed === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.todosService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateTodoDto) {
    return this.todosService.create(dto);
  }
}
```

```typescript
// src/todos/todos.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';
import { NotFoundException } from '@nestjs/common';

describe('TodosController', () => {
  let controller: TodosController;
  let service: jest.Mocked<TodosService>;

  const mockTodosService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodosController],
      providers: [
        { provide: TodosService, useValue: mockTodosService },
      ],
    }).compile();

    controller = module.get<TodosController>(TodosController);
    service = module.get(TodosService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('nên gọi service.findAll với tham số đúng', async () => {
      const todos = [{ id: 1, title: 'Test' }];
      service.findAll.mockResolvedValue(todos as any);

      const result = await controller.findAll('true');

      expect(service.findAll).toHaveBeenCalledWith(true);
      expect(result).toEqual(todos);
    });
  });

  describe('findOne', () => {
    it('nên trả về todo tìm thấy', async () => {
      const todo = { id: 1, title: 'Test' };
      service.findOne.mockResolvedValue(todo as any);

      const result = await controller.findOne(1);
      expect(result).toEqual(todo);
    });

    it('nên để exception propagate khi service throw', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('nên gọi service.create với DTO', async () => {
      const dto = { title: 'New todo', priority: 'medium' };
      const created = { id: 1, ...dto };
      service.create.mockResolvedValue(created as any);

      const result = await controller.create(dto as any);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });
});
```

### 3.5 Test Guards, Pipes, Interceptors, Filters

```typescript
// src/auth/jwt-auth.guard.spec.ts
import { JwtAuthGuard } from './jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = { verify: jest.fn() } as any;
    guard = new JwtAuthGuard(jwtService);
  });

  // Helper tạo mock ExecutionContext
  const createMockContext = (headers: Record<string, string>) => ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext);

  it('nên cho phép request với token hợp lệ', () => {
    jwtService.verify.mockReturnValue({ userId: 1, email: 'test@test.com' });

    const ctx = createMockContext({
      authorization: 'Bearer valid-token',
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('nên từ chối request không có token', () => {
    const ctx = createMockContext({});
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('nên từ chối request với token hết hạn', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const ctx = createMockContext({ authorization: 'Bearer expired-token' });
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
```

```typescript
// src/common/pipes/parse-positive-int.pipe.spec.ts
import { ParsePositiveIntPipe } from './parse-positive-int.pipe';
import { BadRequestException } from '@nestjs/common';

describe('ParsePositiveIntPipe', () => {
  let pipe: ParsePositiveIntPipe;

  beforeEach(() => {
    pipe = new ParsePositiveIntPipe();
  });

  it('nên transform string thành number', () => {
    expect(pipe.transform('5')).toBe(5);
    expect(pipe.transform('100')).toBe(100);
  });

  it('nên throw BadRequestException cho số âm', () => {
    expect(() => pipe.transform('-1')).toThrow(BadRequestException);
  });

  it('nên throw BadRequestException cho số 0', () => {
    expect(() => pipe.transform('0')).toThrow(BadRequestException);
  });

  it('nên throw BadRequestException cho chuỗi không phải số', () => {
    expect(() => pipe.transform('abc')).toThrow(BadRequestException);
  });
});
```

```typescript
// src/common/interceptors/logging.interceptor.spec.ts
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('nên log request và tiếp tục xử lý', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/todos' }),
      }),
    } as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ data: 'response' }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({ data: 'response' });
        expect(console.log).toHaveBeenCalled();
        done();
      },
    });
  });
});
```

---

## Phần 4: Integration Testing

Integration test kiểm tra nhiều component hoạt động cùng nhau — nhưng vẫn mock những thứ bên ngoài như external API hay email service.

```typescript
// src/todos/todos.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosModule } from './todos.module';
import { TodosService } from './todos.service';
import { Todo } from './entities/todo.entity';
import { testDbConfig } from '../../test/test-db.config';

describe('TodosModule Integration', () => {
  let module: TestingModule;
  let todosService: TodosService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),  // DB thật (SQLite in-memory)
        TodosModule,                           // Module thật
      ],
    }).compile();

    todosService = module.get<TodosService>(TodosService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('create và findOne', () => {
    it('nên tạo todo và tìm lại được', async () => {
      // Arrange
      const dto = { title: 'Integration test todo', priority: 'high' };

      // Act
      const created = await todosService.create(dto as any);
      const found = await todosService.findOne(created.id);

      // Assert
      expect(found.id).toBe(created.id);
      expect(found.title).toBe(dto.title);
    });
  });

  describe('complete', () => {
    it('nên cập nhật trạng thái completed trong DB', async () => {
      // Tạo todo
      const todo = await todosService.create({ title: 'Test', priority: 'low' } as any);
      expect(todo.completed).toBe(false);

      // Complete
      await todosService.complete(todo.id);

      // Verify từ DB
      const updated = await todosService.findOne(todo.id);
      expect(updated.completed).toBe(true);
      expect(updated.completedAt).toBeInstanceOf(Date);
    });
  });
});
```

### Database Integration

```typescript
// src/todos/todos-db.integration.spec.ts
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

describe('TodosService với real database', () => {
  let dataSource: DataSource;
  let todoRepository: Repository<Todo>;

  beforeEach(async () => {
    // Xóa dữ liệu trước mỗi test để đảm bảo isolation
    await todoRepository.clear();
  });

  it('nên count đúng số lượng todos', async () => {
    await todoRepository.save([
      todoRepository.create({ title: 'Todo 1', priority: 'low' }),
      todoRepository.create({ title: 'Todo 2', priority: 'high' }),
    ]);

    const count = await todoRepository.count();
    expect(count).toBe(2);
  });
});
```

### Cache Integration

```typescript
// src/todos/todos-cache.integration.spec.ts
import { CacheModule } from '@nestjs/cache-manager';

describe('TodosService với Cache', () => {
  let module: TestingModule;
  let todosService: TodosService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        CacheModule.register({
          store: 'memory',  // In-memory cache cho test
          ttl: 60,
        }),
        TypeOrmModule.forRoot(testDbConfig),
        TodosModule,
      ],
    }).compile();

    todosService = module.get<TodosService>(TodosService);
  });

  it('nên cache kết quả findAll', async () => {
    await todosService.findAll();  // Lần 1: hit DB
    await todosService.findAll();  // Lần 2: từ cache

    // Verify repository chỉ được gọi 1 lần
    const repo = module.get<Repository<Todo>>(getRepositoryToken(Todo));
    // (Nếu dùng spy)
  });
});
```

### External APIs Integration

```typescript
// src/weather/weather.service.spec.ts — Test service gọi API bên ngoài
import { HttpModule, HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [WeatherService],
    })
      .overrideProvider(HttpService)
      .useValue({ get: jest.fn() })
      .compile();

    service = module.get<WeatherService>(WeatherService);
    httpService = module.get(HttpService);
  });

  it('nên trả về nhiệt độ từ API', async () => {
    const mockResponse = {
      data: { temperature: 28, city: 'Ho Chi Minh City' },
      status: 200,
    } as AxiosResponse;

    httpService.get.mockReturnValue(of(mockResponse));

    const result = await service.getWeather('HCM');
    expect(result.temperature).toBe(28);
  });
});
```

---

## Phần 5: E2E Testing

E2E test kiểm tra toàn bộ luồng từ HTTP request đến response, giống như cách user thực sự sử dụng API.

### 5.1 E2E Setup

```typescript
// test/jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  }
}
```

```typescript
// test/app.e2e-spec.ts — Setup chuẩn cho E2E
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('App (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],    // Import AppModule thật
    })
      // Override database config để dùng test DB
      .overrideProvider('DATABASE_CONFIG')
      .useValue(testDbConfig)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply ĐÚNG global setup như production
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  afterEach(async () => {
    // Xóa dữ liệu sau mỗi test
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repo = dataSource.getRepository(entity.name);
      await repo.clear();
    }
  });
});
```

**Fixtures & Seeding:**

```typescript
// test/fixtures/todo.fixture.ts
import { DataSource } from 'typeorm';
import { Todo } from '../../src/todos/entities/todo.entity';

export class TodoFixture {
  constructor(private dataSource: DataSource) {}

  async createTodo(overrides: Partial<Todo> = {}): Promise<Todo> {
    const repo = this.dataSource.getRepository(Todo);
    const todo = repo.create({
      title: 'Default Todo',
      completed: false,
      priority: 'medium',
      ...overrides,
    });
    return repo.save(todo);
  }

  async createMultipleTodos(count: number): Promise<Todo[]> {
    return Promise.all(
      Array.from({ length: count }, (_, i) =>
        this.createTodo({ title: `Todo ${i + 1}` }),
      ),
    );
  }
}
```

### 5.2 Supertest

```typescript
// test/todos.e2e-spec.ts
import * as request from 'supertest';

describe('TodosController (e2e)', () => {
  // ... setup như trên

  // ─── GET /todos ───────────────────────────────────────────────────
  describe('GET /todos', () => {
    it('nên trả về mảng rỗng ban đầu', () => {
      return request(app.getHttpServer())
        .get('/todos')
        .expect(200)
        .expect([]);
    });

    it('nên trả về danh sách todos', async () => {
      await todoFixture.createMultipleTodos(3);

      const response = await request(app.getHttpServer())
        .get('/todos')
        .expect(200);

      expect(response.body).toHaveLength(3);
    });
  });

  // ─── POST /todos ─────────────────────────────────────────────────
  describe('POST /todos', () => {
    it('nên tạo todo mới', () => {
      return request(app.getHttpServer())
        .post('/todos')
        .send({ title: 'E2E Test Todo', priority: 'high' })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe('E2E Test Todo');
          expect(res.body.completed).toBe(false);
        });
    });

    it('nên trả về 400 khi thiếu title', () => {
      return request(app.getHttpServer())
        .post('/todos')
        .send({ priority: 'high' })    // Không có title
        .expect(400);
    });

    it('nên trả về 400 khi title rỗng', () => {
      return request(app.getHttpServer())
        .post('/todos')
        .send({ title: '', priority: 'high' })
        .expect(400);
    });
  });

  // ─── Authentication ───────────────────────────────────────────────
  describe('Authentication trong E2E', () => {
    let authToken: string;

    beforeEach(async () => {
      // Đăng nhập để lấy token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'password123' })
        .expect(200);

      authToken = loginResponse.body.access_token;
    });

    it('nên cho phép truy cập protected route với token', () => {
      return request(app.getHttpServer())
        .get('/todos/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('nên từ chối truy cập không có token', () => {
      return request(app.getHttpServer())
        .get('/todos/my')
        .expect(401);
    });
  });

  // ─── File Upload ─────────────────────────────────────────────────
  describe('File Upload', () => {
    it('nên upload và parse file CSV', () => {
      return request(app.getHttpServer())
        .post('/todos/import')
        .attach('file', Buffer.from('title,priority\nTodo 1,high\nTodo 2,low'), 'todos.csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.imported).toBe(2);
        });
    });
  });
});
```

### 5.3 Test API Scenarios

Test các flow nghiệp vụ hoàn chỉnh:

```typescript
// test/scenarios/auth.e2e-spec.ts
describe('Authentication Flow (e2e)', () => {
  describe('Registration Flow', () => {
    it('nên đăng ký thành công với dữ liệu hợp lệ', async () => {
      const registerDto = {
        email: 'newuser@test.com',
        password: 'Password123!',
        name: 'New User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        email: registerDto.email,
        name: registerDto.name,
      });
      expect(response.body.password).toBeUndefined(); // Không trả về password
    });

    it('nên từ chối đăng ký email đã tồn tại', async () => {
      const dto = { email: 'existing@test.com', password: 'Pass123!', name: 'User' };

      await request(app.getHttpServer()).post('/auth/register').send(dto).expect(201);
      await request(app.getHttpServer()).post('/auth/register').send(dto).expect(409); // Conflict
    });
  });

  describe('Login Flow', () => {
    beforeEach(async () => {
      // Seed user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'user@test.com', password: 'Password123!', name: 'Test User' });
    });

    it('nên đăng nhập thành công và nhận JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'Password123!' })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(typeof response.body.access_token).toBe('string');
    });

    it('nên từ chối sai mật khẩu', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'WrongPassword' })
        .expect(401);
    });
  });

  describe('CRUD Todo Flow', () => {
    it('nên tạo → cập nhật → hoàn thành → xóa todo', async () => {
      const { access_token } = await loginAsTestUser();
      const auth = { Authorization: `Bearer ${access_token}` };

      // 1. Tạo
      const { body: created } = await request(app.getHttpServer())
        .post('/todos')
        .set(auth)
        .send({ title: 'Test CRUD', priority: 'medium' })
        .expect(201);

      expect(created.id).toBeDefined();

      // 2. Cập nhật
      await request(app.getHttpServer())
        .patch(`/todos/${created.id}`)
        .set(auth)
        .send({ title: 'Updated Title' })
        .expect(200);

      // 3. Hoàn thành
      await request(app.getHttpServer())
        .post(`/todos/${created.id}/complete`)
        .set(auth)
        .expect(200);

      // 4. Verify
      const { body: final } = await request(app.getHttpServer())
        .get(`/todos/${created.id}`)
        .set(auth)
        .expect(200);

      expect(final.title).toBe('Updated Title');
      expect(final.completed).toBe(true);

      // 5. Xóa
      await request(app.getHttpServer())
        .delete(`/todos/${created.id}`)
        .set(auth)
        .expect(200);

      // 6. Confirm đã xóa
      await request(app.getHttpServer())
        .get(`/todos/${created.id}`)
        .set(auth)
        .expect(404);
    });
  });
});
```

---

## Phần 6: Advanced Testing

### Custom Utilities

```typescript
// test/utils/auth.helper.ts
export async function loginAsTestUser(
  app: INestApplication,
  credentials = { email: 'test@test.com', password: 'Password123!' },
): Promise<{ access_token: string; user: any }> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send(credentials);

  return response.body;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// Wrapper tiện lợi
export function authenticatedRequest(app: INestApplication, token: string) {
  return {
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set(authHeader(token)),
    post: (url: string) =>
      request(app.getHttpServer()).post(url).set(authHeader(token)),
    patch: (url: string) =>
      request(app.getHttpServer()).patch(url).set(authHeader(token)),
    delete: (url: string) =>
      request(app.getHttpServer()).delete(url).set(authHeader(token)),
  };
}
```

### Test Factories & Data Builders

**Builder pattern** cho test data:

```typescript
// test/builders/todo.builder.ts
export class TodoBuilder {
  private todo: Partial<Todo> = {
    title: 'Default Title',
    completed: false,
    priority: 'medium',
  };

  withTitle(title: string): this {
    this.todo.title = title;
    return this;
  }

  withPriority(priority: 'low' | 'medium' | 'high'): this {
    this.todo.priority = priority;
    return this;
  }

  completed(): this {
    this.todo.completed = true;
    this.todo.completedAt = new Date();
    return this;
  }

  build(): Partial<Todo> {
    return { ...this.todo };
  }
}

// Sử dụng:
const todo = new TodoBuilder()
  .withTitle('Quan trọng')
  .withPriority('high')
  .completed()
  .build();
```

### Parameterized Tests

```typescript
// Test nhiều case với describe.each / it.each
describe('TodosService validation', () => {
  const invalidTitleCases = [
    ['chuỗi rỗng', ''],
    ['chỉ khoảng trắng', '   '],
    ['quá dài', 'a'.repeat(101)],
  ];

  it.each(invalidTitleCases)(
    'nên throw error với title %s',
    async (description, title) => {
      await expect(
        todosService.create({ title, priority: 'low' } as any),
      ).rejects.toThrow();
    },
  );

  const priorityMapping = [
    ['low', 1],
    ['medium', 5],
    ['high', 10],
  ];

  it.each(priorityMapping)(
    'priority "%s" nên có score là %i',
    (priority, expectedScore) => {
      const score = todosService.getPriorityScore(priority as any);
      expect(score).toBe(expectedScore);
    },
  );
});
```

### Snapshot Testing

```typescript
// Snapshot test hữu ích cho response shape
describe('TodosController snapshot', () => {
  it('response shape không được thay đổi', async () => {
    const todo = createMockTodo({ id: 1, createdAt: new Date('2024-01-01') });
    service.findOne.mockResolvedValue(todo);

    const result = await controller.findOne(1);

    // Lần đầu chạy: tạo snapshot file
    // Các lần sau: so sánh với snapshot đã lưu
    expect(result).toMatchSnapshot();
  });
});
```

---

## Phần 7: Mocking Strategies

### TypeORM Mocking

```typescript
// Cách 1: Mock Repository hoàn toàn (đã thấy ở phần 3.2)
// Cách 2: Dùng @golevelup/ts-jest để tự động tạo mock
npm install --save-dev @golevelup/ts-jest

import { createMock } from '@golevelup/ts-jest';
import { Repository } from 'typeorm';

const mockRepo = createMock<Repository<Todo>>();
// Tất cả method đều là jest.fn() với đúng type signature
```

```typescript
// Cách 3: Mock QueryBuilder cho query phức tạp
const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockTodo], 1]),
  getOne: jest.fn().mockResolvedValue(mockTodo),
};

repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
```

### Redis/Cache Mocking

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
};

// Trong TestingModule:
{ provide: CACHE_MANAGER, useValue: mockCacheManager }

// Test:
it('nên cache kết quả', async () => {
  mockCacheManager.get.mockResolvedValue(null);      // Cache miss
  repository.find.mockResolvedValue([mockTodo]);

  await service.findAllCached();

  expect(mockCacheManager.set).toHaveBeenCalledWith(
    'todos:all',
    [mockTodo],
    expect.any(Number),
  );
});

it('nên trả về từ cache nếu có', async () => {
  mockCacheManager.get.mockResolvedValue([mockTodo]); // Cache hit

  await service.findAllCached();

  expect(repository.find).not.toHaveBeenCalled();   // Không hit DB
});
```

### HTTP Calls Mocking

```typescript
// Mock axios với axios-mock-adapter
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('ExternalApiService', () => {
  let axiosMock: MockAdapter;

  beforeEach(() => {
    axiosMock = new MockAdapter(axios);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  it('nên fetch data từ external API', async () => {
    axiosMock.onGet('/external/data').reply(200, { result: 'ok' });

    const result = await externalService.fetchData();
    expect(result).toEqual({ result: 'ok' });
  });

  it('nên xử lý lỗi network', async () => {
    axiosMock.onGet('/external/data').networkError();

    await expect(externalService.fetchData()).rejects.toThrow();
  });
});
```

### Date & Timer Mocking

```typescript
describe('Scheduled tasks', () => {
  beforeEach(() => {
    // Freeze time tại một thời điểm cụ thể
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers(); // Khôi phục timer thật
  });

  it('nên set createdAt đúng', async () => {
    const todo = await service.create({ title: 'Test', priority: 'low' } as any);
    expect(todo.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
  });

  it('nên trigger cleanup sau 1 giờ', async () => {
    const cleanupSpy = jest.spyOn(service, 'cleanup');

    service.scheduleCleanup();

    // Advance time 1 giờ
    jest.advanceTimersByTime(60 * 60 * 1000);

    expect(cleanupSpy).toHaveBeenCalled();
  });
});
```

### File System Mocking

```typescript
import * as fs from 'fs';

describe('FileService', () => {
  beforeEach(() => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue('file content');
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  it('nên đọc file', () => {
    const content = fileService.readConfig('config.json');
    expect(content).toBe('file content');
    expect(fs.readFileSync).toHaveBeenCalledWith('config.json', 'utf8');
  });
});
```

---

## Phần 8: Testing Best Practices

### Naming Conventions

Tên test case là tài liệu — hãy viết như đang mô tả hành vi:

```typescript
// ❌ Tên mơ hồ
it('test 1', () => { });
it('works', () => { });
it('should work', () => { });

// ✅ Tên mô tả rõ ràng: [subject] + [action] + [expected result]
it('nên throw NotFoundException khi todo không tồn tại', () => { });
it('nên trả về todo đã được cập nhật sau khi complete', () => { });
it('nên không gọi EmailService nếu user tắt notification', () => { });

// Pattern: "given [context], when [action], then [expected]"
it('given user chưa verify email, when login, then throw ForbiddenException', () => { });
```

### Test Isolation

Mỗi test phải hoàn toàn độc lập — không phụ thuộc vào thứ tự chạy:

```typescript
// ❌ BAD — test phụ thuộc nhau
let createdTodoId: number;

it('nên tạo todo', async () => {
  const todo = await service.create({ title: 'Test' } as any);
  createdTodoId = todo.id;  // Lưu state cho test sau
});

it('nên tìm todo vừa tạo', async () => {
  const todo = await service.findOne(createdTodoId);  // Phụ thuộc test trước
  expect(todo).toBeDefined();
});

// ✅ GOOD — mỗi test tự setup
it('nên tìm todo', async () => {
  const created = await service.create({ title: 'Test' } as any); // Self-contained
  const found = await service.findOne(created.id);
  expect(found.id).toBe(created.id);
});
```

### Cleanup Strategies

```typescript
describe('with database', () => {
  // ✅ afterEach: dọn dẹp sau MỖI test (isolation tốt nhưng chậm hơn)
  afterEach(async () => {
    await todoRepository.clear();
  });

  // ✅ Transaction rollback (cách hiệu quả hơn)
  let queryRunner: QueryRunner;

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction(); // Hoàn tác toàn bộ, không cần clear từng bảng
    await queryRunner.release();
  });
});
```

### Fast vs Slow Tests

```typescript
// Tổ chức test theo tốc độ và chạy riêng biệt

// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'fast',      // npm run test:fast
      testMatch: ['**/*.spec.ts'],
      testPathIgnorePatterns: ['integration', 'e2e'],
    },
    {
      displayName: 'slow',      // npm run test:slow
      testMatch: ['**/*.integration.spec.ts', '**/*.e2e-spec.ts'],
    },
  ],
};
```

---

## Phần 9: Test Coverage

### Coverage Reports

```bash
# Chạy với coverage
npm run test:cov

# Output trong terminal:
# ----------------------|---------|----------|---------|---------|
# File                  | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------|---------|----------|---------|---------|
# todos/todos.service   |   95.45 |    88.89 |     100 |   95.45 |
# todos/todos.controller|   100   |      100 |     100 |     100 |
# ----------------------|---------|----------|---------|---------|

# HTML report chi tiết hơn
open coverage/lcov-report/index.html
```

### Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: -10,  // Cho phép tối đa 10 statement không được cover
  },
},
```

Nếu coverage dưới threshold, `jest --coverage` sẽ exit với code 1 → CI/CD pipeline fail.

### What to Test

**Nên test:**
- Business logic phức tạp (tính giá, discount, rules)
- Error handling và edge cases
- Integration giữa các module
- Authentication/Authorization logic
- Data transformation

**Không cần test nhiều:**
- NestJS built-in functionality (framework đã test rồi)
- Simple getters/setters
- Framework boilerplate
- Third-party library internals
- Type definitions

---

## Phần 10: Testing Async Code

### Promises

```typescript
// Cách 1: return promise
it('nên resolve với giá trị đúng', () => {
  return service.findOne(1).then((result) => {
    expect(result.id).toBe(1);
  });
});

// Cách 2: async/await (khuyến khích)
it('nên resolve với giá trị đúng', async () => {
  const result = await service.findOne(1);
  expect(result.id).toBe(1);
});

// Test rejection
it('nên reject khi không tìm thấy', async () => {
  repository.findOne.mockResolvedValue(null);

  // ✅ Cách đúng — await expect
  await expect(service.findOne(999)).rejects.toThrow(NotFoundException);

  // ❌ Cách sai — exception bị bỏ qua
  // expect(service.findOne(999)).rejects.toThrow(NotFoundException);
});
```

### Event Emitters

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('TodosService events', () => {
  let eventEmitter: jest.Mocked<EventEmitter2>;

  it('nên emit event khi tạo todo', async () => {
    await service.create({ title: 'Test', priority: 'low' } as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'todo.created',
      expect.objectContaining({ title: 'Test' }),
    );
  });

  // Test subscriber
  it('nên xử lý event todo.created', async () => {
    const handler = new TodoCreatedHandler(emailService);

    await handler.handle({ id: 1, title: 'New Todo', userId: 42 });

    expect(emailService.sendNotification).toHaveBeenCalledWith(42, expect.any(String));
  });
});
```

### Timers

```typescript
// Test debounce/throttle/delay
describe('Search debounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('nên chỉ gọi API sau 300ms không có input mới', () => {
    const searchSpy = jest.spyOn(service, 'search');

    service.debouncedSearch('query1');
    service.debouncedSearch('query2');
    service.debouncedSearch('query3');

    // Chưa gọi vì debounce chưa fire
    expect(searchSpy).not.toHaveBeenCalled();

    // Advance 300ms
    jest.advanceTimersByTime(300);

    // Chỉ gọi 1 lần với query cuối cùng
    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).toHaveBeenCalledWith('query3');
  });
});
```

---

## Phần 11: Database Testing

### In-memory DB (SQLite)

Cách đơn giản và nhanh nhất:

```typescript
// test/test-db.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';

export const InMemoryDbModule = TypeOrmModule.forRoot({
  type: 'better-sqlite3',
  database: ':memory:',
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  synchronize: true,
  dropSchema: true,
});
```

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

### TestContainers

TestContainers chạy Docker container thật trong quá trình test — database giống production nhất:

```bash
npm install testcontainers
```

```typescript
// test/database.e2e-spec.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from 'testcontainers';

describe('Database Integration với TestContainers', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    // Khởi động PostgreSQL container
    container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('todo_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities: [Todo],
          synchronize: true,
        }),
        TodosModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  }, 60000); // Timeout cao hơn vì pull Docker image

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it('nên persist data vào PostgreSQL thật', async () => {
    await request(app.getHttpServer())
      .post('/todos')
      .send({ title: 'TestContainers Test', priority: 'high' })
      .expect(201);
  });
});
```

### Transaction Rollback

```typescript
// Dùng transaction để undo sau mỗi test — nhanh và clean
describe('TodosService với transaction rollback', () => {
  let queryRunner: QueryRunner;
  let service: TodosService;

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Override repository để dùng queryRunner
    const transactionalRepo = dataSource
      .getRepository(Todo)
      .extend({ manager: queryRunner.manager });

    service = new TodosService(transactionalRepo);
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  it('dữ liệu tạo trong test bị rollback sau đó', async () => {
    const todo = await service.create({ title: 'Will be rolled back', priority: 'low' } as any);
    expect(todo.id).toBeDefined();
    // Sau afterEach, todo này biến mất khỏi DB
  });
});
```

### Seed Data

```typescript
// test/seeds/test-seed.ts
import { DataSource } from 'typeorm';
import { User } from '../../src/users/entities/user.entity';
import { Todo } from '../../src/todos/entities/todo.entity';
import * as bcrypt from 'bcrypt';

export async function seedTestData(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const todoRepo = dataSource.getRepository(Todo);

  // Tạo user test
  const user = await userRepo.save(
    userRepo.create({
      email: 'test@test.com',
      password: await bcrypt.hash('Password123!', 10),
      name: 'Test User',
    }),
  );

  // Tạo todos cho user
  await todoRepo.save([
    todoRepo.create({ title: 'Todo 1', priority: 'high', userId: user.id }),
    todoRepo.create({ title: 'Todo 2', priority: 'low', userId: user.id, completed: true }),
  ]);

  return { user };
}

// Dùng trong test:
beforeAll(async () => {
  const { user } = await seedTestData(dataSource);
  testUser = user;
});
```

---

## Phần 12: CI/CD Integration

### Running trong CI/CD

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test -- --coverage --ci
        # --ci: không dùng interactive watch mode, fail khi snapshot outdated

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

  e2e-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: todo_test
        ports: ['5433:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5433
          TEST_DB_USER: test
          TEST_DB_PASS: test
          TEST_DB_NAME: todo_test
          JWT_SECRET: test-secret
```

### Parallel Execution

```javascript
// jest.config.js
module.exports = {
  // Chạy parallel — mặc định Jest dùng số CPU / 2
  maxWorkers: '50%',      // Hoặc số cụ thể: maxWorkers: 4

  // Cho E2E, thường chạy serial để tránh conflict database
  // jest-e2e.json:
  // "runInBand": true    // --runInBand = serial
};
```

```json
// package.json
{
  "scripts": {
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand",
    "test:unit": "jest --maxWorkers=4"
  }
}
```

### Reporting

```bash
# JUnit XML report (dùng cho CI tools như Jenkins, GitLab)
npm install --save-dev jest-junit

# jest.config.js
reporters: [
  'default',
  ['jest-junit', {
    outputDirectory: './test-results',
    outputName: 'junit.xml',
    classNameTemplate: '{classname}',
    titleTemplate: '{title}',
  }],
],
```

```yaml
# GitLab CI
test:
  script:
    - npm run test -- --reporters=jest-junit
  artifacts:
    reports:
      junit: test-results/junit.xml  # GitLab hiển thị kết quả trong MR
```

---

## Phần 13: Debugging Tests

### VSCode Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",          // Serial để debugger hoạt động đúng
        "--no-coverage",
        "--testPathPattern",
        "${relativeFile}"       // Chỉ debug file đang mở
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Specific Test",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-coverage",
        "-t",
        "${selectedText}"       // Highlight tên test → F5 để debug ngay
      ],
      "console": "integratedTerminal"
    }
  ]
}
```

**Cách dùng:** Đặt breakpoint → Chọn configuration → F5. Test sẽ dừng tại breakpoint cho bạn inspect.

### Troubleshooting

**Vấn đề 1: Test pass locally nhưng fail trên CI**

```typescript
// Nguyên nhân phổ biến: timezone
// Test dùng new Date() nhưng CI server ở timezone khác

// ❌ Bị ảnh hưởng bởi timezone
expect(todo.createdAt.toLocaleDateString()).toBe('01/15/2024');

// ✅ Dùng ISO string hoặc timestamp
expect(todo.createdAt.toISOString()).toContain('2024-01-15');
```

**Vấn đề 2: Memory leak — test chạy chậm dần**

```typescript
// Đảm bảo luôn close app sau test
afterAll(async () => {
  await app.close(); // ← Thiếu cái này gây memory leak
});
```

**Vấn đề 3: Mock không hoạt động**

```typescript
// ❌ Import thứ tự sai — jest.mock phải ở trên cùng
import { EmailService } from './email.service';
jest.mock('./email.service'); // Quá muộn!

// ✅ jest.mock được hoist tự động lên đầu file
jest.mock('./email.service'); // Jest tự đưa lên đầu
import { EmailService } from './email.service';
```

**Vấn đề 4: Async test không catch được error**

```typescript
// ❌ Error bị "nuốt" — test luôn pass dù có lỗi
it('should fail but passes', () => {
  service.findOne(999).catch((e) => {
    expect(e).toBeInstanceOf(NotFoundException); // Không được kiểm tra
  });
});

// ✅ Luôn return hoặc await
it('should correctly catch error', async () => {
  await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
});
```

**Vấn đề 5: Test flaky (lúc pass lúc fail)**

```typescript
// Nguyên nhân: test phụ thuộc vào thứ tự, global state, hoặc timing
// Kiểm tra bằng cách chạy ngẫu nhiên:
jest --randomize

// Nếu chỉ fail khi chạy cùng test khác:
// → Có global state bị chia sẻ, cần dọn dẹp trong afterEach
```
