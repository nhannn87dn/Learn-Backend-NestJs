// ============================================
// 1. DATABASE/DATA-SOURCE.TS
// ============================================
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'nestjs_starter',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  synchronize: false, // NEVER use true in production
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

// ============================================
// 2. DATABASE/MIGRATIONS/1700000000001-CreateUsersTable.ts
// ============================================
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            default: "'user'",
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create index on email
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_EMAIL',
        columnNames: ['email'],
      }),
    );

    // Create index on role
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_ROLE',
        columnNames: ['role'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_USERS_ROLE');
    await queryRunner.dropIndex('users', 'IDX_USERS_EMAIL');
    await queryRunner.dropTable('users');
  }
}

// ============================================
// 3. DATABASE/MIGRATIONS/1700000000002-CreatePostsTable.ts
// ============================================
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePostsTable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'posts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'excerpt',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'thumbnail',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'published', 'archived'],
            default: "'draft'",
          },
          {
            name: 'published_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'posts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        name: 'IDX_POSTS_SLUG',
        columnNames: ['slug'],
      }),
    );

    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        name: 'IDX_POSTS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        name: 'IDX_POSTS_USER_ID',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('posts');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    await queryRunner.dropForeignKey('posts', foreignKey);
    await queryRunner.dropIndex('posts', 'IDX_POSTS_USER_ID');
    await queryRunner.dropIndex('posts', 'IDX_POSTS_STATUS');
    await queryRunner.dropIndex('posts', 'IDX_POSTS_SLUG');
    await queryRunner.dropTable('posts');
  }
}

// ============================================
// 4. DATABASE/MIGRATIONS/1700000000003-CreateCategoriesTable.ts
// ============================================
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCategoriesTable1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'parent_id',
            type: 'uuid',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Self-referencing foreign key
    await queryRunner.query(`
      ALTER TABLE categories 
      ADD CONSTRAINT FK_CATEGORIES_PARENT 
      FOREIGN KEY (parent_id) 
      REFERENCES categories(id) 
      ON DELETE SET NULL
    `);

    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_CATEGORIES_SLUG',
        columnNames: ['slug'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE categories DROP CONSTRAINT FK_CATEGORIES_PARENT');
    await queryRunner.dropIndex('categories', 'IDX_CATEGORIES_SLUG');
    await queryRunner.dropTable('categories');
  }
}

// ============================================
// 5. DATABASE/MIGRATIONS/1700000000004-CreatePostCategoriesTable.ts
// ============================================
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePostCategoriesTable1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'post_categories',
        columns: [
          {
            name: 'post_id',
            type: 'uuid',
          },
          {
            name: 'category_id',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Composite primary key
    await queryRunner.query(`
      ALTER TABLE post_categories 
      ADD CONSTRAINT PK_POST_CATEGORIES 
      PRIMARY KEY (post_id, category_id)
    `);

    // Foreign keys
    await queryRunner.createForeignKey(
      'post_categories',
      new TableForeignKey({
        columnNames: ['post_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'posts',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'post_categories',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('post_categories');
    const foreignKeys = table.foreignKeys;
    
    for (const foreignKey of foreignKeys) {
      await queryRunner.dropForeignKey('post_categories', foreignKey);
    }
    
    await queryRunner.dropTable('post_categories');
  }
}

// ============================================
// 6. DATABASE/SEEDS/SEEDER.TS
// ============================================
import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { UserSeeder } from './user.seeder';
import { CategorySeeder } from './category.seeder';
import { PostSeeder } from './post.seeder';

export class DatabaseSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('🌱 Starting database seeding...');

    try {
      // Run seeders in order
      await new UserSeeder(this.dataSource).run();
      await new CategorySeeder(this.dataSource).run();
      await new PostSeeder(this.dataSource).run();

      console.log('✅ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }
}

// Main execution
(async () => {
  try {
    await dataSource.initialize();
    console.log('📦 Data Source initialized');

    const seeder = new DatabaseSeeder(dataSource);
    await seeder.run();

    await dataSource.destroy();
    console.log('👋 Data Source destroyed');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
})();

// ============================================
// 7. DATABASE/SEEDS/USER.SEEDER.TS
// ============================================
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class UserSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('👤 Seeding users...');

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const hashedPassword = await bcrypt.hash('password123', 10);

      const users = [
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'admin',
          is_active: true,
        },
        {
          name: 'John Doe',
          email: 'john@example.com',
          password: hashedPassword,
          role: 'user',
          is_active: true,
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          password: hashedPassword,
          role: 'user',
          is_active: true,
        },
        {
          name: 'Bob Wilson',
          email: 'bob@example.com',
          password: hashedPassword,
          role: 'moderator',
          is_active: true,
        },
        {
          name: 'Alice Brown',
          email: 'alice@example.com',
          password: hashedPassword,
          role: 'user',
          is_active: false,
        },
      ];

      for (const user of users) {
        await queryRunner.query(
          `INSERT INTO users (name, email, password, role, is_active) 
           VALUES ($1, $2, $3, $4, $5)`,
          [user.name, user.email, user.password, user.role, user.is_active],
        );
      }

      await queryRunner.commitTransaction();
      console.log(`✅ Seeded ${users.length} users`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error seeding users:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

// ============================================
// 8. DATABASE/SEEDS/CATEGORY.SEEDER.TS
// ============================================
import { DataSource } from 'typeorm';

export class CategorySeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('📁 Seeding categories...');

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Parent categories
      const parentCategories = [
        { name: 'Technology', slug: 'technology', description: 'All about technology' },
        { name: 'Lifestyle', slug: 'lifestyle', description: 'Lifestyle articles' },
        { name: 'Business', slug: 'business', description: 'Business and finance' },
      ];

      const parentIds: Record<string, string> = {};

      for (const category of parentCategories) {
        const result = await queryRunner.query(
          `INSERT INTO categories (name, slug, description) 
           VALUES ($1, $2, $3) 
           RETURNING id`,
          [category.name, category.slug, category.description],
        );
        parentIds[category.slug] = result[0].id;
      }

      // Child categories
      const childCategories = [
        { 
          name: 'Web Development', 
          slug: 'web-development', 
          description: 'Web dev tutorials',
          parent_slug: 'technology' 
        },
        { 
          name: 'Mobile Apps', 
          slug: 'mobile-apps', 
          description: 'Mobile app development',
          parent_slug: 'technology' 
        },
        { 
          name: 'Health & Fitness', 
          slug: 'health-fitness', 
          description: 'Health tips',
          parent_slug: 'lifestyle' 
        },
        { 
          name: 'Travel', 
          slug: 'travel', 
          description: 'Travel guides',
          parent_slug: 'lifestyle' 
        },
        { 
          name: 'Startups', 
          slug: 'startups', 
          description: 'Startup insights',
          parent_slug: 'business' 
        },
      ];

      for (const category of childCategories) {
        await queryRunner.query(
          `INSERT INTO categories (name, slug, description, parent_id) 
           VALUES ($1, $2, $3, $4)`,
          [
            category.name, 
            category.slug, 
            category.description, 
            parentIds[category.parent_slug]
          ],
        );
      }

      await queryRunner.commitTransaction();
      console.log(`✅ Seeded ${parentCategories.length + childCategories.length} categories`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error seeding categories:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

// ============================================
// 9. DATABASE/SEEDS/POST.SEEDER.TS
// ============================================
import { DataSource } from 'typeorm';

export class PostSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('📝 Seeding posts...');

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Get users
      const users = await queryRunner.query('SELECT id FROM users LIMIT 3');
      
      // Get categories
      const categories = await queryRunner.query('SELECT id FROM categories');

      const posts = [
        {
          title: 'Getting Started with NestJS',
          slug: 'getting-started-with-nestjs',
          content: 'NestJS is a progressive Node.js framework for building efficient and scalable server-side applications...',
          excerpt: 'Learn the basics of NestJS framework',
          status: 'published',
          published_at: new Date('2024-01-15'),
          user_id: users[0].id,
        },
        {
          title: 'TypeORM Best Practices',
          slug: 'typeorm-best-practices',
          content: 'TypeORM is an ORM that can run in NodeJS, Browser, Cordova, PhoneGap, Ionic, React Native...',
          excerpt: 'Best practices for using TypeORM',
          status: 'published',
          published_at: new Date('2024-01-20'),
          user_id: users[0].id,
        },
        {
          title: 'Building RESTful APIs',
          slug: 'building-restful-apis',
          content: 'REST APIs are the backbone of modern web applications...',
          excerpt: 'Guide to building REST APIs',
          status: 'published',
          published_at: new Date('2024-02-01'),
          user_id: users[1].id,
        },
        {
          title: 'Introduction to Docker',
          slug: 'introduction-to-docker',
          content: 'Docker is a platform for developing, shipping, and running applications...',
          excerpt: 'Docker basics for beginners',
          status: 'draft',
          published_at: null,
          user_id: users[1].id,
        },
        {
          title: 'Microservices Architecture',
          slug: 'microservices-architecture',
          content: 'Microservices are a software development technique...',
          excerpt: 'Understanding microservices',
          status: 'published',
          published_at: new Date('2024-02-15'),
          user_id: users[2].id,
        },
      ];

      const postIds: string[] = [];

      for (const post of posts) {
        const result = await queryRunner.query(
          `INSERT INTO posts (title, slug, content, excerpt, status, published_at, user_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING id`,
          [
            post.title,
            post.slug,
            post.content,
            post.excerpt,
            post.status,
            post.published_at,
            post.user_id,
          ],
        );
        postIds.push(result[0].id);
      }

      // Link posts to categories
      for (let i = 0; i < postIds.length; i++) {
        const categoryCount = Math.floor(Math.random() * 3) + 1;
        const selectedCategories = categories
          .sort(() => 0.5 - Math.random())
          .slice(0, categoryCount);

        for (const category of selectedCategories) {
          await queryRunner.query(
            `INSERT INTO post_categories (post_id, category_id) 
             VALUES ($1, $2)`,
            [postIds[i], category.id],
          );
        }
      }

      await queryRunner.commitTransaction();
      console.log(`✅ Seeded ${posts.length} posts`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error seeding posts:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

// ============================================
// 10. DATABASE/SEEDS/SEED.TS (Alternative simple version)
// ============================================
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import * as bcrypt from 'bcrypt';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);

    console.log('🌱 Seeding users...');

    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      },
      {
        name: 'Regular User',
        email: 'user@example.com',
        password: 'password123',
        role: 'user',
      },
    ];

    for (const user of users) {
      try {
        await usersService.create(user);
        console.log(`✅ Created user: ${user.email}`);
      } catch (error) {
        console.log(`⚠️  User ${user.email} already exists`);
      }
    }

    console.log('✅ Seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding:', error);
  } finally {
    await app.close();
  }
}

seed();

// ============================================
// 11. PACKAGE.JSON - ADDITIONAL SCRIPTS
// ============================================
/*
{
  "scripts": {
    ...existing scripts,
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:create": "typeorm migration:create",
    "migration:generate": "npm run typeorm -- migration:generate -d src/database/data-source.ts",
    "migration:run": "npm run typeorm -- migration:run -d src/database/data-source.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d src/database/data-source.ts",
    "migration:show": "npm run typeorm -- migration:show -d src/database/data-source.ts",
    "seed": "ts-node src/database/seeds/seeder.ts",
    "seed:simple": "ts-node src/database/seeds/seed.ts",
    "db:reset": "npm run migration:revert && npm run migration:run && npm run seed"
  }
}
*/

// ============================================
// 12. COMMON/CONFIGS/DATABASE.CONFIG.TS (Updated)
// ============================================
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'nestjs_starter',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../database/migrations/**/*{.ts,.js}'],
    synchronize: false, // Always false - use migrations instead
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false,
    // Additional options
    autoLoadEntities: true,
    migrationsRun: false, // Don't auto-run migrations
    migrationsTableName: 'migrations_history',
  }),
);

// ============================================
// 13. EXAMPLE ENTITIES WITH RELATIONS
// ============================================

// modules/posts/entities/post.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column('text')
  content: string;

  @Column('text', { nullable: true })
  excerpt: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  status: string;

  @Column({ name: 'published_at', nullable: true })
  publishedAt: Date;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => Category, (category) => category.posts)
  @JoinTable({
    name: 'post_categories',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// modules/categories/entities/category.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @ManyToMany(() => Post, (post) => post.categories)
  posts: Post[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// modules/users/entities/user.entity.ts (Updated with relations)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// ============================================
// 14. README - DATABASE SECTION
// ============================================
/*
## Database Management

### Migrations

# Create new migration
npm run migration:create src/database/migrations/MigrationName

# Generate migration from entities
npm run migration:generate src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show all migrations and their status
npm run migration:show

### Seeds

# Run all seeders
npm run seed

# Run simple seeder (using NestJS services)
npm run seed:simple

# Reset database (revert, run migrations, seed)
npm run db:reset
*/