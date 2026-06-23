# 9. Advanced Patterns & Best Practices

## 9.1. Custom Repositories

**Tạo custom repository với business logic:**

```typescript
// user.repository.ts
import { Repository } from 'typeorm';
import { User } from './user.entity';

export class UserRepository extends Repository<User> {
  // Custom method
  async findByEmail(email: string): Promise<User | null> {
    return await this.findOne({
      where: { email: email.toLowerCase() },
      relations: ['profile']
    });
  }

  async findActiveUsers(): Promise<User[]> {
    return await this.createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.deletedAt IS NULL')
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async getUserStats(userId: number) {
    return await this.createQueryBuilder('user')
      .leftJoinAndSelect('user.posts', 'post')
      .leftJoinAndSelect('user.comments', 'comment')
      .where('user.id = :userId', { userId })
      .loadRelationCountAndMap('user.postCount', 'user.posts')
      .loadRelationCountAndMap('user.commentCount', 'user.comments')
      .getOne();
  }

  async searchUsers(query: string, limit: number = 10) {
    return await this.createQueryBuilder('user')
      .where('user.email ILIKE :query OR user.name ILIKE :query', {
        query: `%${query}%`
      })
      .take(limit)
      .getMany();
  }
}
```

**Register custom repository:**

```typescript
// user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    UserService,
    {
      provide: UserRepository,
      useFactory: (dataSource: DataSource) => {
        return dataSource.getRepository(User).extend(UserRepository);
      },
      inject: [DataSource],
    },
  ],
  exports: [UserService],
})
export class UserModule {}
```

**Sử dụng:**

```typescript
@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
  ) {}

  async findByEmail(email: string) {
    return await this.userRepository.findByEmail(email);
  }

  async getActiveUsers() {
    return await this.userRepository.findActiveUsers();
  }
}
```

---

## 9.2. Specification Pattern

**Khái niệm:** Tách business rules thành các specifications có thể tái sử dụng và kết hợp.

```typescript
// specifications/user.specifications.ts
import { SelectQueryBuilder } from 'typeorm';
import { User } from '../entities/user.entity';

export class UserSpecifications {
  static isActive() {
    return (qb: SelectQueryBuilder<User>) => {
      qb.andWhere('user.isActive = :isActive', { isActive: true });
    };
  }

  static hasRole(role: string) {
    return (qb: SelectQueryBuilder<User>) => {
      qb.andWhere('user.role = :role', { role });
    };
  }

  static emailContains(search: string) {
    return (qb: SelectQueryBuilder<User>) => {
      qb.andWhere('user.email LIKE :email', { email: `%${search}%` });
    };
  }

  static createdAfter(date: Date) {
    return (qb: SelectQueryBuilder<User>) => {
      qb.andWhere('user.createdAt > :date', { date });
    };
  }

  static olderThan(age: number) {
    return (qb: SelectQueryBuilder<User>) => {
      qb.andWhere('user.age > :age', { age });
    };
  }
}
```

**Sử dụng:**

```typescript
// user.repository.ts
export class UserRepository extends Repository<User> {
  async findBySpecifications(...specs: Array<(qb: SelectQueryBuilder<User>) => void>) {
    const qb = this.createQueryBuilder('user');

    // Apply all specifications
    specs.forEach(spec => spec(qb));

    return await qb.getMany();
  }
}

// user.service.ts
async getAdminUsers(emailSearch?: string) {
  const specs = [
    UserSpecifications.isActive(),
    UserSpecifications.hasRole('admin'),
  ];

  if (emailSearch) {
    specs.push(UserSpecifications.emailContains(emailSearch));
  }

  return await this.userRepository.findBySpecifications(...specs);
}

async getRecentSeniors() {
  return await this.userRepository.findBySpecifications(
    UserSpecifications.isActive(),
    UserSpecifications.olderThan(60),
    UserSpecifications.createdAfter(new Date('2024-01-01'))
  );
}
```

**Ưu điểm:**
- Reusable business rules
- Easy to test
- Clean, readable code
- Kết hợp specifications linh hoạt

---

## 9.3. Testing Strategies

## **Unit Testing Repositories**

```typescript
// user.repository.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockRepository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    mockRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test' };
      
      jest.spyOn(mockRepository, 'findOne').mockResolvedValue(mockUser as User);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['profile'],
      });
    });
  });
});
```

## **Integration Testing với Test Database**

```typescript
// user.service.integration.spec.ts
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';

describe('UserService Integration', () => {
  let service: UserService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.getRepository(User).clear();
  });

  it('should create and find user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    };

    const created = await service.create(userData);
    expect(created.id).toBeDefined();

    const found = await service.findByEmail(userData.email);
    expect(found).toBeDefined();
    expect(found.email).toBe(userData.email);
  });
});
```

---

## 9.4. Common Pitfalls

## **1. Forgetting to await**

```typescript
// ❌ BAD: Missing await
const user = this.userRepository.save(newUser); // Returns Promise!
console.log(user.id); // undefined

// ✅ GOOD
const user = await this.userRepository.save(newUser);
console.log(user.id); // Correct ID
```

## **2. N+1 queries**

```typescript
// ❌ BAD: N+1 problem
const users = await this.userRepository.find();
for (const user of users) {
  user.posts = await this.postRepository.find({ where: { authorId: user.id } });
}

// ✅ GOOD: Use relations
const users = await this.userRepository.find({ relations: ['posts'] });
```

## **3. Not using transactions for related operations**

```typescript
// ❌ BAD: No transaction
const user = await this.userRepository.save(newUser);
const profile = await this.profileRepository.save(newProfile);
// If profile save fails, user is already saved!

// ✅ GOOD: Use transaction
await this.dataSource.transaction(async (manager) => {
  const user = await manager.save(User, newUser);
  const profile = await manager.save(Profile, { ...newProfile, userId: user.id });
});
```

## **4. Mutating entities without saving**

```typescript
// ❌ BAD: Changes not saved
const user = await this.userRepository.findOne({ where: { id: 1 } });
user.name = 'New Name'; // Just mutates in memory!

// ✅ GOOD: Save changes
const user = await this.userRepository.findOne({ where: { id: 1 } });
user.name = 'New Name';
await this.userRepository.save(user);
```

## **5. Not handling unique constraint errors**

```typescript
// ❌ BAD: No error handling
async createUser(email: string) {
  const user = this.userRepository.create({ email });
  return await this.userRepository.save(user);
  // Throws generic error if email exists
}

// ✅ GOOD: Handle constraint errors
async createUser(email: string) {
  try {
    const user = this.userRepository.create({ email });
    return await this.userRepository.save(user);
  } catch (error) {
    if (error.code === '23505') { // Postgres unique violation
      throw new ConflictException('Email already exists');
    }
    throw error;
  }
}
```

## **6. Using cascade delete inappropriately**

```typescript
// ❌ DANGEROUS: Cascade delete on important data
@Entity()
export class User {
  @OneToMany(() => Order, order => order.user, {
    cascade: ['remove'], // Xóa user → xóa tất cả orders!
  })
  orders: Order[];
}

// ✅ SAFE: No cascade or soft delete
@Entity()
export class User {
  @OneToMany(() => Order, order => order.user)
  orders: Order[];
}
```

## **7. Not validating before saving**

```typescript
// ❌ BAD: No validation
async createUser(data: any) {
  const user = this.userRepository.create(data);
  return await this.userRepository.save(user);
}

// ✅ GOOD: Validate with class-validator
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  name: string;
}

async createUser(data: CreateUserDto) {
  const user = this.userRepository.create(data);
  return await this.userRepository.save(user);
}
```
