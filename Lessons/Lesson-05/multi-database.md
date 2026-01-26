## 8. Cấu hình multi database connection

### 8.1. Cách cấu hình kết nối nhiều database

**Khi nào cần multi database?**

- Ứng dụng cần kết nối với nhiều database khác nhau (ví dụ: main DB, analytics DB, cache DB).
- Sử dụng các loại database khác nhau (PostgreSQL, MySQL, MongoDB, Redis).
- Tách biệt dữ liệu theo module hoặc service (ví dụ: user data, product data, logging data).
- Yêu cầu về hiệu năng hoặc bảo mật khác nhau cho từng database.
- Quản lý dữ liệu legacy và mới song song.
- Phân vùng dữ liệu theo khu vực địa lý.
- Hỗ trợ microservices với database riêng biệt.

**Ví dụ scenario:**
```
Main Database (PostgreSQL)  → Books, Authors
Analytics Database (PostgreSQL) → Statistics, Reports
Cache Database (Redis) → Sessions, Cache
```

### 8.2. Cấu hình trong NestJS

**Bước 1: Cấu hình environment variables:**

```bash
# .env
# Main Database
DB_MAIN_TYPE=postgres
DB_MAIN_HOST=localhost
DB_MAIN_PORT=5432
DB_MAIN_USERNAME=postgres
DB_MAIN_PASSWORD=password
DB_MAIN_DATABASE=bookstore_main

# Analytics Database
DB_ANALYTICS_TYPE=postgres
DB_ANALYTICS_HOST=localhost
DB_ANALYTICS_PORT=5433
DB_ANALYTICS_USERNAME=postgres
DB_ANALYTICS_PASSWORD=password
DB_ANALYTICS_DATABASE=bookstore_analytics

# Legacy Database
DB_LEGACY_TYPE=mysql
DB_LEGACY_HOST=localhost
DB_LEGACY_PORT=3306
DB_LEGACY_USERNAME=root
DB_LEGACY_PASSWORD=password
DB_LEGACY_DATABASE=old_system
```

**Bước 2: Tạo database configurations:**

```typescript
// src/config/database.config.ts
import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export const mainDatabaseConfig = registerAs(
  'database.main',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DB_MAIN_HOST,
    port: parseInt(process.env.DB_MAIN_PORT, 10),
    username: process.env.DB_MAIN_USERNAME,
    password: process.env.DB_MAIN_PASSWORD,
    database: process.env.DB_MAIN_DATABASE,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  }),
);

export const analyticsDatabaseConfig = registerAs(
  'database.analytics',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DB_ANALYTICS_HOST,
    port: parseInt(process.env.DB_ANALYTICS_PORT, 10),
    username: process.env.DB_ANALYTICS_USERNAME,
    password: process.env.DB_ANALYTICS_PASSWORD,
    database: process.env.DB_ANALYTICS_DATABASE,
    entities: [__dirname + '/../analytics/**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  }),
);
```

**Bước 3: Đăng ký multiple connections trong AppModule:**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mainDatabaseConfig, analyticsDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mainDatabaseConfig, analyticsDatabaseConfig],
    }),

    // Main Database Connection
    TypeOrmModule.forRootAsync({
      name: 'main', // Connection name
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database.main'),
      }),
    }),

    // Analytics Database Connection
    TypeOrmModule.forRootAsync({
      name: 'analytics', // Connection name
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database.analytics'),
      }),
    }),

    BooksModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
```

### 8.3. Quản lý các kết nối database khác nhau

**Bước 1: Tạo entities cho mỗi database:**

```typescript
// src/books/entities/book.entity.ts (Main DB)
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  pages: number;
}

// src/analytics/entities/book-statistic.entity.ts (Analytics DB)
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('book_statistics')
export class BookStatistic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookId: number;

  @Column()
  views: number;

  @Column()
  purchases: number;

  @Column({ type: 'date' })
  date: Date;
}
```

**Bước 2: Đăng ký entities với specific connection:**

```typescript
// src/books/books.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book], 'main'), // Main DB
  ],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}

// src/analytics/analytics.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookStatistic } from './entities/book-statistic.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookStatistic], 'analytics'), // Analytics DB
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```

**Bước 3: Inject repositories với connection name:**

```typescript
// src/books/books.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book, 'main') // Specify connection name
    private readonly bookRepository: Repository<Book>,
  ) {}

  async findAll(): Promise<Book[]> {
    return await this.bookRepository.find();
  }
}

// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookStatistic } from './entities/book-statistic.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(BookStatistic, 'analytics') // Analytics connection
    private readonly statisticRepository: Repository<BookStatistic>,
  ) {}

  async getBookViews(bookId: number): Promise<number> {
    const stats = await this.statisticRepository.find({
      where: { bookId },
    });

    return stats.reduce((total, stat) => total + stat.views, 0);
  }
}
```

### 8.4. Ví dụ minh họa sử dụng multi database connection

**Service sử dụng multiple databases:**

```typescript
// src/books/books.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { BookStatistic } from '../analytics/entities/book-statistic.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book, 'main')
    private readonly bookRepository: Repository<Book>,

    @InjectRepository(BookStatistic, 'analytics')
    private readonly statisticRepository: Repository<BookStatistic>,
  ) {}

  /**
   * Lấy sách từ main DB và statistics từ analytics DB
   */
  async findOneWithStats(id: number) {
    // Query từ main database
    const book = await this.bookRepository.findOne({
      where: { id },
    });

    if (!book) {
      throw new NotFoundException(`Book not found`);
    }

    // Query từ analytics database
    const stats = await this.statisticRepository.findOne({
      where: { bookId: id },
    });

    return {
      ...book,
      views: stats?.views || 0,
      purchases: stats?.purchases || 0,
    };
  }

  /**
   * Transaction across databases (cẩn thận!)
   */
  async createBookWithStats(createBookDto: CreateBookDto) {
    // Transaction trong main DB
    const book = await this.bookRepository.save(
      this.bookRepository.create(createBookDto)
    );

    // Create initial stats trong analytics DB
    try {
      await this.statisticRepository.save({
        bookId: book.id,
        views: 0,
        purchases: 0,
        date: new Date(),
      });
    } catch (error) {
      // Rollback? Compensation logic?
      console.error('Failed to create stats', error);
      // Có thể cần implement saga pattern hoặc event-driven approach
    }

    return book;
  }
}
```

**DataSource Injection (Advanced):**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()export class AdvancedService {
  constructor(
    @InjectDataSource('main')
    private mainDataSource: DataSource,

    @InjectDataSource('analytics')
    private analyticsDataSource: DataSource,
  ) {}

  async complexQuery() {
    // Raw query trong main DB
    const books = await this.mainDataSource.query(
      'SELECT * FROM books WHERE pages > $1',
      [300]
    );

    // Raw query trong analytics DB
    const stats = await this.analyticsDataSource.query(
      'SELECT book_id, SUM(views) as total_views FROM book_statistics GROUP BY book_id'
    );

    // Merge results
    return books.map(book => ({
      ...book,
      totalViews: stats.find(s => s.book_id === book.id)?.total_views || 0
    }));
  }

  async useTransaction() {
    const queryRunner = this.mainDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Multiple queries trong transaction
      await queryRunner.manager.save(Book, { title: 'Book 1' });
      await queryRunner.manager.save(Book, { title: 'Book 2' });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
```

**Cấu trúc thư mục với multi database:**

```
src/
├── config/
│   ├── database.config.ts
│   ├── main-database.config.ts
│   └── analytics-database.config.ts
├── books/  (Main DB)
│   ├── entities/
│   │   └── book.entity.ts
│   ├── books.service.ts
│   ├── books.controller.ts
│   └── books.module.ts
├── analytics/  (Analytics DB)
│   ├── entities/
│   │   └── book-statistic.entity.ts
│   ├── analytics.service.ts
│   ├── analytics.controller.ts
│   └── analytics.module.ts
└── app.module.ts
```
