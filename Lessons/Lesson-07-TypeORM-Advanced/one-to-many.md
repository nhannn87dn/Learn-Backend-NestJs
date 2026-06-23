# One-to-Many / Many-to-One Relationship

**Khái niệm:** Một bản ghi ở bảng A có thể liên kết với nhiều bản ghi ở bảng B, nhưng mỗi bản ghi ở bảng B chỉ thuộc về một bản ghi ở bảng A.

**Ví dụ thực tế:** Một User có nhiều Posts, mỗi Post thuộc về một User.

```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  // Một user có nhiều posts
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}
```

```typescript
// post.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  // Nhiều posts thuộc về một user
  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE', // Xóa user thì xóa tất cả posts
    onUpdate: 'CASCADE', // Update user id thì update posts
  })
  @JoinColumn({ name: 'author_id' }) // Tên cột foreign key
  author: User;

  @Column({ name: 'author_id' })
  authorId: number; // Có thể dùng trực tiếp ID
}
```

**Sử dụng:**

```typescript
// Lấy user với tất cả posts
async getUserWithPosts(userId: number) {
  return await this.userRepository.findOne({
    where: { id: userId },
    relations: ['posts'],
  });
}

// Tạo post cho user
async createPost(userId: number, postData: any) {
  const post = this.postRepository.create({
    ...postData,
    authorId: userId, // Cách 1: Dùng ID trực tiếp
  });
  
  return await this.postRepository.save(post);
}

// Hoặc
async createPost2(userId: number, postData: any) {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  
  const post = this.postRepository.create({
    ...postData,
    author: user, // Cách 2: Gán object
  });
  
  return await this.postRepository.save(post);
}
```



Ví dụ 2: Một Order có nhiều OrderItems, mỗi OrderItem thuộc về một Order.

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