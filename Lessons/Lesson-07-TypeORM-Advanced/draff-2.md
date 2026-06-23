# Lesson 06 - TypeORM Advanced: Thực Hành với Book Management System

Tôi sẽ xây dựng lại các ví dụ dựa trên hệ thống quản lý sách từ bài trước, mở rộng với các entities liên quan như Author, Category, Publisher, Review, v.v.

## Setup Project Structure

```bash
# Cấu trúc thư mục
src/
├── modules/
│   ├── books/
│   │   ├── entities/
│   │   │   ├── book.entity.ts
│   │   │   └── book-review.entity.ts
│   │   ├── repositories/
│   │   │   └── book.repository.ts
│   │   ├── specifications/
│   │   │   └── book.specifications.ts
│   │   ├── dto/
│   │   │   ├── create-book.dto.ts
│   │   │   ├── update-book.dto.ts
│   │   │   └── search-book.dto.ts
│   │   ├── books.service.ts
│   │   ├── books.controller.ts
│   │   └── books.module.ts
│   ├── authors/
│   │   ├── entities/
│   │   │   └── author.entity.ts
│   │   ├── authors.service.ts
│   │   └── authors.module.ts
│   ├── categories/
│   │   ├── entities/
│   │   │   └── category.entity.ts
│   │   ├── categories.service.ts
│   │   └── categories.module.ts
│   ├── publishers/
│   │   ├── entities/
│   │   │   └── publisher.entity.ts
│   │   ├── publishers.service.ts
│   │   └── publishers.module.ts
│   └── orders/
│       ├── entities/
│       │   ├── order.entity.ts
│       │   └── order-item.entity.ts
│       ├── orders.service.ts
│       └── orders.module.ts
└── common/
    ├── entities/
    │   └── base.entity.ts
    └── interfaces/
        └── pagination.interface.ts
```

## 1. Quan hệ dữ liệu - Book Management System

### 1.1. Base Entity (Abstract Class)

```typescript
// src/common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  VersionColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  @VersionColumn()
  version: number;
}
```

### 1.2. Author Entity (One-to-Many với Book)

```typescript
// src/modules/authors/entities/author.entity.ts
import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Book } from '../../books/entities/book.entity';

@Entity('authors')
@Index('IDX_AUTHOR_EMAIL', ['email'], { unique: true })
export class Author extends BaseEntity {
  @Column({ length: 100 })
  @Index('IDX_AUTHOR_NAME')
  name: string;

  @Column({ length: 200, unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  biography: string;

  @Column({ length: 100, nullable: true })
  nationality: string;

  @Column({ type: 'date', nullable: true, name: 'birth_date' })
  birthDate: Date;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'profile_image' })
  profileImage: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Quan hệ One-to-Many: Một tác giả có nhiều sách
  @OneToMany(() => Book, (book) => book.author, {
    cascade: false, // Không tự động xóa books khi xóa author
  })
  books: Book[];

  // Virtual field - sẽ được load riêng
  bookCount?: number;
}
```

### 1.3. Category Entity (Self-referencing & Many-to-Many)

```typescript
// src/modules/categories/entities/category.entity.ts
import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  Index,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Book } from '../../books/entities/book.entity';

@Entity('categories')
@Index('IDX_CATEGORY_SLUG', ['slug'], { unique: true })
export class Category extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'parent_id' })
  parentId: number;

  @Column({ default: 0 })
  level: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Self-referencing: Category cha
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Category;

  // Self-referencing: Category con
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  // Many-to-Many với Books
  @ManyToMany(() => Book, (book) => book.categories)
  books: Book[];
}
```

### 1.4. Publisher Entity (One-to-Many)

```typescript
// src/modules/publishers/entities/publisher.entity.ts
import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Book } from '../../books/entities/book.entity';

@Entity('publishers')
export class Publisher extends BaseEntity {
  @Column({ length: 200 })
  @Index('IDX_PUBLISHER_NAME')
  name: string;

  @Column({ length: 200, nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ length: 200, nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // One-to-Many với Books
  @OneToMany(() => Book, (book) => book.publisher)
  books: Book[];

  bookCount?: number;
}
```

### 1.5. Book Entity (Updated với Relations)

```typescript
// src/modules/books/entities/book.entity.ts
import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Author } from '../../authors/entities/author.entity';
import { Publisher } from '../../publishers/entities/publisher.entity';
import { Category } from '../../categories/entities/category.entity';
import { BookReview } from './book-review.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

export enum BookStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

@Entity('books')
@Index('IDX_BOOK_ISBN', ['isbn'], { unique: true })
@Index('IDX_BOOK_TITLE', ['title'])
@Index('IDX_BOOK_STATUS', ['status'])
@Index('IDX_BOOK_PRICE', ['price'])
@Index('IDX_BOOK_AUTHOR_STATUS', ['authorId', 'status']) // Composite index
export class Book extends BaseEntity {
  @Column({ length: 255 })
  title: string;

  @Column({ length: 20, unique: true })
  isbn: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0, name: 'stock_quantity' })
  stockQuantity: number;

  @Column({ type: 'int', default: 0, name: 'page_count' })
  pageCount: number;

  @Column({ length: 50, nullable: true })
  language: string;

  @Column({ type: 'date', nullable: true, name: 'published_date' })
  publishedDate: Date;

  @Column({
    type: 'enum',
    enum: BookStatus,
    default: BookStatus.DRAFT,
  })
  status: BookStatus;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'cover_image' })
  coverImage: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'average_rating' })
  averageRating: number;

  @Column({ type: 'int', default: 0, name: 'total_reviews' })
  totalReviews: number;

  @Column({ type: 'int', default: 0, name: 'total_sold' })
  totalSold: number;

  @Column({ nullable: true, name: 'author_id' })
  @Index('IDX_BOOK_AUTHOR')
  authorId: number;

  @Column({ nullable: true, name: 'publisher_id' })
  @Index('IDX_BOOK_PUBLISHER')
  publisherId: number;

  // Many-to-One: Nhiều sách của một tác giả
  @ManyToOne(() => Author, (author) => author.books, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author: Author;

  // Many-to-One: Nhiều sách của một nhà xuất bản
  @ManyToOne(() => Publisher, (publisher) => publisher.books, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'publisher_id' })
  publisher: Publisher;

  // Many-to-Many: Sách thuộc nhiều categories
  @ManyToMany(() => Category, (category) => category.books, {
    cascade: true,
  })
  @JoinTable({
    name: 'book_categories',
    joinColumn: {
      name: 'book_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'category_id',
      referencedColumnName: 'id',
    },
  })
  categories: Category[];

  // One-to-Many: Một sách có nhiều reviews
  @OneToMany(() => BookReview, (review) => review.book, {
    cascade: ['insert', 'update'],
  })
  reviews: BookReview[];

  // One-to-Many: Một sách có trong nhiều order items
  @OneToMany(() => OrderItem, (orderItem) => orderItem.book)
  orderItems: OrderItem[];
}
```

### 1.6. Book Review Entity (One-to-Many)

```typescript
// src/modules/books/entities/book-review.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Book } from './book.entity';

@Entity('book_reviews')
@Index('IDX_REVIEW_BOOK_USER', ['bookId', 'userId'], { unique: true })
export class BookReview extends BaseEntity {
  @Column({ nullable: true, name: 'book_id' })
  bookId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'int', default: 5 })
  rating: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ default: false, name: 'is_verified_purchase' })
  isVerifiedPurchase: boolean;

  @Column({ default: 0, name: 'helpful_count' })
  helpfulCount: number;

  // Many-to-One với Book
  @ManyToOne(() => Book, (book) => book.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_id' })
  book: Book;
}
```

### 1.7. Order & Order Item Entities

```typescript
// src/modules/orders/entities/order.entity.ts
import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
@Index('IDX_ORDER_USER', ['userId'])
@Index('IDX_ORDER_STATUS', ['status'])
@Index('IDX_ORDER_DATE', ['createdAt'])
export class Order extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 50, unique: true, name: 'order_number' })
  orderNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true, name: 'shipping_address' })
  shippingAddress: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true, name: 'confirmed_at' })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'shipped_at' })
  shippedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt: Date;

  // One-to-Many với OrderItems
  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
  })
  items: OrderItem[];
}
```

```typescript
// src/modules/orders/entities/order-item.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';
import { Book } from '../../books/entities/book.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'book_id' })
  bookId: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'subtotal' })
  subtotal: number;

  // Many-to-One với Order
  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // Many-to-One với Book
  @ManyToOne(() => Book, (book) => book.orderItems, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'book_id' })
  book: Book;
}
```

## 2. DTOs & Interfaces

```typescript
// src/modules/books/dto/create-book.dto.ts
import { IsString, IsNumber, IsOptional, IsEnum, IsArray, Min, Max } from 'class-validator';
import { BookStatus } from '../entities/book.entity';

export class CreateBookDto {
  @IsString()
  title: string;

  @IsString()
  isbn: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stockQuantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pageCount?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  publishedDate?: Date;

  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsNumber()
  authorId: number;

  @IsOptional()
  @IsNumber()
  publisherId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  categoryIds?: number[];
}
```

```typescript
// src/modules/books/dto/search-book.dto.ts
import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { BookStatus } from '../entities/book.entity';

export class SearchBookDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  authorId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  publisherId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsString()
  sortBy?: string; // title, price, createdAt, averageRating

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
```

```typescript
// src/common/interfaces/pagination.interface.ts
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
```

## 3. Custom Repository với Business Logic

```typescript
// src/modules/books/repositories/book.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Book, BookStatus } from '../entities/book.entity';
import { SearchBookDto } from '../dto/search-book.dto';
import { PaginatedResult } from '../../../common/interfaces/pagination.interface';

@Injectable()
export class BookRepository extends Repository<Book> {
  constructor(private dataSource: DataSource) {
    super(Book, dataSource.createEntityManager());
  }

  /**
   * Tìm sách theo ISBN
   */
  async findByIsbn(isbn: string): Promise<Book | null> {
    return await this.findOne({
      where: { isbn },
      relations: ['author', 'publisher', 'categories'],
    });
  }

  /**
   * Lấy sách kèm tất cả thông tin liên quan
   */
  async findOneWithRelations(id: number): Promise<Book | null> {
    return await this.createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .leftJoinAndSelect('book.categories', 'category')
      .loadRelationCountAndMap('book.reviewCount', 'book.reviews')
      .where('book.id = :id', { id })
      .getOne();
  }

  /**
   * Tìm sách đang bán (published và còn hàng)
   */
  async findAvailableBooks(): Promise<Book[]> {
    return await this.createQueryBuilder('book')
      .where('book.status = :status', { status: BookStatus.PUBLISHED })
      .andWhere('book.stockQuantity > 0')
      .andWhere('book.deletedAt IS NULL')
      .orderBy('book.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Tìm bestsellers (sách bán chạy nhất)
   */
  async findBestsellers(limit: number = 10): Promise<Book[]> {
    return await this.createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .where('book.status = :status', { status: BookStatus.PUBLISHED })
      .andWhere('book.totalSold > 0')
      .orderBy('book.totalSold', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Tìm sách rating cao nhất
   */
  async findTopRatedBooks(limit: number = 10): Promise<Book[]> {
    return await this.createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .where('book.status = :status', { status: BookStatus.PUBLISHED })
      .andWhere('book.totalReviews >= :minReviews', { minReviews: 5 })
      .orderBy('book.averageRating', 'DESC')
      .addOrderBy('book.totalReviews', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Tìm sách của tác giả
   */
  async findByAuthor(authorId: number): Promise<Book[]> {
    return await this.find({
      where: { authorId },
      relations: ['publisher', 'categories'],
      order: { publishedDate: 'DESC' },
    });
  }

  /**
   * Tìm sách theo category
   */
  async findByCategory(categoryId: number): Promise<Book[]> {
    return await this.createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .innerJoin('book.categories', 'category')
      .where('category.id = :categoryId', { categoryId })
      .andWhere('book.status = :status', { status: BookStatus.PUBLISHED })
      .getMany();
  }

  /**
   * Search và filter sách với pagination
   */
  async searchBooks(dto: SearchBookDto): Promise<PaginatedResult<Book>> {
    const qb = this.createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .leftJoinAndSelect('book.categories', 'category');

    // Apply filters
    this.applySearchFilters(qb, dto);

    // Count total
    const total = await qb.getCount();

    // Apply pagination
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    qb.skip((page - 1) * limit).take(limit);

    // Apply sorting
    this.applySorting(qb, dto);

    const data = await qb.getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Apply search filters
   */
  private applySearchFilters(qb: SelectQueryBuilder<Book>, dto: SearchBookDto): void {
    // Text search
    if (dto.search) {
      qb.andWhere(
        '(book.title ILIKE :search OR book.description ILIKE :search OR book.isbn ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    // Filter by author
    if (dto.authorId) {
      qb.andWhere('book.authorId = :authorId', { authorId: dto.authorId });
    }

    // Filter by publisher
    if (dto.publisherId) {
      qb.andWhere('book.publisherId = :publisherId', { publisherId: dto.publisherId });
    }

    // Filter by category
    if (dto.categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId: dto.categoryId });
    }

    // Filter by status
    if (dto.status) {
      qb.andWhere('book.status = :status', { status: dto.status });
    }

    // Price range
    if (dto.minPrice !== undefined) {
      qb.andWhere('book.price >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      qb.andWhere('book.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    // Rating filter
    if (dto.minRating) {
      qb.andWhere('book.averageRating >= :minRating', { minRating: dto.minRating });
    }
  }

  /**
   * Apply sorting
   */
  private applySorting(qb: SelectQueryBuilder<Book>, dto: SearchBookDto): void {
    const sortBy = dto.sortBy || 'createdAt';
    const order = dto.order || 'DESC';

    const allowedSortFields = ['title', 'price', 'createdAt', 'averageRating', 'totalSold'];
    
    if (allowedSortFields.includes(sortBy)) {
      qb.orderBy(`book.${sortBy}`, order);
    } else {
      qb.orderBy('book.createdAt', 'DESC');
    }
  }

  /**
   * Lấy thống kê sách theo category
   */
  async getBookStatsByCategory() {
    return await this.createQueryBuilder('book')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(book.id)', 'bookCount')
      .addSelect('AVG(book.price)', 'avgPrice')
      .addSelect('SUM(book.totalSold)', 'totalSold')
      .innerJoin('book.categories', 'category')
      .where('book.status = :status', { status: BookStatus.PUBLISHED })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .having('COUNT(book.id) > 0')
      .orderBy('bookCount', 'DESC')
      .getRawMany();
  }

  /**
   * Lấy sách sắp hết hàng
   */
  async findLowStockBooks(threshold: number = 10): Promise<Book[]> {
    return await this.createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .where('book.stockQuantity <= :threshold', { threshold })
      .andWhere('book.stockQuantity > 0')
      .andWhere('book.status = :status', { status: BookStatus.PUBLISHED })
      .orderBy('book.stockQuantity', 'ASC')
      .getMany();
  }

  /**
   * Update stock quantity
   */
  async updateStock(bookId: number, quantity: number): Promise<void> {
    await this.createQueryBuilder()
      .update(Book)
      .set({ 
        stockQuantity: () => `stock_quantity + ${quantity}`,
        status: () => `CASE 
          WHEN stock_quantity + ${quantity} <= 0 THEN '${BookStatus.OUT_OF_STOCK}'
          ELSE status
        END`
      })
      .where('id = :bookId', { bookId })
      .execute();
  }

  /**
   * Update average rating
   */
  async updateAverageRating(bookId: number): Promise<void> {
    const result = await this.dataSource.query(
      `
      UPDATE books
      SET 
        average_rating = (
          SELECT COALESCE(AVG(rating), 0)
          FROM book_reviews
          WHERE book_id = $1 AND deleted_at IS NULL
        ),
        total_reviews = (
          SELECT COUNT(*)
          FROM book_reviews
          WHERE book_id = $1 AND deleted_at IS NULL
        )
      WHERE id = $1
      `,
      [bookId],
    );
  }
}
```

## 4. Specification Pattern

```typescript
// src/modules/books/specifications/book.specifications.ts
import { SelectQueryBuilder } from 'typeorm';
import { Book, BookStatus } from '../entities/book.entity';

export class BookSpecifications {
  /**
   * Sách đang được xuất bản
   */
  static isPublished() {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.andWhere('book.status = :status', { status: BookStatus.PUBLISHED });
    };
  }

  /**
   * Sách còn hàng
   */
  static inStock() {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.andWhere('book.stockQuantity > 0');
    };
  }

  /**
   * Sách của tác giả
   */
  static byAuthor(authorId: number) {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.andWhere('book.authorId = :authorId', { authorId });
    };
  }

  /**
   * Sách thuộc category
   */
  static hasCategory(categoryId: number) {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.innerJoin('book.categories', 'spec_category', 'spec_category.id = :categoryId', {
        categoryId,
      });
    };
  }

  /**
   * Sách trong khoảng giá
   */
  static priceRange(min: number, max: number) {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.andWhere('book.price BETWEEN :min AND :max', { min, max });
    };
  }

  /**
   * Sách có rating tối thiểu
   */
  static minRating(rating: number) {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.andWhere('book.averageRating >= :rating', { rating });
    };
  }

  /**
   * Sách được xuất bản sau ngày
   */
  static publishedAfter(date: Date) {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.andWhere('book.publishedDate > :date', { date });
    };
  }

  /**
   * Sách bestseller
   */
  static isBestseller(minSold: number = 100) {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.andWhere('book.totalSold >= :minSold', { minSold });
    };
  }

  /**
   * Tìm kiếm text
   */
  static searchText(query: string) {
    return (qb: SelectQueryBuilder<Book>) => {
      qb.andWhere(
        '(book.title ILIKE :query OR book.description ILIKE :query)',
        { query: `%${query}%` },
      );
    };
  }
}
```

## 5. Book Service với Advanced Queries

```typescript
// src/modules/books/books.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Book, BookStatus } from './entities/book.entity';
import { BookRepository } from './repositories/book.repository';
import { BookReview } from './entities/book-review.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { SearchBookDto } from './dto/search-book.dto';
import { BookSpecifications } from './specifications/book.specifications';

@Injectable()
export class BooksService {
  constructor(
    private bookRepository: BookRepository,
    private dataSource: DataSource,
  ) {}

  /**
   * Tạo sách mới với transaction
   */
  async create(dto: CreateBookDto, userId: number): Promise<Book> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check ISBN unique
      const existing = await this.bookRepository.findByIsbn(dto.isbn);
      if (existing) {
        throw new ConflictException('ISBN already exists');
      }

      // Create book
      const book = queryRunner.manager.create(Book, {
        ...dto,
        createdBy: userId,
      });

      // Save book
      const savedBook = await queryRunner.manager.save(book);

      // Add categories if provided
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        const categories = await queryRunner.manager.find(Category, {
          where: { id: In(dto.categoryIds) },
        });

        savedBook.categories = categories;
        await queryRunner.manager.save(savedBook);
      }

      await queryRunner.commitTransaction();

      // Load relations
      return await this.bookRepository.findOneWithRelations(savedBook.id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cập nhật sách với optimistic locking
   */
  async update(id: number, dto: UpdateBookDto, userId: number, expectedVersion: number): Promise<Book> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update với version check
      const result = await queryRunner.manager.update(
        Book,
        { id, version: expectedVersion },
        {
          ...dto,
          updatedBy: userId,
        },
      );

      if (result.affected === 0) {
        throw new ConflictException(
          'Book was updated by another user. Please refresh and try again.',
        );
      }

      // Update categories if provided
      if (dto.categoryIds) {
        const book = await queryRunner.manager.findOne(Book, {
          where: { id },
          relations: ['categories'],
        });

        const categories = await queryRunner.manager.find(Category, {
          where: { id: In(dto.categoryIds) },
        });

        book.categories = categories;
        await queryRunner.manager.save(book);
      }

      await queryRunner.commitTransaction();

      return await this.bookRepository.findOneWithRelations(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Xóa sách (soft delete)
   */
  async remove(id: number, userId: number): Promise<void> {
    const book = await this.bookRepository.findOne({ where: { id } });
    
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Update deletedBy before soft delete
    await this.bookRepository.update(id, { updatedBy: userId });
    await this.bookRepository.softDelete(id);
  }

  /**
   * Restore sách đã xóa
   */
  async restore(id: number): Promise<Book> {
    await this.bookRepository.restore(id);
    return await this.bookRepository.findOne({ where: { id } });
  }

  /**
   * Tìm sách với specifications
   */
  async findBySpecifications(...specs: Array<(qb: any) => void>): Promise<Book[]> {
    const qb = this.bookRepository.createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.publisher', 'publisher');

    specs.forEach(spec => spec(qb));

    return await qb.getMany();
  }

  /**
   * Ví dụ sử dụng specifications
   */
  async findAvailableBooksInCategory(categoryId: number): Promise<Book[]> {
    return await this.findBySpecifications(
      BookSpecifications.isPublished(),
      BookSpecifications.inStock(),
      BookSpecifications.hasCategory(categoryId),
    );
  }

  async findBestsellersByAuthor(authorId: number): Promise<Book[]> {
    return await this.findBySpecifications(
      BookSpecifications.isPublished(),
      BookSpecifications.byAuthor(authorId),
      BookSpecifications.isBestseller(50),
    );
  }

  /**
   * Search sách với pagination
   */
  async search(dto: SearchBookDto) {
    return await this.bookRepository.searchBooks(dto);
  }

  /**
   * Lấy bestsellers
   */
  async getBestsellers(limit: number = 10): Promise<Book[]> {
    return await this.bookRepository.findBestsellers(limit);
  }

  /**
   * Lấy sách rating cao
   */
  async getTopRated(limit: number = 10): Promise<Book[]> {
    return await this.bookRepository.findTopRatedBooks(limit);
  }

  /**
   * Thêm review cho sách
   */
  async addReview(
    bookId: number,
    userId: number,
    rating: number,
    comment: string,
  ): Promise<BookReview> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user already reviewed
      const existing = await queryRunner.manager.findOne(BookReview, {
        where: { bookId, userId },
      });

      if (existing) {
        throw new ConflictException('You have already reviewed this book');
      }

      // Create review
      const review = queryRunner.manager.create(BookReview, {
        bookId,
        userId,
        rating,
        comment,
      });

      await queryRunner.manager.save(review);

      // Update book's average rating
      await this.bookRepository.updateAverageRating(bookId);

      await queryRunner.commitTransaction();

      return review;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lấy thống kê theo category
   */
  async getStatsByCategory() {
    return await this.bookRepository.getBookStatsByCategory();
  }

  /**
   * Lấy sách sắp hết hàng
   */
  async getLowStockBooks(threshold: number = 10): Promise<Book[]> {
    return await this.bookRepository.findLowStockBooks(threshold);
  }

  /**
   * Tìm sách tương tự
   */
  async findSimilarBooks(bookId: number, limit: number = 5): Promise<Book[]> {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['categories'],
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    const categoryIds = book.categories.map(cat => cat.id);

    return await this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .innerJoin('book.categories', 'category')
      .where('book.id != :bookId', { bookId })
      .andWhere('category.id IN (:...categoryIds)', { categoryIds })
      .andWhere('book.status = :status', { status: BookStatus.PUBLISHED })
      .orderBy('book.averageRating', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Full-text search (Postgres)
   */
  async fullTextSearch(query: string, limit: number = 20): Promise<Book[]> {
    return await this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .where(
        `to_tsvector('english', book.title || ' ' || COALESCE(book.description, '')) @@ plainto_tsquery('english', :query)`,
        { query },
      )
      .andWhere('book.status = :status', { status: BookStatus.PUBLISHED })
      .orderBy('book.averageRating', 'DESC')
      .take(limit)
      .getMany();
  }
}
```

## 10. Testing Strategies

```typescript
// src/modules/books/books.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BooksService } from './books.service';
import { BookRepository } from './repositories/book.repository';
import { Book, BookStatus } from './entities/book.entity';
import { Category } from '../categories/entities/category.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('BooksService', () => {
  let service: BooksService;
  let bookRepository: BookRepository;
  let dataSource: DataSource;

  const mockBook: Partial<Book> = {
    id: 1,
    title: 'Test Book',
    isbn: '1234567890',
    price: 29.99,
    stockQuantity: 10,
    status: BookStatus.PUBLISHED,
    authorId: 1,
    version: 1,
  };

  const mockBookRepository = {
    findByIsbn: jest.fn(),
    findOneWithRelations: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
      },
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: BookRepository,
          useValue: mockBookRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    bookRepository = module.get<BookRepository>(BookRepository);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a book successfully', async () => {
      const createBookDto = {
        title: 'Test Book',
        isbn: '1234567890',
        price: 29.99,
        stockQuantity: 10,
        authorId: 1,
        categoryIds: [1, 2],
      };

      const mockCategories = [
        { id: 1, name: 'Fiction' },
        { id: 2, name: 'Adventure' },
      ];

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      
      const mockQueryRunner = mockDataSource.createQueryRunner();
      mockQueryRunner.manager.create.mockReturnValue(mockBook);
      mockQueryRunner.manager.save.mockResolvedValue(mockBook);
      mockQueryRunner.manager.find.mockResolvedValue(mockCategories);

      mockBookRepository.findOneWithRelations.mockResolvedValue({
        ...mockBook,
        categories: mockCategories,
      });

      const result = await service.create(createBookDto, 1);

      expect(result).toBeDefined();
      expect(result.title).toBe(createBookDto.title);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if ISBN already exists', async () => {
      const createBookDto = {
        title: 'Test Book',
        isbn: '1234567890',
        price: 29.99,
        stockQuantity: 10,
        authorId: 1,
      };

      mockBookRepository.findByIsbn.mockResolvedValue(mockBook);

      await expect(service.create(createBookDto, 1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rollback transaction on error', async () => {
      const createBookDto = {
        title: 'Test Book',
        isbn: '1234567890',
        price: 29.99,
        stockQuantity: 10,
        authorId: 1,
      };

      mockBookRepository.findByIsbn.mockResolvedValue(null);
      
      const mockQueryRunner = mockDataSource.createQueryRunner();
      mockQueryRunner.manager.create.mockReturnValue(mockBook);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createBookDto, 1)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update book successfully', async () => {
      const updateDto = {
        title: 'Updated Book',
        price: 39.99,
      };

      const mockQueryRunner = mockDataSource.createQueryRunner();
      mockQueryRunner.manager.update.mockResolvedValue({ affected: 1 });

      mockBookRepository.findOneWithRelations.mockResolvedValue({
        ...mockBook,
        ...updateDto,
        version: 2,
      });

      const result = await service.update(1, updateDto, 1, 1);

      expect(result.title).toBe(updateDto.title);
      expect(result.price).toBe(updateDto.price);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException on version mismatch', async () => {
      const updateDto = { title: 'Updated Book' };

      const mockQueryRunner = mockDataSource.createQueryRunner();
      mockQueryRunner.manager.update.mockResolvedValue({ affected: 0 });

      await expect(service.update(1, updateDto, 1, 1)).rejects.toThrow(
        ConflictException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete book', async () => {
      mockBookRepository.findOne.mockResolvedValue(mockBook);
      mockBookRepository.update.mockResolvedValue({ affected: 1 });
      mockBookRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(1, 1);

      expect(mockBookRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if book not found', async () => {
      mockBookRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
```

```typescript
// Integration test với test database
// src/modules/books/books.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BooksService } from './books.service';
import { BookRepository } from './repositories/book.repository';
import { Book } from './entities/book.entity';
import { Author } from '../authors/entities/author.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { Category } from '../categories/entities/category.entity';
import { BookReview } from './entities/book-review.entity';

describe('BooksService Integration Tests', () => {
  let service: BooksService;
  let dataSource: DataSource;
  let authorId: number;
  let publisherId: number;
  let categoryId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Book, Author, Publisher, Category, BookReview],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([Book, Author, Publisher, Category, BookReview]),
      ],
      providers: [
        BooksService,
        {
          provide: BookRepository,
          useFactory: (dataSource: DataSource) => {
            return dataSource.getRepository(Book).extend(BookRepository);
          },
          inject: [DataSource],
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    dataSource = module.get<DataSource>(DataSource);

    // Setup test data
    const author = await dataSource.getRepository(Author).save({
      name: 'Test Author',
      email: 'author@test.com',
    });
    authorId = author.id;

    const publisher = await dataSource.getRepository(Publisher).save({
      name: 'Test Publisher',
    });
    publisherId = publisher.id;

    const category = await dataSource.getRepository(Category).save({
      name: 'Test Category',
      slug: 'test-category',
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Clean books table before each test
    await dataSource.getRepository(Book).clear();
  });

  describe('create', () => {
    it('should create a book with categories', async () => {
      const createDto = {
        title: 'Integration Test Book',
        isbn: 'INT1234567890',
        price: 29.99,
        stockQuantity: 10,
        authorId,
        publisherId,
        categoryIds: [categoryId],
      };

      const book = await service.create(createDto, 1);

      expect(book).toBeDefined();
      expect(book.id).toBeDefined();
      expect(book.title).toBe(createDto.title);
      expect(book.categories).toHaveLength(1);
      expect(book.categories[0].id).toBe(categoryId);
    });

    it('should enforce unique ISBN constraint', async () => {
      const createDto = {
        title: 'Book 1',
        isbn: 'UNIQUE123',
        price: 29.99,
        stockQuantity: 10,
        authorId,
      };

      await service.create(createDto, 1);

      // Try to create duplicate
      await expect(
        service.create({ ...createDto, title: 'Book 2' }, 1),
      ).rejects.toThrow();
    });
  });

  describe('update with optimistic locking', () => {
    it('should update book with correct version', async () => {
      const createDto = {
        title: 'Original Title',
        isbn: 'VER1234567890',
        price: 29.99,
        stockQuantity: 10,
        authorId,
      };

      const book = await service.create(createDto, 1);
      const originalVersion = book.version;

      const updated = await service.update(
        book.id,
        { title: 'Updated Title' },
        1,
        originalVersion,
      );

      expect(updated.title).toBe('Updated Title');
      expect(updated.version).toBe(originalVersion + 1);
    });

    it('should fail on version conflict', async () => {
      const createDto = {
        title: 'Conflict Test',
        isbn: 'CON1234567890',
        price: 29.99,
        stockQuantity: 10,
        authorId,
      };

      const book = await service.create(createDto, 1);

      // Simulate concurrent update
      await dataSource.getRepository(Book).update(book.id, {
        title: 'Updated by another user',
      });

      await expect(
        service.update(book.id, { title: 'My update' }, 1, book.version),
      ).rejects.toThrow('updated by another user');
    });
  });

  describe('soft delete and restore', () => {
    it('should soft delete and restore book', async () => {
      const createDto = {
        title: 'Delete Test',
        isbn: 'DEL1234567890',
        price: 29.99,
        stockQuantity: 10,
        authorId,
      };

      const book = await service.create(createDto, 1);

      // Soft delete
      await service.remove(book.id, 1);

      // Should not find in normal query
      const found = await dataSource.getRepository(Book).findOne({
        where: { id: book.id },
      });
      expect(found).toBeNull();

      // Should find with withDeleted
      const deleted = await dataSource.getRepository(Book).findOne({
        where: { id: book.id },
        withDeleted: true,
      });
      expect(deleted).toBeDefined();
      expect(deleted.deletedAt).toBeDefined();

      // Restore
      const restored = await service.restore(book.id);
      expect(restored.deletedAt).toBeNull();
    });
  });

  describe('reviews and ratings', () => {
    it('should update average rating when adding reviews', async () => {
      const createDto = {
        title: 'Review Test',
        isbn: 'REV1234567890',
        price: 29.99,
        stockQuantity: 10,
        authorId,
      };

      const book = await service.create(createDto, 1);

      // Add reviews
      await service.addReview(book.id, 1, 5, 'Great book!');
      await service.addReview(book.id, 2, 4, 'Good book');
      await service.addReview(book.id, 3, 5, 'Excellent');

      // Check updated rating
      const updated = await dataSource.getRepository(Book).findOne({
        where: { id: book.id },
      });

      expect(updated.totalReviews).toBe(3);
      expect(updated.averageRating).toBeCloseTo(4.67, 1);
    });
  });
});
```

## 11. Module Configuration

```typescript
// src/modules/books/books.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { BooksAdvancedService } from './books.advanced.service';
import { BooksPerformanceService } from './books.performance.service';
import { BooksProceduresService } from './books.procedures.service';
import { BookRepository } from './repositories/book.repository';
import { Book } from './entities/book.entity';
import { BookReview } from './entities/book-review.entity';
import { AuthorsModule } from '../authors/authors.module';
import { CategoriesModule } from '../categories/categories.module';
import { PublishersModule } from '../publishers/publishers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book, BookReview]),
    AuthorsModule,
    CategoriesModule,
    PublishersModule,
  ],
  controllers: [BooksController],
  providers: [
    BooksService,
    BooksAdvancedService,
    BooksPerformanceService,
    BooksProceduresService,
    {
      provide: BookRepository,
      useFactory: (dataSource: DataSource) => {
        return dataSource.getRepository(Book).extend(BookRepository);
      },
      inject: [DataSource],
    },
  ],
  exports: [BooksService, BookRepository],
})
export class BooksModule {}
```

```typescript
// src/modules/authors/authors.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';
import { Author } from './entities/author.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Author])],
  controllers: [AuthorsController],
  providers: [AuthorsService],
  exports: [AuthorsService],
})
export class AuthorsModule {}
```

```typescript
// src/modules/categories/categories.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

```typescript
// src/modules/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    BooksModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

## 12. Controllers với Examples

```typescript
// src/modules/books/books.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksAdvancedService } from './books.advanced.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { SearchBookDto } from './dto/search-book.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly booksAdvancedService: BooksAdvancedService,
  ) {}

  /**
   * Tạo sách mới
   * POST /books
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  async create(@Body() createBookDto: CreateBookDto, @Request() req) {
    return await this.booksService.create(createBookDto, req.user.id);
  }

  /**
   * Search và filter sách
   * GET /books?search=harry&minPrice=10&page=1&limit=20
   */
  @Get()
  async search(@Query() searchDto: SearchBookDto) {
    return await this.booksService.search(searchDto);
  }

  /**
   * Lấy sách bestseller
   * GET /books/bestsellers?limit=10
   */
  @Get('bestsellers')
  async getBestsellers(@Query('limit', ParseIntPipe) limit: number = 10) {
    return await this.booksService.getBestsellers(limit);
  }

  /**
   * Lấy sách rating cao
   * GET /books/top-rated?limit=10
   */
  @Get('top-rated')
  async getTopRated(@Query('limit', ParseIntPipe) limit: number = 10) {
    return await this.booksService.getTopRated(limit);
  }

  /**
   * Lấy sách sắp hết hàng
   * GET /books/low-stock?threshold=10
   */
  @Get('low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory')
  async getLowStock(@Query('threshold', ParseIntPipe) threshold: number = 10) {
    return await this.booksService.getLowStockBooks(threshold);
  }

  /**
   * Thống kê theo category
   * GET /books/stats/by-category
   */
  @Get('stats/by-category')
  async getStatsByCategory() {
    return await this.booksService.getStatsByCategory();
  }

  /**
   * Lấy detail một sách
   * GET /books/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const book = await this.booksService.findBySpecifications(
      qb => qb.where('book.id = :id', { id }),
    );
    
    if (!book || book.length === 0) {
      throw new NotFoundException('Book not found');
    }
    
    return book[0];
  }

  /**
   * Lấy sách tương tự
   * GET /books/:id/similar?limit=5
   */
  @Get(':id/similar')
  async findSimilar(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', ParseIntPipe) limit: number = 5,
  ) {
    return await this.booksService.findSimilarBooks(id, limit);
  }

  /**
   * Update sách
   * PUT /books/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
    @Query('version', ParseIntPipe) version: number,
    @Request() req,
  ) {
    return await this.booksService.update(id, updateBookDto, req.user.id, version);
  }

  /**
   * Xóa sách (soft delete)
   * DELETE /books/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.booksService.remove(id, req.user.id);
  }

  /**
   * Restore sách đã xóa
   * POST /books/:id/restore
   */
  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async restore(@Param('id', ParseIntPipe) id: number) {
    return await this.booksService.restore(id);
  }

  /**
   * Thêm review cho sách
   * POST /books/:id/reviews
   */
  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  async addReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewDto: { rating: number; comment: string },
    @Request() req,
  ) {
    return await this.booksService.addReview(
      id,
      req.user.id,
      reviewDto.rating,
      reviewDto.comment,
    );
  }

  /**
   * Full-text search
   * GET /books/search/fulltext?q=harry+potter
   */
  @Get('search/fulltext')
  async fullTextSearch(@Query('q') query: string) {
    return await this.booksService.fullTextSearch(query);
  }

  /**
   * Advanced queries - Author statistics
   * GET /books/advanced/author-stats
   */
  @Get('advanced/author-stats')
  async getAuthorStats() {
    return await this.booksAdvancedService.getAuthorStatistics();
  }

  /**
   * Advanced queries - Book sales analytics
   * GET /books/advanced/sales-analytics
   */
  @Get('advanced/sales-analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'analyst')
  async getSalesAnalytics() {
    return await this.booksAdvancedService.getBookSalesAnalytics();
  }
}
```

```typescript
// src/modules/orders/orders.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './orders.service';
import { OrderStatus } from './entities/order.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Tạo đơn hàng mới
   * POST /orders
   */
  @Post()
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    createOrderDto.userId = req.user.id;
    return await this.ordersService.createOrder(createOrderDto);
  }

  /**
   * Lấy orders của user hiện tại
   * GET /orders?page=1&limit=10
   */
  @Get()
  async getMyOrders(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return await this.ordersService.getUserOrders(req.user.id, page, limit);
  }

  /**
   * Lấy chi tiết order
   * GET /orders/:id
   */
  @Get(':id')
  async getOrderDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return await this.ordersService.getOrderDetail(id, req.user.id);
  }

  /**
   * Cancel order
   * PUT /orders/:id/cancel
   */
  @Put(':id/cancel')
  async cancelOrder(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return await this.ordersService.cancelOrder(id, req.user.id);
  }

  /**
   * Confirm order (admin only)
   * PUT /orders/:id/confirm
   */
  @Put(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('admin', 'sales')
  async confirmOrder(@Param('id', ParseIntPipe) id: number) {
    return await this.ordersService.confirmOrder(id);
  }

  /**
   * Update order status (admin only)
   * PUT /orders/:id/status
   */
  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'sales')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
  ) {
    return await this.ordersService.updateStatus(id, status);
  }

  /**
   * Thống kê doanh thu theo tháng
   * GET /orders/stats/monthly-revenue?year=2024
   */
  @Get('stats/monthly-revenue')
  @UseGuards(RolesGuard)
  @Roles('admin', 'analyst')
  async getMonthlyRevenue(@Query('year', ParseIntPipe) year: number) {
    return await this.ordersService.getMonthlyRevenue(year);
  }

  /**
   * Top customers
   * GET /orders/stats/top-customers?limit=10
   */
  @Get('stats/top-customers')
  @UseGuards(RolesGuard)
  @Roles('admin', 'analyst')
  async getTopCustomers(@Query('limit', ParseIntPipe) limit: number = 10) {
    return await this.ordersService.getTopCustomers(limit);
  }
}
```

## 13. Database Migrations Examples

```typescript
// src/database/migrations/1700000001-CreateAuthors.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuthors1700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'authors',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '200',
            isUnique: true,
          },
          {
            name: 'biography',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'nationality',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'birth_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'profile_image',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'authors',
      new TableIndex({
        name: 'IDX_AUTHOR_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'authors',
      new TableIndex({
        name: 'IDX_AUTHOR_EMAIL',
        columnNames: ['email'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('authors');
  }
}
```

```typescript
// src/database/migrations/1700000002-CreateBooks.ts
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateBooks1700000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'books',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'isbn',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'stock_quantity',
            type: 'int',
            default: 0,
          },
          {
            name: 'page_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'language',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'published_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'published', 'out_of_stock', 'discontinued'],
            default: "'draft'",
          },
          {
            name: 'cover_image',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'average_rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_reviews',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_sold',
            type: 'int',
            default: 0,
          },
          {
            name: 'author_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'publisher_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'IDX_BOOK_ISBN',
        columnNames: ['isbn'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'IDX_BOOK_TITLE',
        columnNames: ['title'],
      }),
    );

    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'IDX_BOOK_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'IDX_BOOK_PRICE',
        columnNames: ['price'],
      }),
    );

    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'IDX_BOOK_AUTHOR',
        columnNames: ['author_id'],
      }),
    );

    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'IDX_BOOK_PUBLISHER',
        columnNames: ['publisher_id'],
      }),
    );

    // Composite index
    await queryRunner.createIndex(
      'books',
      new TableIndex({
        name: 'IDX_BOOK_AUTHOR_STATUS',
        columnNames: ['author_id', 'status'],
      }),
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'books',
      new TableForeignKey({
        columnNames: ['author_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'authors',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'books',
      new TableForeignKey({
        columnNames: ['publisher_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'publishers',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('books');
    const foreignKeys = table.foreignKeys;
    
    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('books', foreignKey);
    }
    
    await queryRunner.dropTable('books');
  }
}
```

## 14. Seeder Data cho Testing

```typescript
// src/database/seeders/book.seeder.ts
import { DataSource } from 'typeorm';
import { Author } from '../../modules/authors/entities/author.entity';
import { Publisher } from '../../modules/publishers/entities/publisher.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { Book, BookStatus } from '../../modules/books/entities/book.entity';
import { BookReview } from '../../modules/books/entities/book-review.entity';

export class BookSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('Starting book seeder...');

    // 1. Seed Authors
    const authors = await this.seedAuthors();
    console.log(`Created ${authors.length} authors`);

    // 2. Seed Publishers
    const publishers = await this.seedPublishers();
    console.log(`Created ${publishers.length} publishers`);

    // 3. Seed Categories
    const categories = await this.seedCategories();
    console.log(`Created ${categories.length} categories`);

    // 4. Seed Books
    const books = await this.seedBooks(authors, publishers, categories);
    console.log(`Created ${books.length} books`);

    // 5. Seed Reviews
    await this.seedReviews(books);
    console.log('Created book reviews');

    console.log('Seeding completed!');
  }

  private async seedAuthors(): Promise<Author[]> {
    const authorRepository = this.dataSource.getRepository(Author);

    const authorsData = [
      {
        name: 'J.K. Rowling',
        email: 'jk.rowling@example.com',
        biography: 'British author, best known for the Harry Potter series',
        nationality: 'British',
        birthDate: new Date('1965-07-31'),
        isActive: true,
      },
      {
        name: 'George R.R. Martin',
        email: 'george.martin@example.com',
        biography: 'American novelist and short story writer, author of A Song of Ice and Fire',
        nationality: 'American',
        birthDate: new Date('1948-09-20'),
        isActive: true,
      },
      {
        name: 'J.R.R. Tolkien',
        email: 'tolkien@example.com',
        biography: 'English writer, poet, and philologist, author of The Lord of the Rings',
        nationality: 'British',
        birthDate: new Date('1892-01-03'),
        isActive: true,
      },
      {
        name: 'Stephen King',
        email: 'stephen.king@example.com',
        biography: 'American author of horror, supernatural fiction, suspense, and fantasy',
        nationality: 'American',
        birthDate: new Date('1947-09-21'),
        isActive: true,
      },
      {
        name: 'Agatha Christie',
        email: 'agatha.christie@example.com',
        biography: 'English writer known for detective novels',
        nationality: 'British',
        birthDate: new Date('1890-09-15'),
        isActive: true,
      },
    ];

    const authors = authorRepository.create(authorsData);
    return await authorRepository.save(authors);
  }

  private async seedPublishers(): Promise<Publisher[]> {
    const publisherRepository = this.dataSource.getRepository(Publisher);

    const publishersData = [
      {
        name: 'Bloomsbury Publishing',
        address: '50 Bedford Square, London',
        phone: '+44 20 7631 5600',
        email: 'info@bloomsbury.com',
        website: 'https://www.bloomsbury.com',
        isActive: true,
      },
      {
        name: 'Penguin Random House',
        address: '1745 Broadway, New York',
        phone: '+1 212-782-9000',
        email: 'info@penguinrandomhouse.com',
        website: 'https://www.penguinrandomhouse.com',
        isActive: true,
      },
      {
        name: 'HarperCollins',
        address: '195 Broadway, New York',
        phone: '+1 212-207-7000',
        email: 'info@harpercollins.com',
        website: 'https://www.harpercollins.com',
        isActive: true,
      },
      {
        name: 'Simon & Schuster',
        address: '1230 Avenue of the Americas, New York',
        phone: '+1 212-698-7000',
        email: 'info@simonandschuster.com',
        website: 'https://www.simonandschuster.com',
        isActive: true,
      },
    ];

    const publishers = publisherRepository.create(publishersData);
    return await publisherRepository.save(publishers);
  }

  private async seedCategories(): Promise<Category[]> {
    const categoryRepository = this.dataSource.getRepository(Category);

    // Parent categories
    const parentCategories = [
      {
        name: 'Fiction',
        slug: 'fiction',
        description: 'Fictional literature',
        level: 0,
        isActive: true,
      },
      {
        name: 'Non-Fiction',
        slug: 'non-fiction',
        description: 'Non-fictional works',
        level: 0,
        isActive: true,
      },
    ];

    const savedParents = await categoryRepository.save(
      categoryRepository.create(parentCategories),
    );

    // Child categories
    const childCategories = [
      {
        name: 'Fantasy',
        slug: 'fantasy',
        description: 'Fantasy novels',
        parentId: savedParents[0].id,
        level: 1,
        isActive: true,
      },
      {
        name: 'Mystery',
        slug: 'mystery',
        description: 'Mystery and detective stories',
        parentId: savedParents[0].id,
        level: 1,
        isActive: true,
      },
      {
        name: 'Horror',
        slug: 'horror',
        description: 'Horror fiction',
        parentId: savedParents[0].id,
        level: 1,
        isActive: true,
      },
      {
        name: 'Science Fiction',
        slug: 'sci-fi',
        description: 'Science fiction novels',
        parentId: savedParents[0].id,
        level: 1,
        isActive: true,
      },
      {
        name: 'Biography',
        slug: 'biography',
        description: 'Biographical works',
        parentId: savedParents[1].id,
        level: 1,
        isActive: true,
      },
      {
        name: 'History',
        slug: 'history',
        description: 'Historical books',
        parentId: savedParents[1].id,
        level: 1,
        isActive: true,
      },
    ];

    const savedChildren = await categoryRepository.save(
      categoryRepository.create(childCategories),
    );

    return [...savedParents, ...savedChildren];
  }

  private async seedBooks(
    authors: Author[],
    publishers: Publisher[],
    categories: Category[],
  ): Promise<Book[]> {
    const bookRepository = this.dataSource.getRepository(Book);

    const fantasyCategory = categories.find(c => c.slug === 'fantasy');
    const mysteryCategory = categories.find(c => c.slug === 'mystery');
    const horrorCategory = categories.find(c => c.slug === 'horror');

    const booksData = [
      {
        title: "Harry Potter and the Philosopher's Stone",
        isbn: '9780747532699',
        description:
          'The first novel in the Harry Potter series and one of the most popular books ever written.',
        price: 19.99,
        stockQuantity: 150,
        pageCount: 223,
        language: 'English',
        publishedDate: new Date('1997-06-26'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'J.K. Rowling')?.id,
        publisherId: publishers.find(p => p.name === 'Bloomsbury Publishing')?.id,
        averageRating: 4.8,
        totalReviews: 0,
        totalSold: 320,
      },
      {
        title: 'Harry Potter and the Chamber of Secrets',
        isbn: '9780747538493',
        description: 'The second book in the Harry Potter series.',
        price: 20.99,
        stockQuantity: 120,
        pageCount: 251,
        language: 'English',
        publishedDate: new Date('1998-07-02'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'J.K. Rowling')?.id,
        publisherId: publishers.find(p => p.name === 'Bloomsbury Publishing')?.id,
        averageRating: 4.7,
        totalReviews: 0,
        totalSold: 280,
      },
      {
        title: 'A Game of Thrones',
        isbn: '9780553103540',
        description:
          'The first book in A Song of Ice and Fire series, the basis for Game of Thrones TV series.',
        price: 24.99,
        stockQuantity: 80,
        pageCount: 694,
        language: 'English',
        publishedDate: new Date('1996-08-01'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'George R.R. Martin')?.id,
        publisherId: publishers.find(p => p.name === 'Penguin Random House')?.id,
        averageRating: 4.6,
        totalReviews: 0,
        totalSold: 450,
      },
      {
        title: 'The Lord of the Rings',
        isbn: '9780618640157',
        description: 'Epic high-fantasy novel written by English author J.R.R. Tolkien.',
        price: 29.99,
        stockQuantity: 95,
        pageCount: 1178,
        language: 'English',
        publishedDate: new Date('1954-07-29'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'J.R.R. Tolkien')?.id,
        publisherId: publishers.find(p => p.name === 'HarperCollins')?.id,
        averageRating: 4.9,
        totalReviews: 0,
        totalSold: 520,
      },
      {
        title: 'The Shining',
        isbn: '9780385121675',
        description: 'Horror novel by American author Stephen King.',
        price: 18.99,
        stockQuantity: 60,
        pageCount: 447,
        language: 'English',
        publishedDate: new Date('1977-01-28'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'Stephen King')?.id,
        publisherId: publishers.find(p => p.name === 'Simon & Schuster')?.id,
        averageRating: 4.5,
        totalReviews: 0,
        totalSold: 380,
      },
      {
        title: 'Murder on the Orient Express',
        isbn: '9780062693662',
        description: 'Detective novel by Agatha Christie featuring Hercule Poirot.',
        price: 16.99,
        stockQuantity: 75,
        pageCount: 256,
        language: 'English',
        publishedDate: new Date('1934-01-01'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'Agatha Christie')?.id,
        publisherId: publishers.find(p => p.name === 'HarperCollins')?.id,
        averageRating: 4.4,
        totalReviews: 0,
        totalSold: 290,
      },
      {
        title: 'It',
        isbn: '9781501142970',
        description: 'Horror novel by Stephen King about a monster that preys on children.',
        price: 22.99,
        stockQuantity: 45,
        pageCount: 1138,
        language: 'English',
        publishedDate: new Date('1986-09-15'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'Stephen King')?.id,
        publisherId: publishers.find(p => p.name === 'Simon & Schuster')?.id,
        averageRating: 4.3,
        totalReviews: 0,
        totalSold: 410,
      },
      {
        title: 'The Hobbit',
        isbn: '9780547928227',
        description: "Children's fantasy novel by J.R.R. Tolkien, prequel to The Lord of the Rings.",
        price: 17.99,
        stockQuantity: 110,
        pageCount: 310,
        language: 'English',
        publishedDate: new Date('1937-09-21'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'J.R.R. Tolkien')?.id,
        publisherId: publishers.find(p => p.name === 'HarperCollins')?.id,
        averageRating: 4.7,
        totalReviews: 0,
        totalSold: 340,
      },
      {
        title: 'A Clash of Kings',
        isbn: '9780553108033',
        description: 'Second book in A Song of Ice and Fire series.',
        price: 25.99,
        stockQuantity: 5, // Low stock
        pageCount: 768,
        language: 'English',
        publishedDate: new Date('1998-11-16'),
        status: BookStatus.PUBLISHED,
        authorId: authors.find(a => a.name === 'George R.R. Martin')?.id,
        publisherId: publishers.find(p => p.name === 'Penguin Random House')?.id,
        averageRating: 4.6,
        totalReviews: 0,
        totalSold: 390,
      },
      {
        title: 'And Then There Were None',
        isbn: '9780062073488',
        description: 'Mystery novel by Agatha Christie, best-selling mystery of all time.',
        price: 15.99,
        stockQuantity: 0, // Out of stock
        pageCount: 272,
        language: 'English',
        publishedDate: new Date('1939-11-06'),
        status: BookStatus.OUT_OF_STOCK,
        authorId: authors.find(a => a.name === 'Agatha Christie')?.id,
        publisherId: publishers.find(p => p.name === 'HarperCollins')?.id,
        averageRating: 4.5,
        totalReviews: 0,
        totalSold: 460,
      },
    ];

    const books = bookRepository.create(booksData);
    const savedBooks = await bookRepository.save(books);

    // Assign categories to books
    savedBooks[0].categories = [fantasyCategory]; // Harry Potter 1
    savedBooks[1].categories = [fantasyCategory]; // Harry Potter 2
    savedBooks[2].categories = [fantasyCategory]; // Game of Thrones
    savedBooks[3].categories = [fantasyCategory]; // Lord of the Rings
    savedBooks[4].categories = [horrorCategory]; // The Shining
    savedBooks[5].categories = [mysteryCategory]; // Murder on Orient
    savedBooks[6].categories = [horrorCategory]; // It
    savedBooks[7].categories = [fantasyCategory]; // The Hobbit
    savedBooks[8].categories = [fantasyCategory]; // Clash of Kings
    savedBooks[9].categories = [mysteryCategory]; // And Then There Were None

    return await bookRepository.save(savedBooks);
  }

  private async seedReviews(books: Book[]): Promise<void> {
    const reviewRepository = this.dataSource.getRepository(BookReview);

    const reviewsData = [];

    // Add 3-5 reviews cho mỗi sách
    for (const book of books) {
      const numReviews = Math.floor(Math.random() * 3) + 3; // 3-5 reviews

      for (let i = 0; i < numReviews; i++) {
        reviewsData.push({
          bookId: book.id,
          userId: Math.floor(Math.random() * 100) + 1, // Random user 1-100
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
          comment: this.getRandomComment(),
          isVerifiedPurchase: Math.random() > 0.3, // 70% verified
          helpfulCount: Math.floor(Math.random() * 20),
        });
      }
    }

    const reviews = reviewRepository.create(reviewsData);
    await reviewRepository.save(reviews);

    // Update book ratings
    const bookRepository = this.dataSource.getRepository(Book);
    for (const book of books) {
      await this.dataSource.query(
        `
        UPDATE books
        SET 
          average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM book_reviews
            WHERE book_id = $1 AND deleted_at IS NULL
          ),
          total_reviews = (
            SELECT COUNT(*)
            FROM book_reviews
            WHERE book_id = $1 AND deleted_at IS NULL
          )
        WHERE id = $1
        `,
        [book.id],
      );
    }
  }

  private getRandomComment(): string {
    const comments = [
      'Absolutely loved this book! Highly recommend.',
      'Great read, couldn\'t put it down.',
      'One of the best books I\'ve ever read.',
      'Engaging story with well-developed characters.',
      'A masterpiece! Will definitely read again.',
      'Fantastic book, exceeded my expectations.',
      'Well-written and captivating from start to finish.',
      'Amazing story, highly entertaining.',
      'Brilliant work, five stars!',
      'Exceptional storytelling and character development.',
    ];

    return comments[Math.floor(Math.random() * comments.length)];
  }
}
```

```typescript
// src/database/seeders/seed.ts
import { DataSource } from 'typeorm';
import { BookSeeder } from './book.seeder';
import * as dotenv from 'dotenv';

dotenv.config();

async function runSeeders() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'bookstore',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    const bookSeeder = new BookSeeder(dataSource);
    await bookSeeder.run();

    console.log('All seeders completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

runSeeders();
```

Thêm script vào `package.json`:

```json
{
  "scripts": {
    "seed": "ts-node src/database/seeders/seed.ts"
  }
}
```

## 15. API Response Interceptor & Error Handling

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}
```

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message =
          (exceptionResponse as any).message || exception.message;
        errors = (exceptionResponse as any).errors;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

## 16. Example: Complete Flow - Create Order

Để minh họa tổng hợp tất cả concepts, đây là flow hoàn chỉnh tạo order:

```typescript
// src/modules/orders/dto/create-order.dto.ts
import { IsArray, IsString, IsNotEmpty, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsInt()
  @Min(1)
  bookId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  userId: number; // Will be set from JWT

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsString()
  notes?: string;
}
```

```typescript
// Complete service với full error handling và logging
// src/modules/orders/orders.enhanced.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Book, BookStatus } from '../books/entities/book.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersEnhancedService {
  private readonly logger = new Logger(OrdersEnhancedService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    private dataSource: DataSource,
  ) {}

  /**
   * Tạo order với full transaction, validation, error handling
   */
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Creating order for user ${dto.userId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Start transaction với READ COMMITTED isolation
      await queryRunner.startTransaction('READ COMMITTED');
      this.logger.debug('Transaction started');

      // Step 1: Validate và lock books
      const bookIds = dto.items.map(item => item.bookId);
      this.logger.debug(`Locking books: ${bookIds.join(', ')}`);

      const books = await queryRunner.manager
        .createQueryBuilder(Book, 'book')
        .where('book.id IN (:...bookIds)', { bookIds })
        .setLock('pessimistic_write') // FOR UPDATE
        .getMany();

      if (books.length !== dto.items.length) {
        throw new NotFoundException('One or more books not found');
      }

      // Step 2: Validate stock và calculate total
      let totalAmount = 0;
      const orderItemsData = [];
      const stockUpdates = [];

      for (const item of dto.items) {
        const book = books.find(b => b.id === item.bookId);

        // Validate book status
        if (book.status !== BookStatus.PUBLISHED) {
          throw new BadRequestException(
            `Book "${book.title}" is not available for purchase`,
          );
        }

        // Validate stock
        if (book.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${book.title}". ` +
              `Available: ${book.stockQuantity}, Requested: ${item.quantity}`,
          );
        }

        const subtotal = Number(book.price) * item.quantity;
        totalAmount += subtotal;

        orderItemsData.push({
          bookId: book.id,
          quantity: item.quantity,
          price: book.price,
          subtotal,
        });

        stockUpdates.push({
          bookId: book.id,
          quantity: item.quantity,
        });

        this.logger.debug(
          `Validated book ${book.id}: ${item.quantity} x $${book.price} = $${subtotal}`,
        );
      }

      // Step 3: Generate order number
      const orderNumber = await this.generateOrderNumber(queryRunner);
      this.logger.debug(`Generated order number: ${orderNumber}`);

      // Step 4: Create order
      const order = queryRunner.manager.create(Order, {
        userId: dto.userId,
        orderNumber,
        totalAmount,
        shippingAddress: dto.shippingAddress,
        notes: dto.notes,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);
      this.logger.log(`Order created with ID: ${savedOrder.id}`);

      // Step 5: Create order items
      const orderItems = orderItemsData.map(itemData =>
        queryRunner.manager.create(OrderItem, {
          ...itemData,
          orderId: savedOrder.id,
        }),
      );

      await queryRunner.manager.save(orderItems);
      this.logger.debug(`Created ${orderItems.length} order items`);

      // Step 6: Update book stock
      for (const update of stockUpdates) {
        await queryRunner.manager.decrement(
          Book,
          { id: update.bookId },
          'stockQuantity',
          update.quantity,
        );

        await queryRunner.manager.increment(
          Book,
          { id: update.bookId },
          'totalSold',
          update.quantity,
        );

        // Check if out of stock
        const updatedBook = await queryRunner.manager.findOne(Book, {
          where: { id: update.bookId },
        });

        if (updatedBook.stockQuantity === 0) {
          await queryRunner.manager.update(Book, update.bookId, {
            status: BookStatus.OUT_OF_STOCK,
          });
          this.logger.warn(`Book ${update.bookId} is now out of stock`);
        }
      }

      // Commit transaction
      await queryRunner.commitTransaction();
      this.logger.log(`Order ${savedOrder.id} committed successfully`);

      // Load order với relations
      const completeOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['items', 'items.book', 'items.book.author'],
      });

      return completeOrder;

    } catch (error) {
      // Rollback transaction
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction rolled back', error.stack);

      // Re-throw known errors
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        'Failed to create order. Please try again.',
      );

    } finally {
      // Always release connection
      await queryRunner.release();
      this.logger.debug('Connection released');
    }
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(queryRunner: any): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Count orders created today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await queryRunner.manager
      .createQueryBuilder(Order, 'order')
      .where('order.createdAt >= :start', { start: startOfDay })
      .andWhere('order.createdAt <= :end', { end: endOfDay })
      .getCount();

    const sequence = String(count + 1).padStart(4, '0');
    return `ORD${year}${month}${day}${sequence}`;
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(userId: number) {
    const stats = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('SUM(order.totalAmount)', 'totalAmount')
      .where('order.userId = :userId', { userId })
      .groupBy('order.status')
      .getRawMany();

    const totalOrders = await this.orderRepository.count({
      where: { userId },
    });

    const totalSpent = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status != :status', { status: OrderStatus.CANCELLED })
      .getRawOne();

    return {
      totalOrders,
      totalSpent: Number(totalSpent?.total || 0),
      byStatus: stats,
    };
  }
}
```

## 17. Main Application Setup

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
```

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BooksModule } from './modules/books/books.module';
import { AuthorsModule } from './modules/authors/authors.module';
import { PublishersModule } from './modules/publishers/publishers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('DB_LOGGING') === 'true',
        maxQueryExecutionTime: 1000,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),
    BooksModule,
    AuthorsModule,
    PublishersModule,
    CategoriesModule,
    OrdersModule,
  ],
})
export class AppModule {}
```

## 18. Environment Configuration

```bash
# .env.example
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=bookstore
DB_LOGGING=true

# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
```

## 19. Kết luận và Best Practices Summary

### Key Takeaways:

1. **Relations Design:**
   - Xác định đúng loại quan hệ (One-to-One, One-to-Many, Many-to-Many)
   - Sử dụng cascade cẩn thận
   - Dùng eager loading hợp lý

2. **Query Optimization:**
   - Tránh N+1 problem
   - Sử dụng indexes đúng cách
   - Select only needed fields
   - Pagination cho large datasets

3. **Transactions:**
   - Dùng transactions cho related operations
   - Handle errors properly
   - Always release connections
   - Chọn isolation level phù hợp

4. **Security:**
   - Always use parameter binding
   - Never concatenate SQL strings
   - Validate input data
   - Use appropriate permissions

5. **Performance:**
   - Monitor slow queries
   - Use query caching when appropriate
   - Batch operations
   - Optimize indexes

6. **Testing:**
   - Unit tests cho business logic
   - Integration tests với test database
   - Test edge cases và error scenarios

7. **Code Organization:**
   - Custom repositories cho complex queries
   - Specifications pattern cho reusable conditions
   - Proper error handling
   - Comprehensive logging

Chúc bạn học tốt TypeORM Advanced! 🚀