import {
  IsLowercase,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  //OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { PostStatus } from '../interfaces/post.interface';
import { v4 as uuidv4 } from 'uuid';

@Entity({ name: 'Posts' })
export class Post {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  @IsNotEmpty({ message: 'Post ID must not be empty.' })
  id: string;

  @IsNotEmpty({ message: 'Post Title must not be empty.' })
  @Column({ type: 'varchar', length: 255, name: 'Title' })
  @MinLength(2, { message: 'Post Title must have atleast 2 characters.' })
  title: string;

  @IsNotEmpty({ message: 'Post Slug must not be empty.' })
  @Column({
    type: 'varchar',
    length: 255,
    name: 'Slug',
    unique: true,
  })
  @IsLowercase({ message: 'Slug must be lowercase.' })
  @MinLength(2, { message: 'Post Title must have atleast 2 characters.' })
  slug: string;

  @Column({ type: 'text', name: 'Content', nullable: true })
  @IsOptional()
  content: string;

  @Column({
    name: 'Status',
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  status: PostStatus;

  @Column({ name: 'ThumbnailUrl', type: 'varchar', nullable: true })
  thumbnailUrl: string;

  @CreateDateColumn({ name: 'CreatedAt' })
  @IsNotEmpty()
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt' })
  @IsNotEmpty()
  updatedAt: Date;

  // Quan hệ với User
  // @ManyToOne(() => User, (user) => user.posts, { eager: true })
  // @JoinColumn({ name: 'authorId' })
  // author: User;

  // @Column()
  // authorId: number;

  // // Quan hệ với Category
  // @ManyToOne(() => Category, (category) => category.posts)
  // @JoinColumn({ name: 'categoryId' })
  // category: Category;

  // @Column()
  // categoryId: number;

  // // Quan hệ với Comment
  // @OneToMany(() => Comment, (comment) => comment.post)
  // comments: Comment[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
