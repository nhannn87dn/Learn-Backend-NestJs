# Lesson 12 - MongoDB Advanced

## 1. Truy vấn nâng cao với Mongoose

### 1.1. Populate (Join trong MongoDB)

MongoDB không có JOIN như SQL, nhưng Mongoose cung cấp `populate()` để "nối" documents từ các collections khác nhau.

#### Basic Populate

**Cách hoạt động của Populate:**

```typescript
// Without populate
const post = await this.postModel.findById(postId);
console.log(post);
// {
//   _id: "post123",
//   title: "My Post",
//   authorId: "user456", // Just an ObjectId
//   content: "..."
// }

// With populate
const post = await this.postModel
  .findById(postId)
  .populate('authorId');
console.log(post);
// {
//   _id: "post123",
//   title: "My Post",
//   authorId: { // Full user object
//     _id: "user456",
//     name: "John Doe",
//     email: "john@example.com",
//     ...
//   },
//   content: "..."
// }
```

**Internally, populate thực hiện 2 queries:**

```javascript
// Step 1: Get post
const post = await db.posts.findOne({ _id: "post123" });
// Result: { _id: "post123", authorId: "user456", ... }

// Step 2: Get referenced user
const author = await db.users.findOne({ _id: "user456" });
// Result: { _id: "user456", name: "John Doe", ... }

// Step 3: Merge results
post.authorId = author;
```

**Implementation:**

```typescript
// src/posts/schemas/post.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tags: Types.ObjectId[];
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

**Service với populate:**

```typescript
// src/posts/posts.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Basic populate
  async findByIdWithAuthor(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate('authorId') // Populate author
      .exec();
  }

  // Populate multiple fields
  async findByIdWithRelations(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate('authorId')    // Populate author
      .populate('categoryId')  // Populate category
      .populate('tags')        // Populate tags
      .exec();
  }

  // Populate all posts
  async findAllWithAuthors(): Promise<Post[]> {
    return this.postModel
      .find()
      .populate('authorId')
      .sort({ createdAt: -1 })
      .exec();
  }
}
```

#### Select Fields khi Populate

```typescript
@Injectable()
export class PostsService {
  // Select specific fields
  async findByIdWithAuthorBasic(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate('authorId', 'name email avatar') // Only these fields
      .exec();
  }

  // Exclude fields with minus (-)
  async findByIdWithAuthorSafe(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate('authorId', '-password -__v') // Exclude password & __v
      .exec();
  }

  // Populate object syntax (more control)
  async findByIdWithDetailedPopulate(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate({
        path: 'authorId',
        select: 'name email avatar bio',
        match: { isActive: true }, // Only if author is active
      })
      .populate({
        path: 'categoryId',
        select: 'name slug description',
      })
      .populate({
        path: 'tags',
        select: 'name color',
        options: {
          limit: 5, // Limit number of tags
          sort: { name: 1 } // Sort tags
        }
      })
      .exec();
  }
}
```

**Giải thích populate options:**

```typescript
.populate({
  path: 'authorId',           // Field to populate
  select: 'name email',       // Fields to include from populated doc
  match: { isActive: true },  // Filter populated docs
  options: {
    limit: 10,                // Limit number of populated docs
    sort: { name: 1 },        // Sort populated docs
    skip: 0,                  // Skip populated docs
  },
  populate: { ... }           // Nested populate (next section)
})
```

#### Nested Populate

```typescript
// Scenario: Post → Author → Company
// Post references Author
// Author references Company

// src/users/schemas/user.schema.ts
@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId: Types.ObjectId;
}

// Nested populate implementation
@Injectable()
export class PostsService {
  async findByIdWithNestedPopulate(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate({
        path: 'authorId',
        select: 'name email companyId',
        populate: {
          path: 'companyId', // Nested populate
          select: 'name logo website',
        }
      })
      .exec();
  }

  // Result:
  // {
  //   _id: "post123",
  //   title: "My Post",
  //   authorId: {
  //     _id: "user456",
  //     name: "John Doe",
  //     email: "john@example.com",
  //     companyId: {
  //       _id: "company789",
  //       name: "Tech Corp",
  //       logo: "https://...",
  //       website: "https://..."
  //     }
  //   }
  // }
}
```

**Multiple nested populates:**

```typescript
async findByIdWithMultipleNested(id: string): Promise<Post> {
  return this.postModel
    .findById(id)
    .populate({
      path: 'authorId',
      select: 'name email avatar',
      populate: [
        {
          path: 'companyId',
          select: 'name logo',
        },
        {
          path: 'departmentId',
          select: 'name',
        }
      ]
    })
    .populate({
      path: 'categoryId',
      select: 'name slug',
      populate: {
        path: 'parentCategoryId', // Category can have parent
        select: 'name',
      }
    })
    .exec();
}
```

**Deep nested populate (3+ levels):**

```typescript
// Post → Comment → User → Company
async findByIdWithComments(id: string): Promise<Post> {
  return this.postModel
    .findById(id)
    .populate({
      path: 'comments', // Virtual populate (explained next)
      populate: {
        path: 'userId',
        select: 'name avatar',
        populate: {
          path: 'companyId',
          select: 'name logo'
        }
      }
    })
    .exec();
}
```

#### Virtual Populate

Virtual populate cho phép tạo relationship "ngược chiều" mà không cần lưu array of references.

**Scenario: User has many Posts**

```typescript
// Traditional approach (storing array of post IDs in User)
@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Post' }] })
  postIds: Types.ObjectId[]; // Array can grow unbounded!
}

// Problem:
// - User document grows indefinitely
// - Duplicate data (post knows author, author knows posts)
// - Hard to maintain consistency
```

**Virtual Populate Solution:**

```typescript
// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ 
  timestamps: true,
  toJSON: { virtuals: true }, // Important!
  toObject: { virtuals: true }, // Important!
})
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  // No postIds array!
}

export const UserSchema = SchemaFactory.createForClass(User);

// Define virtual populate
UserSchema.virtual('posts', {
  ref: 'Post',              // Model to populate from
  localField: '_id',        // Field in User
  foreignField: 'authorId', // Field in Post
  justOne: false,           // false = array, true = single object
});

// Optional: Add type for TypeScript
export interface UserWithPosts extends User {
  posts?: Post[];
}
```

**Service usage:**

```typescript
// src/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Get user with posts
  async findByIdWithPosts(id: string) {
    return this.userModel
      .findById(id)
      .populate('posts') // Virtual populate!
      .exec();
  }

  // Result:
  // {
  //   _id: "user456",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   posts: [ // Virtual field
  //     { _id: "post1", title: "Post 1", authorId: "user456" },
  //     { _id: "post2", title: "Post 2", authorId: "user456" },
  //     { _id: "post3", title: "Post 3", authorId: "user456" }
  //   ]
  // }

  // With select and options
  async findByIdWithLatestPosts(id: string) {
    return this.userModel
      .findById(id)
      .populate({
        path: 'posts',
        select: 'title createdAt viewCount',
        options: {
          limit: 10,
          sort: { createdAt: -1 }
        }
      })
      .exec();
  }
}
```

**Virtual populate với match:**

```typescript
// Get user with only published posts
async findByIdWithPublishedPosts(id: string) {
  return this.userModel
    .findById(id)
    .populate({
      path: 'posts',
      match: { status: 'published' }, // Filter
      select: 'title createdAt',
      options: {
        sort: { createdAt: -1 },
        limit: 5
      }
    })
    .exec();
}
```

**Multiple virtual populates:**

```typescript
// User can have posts and comments
UserSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'authorId',
});

UserSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'userId',
});

// Usage
const user = await this.userModel
  .findById(id)
  .populate('posts')
  .populate('comments')
  .exec();

console.log(user.posts);     // User's posts
console.log(user.comments);  // User's comments
```

**Virtual populate với count:**

```typescript
// Virtual to count posts without loading them
UserSchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'authorId',
  count: true, // Only count, don't load documents
});

// Usage
const user = await this.userModel
  .findById(id)
  .populate('postCount')
  .exec();

console.log(user.postCount); // 42 (just a number)
```

### 1.2. Pagination

#### Offset-based Pagination (skip + limit)

```typescript
// src/posts/dto/pagination-query.dto.ts
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
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

// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Basic offset pagination
  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name avatar')
        .exec(),
      
      this.postModel.countDocuments().exec(),
    ]);

    return {
      data: posts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      }
    };
  }
}
```

**Response format:**

```json
{
  "data": [
    { "_id": "post1", "title": "Post 1", ... },
    { "_id": "post2", "title": "Post 2", ... },
    { "_id": "post3", "title": "Post 3", ... }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 142,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Vấn đề của offset pagination:**

```typescript
// Performance degradation với large offsets
// Page 1: skip(0).limit(10)     → Fast
// Page 10: skip(90).limit(10)   → OK
// Page 100: skip(990).limit(10) → Slow
// Page 1000: skip(9990).limit(10) → Very slow!

// Lý do:
// MongoDB must scan through all skipped documents
// skip(9990) = scan 9990 documents, then return 10

// Solution: Cursor-based pagination (next section)
```

#### Cursor-based Pagination (Recommended)

```typescript
// src/posts/dto/cursor-pagination.dto.ts
export class CursorPaginationDto {
  @IsOptional()
  cursor?: string; // Last document ID from previous page

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  direction?: 'next' | 'prev' = 'next';
}

// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  // Cursor-based pagination
  async findAllCursorBased(query: CursorPaginationDto) {
    const { cursor, limit = 10, direction = 'next' } = query;

    // Build query
    const filter: any = {};
    
    if (cursor) {
      if (direction === 'next') {
        filter._id = { $lt: cursor }; // Get posts before cursor
      } else {
        filter._id = { $gt: cursor }; // Get posts after cursor
      }
    }

    // Fetch posts
    const posts = await this.postModel
      .find(filter)
      .sort({ _id: -1 }) // Sort by _id descending
      .limit(limit + 1) // Fetch 1 extra to check if more exists
      .populate('authorId', 'name avatar')
      .exec();

    // Check if more posts exist
    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;

    // Get cursors
    const nextCursor = hasMore ? data[data.length - 1]._id.toString() : null;
    const prevCursor = data.length > 0 ? data[0]._id.toString() : null;

    return {
      data,
      meta: {
        nextCursor,
        prevCursor,
        hasMore,
        limit,
      }
    };
  }

  // Cursor pagination với custom sort field
  async findAllCursorByDate(query: CursorPaginationDto) {
    const { cursor, limit = 10, direction = 'next' } = query;

    const filter: any = {};
    
    if (cursor) {
      // Cursor contains timestamp
      const cursorDate = new Date(cursor);
      
      if (direction === 'next') {
        filter.createdAt = { $lt: cursorDate };
      } else {
        filter.createdAt = { $gt: cursorDate };
      }
    }

    const posts = await this.postModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 }) // Secondary sort by _id for consistency
      .limit(limit + 1)
      .exec();

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;

    return {
      data,
      meta: {
        nextCursor: hasMore ? data[data.length - 1].createdAt.toISOString() : null,
        prevCursor: data.length > 0 ? data[0].createdAt.toISOString() : null,
        hasMore,
        limit,
      }
    };
  }
}
```

**Cursor pagination usage:**

```typescript
// First request (no cursor)
GET /posts?limit=10

Response:
{
  "data": [ ... 10 posts ... ],
  "meta": {
    "nextCursor": "507f1f77bcf86cd799439011",
    "hasMore": true,
    "limit": 10
  }
}

// Second request (with cursor)
GET /posts?cursor=507f1f77bcf86cd799439011&limit=10

Response:
{
  "data": [ ... next 10 posts ... ],
  "meta": {
    "nextCursor": "507f1f77bcf86cd799439022",
    "hasMore": true,
    "limit": 10
  }
}
```

**Ưu điểm của cursor-based:**

```typescript
// ✓ Consistent performance regardless of page depth
// Page 1: Find where _id < cursor, limit 10     → Fast
// Page 100: Find where _id < cursor, limit 10   → Fast (same speed!)
// Page 10000: Find where _id < cursor, limit 10 → Fast (same speed!)

// ✓ No duplicate results when data changes
// Offset: Data inserted while paginating → duplicates
// Cursor: Always continues from exact point

// ✓ Better for infinite scroll UIs

// ✗ Can't jump to specific page (no page numbers)
// ✗ Can't show total pages
// ✗ More complex to implement
```

#### Total Count với countDocuments()

```typescript
@Injectable()
export class PostsService {
  // Efficient count with filters
  async getTotalCount(filters: any = {}): Promise<number> {
    return this.postModel.countDocuments(filters).exec();
  }

  // Count with specific conditions
  async getPublishedPostCount(): Promise<number> {
    return this.postModel.countDocuments({ 
      status: 'published',
      publishedAt: { $lte: new Date() }
    }).exec();
  }

  // Pagination with count
  async findAllWithCount(query: PaginationQueryDto, filters: any = {}) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Run both queries in parallel
    const [posts, total] = await Promise.all([
      this.postModel
        .find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      
      this.postModel.countDocuments(filters).exec(),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  // Estimated count (faster but less accurate)
  async getEstimatedCount(): Promise<number> {
    return this.postModel.estimatedDocumentCount().exec();
    
    // estimatedDocumentCount():
    // ✓ Very fast (reads from metadata)
    // ✗ Doesn't accept filters
    // ✗ May be slightly inaccurate
    // Use for: Total count displays, not critical calculations
  }
}
```

**Optimization: Skip count for large datasets:**

```typescript
// For very large datasets, skip counting
async findAllFastPagination(query: PaginationQueryDto) {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const posts = await this.postModel
    .find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1) // Fetch 1 extra
    .exec();

  const hasMore = posts.length > limit;
  const data = hasMore ? posts.slice(0, limit) : posts;

  return {
    data,
    meta: {
      page,
      limit,
      hasMore, // Instead of total count
    }
  };
}
```

### 1.3. Filtering

#### Query Builder Pattern

```typescript
// src/posts/dto/filter-post.dto.ts
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export class FilterPostDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  tags?: string; // Comma-separated tag IDs
}

// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  // Build dynamic filters
  private buildFilters(filterDto: FilterPostDto): any {
    const filters: any = {};

    // Text search
    if (filterDto.search) {
      filters.$or = [
        { title: { $regex: filterDto.search, $options: 'i' } },
        { content: { $regex: filterDto.search, $options: 'i' } }
      ];
    }

    // Exact match filters
    if (filterDto.authorId) {
      filters.authorId = filterDto.authorId;
    }

    if (filterDto.categoryId) {
      filters.categoryId = filterDto.categoryId;
    }

    if (filterDto.status) {
      filters.status = filterDto.status;
    }

    // Date range filter
    if (filterDto.fromDate || filterDto.toDate) {
      filters.createdAt = {};
      
      if (filterDto.fromDate) {
        filters.createdAt.$gte = new Date(filterDto.fromDate);
      }
      
      if (filterDto.toDate) {
        filters.createdAt.$lte = new Date(filterDto.toDate);
      }
    }

    // Array filter (tags)
    if (filterDto.tags) {
      const tagIds = filterDto.tags.split(',');
      filters.tags = { $in: tagIds };
    }

    return filters;
  }

  // Apply filters to query
  async findAllFiltered(
    filterDto: FilterPostDto,
    paginationDto: PaginationQueryDto
  ) {
    const filters = this.buildFilters(filterDto);
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.postModel
        .find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name avatar')
        .populate('categoryId', 'name')
        .exec(),
      
      this.postModel.countDocuments(filters).exec(),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        filters: filterDto, // Echo back filters
      }
    };
  }
}
```

**Advanced query builder:**

```typescript
// src/common/builders/query.builder.ts
export class QueryBuilder {
  private filters: any = {};

  where(field: string, value: any): this {
    this.filters[field] = value;
    return this;
  }

  whereIn(field: string, values: any[]): this {
    this.filters[field] = { $in: values };
    return this;
  }

  whereNotIn(field: string, values: any[]): this {
    this.filters[field] = { $nin: values };
    return this;
  }

  whereGreaterThan(field: string, value: any): this {
    this.filters[field] = { $gt: value };
    return this;
  }

  whereLessThan(field: string, value: any): this {
    this.filters[field] = { $lt: value };
    return this;
  }

  whereBetween(field: string, min: any, max: any): this {
    this.filters[field] = { $gte: min, $lte: max };
    return this;
  }

  whereRegex(field: string, pattern: string, options: string = 'i'): this {
    this.filters[field] = { $regex: pattern, $options: options };
    return this;
  }

  whereExists(field: string, exists: boolean = true): this {
    this.filters[field] = { $exists: exists };
    return this;
  }

  orWhere(conditions: any[]): this {
    this.filters.$or = conditions;
    return this;
  }

  andWhere(conditions: any[]): this {
    this.filters.$and = conditions;
    return this;
  }

  build(): any {
    return this.filters;
  }
}

// Usage
const filters = new QueryBuilder()
  .where('status', 'published')
  .whereGreaterThan('viewCount', 100)
  .whereBetween('createdAt', startDate, endDate)
  .whereIn('categoryId', ['cat1', 'cat2'])
  .whereRegex('title', searchTerm)
  .build();

const posts = await this.postModel.find(filters).exec();
```

#### Dynamic Filters

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  // Flexible filtering system
  async findWithDynamicFilters(filtersDto: Record<string, any>) {
    const query: any = {};

    // Process each filter dynamically
    for (const [key, value] of Object.entries(filtersDto)) {
      if (value === undefined || value === null || value === '') {
        continue; // Skip empty values
      }

      // Handle different filter types
      if (key.endsWith('_min')) {
        const field = key.replace('_min', '');
        query[field] = { ...query[field], $gte: value };
      } else if (key.endsWith('_max')) {
        const field = key.replace('_max', '');
        query[field] = { ...query[field], $lte: value };
      } else if (key.endsWith('_in')) {
        const field = key.replace('_in', '');
        query[field] = { $in: Array.isArray(value) ? value : value.split(',') };
      } else if (key.endsWith('_like')) {
        const field = key.replace('_like', '');
        query[field] = { $regex: value, $options: 'i' };
      } else if (key.endsWith('_exists')) {
        const field = key.replace('_exists', '');
        query[field] = { $exists: value === 'true' };
      } else {
        query[key] = value;
      }
    }

    return this.postModel.find(query).exec();
  }

  // Example usage:
  // GET /posts?status=published&viewCount_min=100&viewCount_max=1000&categoryId_in=cat1,cat2&title_like=mongodb
  // Results in:
  // {
  //   status: 'published',
  //   viewCount: { $gte: 100, $lte: 1000 },
  //   categoryId: { $in: ['cat1', 'cat2'] },
  //   title: { $regex: 'mongodb', $options: 'i' }
  // }
}
```

#### Text Search với $text và $search

**Setup Text Index:**

```typescript
// src/posts/schemas/post.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  excerpt: string;

  @Prop({ type: [String] })
  tags: string[];
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Create text index
PostSchema.index(
  { 
    title: 'text', 
    content: 'text',
    excerpt: 'text',
    tags: 'text'
  },
  {
    weights: {
      title: 10,      // Title is most important
      excerpt: 5,     // Excerpt is medium importance
      tags: 3,        // Tags are somewhat important
      content: 1,     // Content is least important (but still indexed)
    },
    name: 'post_text_index', // Index name
  }
);
```

**Giải thích Text Index:**

```typescript
// Text index creates inverted index for full-text search
// Example document:
{
  title: "Introduction to MongoDB",
  content: "MongoDB is a NoSQL database...",
  tags: ["mongodb", "nosql", "database"]
}

// Text index creates:
// "introduction" → [doc1]
// "mongodb" → [doc1, doc2, doc3]
// "nosql" → [doc1, doc4]
// "database" → [doc1, doc2, doc5, doc6]

// Supports:
// - Stemming: "running" matches "run", "ran", "runs"
// - Stop words: ignores "a", "the", "is", etc.
// - Case insensitive
// - Language-specific processing
```

**Text Search Service:**

```typescript
// src/posts/posts.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Basic text search
  async search(searchTerm: string): Promise<Post[]> {
    return this.postModel
      .find({
        $text: { $search: searchTerm }
      })
      .exec();
  }

  // Text search with score (relevance)
  async searchWithScore(searchTerm: string): Promise<Post[]> {
    return this.postModel
      .find(
        { $text: { $search: searchTerm } },
        { score: { $meta: 'textScore' } } // Include relevance score
      )
      .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
      .exec();
  }

  // Text search with minimum score
  async searchWithMinScore(searchTerm: string, minScore: number = 1): Promise<Post[]> {
    return this.postModel
      .find(
        { 
          $text: { $search: searchTerm },
          score: { $meta: 'textScore' }
        },
        { score: { $meta: 'textScore' } }
      )
      .where('score').gte(minScore)
      .sort({ score: { $meta: 'textScore' } })
      .exec();
  }

  // Text search with additional filters
  async searchPublished(searchTerm: string): Promise<Post[]> {
    return this.postModel
      .find({
        $text: { $search: searchTerm },
        status: 'published', // Additional filter
        publishedAt: { $lte: new Date() }
      })
      .select({ score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .exec();
  }

  // Advanced text search
  async advancedSearch(query: {
    search: string;
    language?: string;
    caseSensitive?: boolean;
    diacriticSensitive?: boolean;
  }): Promise<Post[]> {
    return this.postModel
      .find({
        $text: {
          $search: query.search,
          $language: query.language || 'english', // Specify language
          $caseSensitive: query.caseSensitive || false,
          $diacriticSensitive: query.diacriticSensitive || false,
        }
      })
      .select({ score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .exec();
  }
}
```

**Text Search Operators:**

```typescript
// 1. Search for any word (OR)
await this.postModel.find({ 
  $text: { $search: 'mongodb database' } 
});
// Matches: "mongodb" OR "database"

// 2. Search for exact phrase
await this.postModel.find({ 
  $text: { $search: '"nosql database"' } 
});
// Matches: exact phrase "nosql database"

// 3. Exclude words (NOT)
await this.postModel.find({ 
  $text: { $search: 'mongodb -sql' } 
});
// Matches: "mongodb" but NOT "sql"

// 4. Combine operators
await this.postModel.find({ 
  $text: { $search: '"nosql database" mongodb -relational' } 
});
// Matches: exact phrase "nosql database" OR "mongodb", but NOT "relational"

// Examples:
const results = await this.search('mongodb tutorial');
// Finds: "MongoDB Tutorial", "Learn MongoDB", "Tutorial on NoSQL", etc.

const exact = await this.search('"getting started with mongodb"');
// Finds: only documents with exact phrase

const exclude = await this.search('database -sql -relational');
// Finds: documents with "database" but without "sql" or "relational"
```

**Supported Languages:**

```typescript
// MongoDB supports many languages for text search
const languages = [
  'danish', 'dutch', 'english', 'finnish', 'french', 'german',
  'hungarian', 'italian', 'norwegian', 'portuguese', 'romanian',
  'russian', 'spanish', 'swedish', 'turkish', 'arabic', 'persian'
];

// Example: Vietnamese (not natively supported, use 'none' for no stemming)
await this.postModel.find({
  $text: { 
    $search: 'học mongodb',
    $language: 'none' // No language-specific processing
  }
});
```

**Text Search Limitations:**

```typescript
// ✗ Only ONE text index per collection
// ✗ Cannot combine with other index types in same query
// ✗ Performance degrades with large collections
// ✗ No wildcard/partial matches (use regex for that)
// ✗ No fuzzy matching (typo tolerance)

// For advanced search, consider:
// - Elasticsearch
// - MongoDB Atlas Search
// - Algolia
```

### 1.4. Sorting

#### sort() Method

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  // Sort ascending (1)
  async findAllSortedByTitle(): Promise<Post[]> {
    return this.postModel
      .find()
      .sort({ title: 1 }) // 1 = ascending (A-Z)
      .exec();
  }

  // Sort descending (-1)
  async findAllNewest(): Promise<Post[]> {
    return this.postModel
      .find()
      .sort({ createdAt: -1 }) // -1 = descending (newest first)
      .exec();
  }

  // Sort with string syntax
  async findAllSorted(): Promise<Post[]> {
    return this.postModel
      .find()
      .sort('-createdAt') // - prefix = descending
      .exec();
  }

  // Multiple string sorts
  async findAllMultiSort(): Promise<Post[]> {
    return this.postModel
      .find()
      .sort('-createdAt title') // createdAt desc, then title asc
      .exec();
  }
}
```

#### Multiple Field Sorting

```typescript
@Injectable()
export class PostsService {
  // Multiple fields (object syntax)
  async findAllSortedMultiple(): Promise<Post[]> {
    return this.postModel
      .find()
      .sort({ 
        status: 1,        // First: sort by status (asc)
        createdAt: -1,    // Then: sort by date (desc)
        title: 1          // Finally: sort by title (asc)
      })
      .exec();
  }

  // Real-world example: Featured posts first, then by date
  async findAllWithFeatured(): Promise<Post[]> {
    return this.postModel
      .find()
      .sort({ 
        isFeatured: -1,   // Featured posts first (true > false)
        createdAt: -1     // Then by date
      })
      .exec();
  }

  // Dynamic sorting
  async findAllDynamicSort(sortBy: string = 'createdAt', order: 'asc' | 'desc' = 'desc'): Promise<Post[]> {
    const sortOrder = order === 'asc' ? 1 : -1;
    
    return this.postModel
      .find()
      .sort({ [sortBy]: sortOrder })
      .exec();
  }

  // Complex dynamic sorting
  async findAllAdvancedSort(sortQuery: string): Promise<Post[]> {
    // Parse sort query: "status,-createdAt,title"
    const sortObj = {};
    
    sortQuery.split(',').forEach(field => {
      if (field.startsWith('-')) {
        sortObj[field.substring(1)] = -1;
      } else {
        sortObj[field] = 1;
      }
    });

    return this.postModel
      .find()
      .sort(sortObj)
      .exec();
  }
}
```

**Sort với Text Search:**

```typescript
// Sort by text score, then by date
async searchAndSort(searchTerm: string): Promise<Post[]> {
  return this.postModel
    .find(
      { $text: { $search: searchTerm } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ 
      score: { $meta: 'textScore' }, // Primary: relevance
      createdAt: -1                   // Secondary: date
    })
    .exec();
}
```

#### Index Optimization cho Sorting

```typescript
// src/posts/schemas/post.schema.ts
export const PostSchema = SchemaFactory.createForClass(Post);

// Index for sorting optimization
// Single field index
PostSchema.index({ createdAt: -1 }); // Optimize: .sort({ createdAt: -1 })

// Compound index for multiple sorts
PostSchema.index({ status: 1, createdAt: -1 }); 
// Optimizes: .sort({ status: 1, createdAt: -1 })

// Index for common query patterns
PostSchema.index({ authorId: 1, createdAt: -1 }); 
// Optimizes: .find({ authorId: userId }).sort({ createdAt: -1 })

// Compound index with multiple fields
PostSchema.index({ category: 1, isFeatured: -1, createdAt: -1 }); 
// Optimizes: .find({ category: cat }).sort({ isFeatured: -1, createdAt: -1 })
```

**Index Usage Rules:**

```typescript
// ✓ Index used (efficient)
// Index: { createdAt: -1 }
.find().sort({ createdAt: -1 })  // Uses index
.find().sort({ createdAt: 1 })   // Can traverse index backwards (still efficient)

// ✓ Compound index used
// Index: { status: 1, createdAt: -1 }
.find({ status: 'published' }).sort({ createdAt: -1 })  // Uses full index
.find().sort({ status: 1, createdAt: -1 })              // Uses full index
.find({ status: 'published' })                          // Uses prefix of index

// ✗ Index NOT used (inefficient)
// Index: { status: 1, createdAt: -1 }
.find().sort({ createdAt: -1 })              // Missing prefix (status)
.find().sort({ status: 1, title: 1 })        // Different fields

// ✗ In-memory sort (very slow for large datasets)
// No index on viewCount
.find().sort({ viewCount: -1 })  // MongoDB sorts in memory!
```

**Check if index is used:**

```typescript
// Development: Check query performance
async checkSortPerformance() {
  const explain = await this.postModel
    .find()
    .sort({ createdAt: -1 })
    .explain('executionStats');

  console.log(explain);
  
  // Look for:
  // - executionStages.stage: "IXSCAN" (good - using index)
  // - executionStages.stage: "SORT" (bad - in-memory sort)
  // - executionStats.totalDocsExamined vs nReturned (lower is better)
}
```

### 1.5. Aggregation Pipeline

Aggregation Pipeline là framework mạnh mẽ để xử lý và phân tích dữ liệu trong MongoDB.

**Khái niệm cơ bản:**

```typescript
// Aggregation Pipeline = series of stages
// Data flows through each stage, transformed along the way

// Example flow:
Documents → $match → $group → $sort → $project → Result

// Each stage:
// Input: documents from previous stage (or collection)
// Process: transform documents
// Output: documents to next stage
```

#### $match - Filter Documents

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Basic $match
  async getPublishedPosts(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: {
          status: 'published',
          publishedAt: { $lte: new Date() }
        }
      }
    ]);
  }

  // $match with multiple conditions
  async getPopularRecentPosts(): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.postModel.aggregate([
      {
        $match: {
          status: 'published',
          createdAt: { $gte: thirtyDaysAgo },
          viewCount: { $gte: 100 }
        }
      }
    ]);
  }

  // $match should be first stage for performance
  // Uses indexes if available
}
```

#### $group - Group and Aggregate

```typescript
@Injectable()
export class PostsService {
  // Count posts by category
  async getPostCountByCategory(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $group: {
          _id: '$categoryId',        // Group by categoryId
          count: { $sum: 1 },        // Count documents
          totalViews: { $sum: '$viewCount' }, // Sum viewCount
          avgViews: { $avg: '$viewCount' }    // Average viewCount
        }
      }
    ]);
  }

  // Result:
  // [
  //   { _id: "cat1", count: 25, totalViews: 5000, avgViews: 200 },
  //   { _id: "cat2", count: 15, totalViews: 3000, avgViews: 200 },
  //   { _id: "cat3", count: 30, totalViews: 9000, avgViews: 300 }
  // ]

  // Group by multiple fields
  async getPostsByAuthorAndCategory(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $group: {
          _id: {
            authorId: '$authorId',
            categoryId: '$categoryId'
          },
          count: { $sum: 1 },
          posts: { $push: '$title' } // Collect all titles
        }
      }
    ]);
  }

  // Result:
  // [
  //   { 
  //     _id: { authorId: "user1", categoryId: "cat1" },
  //     count: 5,
  //     posts: ["Post 1", "Post 2", "Post 3", "Post 4", "Post 5"]
  //   },
  //   ...
  // ]

  // Group accumulator operators
  async getPostStats(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $group: {
          _id: null, // Group all documents together
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          avgViews: { $avg: '$viewCount' },
          maxViews: { $max: '$viewCount' },
          minViews: { $min: '$viewCount' },
          firstPost: { $first: '$title' },
          lastPost: { $last: '$title' },
          allTags: { $push: '$tags' },          // Array of arrays
          uniqueTags: { $addToSet: '$tags' }    // Unique values
        }
      }
    ]);
  }
}
```

**$group Accumulators:**

```typescript
{
  $sum: 1,                    // Count
  $sum: '$field',             // Sum values
  $avg: '$field',             // Average
  $max: '$field',             // Maximum
  $min: '$field',             // Minimum
  $first: '$field',           // First value
  $last: '$field',            // Last value
  $push: '$field',            // Array of all values
  $addToSet: '$field',        // Array of unique values
  $stdDevPop: '$field',       // Standard deviation (population)
  $stdDevSamp: '$field',      // Standard deviation (sample)
}
```

#### $project - Reshape Documents

```typescript
@Injectable()
export class PostsService {
  // Select specific fields
  async getPostSummaries(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $project: {
          title: 1,           // Include title
          excerpt: 1,         // Include excerpt
          createdAt: 1,       // Include createdAt
          authorId: 1,        // Include authorId
          _id: 0              // Exclude _id
        }
      }
    ]);
  }

  // Computed fields
  async getPostsWithComputedFields(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $project: {
          title: 1,
          viewCount: 1,
          likeCount: 1,
          
          // Computed field: engagement rate
          engagementRate: {
            $cond: {
              if: { $eq: ['$viewCount', 0] },
              then: 0,
              else: { 
                $multiply: [
                  { $divide: ['$likeCount', '$viewCount'] },
                  100
                ]
              }
            }
          },
          
          // Computed field: age in days
          ageInDays: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          },
          
          // String manipulation
          titleUpper: { $toUpper: '$title' },
          titleLength: { $strLenCP: '$title' },
          
          // Array operations
          tagCount: { $size: { $ifNull: ['$tags', []] } }
        }
      }
    ]);
  }

  // Nested field projection
  async getAuthorNames(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: '$author'
      },
      {
        $project: {
          title: 1,
          'author.name': 1,      // Nested field
          'author.email': 1,
          authorFullName: {
            $concat: [
              '$author.firstName',
              ' ',
              '$author.lastName'
            ]
          }
        }
      }
    ]);
  }
}
```

#### $lookup - Join Collections

```typescript
@Injectable()
export class PostsService {
  // Basic $lookup (like SQL LEFT JOIN)
  async getPostsWithAuthors(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $lookup: {
          from: 'users',              // Collection to join
          localField: 'authorId',     // Field in posts
          foreignField: '_id',        // Field in users
          as: 'author'                // Output array field
        }
      },
      {
        $unwind: '$author' // Convert array to object
      },
      {
        $project: {
          title: 1,
          content: 1,
          'author.name': 1,
          'author.email': 1,
          'author.avatar': 1
        }
      }
    ]);
  }

  // Multiple $lookup
  async getPostsWithAllRelations(): Promise<any[]> {
    return this.postModel.aggregate([
      // Lookup author
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: { 
          path: '$author',
          preserveNullAndEmptyArrays: true // Keep posts without author
        }
      },
      
      // Lookup category
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: { 
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Lookup tags (many-to-many)
      {
        $lookup: {
          from: 'tags',
          localField: 'tags',
          foreignField: '_id',
          as: 'tagDetails'
        }
      },
      
      {
        $project: {
          title: 1,
          content: 1,
          author: { name: 1, email: 1, avatar: 1 },
          category: { name: 1, slug: 1 },
          tags: '$tagDetails.name'
        }
      }
    ]);
  }

  // Advanced $lookup with pipeline
  async getPostsWithRecentComments(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $lookup: {
          from: 'comments',
          let: { postId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$postId', '$$postId'] }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                content: 1,
                userName: 1,
                createdAt: 1
              }
            }
          ],
          as: 'recentComments'
        }
      }
    ]);
  }
}
```

#### $unwind - Flatten Arrays

```typescript
@Injectable()
export class PostsService {
  // Unwind tags
  async getTagStatistics(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { 
          status: 'published',
          tags: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$tags' // Flatten tags array
      },
      // Before $unwind:
      // { _id: "post1", title: "...", tags: ["tag1", "tag2", "tag3"] }
      //
      // After $unwind:
      // { _id: "post1", title: "...", tags: "tag1" }
      // { _id: "post1", title: "...", tags: "tag2" }
      // { _id: "post1", title: "...", tags: "tag3" }
      
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);
  }

  // Unwind with preserveNullAndEmptyArrays
  async getAllPostsIncludingWithoutTags(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $unwind: {
          path: '$tags',
          preserveNullAndEmptyArrays: true // Keep posts without tags
        }
      }
      // Posts without tags will have tags: null
    ]);
  }

  // Unwind with includeArrayIndex
  async getTagsWithPosition(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $unwind: {
          path: '$tags',
          includeArrayIndex: 'tagPosition' // Add position field
        }
      },
      {
        $project: {
          title: 1,
          tag: '$tags',
          position: '$tagPosition'
        }
      }
    ]);
  }
}
```

#### $sort, $limit, $skip trong Aggregation

```typescript
@Injectable()
export class PostsService {
  // Sort aggregation results
  async getTopPosts(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $sort: { 
          viewCount: -1,    // Sort by views descending
          createdAt: -1     // Then by date
        }
      },
      {
        $limit: 10 // Top 10
      },
      {
        $project: {
          title: 1,
          viewCount: 1,
          likeCount: 1,
          createdAt: 1
        }
      }
    ]);
  }

  // Pagination in aggregation
  async getPaginatedAggregation(page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const result = await this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $facet: {
          metadata: [
            { $count: 'total' }
          ],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'authorId',
                foreignField: '_id',
                as: 'author'
              }
            },
            { $unwind: '$author' }
          ]
        }
      }
    ]);

    const total = result[0].metadata[0]?.total || 0;
    const data = result[0].data;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
```

#### Ví dụ thực tế: Analytics & Reports

**Example 1: Monthly Post Statistics**

```typescript
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Monthly post count and engagement
  async getMonthlyStats(year: number): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: {
          status: 'published',
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          postCount: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalLikes: { $sum: '$likeCount' },
          avgViewsPerPost: { $avg: '$viewCount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          postCount: 1,
          totalViews: 1,
          totalLikes: 1,
          avgViewsPerPost: { $round: ['$avgViewsPerPost', 2] }
        }
      }
    ]);
  }

  // Result:
  // [
  //   { year: 2024, month: 1, postCount: 25, totalViews: 5000, totalLikes: 500, avgViewsPerPost: 200 },
  //   { year: 2024, month: 2, postCount: 30, totalViews: 7500, totalLikes: 750, avgViewsPerPost: 250 },
  //   ...
  // ]
}
```

**Example 2: Top Authors Report**

```typescript
@Injectable()
export class AnalyticsService {
  // Top authors by engagement
  async getTopAuthors(limit: number = 10): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $group: {
          _id: '$authorId',
          postCount: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalLikes: { $sum: '$likeCount' },
          avgViewsPerPost: { $avg: '$viewCount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: '$author'
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ['$totalViews', 1] },
              { $multiply: ['$totalLikes', 10] }
            ]
          }
        }
      },
      {
        $sort: { engagementScore: -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          authorId: '$_id',
          authorName: '$author.name',
          authorEmail: '$author.email',
          authorAvatar: '$author.avatar',
          postCount: 1,
          totalViews: 1,
          totalLikes: 1,
          avgViewsPerPost: { $round: ['$avgViewsPerPost', 2] },
          engagementScore: 1,
          _id: 0
        }
      }
    ]);
  }
}
```

**Example 3: Category Performance**

```typescript
@Injectable()
export class AnalyticsService {
  // Category performance analysis
  async getCategoryPerformance(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { 
          status: 'published',
          categoryId: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $group: {
          _id: '$categoryId',
          categoryName: { $first: '$category.name' },
          postCount: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalLikes: { $sum: '$likeCount' },
          avgViews: { $avg: '$viewCount' },
          maxViews: { $max: '$viewCount' },
          minViews: { $min: '$viewCount' }
        }
      },
      {
        $addFields: {
          likesPerView: {
            $cond: {
              if: { $eq: ['$totalViews', 0] },
              then: 0,
              else: { 
                $divide: ['$totalLikes', '$totalViews'] 
              }
            }
          }
        }
      },
      {
        $sort: { totalViews: -1 }
      },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: 1,
          postCount: 1,
          totalViews: 1,
          totalLikes: 1,
          avgViews: { $round: ['$avgViews', 2] },
          maxViews: 1,
          minViews: 1,
          likesPerView: { $round: ['$likesPerView', 4] }
        }
      }
    ]);
  }
}
```

**Example 4: Daily Activity Report**

```typescript
@Injectable()
export class AnalyticsService {
  // Daily activity for last 30 days
  async getDailyActivity(): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.postModel.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          postsCreated: { $sum: 1 },
          viewsGenerated: { $sum: '$viewCount' },
          likesReceived: { $sum: '$likeCount' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          postsCreated: 1,
          viewsGenerated: 1,
          likesReceived: 1
        }
      }
    ]);
  }
}
```

## 2. Transactions trong MongoDB

### 2.1. Multi-document ACID Transactions

MongoDB hỗ trợ ACID transactions từ version 4.0+ (replica sets) và 4.2+ (sharded clusters).

**ACID Properties:**

```typescript
// A - Atomicity: All or nothing
// Either all operations succeed, or all fail (rollback)

// C - Consistency: Data remains valid
// Database constraints are maintained

// I - Isolation: Concurrent transactions don't interfere
// Each transaction sees consistent snapshot

// D - Durability: Committed data persists
// Survives system failures
```

**Tại sao cần transactions?**

```typescript
// Scenario WITHOUT transaction: Transfer money between accounts
// Step 1: Deduct from account A
await accountModel.updateOne(
  { _id: accountA },
  { $inc: { balance: -100 } }
);

// ⚠️ System crashes here!
// Money deducted from A, but never added to B
// Money lost!

// Step 2: Add to account B (never executed)
await accountModel.updateOne(
  { _id: accountB },
  { $inc: { balance: 100 } }
);
```

```typescript
// Scenario WITH transaction: Atomic operation
const session = await connection.startSession();
await session.withTransaction(async () => {
  // Step 1: Deduct from account A
  await accountModel.updateOne(
    { _id: accountA },
    { $inc: { balance: -100 } },
    { session }
  );

  // System crashes here → Transaction rolls back automatically
  // Both operations succeed or both fail

  // Step 2: Add to account B
  await accountModel.updateOne(
    { _id: accountB },
    { $inc: { balance: 100 } },
    { session }
  );
});
// If any step fails → all changes rolled back
// Money never lost!
```

### 2.2. Khi nào cần Transactions?

**✓ Use transactions when:**

```typescript
// 1. Multi-document updates must be atomic
// Example: Financial operations, inventory management

// 2. Data consistency across collections is critical
// Example: Order + reduce inventory + create invoice

// 3. Rollback capability is required
// Example: Complex business workflows

// 4. Multiple operations must succeed together
// Example: User registration + create profile + send email record
```

**✗ Avoid transactions when:**

```typescript
// 1. Single document updates (already atomic)
await userModel.updateOne({ _id: id }, { $set: { name: 'New Name' } });
// No transaction needed - single doc operations are atomic

// 2. Performance is critical and eventual consistency is acceptable
// Transactions have overhead

// 3. Long-running operations
// Transactions should be short (< 60 seconds)

// 4. Operations don't need to be atomic
// Read-only operations, independent writes
```

### 2.3. Implement Transactions với Mongoose

#### Basic Transaction

```typescript
// src/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectConnection() private connection: Connection,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  // Create order with transaction
  async createOrder(userId: string, items: any[]): Promise<Order> {
    const session = await this.connection.startSession();
    
    let order;
    
    try {
      await session.withTransaction(async () => {
        // Step 1: Check and reduce product stock
        for (const item of items) {
          const product = await this.productModel.findById(item.productId).session(session);
          
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }
          
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
          
          // Reduce stock
          await this.productModel.updateOne(
            { _id: item.productId },
            { $inc: { stock: -item.quantity } },
            { session }
          );
        }
        
        // Step 2: Create order
        const [createdOrder] = await this.orderModel.create(
          [{
            userId,
            items,
            total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            status: 'pending',
          }],
          { session }
        );
        
        order = createdOrder;
      });
      
      return order;
    } finally {
      await session.endSession();
    }
  }
}
```

**Giải thích:**

```typescript
// 1. Start session
const session = await this.connection.startSession();

// 2. Start transaction
await session.withTransaction(async () => {
  // All operations inside use session
  
  // Pass session to each operation
  await model.findOne({ ... }).session(session);
  await model.updateOne({ ... }, { ... }, { session });
  await model.create([{ ... }], { session }); // Note: array required!
  
  // If any operation throws error → auto rollback
});

// 3. Session auto-commits if no error
// 4. Session auto-rolls back if error thrown

// 5. Always end session
await session.endSession();
```

#### Manual Transaction Control

```typescript
@Injectable()
export class PaymentService {
  constructor(
    @InjectConnection() private connection: Connection,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  // Transfer money with manual transaction control
  async transferMoney(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
  ): Promise<any> {
    const session = await this.connection.startSession();
    
    try {
      // Start transaction
      session.startTransaction();
      
      // Step 1: Check sender balance
      const fromAccount = await this.accountModel
        .findById(fromAccountId)
        .session(session);
      
      if (!fromAccount) {
        throw new Error('Sender account not found');
      }
      
      if (fromAccount.balance < amount) {
        throw new Error('Insufficient balance');
      }
      
      // Step 2: Deduct from sender
      await this.accountModel.updateOne(
        { _id: fromAccountId },
        { $inc: { balance: -amount } },
        { session }
      );
      
      // Step 3: Add to receiver
      const result = await this.accountModel.updateOne(
        { _id: toAccountId },
        { $inc: { balance: amount } },
        { session }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('Receiver account not found');
      }
      
      // Step 4: Record transaction
      await this.transactionModel.create(
        [{
          fromAccountId,
          toAccountId,
          amount,
          type: 'transfer',
          status: 'completed',
          timestamp: new Date(),
        }],
        { session }
      );
      
      // Commit transaction
      await session.commitTransaction();
      
      return { success: true, amount };
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // Always end session
      await session.endSession();
    }
  }
}
```

#### Transaction with Retry Logic

```typescript
@Injectable()
export class OrdersService {
  // Retry transaction on transient errors
  async createOrderWithRetry(
    userId: string, 
    items: any[],
    maxRetries: number = 3
  ): Promise<Order> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      const session = await this.connection.startSession();
      
      try {
        let order;
        
        await session.withTransaction(
          async () => {
            // Transaction logic here
            for (const item of items) {
              await this.productModel.updateOne(
                { _id: item.productId, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { session }
              );
            }
            
            [order] = await this.orderModel.create(
              [{ userId, items, status: 'pending' }],
              { session }
            );
          },
          {
            readPreference: 'primary',
            readConcern: { level: 'local' },
            writeConcern: { w: 'majority' },
          }
        );
        
        await session.endSession();
        return order;
      } catch (error) {
        await session.endSession();
        
        // Retry on transient errors
        if (
          error.hasErrorLabel('TransientTransactionError') &&
          attempt < maxRetries - 1
        ) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
          continue;
        }
        
        throw error;
      }
    }
  }
}
```

#### Nested Transactions (Not Supported - Alternative Pattern)

```typescript
// MongoDB doesn't support nested transactions
// Instead, use single transaction with multiple operations

@Injectable()
export class OrdersService {
  constructor(
    @InjectConnection() private connection: Connection,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  // Complex multi-step transaction
  async processCompleteOrder(userId: string, orderData: any): Promise<any> {
    const session = await this.connection.startSession();
    
    try {
      let order, invoice;
      
      await session.withTransaction(async () => {
        // Step 1: Update user points
        await this.userModel.updateOne(
          { _id: userId },
          { 
            $inc: { 
              points: orderData.pointsEarned,
              totalOrders: 1 
            } 
          },
          { session }
        );
        
        // Step 2: Reduce product stock
        for (const item of orderData.items) {
          const updateResult = await this.productModel.updateOne(
            { 
              _id: item.productId,
              stock: { $gte: item.quantity } // Optimistic locking
            },
            { $inc: { stock: -item.quantity, soldCount: item.quantity } },
            { session }
          );
          
          if (updateResult.matchedCount === 0) {
            throw new Error(`Insufficient stock for product ${item.productId}`);
          }
        }
        
        // Step 3: Create order
        [order] = await this.orderModel.create(
          [{
            userId,
            items: orderData.items,
            total: orderData.total,
            status: 'pending',
          }],
          { session }
        );
        
        // Step 4: Create invoice
        [invoice] = await this.invoiceModel.create(
          [{
            orderId: order._id,
            userId,
            amount: orderData.total,
            status: 'unpaid',
          }],
          { session }
        );
      });
      
      return { order, invoice };
    } finally {
      await session.endSession();
    }
  }
}
```

### 2.4. Best Practices và Limitations

#### Best Practices

```typescript
// 1. Keep transactions short
// ✓ Good: Quick operations
await session.withTransaction(async () => {
  await model1.updateOne({ ... }, { ... }, { session });
  await model2.create([{ ... }], { session });
  // Total time: < 1 second
});

// ✗ Bad: Long-running operations
await session.withTransaction(async () => {
  await sendEmail(); // External API call - slow!
  await processLargeFile(); // CPU intensive - slow!
  await model.updateMany({ ... }, { ... }, { session }); // Updates millions - slow!
  // Total time: > 60 seconds → Transaction will timeout!
});

// 2. Always use try-finally for session cleanup
const session = await this.connection.startSession();
try {
  await session.withTransaction(async () => {
    // Transaction logic
  });
} finally {
  await session.endSession(); // Always cleanup!
}

// 3. Pass session to ALL operations
// ✓ Correct
await model.findOne({ ... }).session(session);
await model.updateOne({ ... }, { ... }, { session });

// ✗ Wrong - operation not in transaction!
await model.findOne({ ... }); // Missing session!

// 4. Use arrays for create() in transactions
// ✓ Correct
await model.create([{ ... }], { session });

// ✗ Wrong - won't work in transaction
await model.create({ ... }, { session }); // Not an array!

// 5. Handle errors appropriately
try {
  await session.withTransaction(async () => {
    // Operations
  });
} catch (error) {
  // Log error
  console.error('Transaction failed:', error);
  
  // Provide user-friendly message
  throw new BadRequestException('Order could not be processed');
}

// 6. Set appropriate timeouts
await session.withTransaction(
  async () => {
    // Operations
  },
  {
    maxCommitTimeMS: 30000, // 30 seconds max
  }
);

// 7. Use read/write concerns appropriately
await session.withTransaction(
  async () => {
    // Operations
  },
  {
    readConcern: { level: 'snapshot' }, // Consistent snapshot
    writeConcern: { w: 'majority', j: true }, // Durability
  }
);
```

#### Limitations

```typescript
// 1. 60-second time limit
// Transactions auto-abort after 60 seconds
// Keep operations quick!

// 2. 16MB document size limit per operation
// Can't create/update documents larger than 16MB

// 3. No DDL operations
// Can't create/drop collections or indexes in transaction

// ✗ This will fail:
await session.withTransaction(async () => {
  await this.connection.createCollection('newCollection'); // Error!
  await model.createIndexes([{ ... }]); // Error!
});

// 4. Requires replica set
// Won't work on standalone MongoDB
// Minimum: 3-node replica set (production)

// 5. Performance overhead
// Transactions are slower than non-transactional operations
// Use only when atomicity is required

// Benchmark:
// Non-transactional: 1000 ops/sec
// Transactional: 200 ops/sec (5x slower)

// 6. Can't span multiple databases (before 4.2)
// MongoDB 4.0: Transactions within single replica set
// MongoDB 4.2+: Transactions across sharded clusters

// 7. No savepoints or nested transactions
// Unlike PostgreSQL, can't partially rollback

// 8. Cross-shard transactions have higher latency
// Distributed transactions are slower
```

#### Common Pitfalls

```typescript
// ❌ Pitfall 1: Forgetting to pass session
async badExample() {
  const session = await this.connection.startSession();
  await session.withTransaction(async () => {
    await this.model1.updateOne({ ... }, { ... }); // No session!
    await this.model2.create([{ ... }]); // No session!
    // These operations run OUTSIDE transaction!
  });
  await session.endSession();
}

// ✓ Correct
async goodExample() {
  const session = await this.connection.startSession();
  await session.withTransaction(async () => {
    await this.model1.updateOne({ ... }, { ... }, { session });
    await this.model2.create([{ ... }], { session });
  });
  await session.endSession();
}

// ❌ Pitfall 2: Not ending session
async badExample() {
  const session = await this.connection.startSession();
  await session.withTransaction(async () => {
    // ...
  });
  // Session never ended → Memory leak!
}

// ✓ Correct
async goodExample() {
  const session = await this.connection.startSession();
  try {
    await session.withTransaction(async () => {
      // ...
    });
  } finally {
    await session.endSession();
  }
}

// ❌ Pitfall 3: External operations in transaction
async badExample() {
  const session = await this.connection.startSession();
  await session.withTransaction(async () => {
    await this.model.create([{ ... }], { session });
    await this.emailService.send(); // External service!
    // If email fails → rollback database!
    // If email succeeds but DB fails → email already sent!
  });
  await session.endSession();
}

// ✓ Correct: External operations after transaction
async goodExample() {
  const session = await this.connection.startSession();
  let order;
  
  await session.withTransaction(async () => {
    [order] = await this.model.create([{ ... }], { session });
  });
  await session.endSession();
  
  // Send email after successful transaction
  await this.emailService.send(order);
}

// ❌ Pitfall 4: Long-running operations
async badExample() {
  const session = await this.connection.startSession();
  await session.withTransaction(async () => {
    for (let i = 0; i < 1000000; i++) {
      await this.model.create([{ ... }], { session }); // Very slow!
    }
  });
  await session.endSession();
}

// ✓ Correct: Batch operations
async goodExample() {
  const session = await this.connection.startSession();
  await session.withTransaction(async () => {
    const docs = [];
    for (let i = 0; i < 1000000; i++) {
      docs.push({ ... });
    }
    await this.model.insertMany(docs, { session }); // Much faster!
  });
  await session.endSession();
}
```

---

## 3. Performance & Optimization

### 3.1. Explain() để phân tích Query

**explain() method** cho phép xem chi tiết cách MongoDB thực thi query.

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Analyze query performance
  async analyzeQuery() {
    const explain = await this.postModel
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(10)
      .explain('executionStats'); // or 'queryPlanner' or 'allPlansExecution'

    console.log(JSON.stringify(explain, null, 2));
    return explain;
  }
}
```

**Explain modes:**

```typescript
// 1. 'queryPlanner' - Shows query plan (default)
.explain('queryPlanner')
// Returns: Which index used, query shape

// 2. 'executionStats' - Shows execution statistics
.explain('executionStats')
// Returns: Actual execution time, docs examined, docs returned

// 3. 'allPlansExecution' - Shows all considered plans
.explain('allPlansExecution')
// Returns: All plans MongoDB considered, why it chose one
```

**Reading explain output:**

```typescript
const explain = await this.postModel
  .find({ authorId: 'user123', status: 'published' })
  .sort({ createdAt: -1 })
  .explain('executionStats');

// Key fields to check:
{
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 25,              // Documents returned
    "executionTimeMillis": 5,     // Time taken (LOWER is better)
    "totalKeysExamined": 25,      // Index keys scanned
    "totalDocsExamined": 25,      // Documents scanned (should be close to nReturned)
    
    "executionStages": {
      "stage": "FETCH",           // Type of operation
      "inputStage": {
        "stage": "IXSCAN",        // IXSCAN = Index Scan (GOOD!)
        "indexName": "authorId_1_createdAt_-1",
        "direction": "backward"
      }
    }
  },
  
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",        // Index used
        "indexName": "authorId_1_createdAt_-1"
      }
    }
  }
}
```

**Stage types:**

```typescript
// ✓ GOOD stages (fast):
"IXSCAN"      // Index scan - using index
"FETCH"       // Fetching documents by _id
"LIMIT"       // Limiting results
"SORT_KEY_GENERATOR" // Sorting using index

// ⚠️ WARNING stages (potentially slow):
"COLLSCAN"    // Collection scan - scanning all documents (NO INDEX!)
"SORT"        // In-memory sort (NO INDEX for sorting!)

// Example of BAD query:
{
  "executionStats": {
    "executionTimeMillis": 1500,  // Slow!
    "totalDocsExamined": 100000,  // Scanned 100k docs
    "nReturned": 10,               // But only returned 10
    "executionStages": {
      "stage": "SORT",             // In-memory sort (bad!)
      "inputStage": {
        "stage": "COLLSCAN"        // Collection scan (bad!)
      }
    }
  }
}

// Solution: Add index!
```

**Performance metrics:**

```typescript
// Good performance indicators:
totalDocsExamined ≈ nReturned  // Examined only what we need
executionTimeMillis < 100      // Fast response
stage: "IXSCAN"                // Using index

// Bad performance indicators:
totalDocsExamined >> nReturned // Examined many unnecessary docs
executionTimeMillis > 1000     // Slow response
stage: "COLLSCAN"              // Not using index
stage: "SORT"                  // In-memory sort
```

**Practical example:**

```typescript
@Injectable()
export class PostsService {
  // Check if query uses index
  async checkIndexUsage() {
    // Query 1: Without index
    const explain1 = await this.postModel
      .find({ viewCount: { $gt: 100 } })
      .explain('executionStats');
    
    console.log('Stage:', explain1.executionStats.executionStages.stage);
    // Output: "COLLSCAN" (bad - no index on viewCount)
    
    // Query 2: With index
    const explain2 = await this.postModel
      .find({ status: 'published' })
      .explain('executionStats');
    
    console.log('Stage:', explain2.executionStats.executionStages.inputStage.stage);
    // Output: "IXSCAN" (good - using status index)
    
    // Compare performance
    console.log('Query 1 time:', explain1.executionStats.executionTimeMillis, 'ms');
    console.log('Query 2 time:', explain2.executionStats.executionTimeMillis, 'ms');
  }

  // Identify slow queries
  async identifySlowQuery() {
    const explain = await this.postModel
      .find({ 
        content: { $regex: 'mongodb', $options: 'i' } // Regex on unindexed field
      })
      .explain('executionStats');
    
    const stats = explain.executionStats;
    
    if (stats.executionTimeMillis > 100) {
      console.warn('Slow query detected!');
      console.log('Time:', stats.executionTimeMillis, 'ms');
      console.log('Docs examined:', stats.totalDocsExamined);
      console.log('Docs returned:', stats.nReturned);
      console.log('Stage:', stats.executionStages.stage);
      
      // Suggest optimization
      if (stats.executionStages.stage === 'COLLSCAN') {
        console.log('Suggestion: Add index on query fields');
      }
      if (stats.executionStages.stage === 'SORT') {
        console.log('Suggestion: Add index to cover sort fields');
      }
    }
  }
}
```

### 3.2. Index Strategies

#### Compound Index Strategy

```typescript
// src/posts/schemas/post.schema.ts
export const PostSchema = SchemaFactory.createForClass(Post);

// Strategy 1: Most selective field first
// Query: Find published posts by specific author
PostSchema.index({ authorId: 1, status: 1 });
// authorId is more selective than status
// authorId: ~1000 unique values
// status: only 3 values (draft, published, archived)

// Strategy 2: Equality, Sort, Range (ESR Rule)
// Query: Find posts in category, sorted by date, with min views
PostSchema.index({ 
  categoryId: 1,    // Equality
  createdAt: -1,    // Sort
  viewCount: 1      // Range
});
// Optimizes: .find({ categoryId: 'cat1', viewCount: { $gt: 100 } }).sort({ createdAt: -1 })

// Strategy 3: Cover query completely (Covered Query)
PostSchema.index({ 
  status: 1, 
  createdAt: -1,
  title: 1,
  viewCount: 1
});
// If query only selects these fields → MongoDB doesn't fetch documents!
// Ultra fast!

// Usage:
await this.postModel
  .find({ status: 'published' })
  .select('title viewCount createdAt -_id') // Only indexed fields
  .sort({ createdAt: -1 });
// Entire query answered from index, no document fetch needed!
```

#### Index Intersection

```typescript
// MongoDB can use multiple indexes in single query

// Indexes:
PostSchema.index({ authorId: 1 });
PostSchema.index({ status: 1 });
PostSchema.index({ createdAt: -1 });

// Query using multiple indexes:
await this.postModel.find({
  authorId: 'user123',  // Uses authorId index
  status: 'published'   // Uses status index
});
// MongoDB intersects both indexes

// However, compound index is usually better:
PostSchema.index({ authorId: 1, status: 1 });
// Single index lookup is faster than intersecting two
```

#### Partial Indexes

```typescript
// Index only subset of documents
PostSchema.index(
  { createdAt: -1 },
  { 
    partialFilterExpression: { 
      status: 'published' 
    } 
  }
);
// Only indexes published posts
// Smaller index → faster, less memory

// Usage:
await this.postModel
  .find({ 
    status: 'published',
    createdAt: { $gte: new Date('2024-01-01') }
  })
  .sort({ createdAt: -1 });
// Uses partial index

await this.postModel
  .find({ 
    status: 'draft' // Different status
  });
// Cannot use partial index, does collection scan
```

#### Sparse Indexes

```typescript
// Index only documents where field exists
PostSchema.index(
  { phoneNumber: 1 },
  { sparse: true }
);
// Only indexes documents with phoneNumber
// Documents without phoneNumber not in index

// Useful for optional fields with unique constraint:
PostSchema.index(
  { phoneNumber: 1 },
  { unique: true, sparse: true }
);
// phoneNumber must be unique IF it exists
// Multiple documents can have null/undefined phoneNumber
```

#### TTL Indexes (Time To Live)

```typescript
// Auto-delete documents after expiration
@Schema()
export class Session {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Auto-delete sessions after 24 hours
SessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 } // 24 * 60 * 60
);

// MongoDB background process deletes expired docs every 60 seconds

// Dynamic expiration per document:
@Schema()
export class TempFile {
  @Prop({ required: true })
  filename: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date; // Custom expiration time per document
}

export const TempFileSchema = SchemaFactory.createForClass(TempFile);

TempFileSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 } // Delete immediately when expiresAt is reached
);

// Usage:
await this.tempFileModel.create({
  filename: 'temp.txt',
  expiresAt: new Date(Date.now() + 3600000) // Expires in 1 hour
});
```

### 3.3. Schema Design Patterns

MongoDB cung cấp các design patterns để tối ưu hóa performance và storage.

#### Attribute Pattern

**Problem:** Documents có nhiều fields tương tự nhau, gây khó khăn cho indexing và querying.

```typescript
// ❌ Anti-pattern: Many similar fields
{
  _id: "product1",
  name: "Laptop",
  price_usd: 999,
  price_eur: 850,
  price_gbp: 750,
  price_jpy: 110000,
  price_vnd: 23000000,
  // 100+ currencies = 100+ fields!
  // Can't index all currencies
  // Hard to query "find products with price < 1000 in any currency"
}
```

**✓ Solution: Attribute Pattern**

```typescript
// src/products/schemas/product.schema.ts
@Schema()
export class ProductPrice {
  @Prop({ required: true })
  currency: string; // 'USD', 'EUR', 'GBP', etc.

  @Prop({ required: true })
  amount: number;
}

export const ProductPriceSchema = SchemaFactory.createForClass(ProductPrice);

@Schema()
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [ProductPriceSchema] })
  prices: ProductPrice[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Create index on array
ProductSchema.index({ 'prices.currency': 1, 'prices.amount': 1 });

// Document structure:
{
  _id: "product1",
  name: "Laptop",
  prices: [
    { currency: "USD", amount: 999 },
    { currency: "EUR", amount: 850 },
    { currency: "GBP", amount: 750 },
    { currency: "JPY", amount: 110000 },
    { currency: "VND", amount: 23000000 }
  ]
}
```

**Usage:**

```typescript
// src/products/products.service.ts
@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  // Find products under budget in specific currency
  async findByMaxPrice(currency: string, maxAmount: number): Promise<Product[]> {
    return this.productModel
      .find({
        'prices.currency': currency,
        'prices.amount': { $lte: maxAmount }
      })
      .exec();
  }

  // Find products available in specific currency
  async findByCurrency(currency: string): Promise<Product[]> {
    return this.productModel
      .find({
        'prices.currency': currency
      })
      .exec();
  }

  // Aggregation: Convert prices to USD
  async getPricesInUSD(): Promise<any[]> {
    return this.productModel.aggregate([
      { $unwind: '$prices' },
      { $match: { 'prices.currency': 'USD' } },
      {
        $project: {
          name: 1,
          priceUSD: '$prices.amount'
        }
      }
    ]);
  }
}
```

**Benefits:**

```typescript
// ✓ Flexible: Add new currencies without schema change
// ✓ Indexable: Can index on currency and amount
// ✓ Queryable: Easy to filter by currency/amount
// ✓ Scalable: Supports unlimited attributes

// Use cases:
// - Product specifications (size, color, material)
// - User preferences
// - Feature flags
// - Multi-language content
```

#### Bucket Pattern

**Problem:** Time-series data creates too many documents.

```typescript
// ❌ Anti-pattern: One document per measurement
// IoT sensor sending data every second
{
  _id: "reading1",
  sensorId: "sensor123",
  temperature: 25.5,
  timestamp: ISODate("2024-03-06T10:00:00Z")
}
{
  _id: "reading2",
  sensorId: "sensor123",
  temperature: 25.6,
  timestamp: ISODate("2024-03-06T10:00:01Z")
}
// ... 86,400 documents per day per sensor!
// Millions of documents quickly
```

**✓ Solution: Bucket Pattern**

```typescript
// src/sensors/schemas/sensor-reading.schema.ts
@Schema()
export class Reading {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  temperature: number;

  @Prop()
  humidity: number;

  @Prop()
  pressure: number;
}

export const ReadingSchema = SchemaFactory.createForClass(Reading);

@Schema()
export class SensorBucket {
  @Prop({ required: true })
  sensorId: string;

  @Prop({ required: true })
  date: Date; // Start of bucket (e.g., start of day/hour)

  @Prop({ type: [ReadingSchema] })
  readings: Reading[];

  @Prop()
  count: number; // Number of readings in bucket

  @Prop()
  avgTemperature: number; // Pre-computed stats

  @Prop()
  minTemperature: number;

  @Prop()
  maxTemperature: number;
}

export const SensorBucketSchema = SchemaFactory.createForClass(SensorBucket);

// Indexes
SensorBucketSchema.index({ sensorId: 1, date: -1 });

// Document structure:
{
  _id: "bucket1",
  sensorId: "sensor123",
  date: ISODate("2024-03-06T00:00:00Z"), // Start of day
  count: 86400,
  avgTemperature: 25.5,
  minTemperature: 22.0,
  maxTemperature: 28.0,
  readings: [
    { timestamp: ISODate("2024-03-06T00:00:00Z"), temperature: 25.5, humidity: 60 },
    { timestamp: ISODate("2024-03-06T00:00:01Z"), temperature: 25.6, humidity: 61 },
    // ... up to bucket size limit
  ]
}
```

**Usage:**

```typescript
// src/sensors/sensors.service.ts
@Injectable()
export class SensorsService {
  constructor(
    @InjectModel(SensorBucket.name) private bucketModel: Model<SensorBucketDocument>,
  ) {}

  // Add reading to bucket
  async addReading(sensorId: string, reading: Reading): Promise<void> {
    const bucketDate = new Date(reading.timestamp);
    bucketDate.setHours(0, 0, 0, 0); // Start of day

    await this.bucketModel.updateOne(
      {
        sensorId,
        date: bucketDate,
        count: { $lt: 1000 } // Max 1000 readings per bucket
      },
      {
        $push: { readings: reading },
        $inc: { count: 1 },
        $min: { minTemperature: reading.temperature },
        $max: { maxTemperature: reading.temperature },
        // Update average (simplified)
        $set: { 
          avgTemperature: reading.temperature // Would need proper avg calculation
        }
      },
      { upsert: true }
    );
  }

  // Get sensor data for date range
  async getReadings(
    sensorId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Reading[]> {
    const buckets = await this.bucketModel
      .find({
        sensorId,
        date: { $gte: startDate, $lte: endDate }
      })
      .sort({ date: 1 })
      .exec();

    // Flatten all readings
    return buckets.flatMap(bucket => bucket.readings);
  }

  // Get aggregated stats (fast - pre-computed)
  async getStats(sensorId: string, date: Date): Promise<any> {
    return this.bucketModel
      .findOne({ sensorId, date })
      .select('avgTemperature minTemperature maxTemperature count')
      .exec();
  }

  // Hourly buckets for high-frequency data
  async addReadingHourly(sensorId: string, reading: Reading): Promise<void> {
    const bucketDate = new Date(reading.timestamp);
    bucketDate.setMinutes(0, 0, 0); // Start of hour

    await this.bucketModel.updateOne(
      {
        sensorId,
        date: bucketDate,
        count: { $lt: 3600 } // Max 3600 readings (1 per second for 1 hour)
      },
      {
        $push: { readings: reading },
        $inc: { count: 1 }
      },
      { upsert: true }
    );
  }
}
```

**Benefits:**

```typescript
// ✓ Fewer documents: 1 bucket vs 1000s of documents
// ✓ Better performance: Less index overhead
// ✓ Pre-computed stats: Fast aggregations
// ✓ Efficient storage: Reduced metadata overhead

// Before: 86,400 docs/day/sensor = 31.5M docs/year
// After: 1 doc/day/sensor = 365 docs/year
// 86,000x reduction!

// Bucket size considerations:
// - Too small: Defeats purpose
// - Too large: Hits 16MB document limit
// - Sweet spot: 100-1000 items per bucket
```

#### Computed Pattern

**Problem:** Expensive calculations repeated on every query.

```typescript
// ❌ Anti-pattern: Calculate on every request
async getPostEngagement(postId: string) {
  const post = await this.postModel.findById(postId);
  const comments = await this.commentModel.countDocuments({ postId });
  const likes = await this.likeModel.countDocuments({ postId });
  
  // Calculate engagement score every time
  const engagementScore = (post.viewCount * 1) + (comments * 10) + (likes * 5);
  
  return { ...post.toObject(), engagementScore, comments, likes };
}
// Every request: 3 database queries + computation
```

**✓ Solution: Computed Pattern**

```typescript
// src/posts/schemas/post.schema.ts
@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  // Raw counts
  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  commentCount: number;

  // Pre-computed fields
  @Prop({ default: 0 })
  engagementScore: number; // Computed: viewCount + likeCount*5 + commentCount*10

  @Prop({ default: 0 })
  popularityRank: number; // Computed: ranking among all posts

  @Prop({ type: Date })
  lastEngagementAt: Date; // Computed: last like/comment time

  @Prop()
  trendingScore: number; // Computed: time-decay engagement score
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Index on computed fields
PostSchema.index({ engagementScore: -1 });
PostSchema.index({ trendingScore: -1 });
```

**Update computed fields:**

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Increment view and update engagement
  async incrementView(postId: string): Promise<void> {
    await this.postModel.updateOne(
      { _id: postId },
      { 
        $inc: { viewCount: 1 },
        $set: {
          // Recompute engagement score
          // Formula: views*1 + likes*5 + comments*10
          // Note: This is simplified, see better approach below
        }
      }
    );
  }

  // Add like and update computed fields
  async addLike(postId: string): Promise<void> {
    const post = await this.postModel.findById(postId);
    
    await this.postModel.updateOne(
      { _id: postId },
      {
        $inc: { likeCount: 1 },
        $set: {
          engagementScore: this.calculateEngagement(
            post.viewCount,
            post.likeCount + 1,
            post.commentCount
          ),
          lastEngagementAt: new Date()
        }
      }
    );
  }

  // Add comment and update computed fields
  async addComment(postId: string): Promise<void> {
    const post = await this.postModel.findById(postId);
    
    await this.postModel.updateOne(
      { _id: postId },
      {
        $inc: { commentCount: 1 },
        $set: {
          engagementScore: this.calculateEngagement(
            post.viewCount,
            post.likeCount,
            post.commentCount + 1
          ),
          lastEngagementAt: new Date()
        }
      }
    );
  }

  // Engagement calculation
  private calculateEngagement(views: number, likes: number, comments: number): number {
    return views * 1 + likes * 5 + comments * 10;
  }

  // Trending score with time decay
  private calculateTrendingScore(engagement: number, date: Date): number {
    const hoursSincePublish = (Date.now() - date.getTime()) / (1000 * 60 * 60);
    const gravity = 1.8; // Decay factor
    
    return engagement / Math.pow(hoursSincePublish + 2, gravity);
  }

  // Get trending posts (fast - using computed field)
  async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    return this.postModel
      .find({ status: 'published' })
      .sort({ trendingScore: -1 }) // Sort by pre-computed score
      .limit(limit)
      .exec();
  }

  // Background job: Update trending scores
  @Cron('0 */1 * * * *') // Every hour
  async updateTrendingScores(): Promise<void> {
    const posts = await this.postModel.find({ status: 'published' });
    
    const bulkOps = posts.map(post => ({
      updateOne: {
        filter: { _id: post._id },
        update: {
          $set: {
            trendingScore: this.calculateTrendingScore(
              post.engagementScore,
              post.createdAt
            )
          }
        }
      }
    }));

    await this.postModel.bulkWrite(bulkOps);
  }

  // Recompute all engagement scores
  async recomputeEngagementScores(): Promise<void> {
    const posts = await this.postModel.find();
    
    const bulkOps = posts.map(post => ({
      updateOne: {
        filter: { _id: post._id },
        update: {
          $set: {
            engagementScore: this.calculateEngagement(
              post.viewCount,
              post.likeCount,
              post.commentCount
            )
          }
        }
      }
    }));

    await this.postModel.bulkWrite(bulkOps);
  }
}
```

**Benefits:**

```typescript
// ✓ Fast reads: No computation on read
// ✓ Sortable/Filterable: Can index computed fields
// ✓ Consistent: Same calculation every time

// Before: 3 queries + computation per request
// After: 1 query, instant result

// Trade-off: More writes (update computed fields)
// Worth it for read-heavy workloads
```

### 3.4. Connection Pooling

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
        
        // Connection pool settings
        maxPoolSize: 50,        // Max connections in pool
        minPoolSize: 10,        // Min connections to maintain
        
        // Timeouts
        serverSelectionTimeoutMS: 5000,   // 5s to select server
        socketTimeoutMS: 45000,           // 45s for socket operations
        connectTimeoutMS: 10000,          // 10s to establish connection
        
        // Heartbeat
        heartbeatFrequencyMS: 10000,      // Check server health every 10s
        
        // Write concern
        w: 'majority',          // Wait for majority of replicas
        journal: true,          // Wait for journal commit
        
        // Read preference
        readPreference: 'primaryPreferred', // Read from primary if available
      }),
    }),
  ],
})
export class AppModule {}
```

**Pool size guidelines:**

```typescript
// Rule of thumb: poolSize = concurrent_requests * 1.2

// Low traffic (< 100 req/s):
maxPoolSize: 10
minPoolSize: 5

// Medium traffic (100-1000 req/s):
maxPoolSize: 50
minPoolSize: 10

// High traffic (> 1000 req/s):
maxPoolSize: 100
minPoolSize: 20

// Monitor pool usage:
// - Too small: Requests wait for connection
// - Too large: Wastes resources, server overload
```

### 3.5. Caching Strategies với Redis

**Install Redis:**

```bash
npm install @nestjs/cache-manager cache-manager
npm install cache-manager-redis-store
npm install @types/cache-manager-redis-store -D
```

**Setup Redis cache:**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      ttl: 60, // Default TTL: 60 seconds
      max: 100, // Max items in cache
    }),
  ],
})
export class AppModule {}
```

**Cache aside pattern:**

```typescript
// src/posts/posts.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Cache aside pattern
  async findById(id: string): Promise<Post> {
    // 1. Try cache first
    const cacheKey = `post:${id}`;
    const cached = await this.cacheManager.get<Post>(cacheKey);
    
    if (cached) {
      console.log('Cache hit!');
      return cached;
    }
    
    // 2. Cache miss - fetch from database
    console.log('Cache miss - fetching from DB');
    const post = await this.postModel
      .findById(id)
      .populate('authorId', 'name avatar')
      .lean()
      .exec();
    
    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }
    
    // 3. Store in cache
    await this.cacheManager.set(cacheKey, post, 300); // TTL: 5 minutes
    
    return post;
  }

  // Invalidate cache on update
  async update(id: string, updateDto: UpdatePostDto): Promise<Post> {
    const post = await this.postModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    
    // Invalidate cache
    const cacheKey = `post:${id}`;
    await this.cacheManager.del(cacheKey);
    
    return post;
  }

  // Invalidate cache on delete
  async remove(id: string): Promise<void> {
    await this.postModel.findByIdAndDelete(id).exec();
    
    // Invalidate cache
    const cacheKey = `post:${id}`;
    await this.cacheManager.del(cacheKey);
  }
}
```

**Cache popular queries:**

```typescript
@Injectable()
export class PostsService {
  // Cache trending posts list
  async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    const cacheKey = `trending:posts:${limit}`;
    
    // Check cache
    const cached = await this.cacheManager.get<Post[]>(cacheKey);
    if (cached) return cached;
    
    // Fetch from database
    const posts = await this.postModel
      .find({ status: 'published' })
      .sort({ trendingScore: -1 })
      .limit(limit)
      .populate('authorId', 'name avatar')
      .lean()
      .exec();
    
    // Cache for 1 minute (trending changes frequently)
    await this.cacheManager.set(cacheKey, posts, 60);
    
    return posts;
  }

  // Cache aggregation results
  async getStatsByCategory(): Promise<any[]> {
    const cacheKey = 'stats:by:category';
    
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;
    
    const stats = await this.postModel.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' }
        }
      }
    ]);
    
    // Cache for 10 minutes (stats change slowly)
    await this.cacheManager.set(cacheKey, stats, 600);
    
    return stats;
  }

  // Invalidate pattern-based cache keys
  async invalidateTrendingCache(): Promise<void> {
    // In production, use Redis KEYS command carefully (blocking!)
    // Better: Track cache keys in a Set
    await this.cacheManager.del('trending:posts:10');
    await this.cacheManager.del('trending:posts:20');
    // Or use cache tags/namespaces
  }
}
```

**Write-through cache:**

```typescript
@Injectable()
export class PostsService {
  // Write-through: Update DB and cache simultaneously
  async incrementViewCount(id: string): Promise<void> {
    // Update database
    await this.postModel.updateOne(
      { _id: id },
      { $inc: { viewCount: 1 } }
    );
    
    // Update cache
    const cacheKey = `post:${id}`;
    const cached = await this.cacheManager.get<Post>(cacheKey);
    
    if (cached) {
      cached.viewCount += 1;
      await this.cacheManager.set(cacheKey, cached, 300);
    }
  }
}
```

**Cache warming:**

```typescript
@Injectable()
export class PostsService {
  // Warm cache on application start
  async onModuleInit() {
    await this.warmCache();
  }

  private async warmCache(): Promise<void> {
    console.log('Warming cache...');
    
    // Cache trending posts
    await this.getTrendingPosts(10);
    await this.getTrendingPosts(20);
    
    // Cache popular posts
    const popularPosts = await this.postModel
      .find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(10)
      .lean()
      .exec();
    
    for (const post of popularPosts) {
      const cacheKey = `post:${post._id}`;
      await this.cacheManager.set(cacheKey, post, 300);
    }
    
    console.log('Cache warmed!');
  }
}
```

### 3.6. Monitoring với MongoDB Atlas/Cloud

**Enable Profiling:**

```typescript
// Enable profiling for slow queries (> 100ms)
await db.setProfilingLevel(1, { slowms: 100 });

// View slow queries
const slowQueries = await db.system.profile.find().sort({ ts: -1 }).limit(10);
```

**Atlas Monitoring Metrics:**

```typescript
// Key metrics to monitor:

// 1. Query Performance
// - Query Execution Time (avg, p95, p99)
// - Queries per second
// - Slow queries (> 100ms)

// 2. Index Usage
// - Index hit ratio (should be > 95%)
// - Scanned objects vs returned
// - Missing indexes

// 3. Resource Usage
// - CPU usage (should be < 80%)
// - Memory usage
// - Disk IOPS
// - Network throughput

// 4. Connection Pool
// - Active connections
// - Available connections
// - Connection wait time

// 5. Replication
// - Replication lag
// - Oplog window
```

**Custom monitoring service:**

```typescript
// src/monitoring/monitoring.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectConnection() private connection: Connection,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkConnectionHealth(): Promise<void> {
    const state = this.connection.readyState;
    
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    
    this.logger.log(`MongoDB state: ${states[state]}`);
    
    if (state !== 1) {
      this.logger.error('MongoDB connection unhealthy!');
      // Send alert
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSlowQueries(): Promise<void> {
    const db = this.connection.db;
    
    try {
      const slowQueries = await db
        .collection('system.profile')
        .find({ millis: { $gt: 100 } })
        .sort({ ts: -1 })
        .limit(10)
        .toArray();
      
      if (slowQueries.length > 0) {
        this.logger.warn(`Found ${slowQueries.length} slow queries`);
        slowQueries.forEach(query => {
          this.logger.warn(`Slow query: ${query.command} - ${query.millis}ms`);
        });
      }
    } catch (error) {
      // Profiling might not be enabled
      this.logger.debug('Could not check slow queries');
    }
  }

  async getCollectionStats(collectionName: string): Promise<any> {
    const stats = await this.connection.db.collection(collectionName).stats();
    
    return {
      count: stats.count,
      size: stats.size,
      avgObjSize: stats.avgObjSize,
      storageSize: stats.storageSize,
      indexes: stats.nindexes,
      indexSize: stats.totalIndexSize,
    };
  }
}
```

---

## 4. Migration & Data Seeding

### 4.1. Tạo Seed Data cho MongoDB

**Setup seeding infrastructure:**

```bash
npm install --save-dev @faker-js/faker
```

```typescript
// src/database/seeders/seeder.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { Post, PostSchema } from '../../posts/schemas/post.schema';
import { Category, CategorySchema } from '../../categories/schemas/category.schema';
import { Tag, TagSchema } from '../../tags/schemas/tag.schema';
import { UserSeeder } from './user.seeder';
import { PostSeeder } from './post.seeder';
import { CategorySeeder } from './category.seeder';
import { TagSeeder } from './tag.seeder';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Tag.name, schema: TagSchema },
    ]),
  ],
  providers: [UserSeeder, PostSeeder, CategorySeeder, TagSeeder],
})
export class SeederModule {}
```

**User Seeder:**

```typescript
// src/database/seeders/user.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async seed(count: number = 50): Promise<User[]> {
    console.log(`Seeding ${count} users...`);

    const users: User[] = [];

    // Create admin user
    const admin = await this.userModel.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'admin',
      isActive: true,
      bio: 'System Administrator',
      avatar: faker.image.avatar(),
    });
    users.push(admin);

    // Create regular users
    for (let i = 0; i < count - 1; i++) {
      const user = await this.userModel.create({
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        password: await bcrypt.hash('password123', 10),
        role: faker.helpers.arrayElement(['user', 'moderator']),
        isActive: faker.datatype.boolean(0.9), // 90% active
        bio: faker.lorem.sentence(),
        avatar: faker.image.avatar(),
        phoneNumber: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.7 }),
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          country: faker.location.country(),
        },
        socialLinks: {
          twitter: faker.helpers.maybe(() => faker.internet.userName(), { probability: 0.5 }),
          facebook: faker.helpers.maybe(() => faker.internet.userName(), { probability: 0.5 }),
          linkedin: faker.helpers.maybe(() => faker.internet.userName(), { probability: 0.3 }),
        },
      });
      users.push(user);
    }

    console.log(`✓ Seeded ${users.length} users`);
    return users;
  }

  async clear(): Promise<void> {
    await this.userModel.deleteMany({});
    console.log('✓ Cleared users collection');
  }
}
```

**Category & Tag Seeders:**

```typescript
// src/database/seeders/category.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '../../categories/schemas/category.schema';

@Injectable()
export class CategorySeeder {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async seed(): Promise<Category[]> {
    console.log('Seeding categories...');

    const categories = [
      {
        name: 'Technology',
        slug: 'technology',
        description: 'Latest technology trends and news',
      },
      {
        name: 'Programming',
        slug: 'programming',
        description: 'Programming tutorials and tips',
      },
      {
        name: 'Web Development',
        slug: 'web-development',
        description: 'Web development resources',
      },
      {
        name: 'Mobile Development',
        slug: 'mobile-development',
        description: 'Mobile app development',
      },
      {
        name: 'DevOps',
        slug: 'devops',
        description: 'DevOps practices and tools',
      },
      {
        name: 'Database',
        slug: 'database',
        description: 'Database design and optimization',
      },
    ];

    const created = await this.categoryModel.insertMany(categories);
    console.log(`✓ Seeded ${created.length} categories`);
    return created;
  }

  async clear(): Promise<void> {
    await this.categoryModel.deleteMany({});
    console.log('✓ Cleared categories collection');
  }
}

// src/database/seeders/tag.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from '../../tags/schemas/tag.schema';

@Injectable()
export class TagSeeder {
  constructor(
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
  ) {}

  async seed(): Promise<Tag[]> {
    console.log('Seeding tags...');

    const tags = [
      'javascript', 'typescript', 'nodejs', 'nestjs', 'mongodb',
      'react', 'vue', 'angular', 'docker', 'kubernetes',
      'aws', 'azure', 'gcp', 'ci-cd', 'testing',
      'security', 'performance', 'architecture', 'microservices', 'api'
    ];

    const created = await this.tagModel.insertMany(
      tags.map(name => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
      }))
    );

    console.log(`✓ Seeded ${created.length} tags`);
    return created;
  }

  async clear(): Promise<void> {
    await this.tagModel.deleteMany({});
    console.log('✓ Cleared tags collection');
  }
}
```

**Post Seeder:**

```typescript
// src/database/seeders/post.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { Post, PostDocument } from '../../posts/schemas/post.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Category, CategoryDocument } from '../../categories/schemas/category.schema';
import { Tag, TagDocument } from '../../tags/schemas/tag.schema';

@Injectable()
export class PostSeeder {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
  ) {}

  async seed(count: number = 200): Promise<Post[]> {
    console.log(`Seeding ${count} posts...`);

    // Get reference data
    const users = await this.userModel.find().select('_id name avatar').exec();
    const categories = await this.categoryModel.find().select('_id').exec();
    const tags = await this.tagModel.find().select('_id').exec();

    const posts: any[] = [];

    for (let i = 0; i < count; i++) {
      const author = faker.helpers.arrayElement(users);
      const category = faker.helpers.arrayElement(categories);
      const postTags = faker.helpers.arrayElements(
        tags,
        faker.number.int({ min: 1, max: 5 })
      );

      const status = faker.helpers.arrayElement([
        'published',
        'published',
        'published', // 75% published
        'draft',
      ]);

      const createdAt = faker.date.past({ years: 1 });
      const publishedAt = status === 'published' ? createdAt : null;

      const post = {
        title: faker.lorem.sentence({ min: 5, max: 10 }),
        slug: faker.helpers.slugify(faker.lorem.words(5)).toLowerCase(),
        excerpt: faker.lorem.paragraph(),
        content: faker.lorem.paragraphs(faker.number.int({ min: 5, max: 15 })),
        
        // Author info (hybrid pattern)
        authorId: author._id,
        authorName: author.name,
        authorAvatar: author.avatar,
        
        // Category
        categoryId: category._id,
        
        // Tags
        tags: postTags.map(tag => tag._id),
        
        // Status
        status,
        publishedAt,
        
        // Engagement metrics
        viewCount: status === 'published' 
          ? faker.number.int({ min: 0, max: 10000 })
          : 0,
        likeCount: status === 'published'
          ? faker.number.int({ min: 0, max: 500 })
          : 0,
        commentCount: status === 'published'
          ? faker.number.int({ min: 0, max: 100 })
          : 0,
        
        // Computed fields
        engagementScore: 0, // Will calculate below
        
        // SEO
        metaTitle: faker.lorem.sentence(),
        metaDescription: faker.lorem.paragraph(),
        
        // Timestamps
        createdAt,
        updatedAt: createdAt,
      };

      // Calculate engagement score
      post.engagementScore = 
        post.viewCount * 1 + 
        post.likeCount * 5 + 
        post.commentCount * 10;

      posts.push(post);
    }

    const created = await this.postModel.insertMany(posts);
    console.log(`✓ Seeded ${created.length} posts`);
    return created;
  }

  async clear(): Promise<void> {
    await this.postModel.deleteMany({});
    console.log('✓ Cleared posts collection');
  }
}
```

**Main Seeder Script:**

```typescript
// src/database/seeders/seed.ts
import { NestFactory } from '@nestjs/core';
import { SeederModule } from './seeder.module';
import { UserSeeder } from './user.seeder';
import { CategorySeeder } from './category.seeder';
import { TagSeeder } from './tag.seeder';
import { PostSeeder } from './post.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeederModule);

  const userSeeder = app.get(UserSeeder);
  const categorySeeder = app.get(CategorySeeder);
  const tagSeeder = app.get(TagSeeder);
  const postSeeder = app.get(PostSeeder);

  try {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    console.log('Clearing existing data...');
    await postSeeder.clear();
    await userSeeder.clear();
    await categorySeeder.clear();
    await tagSeeder.clear();
    console.log('');

    // Seed in correct order (dependencies)
    await userSeeder.seed(50);
    await categorySeeder.seed();
    await tagSeeder.seed();
    await postSeeder.seed(200);

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();
```

**Add to package.json:**

```json
{
  "scripts": {
    "seed": "ts-node src/database/seeders/seed.ts",
    "seed:clear": "ts-node src/database/seeders/clear.ts"
  }
}
```

**Run seeder:**

```bash
npm run seed
```

### 4.2. Migration Strategies

MongoDB không có native migration system như SQL, nhưng có nhiều cách để manage schema changes.

**Install migrate-mongo:**

```bash
npm install migrate-mongo
```

**Initialize migrate-mongo:**

```bash
npx migrate-mongo init
```

**Configure migrate-mongo:**

```javascript
// migrate-mongo-config.js
module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    databaseName: process.env.DB_NAME || 'blog_db',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
};
```

**Create migration:**

```bash
npx migrate-mongo create add-slug-to-posts
```

**Migration Example 1: Add field to all documents:**

```javascript
// migrations/20240306000001-add-slug-to-posts.js
module.exports = {
  async up(db, client) {
    console.log('Adding slug field to posts...');
    
    const posts = await db.collection('posts').find({ slug: { $exists: false } }).toArray();
    
    const bulkOps = posts.map(post => {
      const slug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      return {
        updateOne: {
          filter: { _id: post._id },
          update: { $set: { slug } }
        }
      };
    });
    
    if (bulkOps.length > 0) {
      await db.collection('posts').bulkWrite(bulkOps);
      console.log(`✓ Added slug to ${bulkOps.length} posts`);
    }
    
    // Create unique index on slug
    await db.collection('posts').createIndex({ slug: 1 }, { unique: true });
    console.log('✓ Created unique index on slug');
  },

  async down(db, client) {
    console.log('Removing slug field from posts...');
    
    await db.collection('posts').updateMany(
      {},
      { $unset: { slug: '' } }
    );
    
    await db.collection('posts').dropIndex('slug_1');
    console.log('✓ Removed slug field and index');
  }
};
```

**Migration Example 2: Rename field:**

```javascript
// migrations/20240306000002-rename-likes-to-likeCount.js
module.exports = {
  async up(db, client) {
    console.log('Renaming likes to likeCount...');
    
    await db.collection('posts').updateMany(
      { likes: { $exists: true } },
      { $rename: { likes: 'likeCount' } }
    );
    
    console.log('✓ Renamed likes to likeCount');
  },

  async down(db, client) {
    console.log('Renaming likeCount back to likes...');
    
    await db.collection('posts').updateMany(
      { likeCount: { $exists: true } },
      { $rename: { likeCount: 'likes' } }
    );
    
    console.log('✓ Renamed likeCount back to likes');
  }
};
```

**Migration Example 3: Transform data structure:**

```javascript
// migrations/20240306000003-split-author-name.js
module.exports = {
  async up(db, client) {
    console.log('Splitting author name into firstName and lastName...');
    
    const users = await db.collection('users').find({ name: { $exists: true } }).toArray();
    
    const bulkOps = users.map(user => {
      const parts = user.name.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      
      return {
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: { firstName, lastName },
            $unset: { name: '' }
          }
        }
      };
    });
    
    if (bulkOps.length > 0) {
      await db.collection('users').bulkWrite(bulkOps);
      console.log(`✓ Split name for ${bulkOps.length} users`);
    }
  },

  async down(db, client) {
    console.log('Combining firstName and lastName back to name...');
    
    const users = await db.collection('users').find({
      firstName: { $exists: true },
      lastName: { $exists: true }
    }).toArray();
    
    const bulkOps = users.map(user => {
      const name = `${user.firstName} ${user.lastName}`.trim();
      
      return {
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: { name },
            $unset: { firstName: '', lastName: '' }
          }
        }
      };
    });
    
    if (bulkOps.length > 0) {
      await db.collection('users').bulkWrite(bulkOps);
      console.log(`✓ Combined names for ${bulkOps.length} users`);
    }
  }
};
```

**Migration Example 4: Denormalize data:**

```javascript
// migrations/20240306000004-denormalize-author-info.js
module.exports = {
  async up(db, client) {
    console.log('Denormalizing author info in posts...');
    
    const posts = await db.collection('posts').find({
      authorName: { $exists: false }
    }).toArray();
    
    const bulkOps = [];
    
    for (const post of posts) {
      const author = await db.collection('users').findOne({ _id: post.authorId });
      
      if (author) {
        bulkOps.push({
          updateOne: {
            filter: { _id: post._id },
            update: {
              $set: {
                authorName: author.name,
                authorAvatar: author.avatar
              }
            }
          }
        });
      }
    }
    
    if (bulkOps.length > 0) {
      await db.collection('posts').bulkWrite(bulkOps);
      console.log(`✓ Denormalized author info for ${bulkOps.length} posts`);
    }
  },

  async down(db, client) {
    console.log('Removing denormalized author info...');
    
    await db.collection('posts').updateMany(
      {},
      {
        $unset: {
          authorName: '',
          authorAvatar: ''
        }
      }
    );
    
    console.log('✓ Removed denormalized author info');
  }
};
```

**Migration Example 5: Create computed fields:**

```javascript
// migrations/20240306000005-add-engagement-score.js
module.exports = {
  async up(db, client) {
    console.log('Adding engagement score to posts...');
    
    const posts = await db.collection('posts').find({}).toArray();
    
    const bulkOps = posts.map(post => {
      const engagementScore = 
        (post.viewCount || 0) * 1 +
        (post.likeCount || 0) * 5 +
        (post.commentCount || 0) * 10;
      
      return {
        updateOne: {
          filter: { _id: post._id },
          update: { $set: { engagementScore } }
        }
      };
    });
    
    if (bulkOps.length > 0) {
      await db.collection('posts').bulkWrite(bulkOps);
      console.log(`✓ Added engagement score to ${bulkOps.length} posts`);
    }
    
    // Create index for sorting
    await db.collection('posts').createIndex({ engagementScore: -1 });
    console.log('✓ Created index on engagementScore');
  },

  async down(db, client) {
    console.log('Removing engagement score...');
    
    await db.collection('posts').updateMany(
      {},
      { $unset: { engagementScore: '' } }
    );
    
    await db.collection('posts').dropIndex('engagementScore_-1');
    console.log('✓ Removed engagement score and index');
  }
};
```

**Run migrations:**

```bash
# Run all pending migrations
npx migrate-mongo up

# Rollback last migration
npx migrate-mongo down

# Check migration status
npx migrate-mongo status
```

**NestJS Migration Service (Alternative):**

```typescript
// src/database/migrations/migration.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectConnection() private connection: Connection,
  ) {}

  async runMigrations(): Promise<void> {
    const db = this.connection.db;
    
    // Check which migrations have run
    const migrationsCollection = db.collection('migrations');
    const completedMigrations = await migrationsCollection.find().toArray();
    const completedNames = completedMigrations.map(m => m.name);
    
    // Define migrations
    const migrations = [
      {
        name: '001-add-slug-to-posts',
        up: async () => {
          this.logger.log('Running migration: add-slug-to-posts');
          // Migration logic here
        }
      },
      {
        name: '002-denormalize-author',
        up: async () => {
          this.logger.log('Running migration: denormalize-author');
          // Migration logic here
        }
      }
    ];
    
    // Run pending migrations
    for (const migration of migrations) {
      if (!completedNames.includes(migration.name)) {
        await migration.up();
        await migrationsCollection.insertOne({
          name: migration.name,
          completedAt: new Date()
        });
        this.logger.log(`✓ Completed migration: ${migration.name}`);
      }
    }
  }
}

// Run on application start
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Run migrations
  const migrationService = app.get(MigrationService);
  await migrationService.runMigrations();
  
  await app.listen(3000);
}
```

**Best Practices for Migrations:**

```typescript
// 1. Always test migrations on copy of production data
// 2. Make migrations reversible (implement down())
// 3. Keep migrations small and focused
// 4. Use transactions when possible
// 5. Backup before running migrations
// 6. Run migrations during low-traffic periods
// 7. Monitor migration performance
// 8. Document breaking changes
```

---

## 5. Best Practices & Common Pitfalls

### 5.1. Schema Design Best Practices

#### 1. Design for Your Query Patterns

```typescript
// ❌ Bad: Design based on data structure alone
@Schema()
export class User {
  @Prop()
  name: string;
  
  @Prop()
  email: string;
}

@Schema()
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  authorId: Types.ObjectId;
  
  @Prop()
  title: string;
}

// Query: Show feed with author names
// Problem: Need to populate every post (N+1 queries)

// ✓ Good: Design for common queries
@Schema()
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  authorId: Types.ObjectId;
  
  // Denormalize frequently accessed data
  @Prop()
  authorName: string;
  
  @Prop()
  authorAvatar: string;
  
  @Prop()
  title: string;
}

// Query: Show feed with author names
// Solution: One query, no populate needed!
```

#### 2. Optimize for Read vs Write

```typescript
// Read-heavy application (social media, blogs)
// ✓ Denormalize for fast reads
@Schema()
export class Post {
  @Prop()
  title: string;
  
  @Prop()
  authorName: string; // Denormalized
  
  @Prop({ default: 0 })
  likeCount: number; // Computed field
  
  @Prop({ default: 0 })
  commentCount: number; // Computed field
}
// Trade-off: More complex writes, but much faster reads

// Write-heavy application (logging, analytics)
// ✓ Normalize, minimize redundancy
@Schema()
export class Log {
  @Prop()
  message: string;
  
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId; // Just reference
  
  @Prop()
  timestamp: Date;
}
// Trade-off: Slower reads (need populate), but fast writes
```

#### 3. Use Appropriate Data Types

```typescript
// ❌ Bad: Using wrong data types
@Schema()
export class Product {
  @Prop()
  price: string; // Wrong! "99.99" can't be sorted/calculated
  
  @Prop()
  tags: string; // Wrong! "tag1,tag2,tag3" can't be queried efficiently
  
  @Prop()
  createdAt: string; // Wrong! "2024-03-06" can't use date operators
}

// ✓ Good: Correct data types
@Schema()
export class Product {
  @Prop({ type: Number })
  price: number; // Can sort, calculate, use $gte, $lte
  
  @Prop({ type: [String] })
  tags: string[]; // Can use $in, $all, $elemMatch
  
  @Prop({ type: Date, default: Date.now })
  createdAt: Date; // Can use date operators
  
  // For money, use Decimal128 for precision
  @Prop({ type: Schema.Types.Decimal128 })
  precisePrice: Schema.Types.Decimal128;
}
```

#### 4. Plan for Data Growth

```typescript
// ❌ Bad: Unbounded arrays
@Schema()
export class User {
  @Prop()
  name: string;
  
  @Prop({ type: [String] })
  activityLog: string[]; // Will grow forever!
  // Problem: Document size limit (16MB), performance degradation
}

// ✓ Good: Separate collection for unbounded data
@Schema()
export class User {
  @Prop()
  name: string;
}

@Schema()
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;
  
  @Prop()
  action: string;
  
  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

// Query recent activities: pagination, TTL indexes possible
```

#### 5. Use Indexes Strategically

```typescript
// ❌ Bad: Too many indexes
PostSchema.index({ title: 1 });
PostSchema.index({ authorId: 1 });
PostSchema.index({ status: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ viewCount: -1 });
PostSchema.index({ likeCount: -1 });
PostSchema.index({ categoryId: 1 });
// Problem: Slow writes, high memory usage

// ✓ Good: Compound indexes for common queries
PostSchema.index({ authorId: 1, createdAt: -1 }); // Query: user's posts by date
PostSchema.index({ status: 1, createdAt: -1 }); // Query: published posts by date
PostSchema.index({ categoryId: 1, viewCount: -1 }); // Query: popular posts in category

// Keep indexes minimal and targeted
```

### 5.2. Tránh N+1 Queries

**Problem: N+1 Query Pattern**

```typescript
// ❌ Bad: N+1 queries
async getAllPostsWithAuthors() {
  const posts = await this.postModel.find(); // 1 query
  
  // N queries (one per post)
  for (const post of posts) {
    const author = await this.userModel.findById(post.authorId); // N queries!
    post['author'] = author;
  }
  
  return posts;
}
// Total: 1 + N queries
// If 100 posts → 101 queries! Very slow!
```

**Solution 1: Use populate()**

```typescript
// ✓ Good: Use populate
async getAllPostsWithAuthors() {
  return this.postModel
    .find()
    .populate('authorId', 'name email avatar')
    .exec();
}
// Total: 2 queries (posts + authors)
// Much faster!
```

**Solution 2: Denormalization**

```typescript
// ✓ Better: Denormalize for read-heavy
@Schema()
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  authorId: Types.ObjectId;
  
  @Prop()
  authorName: string; // Denormalized
  
  @Prop()
  authorAvatar: string; // Denormalized
}

async getAllPostsWithAuthors() {
  return this.postModel.find().exec();
}
// Total: 1 query
// Fastest! No populate needed
```

**Solution 3: Aggregation with $lookup**

```typescript
// ✓ Good: Aggregation for complex cases
async getAllPostsWithStats() {
  return this.postModel.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'authorId',
        foreignField: '_id',
        as: 'author'
      }
    },
    { $unwind: '$author' },
    {
      $lookup: {
        from: 'comments',
        localField: '_id',
        foreignField: 'postId',
        as: 'comments'
      }
    },
    {
      $addFields: {
        commentCount: { $size: '$comments' }
      }
    },
    {
      $project: {
        title: 1,
        'author.name': 1,
        'author.avatar': 1,
        commentCount: 1,
        viewCount: 1
      }
    }
  ]);
}
// Total: 1 aggregation pipeline
// Efficient for complex joins
```

**DataLoader Pattern (Advanced)**

```typescript
// src/common/dataloaders/user.dataloader.ts
import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class UserDataLoader {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  createLoader() {
    return new DataLoader<string, User>(async (userIds: string[]) => {
      const users = await this.userModel
        .find({ _id: { $in: userIds } })
        .exec();
      
      // Create map for O(1) lookup
      const userMap = new Map(
        users.map(user => [user._id.toString(), user])
      );
      
      // Return in same order as input
      return userIds.map(id => userMap.get(id));
    });
  }
}

// Usage in service
async getPostsWithAuthors() {
  const posts = await this.postModel.find();
  const userLoader = this.userDataLoader.createLoader();
  
  // Batch load all authors in one query
  const postsWithAuthors = await Promise.all(
    posts.map(async post => ({
      ...post.toObject(),
      author: await userLoader.load(post.authorId.toString())
    }))
  );
  
  return postsWithAuthors;
}
// DataLoader batches and caches requests
// 100 posts → 1 query for users (instead of 100)
```

### 5.3. Document Size Limits (16MB)

```typescript
// ❌ Bad: Unbounded embedded arrays
@Schema()
export class User {
  @Prop()
  name: string;
  
  @Prop({ type: [Object] })
  orders: any[]; // Can grow to 16MB!
  
  @Prop({ type: [String] })
  allMessages: string[]; // Can exceed limit!
}

// ✓ Good: Separate collections
@Schema()
export class User {
  @Prop()
  name: string;
}

@Schema()
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;
  
  @Prop()
  items: any[];
  
  @Prop()
  total: number;
}

// ✓ Good: Bucket pattern for high-volume
@Schema()
export class MessageBucket {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;
  
  @Prop()
  date: Date; // Bucket by day
  
  @Prop({ type: [Object] })
  messages: any[]; // Max ~1000 messages per day
  
  @Prop()
  count: number;
}

// Monitoring document size
async checkDocumentSizes() {
  const stats = await this.postModel.aggregate([
    {
      $project: {
        size: { $bsonSize: '$$ROOT' }
      }
    },
    {
      $group: {
        _id: null,
        avgSize: { $avg: '$size' },
        maxSize: { $max: '$size' }
      }
    }
  ]);
  
  console.log('Average size:', stats[0].avgSize, 'bytes');
  console.log('Max size:', stats[0].maxSize, 'bytes');
  
  if (stats[0].maxSize > 15000000) { // > 15MB
    console.warn('Warning: Documents approaching 16MB limit!');
  }
}
```

### 5.4. Khi nào KHÔNG nên dùng MongoDB?

```typescript
// ❌ Don't use MongoDB for:

// 1. Complex multi-row transactions
// Example: Banking system with frequent transfers
// Better: PostgreSQL with ACID transactions

// 2. Complex joins across many tables
// Example: ERP system with 50+ related entities
// Better: PostgreSQL with native JOINs

// 3. Strict referential integrity required
// Example: Financial records, legal documents
// Better: PostgreSQL with foreign keys

// 4. Business Intelligence / OLAP
// Example: Complex analytical queries with multiple aggregations
// Better: PostgreSQL / Snowflake / BigQuery

// 5. Graph relationships
// Example: Social network friend-of-friend queries
// Better: Neo4j

// ✓ Use MongoDB for:

// 1. Flexible, evolving schemas
// Example: Product catalogs with varying attributes

// 2. Document-centric data
// Example: CMS, blogs, user profiles

// 3. High-volume writes
// Example: IoT data, logging, analytics events

// 4. Horizontal scaling needs
// Example: Global applications with sharding

// 5. Rapid development
// Example: Startups, MVPs with changing requirements
```

### 5.5. Security Best Practices

#### Authentication & Authorization

```typescript
// 1. Enable authentication
// mongod.conf
security:
  authorization: enabled

// 2. Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "strongPassword123!",
  roles: ["root"]
})

// 3. Create application user with minimal permissions
use blog_db
db.createUser({
  user: "blog_app",
  pwd: "appPassword123!",
  roles: [
    { role: "readWrite", db: "blog_db" }
  ]
})

// 4. Use environment variables for credentials
// .env
MONGODB_URI=mongodb://blog_app:appPassword123!@localhost:27017/blog_db?authSource=blog_db

// 5. Never expose connection strings
// ❌ Bad
const uri = 'mongodb://user:password@localhost:27017/db';

// ✓ Good
const uri = process.env.MONGODB_URI;
```

#### Network Security

```typescript
// 1. Bind to localhost only (if single server)
// mongod.conf
net:
  bindIp: 127.0.0.1

// 2. Use firewall to restrict access
// Only allow application server
sudo ufw allow from 10.0.1.5 to any port 27017

// 3. Use TLS/SSL for connections
MongooseModule.forRoot(process.env.MONGODB_URI, {
  ssl: true,
  sslValidate: true,
  sslCA: fs.readFileSync('./ca-certificate.crt'),
});

// 4. MongoDB Atlas: Use IP whitelisting
// Only allow known IPs to connect
```

#### Data Encryption

```typescript
// 1. Encryption at rest (MongoDB Enterprise)
// mongod.conf
security:
  enableEncryption: true
  encryptionKeyFile: /path/to/key

// 2. Encryption in transit (TLS/SSL)
// Already covered above

// 3. Field-level encryption (sensitive data)
import { ClientEncryption } from 'mongodb';

@Schema()
export class User {
  @Prop()
  name: string;
  
  @Prop()
  email: string;
  
  // Encrypt sensitive fields
  @Prop()
  encryptedSSN: string; // Encrypted social security number
  
  @Prop()
  encryptedCreditCard: string; // Encrypted credit card
}

// Encrypt before save
async encryptSensitiveData(user: User) {
  const encryption = new ClientEncryption(client, {
    keyVaultNamespace: 'encryption.__keyVault',
    kmsProviders: {
      local: {
        key: Buffer.from(process.env.MASTER_KEY, 'base64')
      }
    }
  });
  
  user.encryptedSSN = await encryption.encrypt(
    user.ssn,
    {
      algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
      keyId: dataKeyId
    }
  );
}
```

#### Input Validation

```typescript
// ❌ Bad: No validation
async createPost(data: any) {
  return this.postModel.create(data); // Dangerous!
}

// ✓ Good: DTO validation
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
  
  @IsString()
  @IsNotEmpty()
  content: string;
  
  @IsOptional()
  @IsString()
  categoryId?: string;
}

async createPost(data: CreatePostDto) {
  return this.postModel.create(data);
}

// Prevent NoSQL injection
// ❌ Bad: Direct user input in query
async findByEmail(email: any) {
  return this.userModel.findOne({ email }); // Injection possible!
}
// Attack: { $gt: "" } returns all users!

// ✓ Good: Validate and sanitize
async findByEmail(email: string) {
  if (typeof email !== 'string') {
    throw new BadRequestException('Invalid email');
  }
  return this.userModel.findOne({ email });
}

// Use mongoose-sanitize
import mongooseSanitize from 'mongoose-sanitize';

app.use(mongooseSanitize()); // Strips out $ and . from user input
```

### 5.6. Backup & Recovery Strategies

#### MongoDB Dump/Restore

```bash
# Backup entire database
mongodump --uri="mongodb://localhost:27017/blog_db" --out=/backup/$(date +%Y%m%d)

# Backup specific collection
mongodump --uri="mongodb://localhost:27017/blog_db" --collection=posts --out=/backup/posts

# Restore database
mongorestore --uri="mongodb://localhost:27017/blog_db" /backup/20240306

# Restore specific collection
mongorestore --uri="mongodb://localhost:27017/blog_db" --collection=posts /backup/posts/posts.bson
```

#### Automated Backup Script

```typescript
// src/backup/backup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = '/backups';

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performDailyBackup() {
    this.logger.log('Starting daily backup...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const backupPath = path.join(this.backupDir, timestamp);
    
    try {
      // Create backup directory
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      // Run mongodump
      const uri = process.env.MONGODB_URI;
      const command = `mongodump --uri="${uri}" --out="${backupPath}"`;
      
      const { stdout, stderr } = await execAsync(command);
      this.logger.log('Backup completed:', stdout);
      
      // Compress backup
      await execAsync(`tar -czf ${backupPath}.tar.gz -C ${backupPath} .`);
      
      // Remove uncompressed backup
      await execAsync(`rm -rf ${backupPath}`);
      
      // Clean old backups (keep last 7 days)
      await this.cleanOldBackups(7);
      
      this.logger.log('Backup successful:', `${backupPath}.tar.gz`);
    } catch (error) {
      this.logger.error('Backup failed:', error);
      // Send alert
    }
  }

  private async cleanOldBackups(daysToKeep: number) {
    const files = fs.readdirSync(this.backupDir);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        this.logger.log('Deleted old backup:', file);
      }
    }
  }

  // Upload to S3 (optional)
  async uploadToS3(filePath: string) {
    // Implementation with AWS SDK
  }
}
```

#### Point-in-Time Recovery (Replica Sets)

```bash
# Enable oplog
# mongod.conf
replication:
  oplogSizeMB: 2048
  replSetName: rs0

# Backup with oplog
mongodump --oplog --uri="mongodb://localhost:27017" --out=/backup

# Restore to specific point in time
mongorestore --oplogReplay --oplogLimit="1709712000:1" /backup
```

#### MongoDB Atlas Backup

```typescript
// Atlas provides automatic backups
// - Continuous backups (every 6 hours)
// - Point-in-time recovery
// - No manual setup needed

// Download backup via Atlas UI or API
import { MongoClient } from 'mongodb';

async function downloadAtlasBackup() {
  // Use MongoDB Atlas API
  const response = await fetch(
    'https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/backup/snapshots',
    {
      headers: {
        'Authorization': `Bearer ${process.env.ATLAS_API_KEY}`
      }
    }
  );
  
  const snapshots = await response.json();
  // Download specific snapshot
}
```

---

## 6. So sánh với TypeORM (PostgreSQL)

### 6.1. Điểm giống và khác

| Aspect | MongoDB (Mongoose) | PostgreSQL (TypeORM) |
|--------|-------------------|---------------------|
| **Data Model** | Document-oriented (JSON-like) | Relational (Tables/Rows) |
| **Schema** | Flexible, optional | Rigid, enforced |
| **Relationships** | Embedded or References | Foreign Keys |
| **Queries** | Find/Aggregate | SQL |
| **Transactions** | Multi-doc (4.0+), limited | Full ACID, robust |
| **Scaling** | Horizontal (sharding) | Vertical primarily |
| **Joins** | $lookup (slow) | Native (fast) |
| **Migrations** | Manual, optional | Automatic, required |
| **Learning Curve** | Moderate | Moderate-High |

**Code Comparison:**

```typescript
// MongoDB (Mongoose)
@Schema()
export class User {
  @Prop({ required: true })
  name: string;
  
  @Prop({ required: true, unique: true })
  email: string;
  
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Post' }] })
  posts: Types.ObjectId[];
}

const user = await this.userModel
  .findOne({ email })
  .populate('posts')
  .exec();

// PostgreSQL (TypeORM)
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  name: string;
  
  @Column({ unique: true })
  email: string;
  
  @OneToMany(() => Post, post => post.user)
  posts: Post[];
}

const user = await this.userRepository
  .findOne({
    where: { email },
    relations: ['posts']
  });
```

### 6.2. Khi nào dùng cái nào?

**Use MongoDB when:**

```typescript
// 1. Schema changes frequently
// E-commerce with varying product attributes
{
  name: "Laptop",
  cpu: "i7", ram: "16GB", storage: "512GB"
}
{
  name: "T-Shirt",
  size: "L", color: "Blue", material: "Cotton"
}

// 2. Need horizontal scaling
// Global app with millions of users

// 3. Document-centric data
// CMS, blogs, user profiles

// 4. High write throughput
// IoT sensors, logs, analytics events

// 5. Rapid prototyping
// Startup MVP with changing requirements
```

**Use PostgreSQL when:**

```typescript
// 1. Complex transactions
// Banking, financial systems

// 2. Complex relationships
// ERP, CRM with many related entities

// 3. Data integrity critical
// Legal, healthcare, finance

// 4. Complex analytical queries
// Reporting, business intelligence

// 5. Mature, stable schema
// Long-established business logic
```

### 6.3. Polyglot Persistence (Dùng cả hai)

```typescript
// Use both databases in same application!

// src/app.module.ts
@Module({
  imports: [
    // PostgreSQL for transactional data
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'main_db',
      entities: [Order, Payment, Invoice],
      synchronize: false,
    }),
    
    // MongoDB for content and analytics
    MongooseModule.forRoot('mongodb://localhost:27017/content_db'),
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Analytics.name, schema: AnalyticsSchema },
    ]),
  ],
})
export class AppModule {}

// Use case example:
@Injectable()
export class OrderService {
  constructor(
    // PostgreSQL for orders (transactions critical)
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    
    // MongoDB for order analytics (flexible schema)
    @InjectModel(Analytics.name)
    private analyticsModel: Model<AnalyticsDocument>,
  ) {}
  
  async createOrder(data: CreateOrderDto) {
    // Save order in PostgreSQL
    const order = await this.orderRepository.save(data);
    
    // Track analytics in MongoDB
    await this.analyticsModel.create({
      type: 'order_created',
      orderId: order.id,
      userId: data.userId,
      amount: data.total,
      metadata: { /* flexible data */ },
      timestamp: new Date(),
    });
    
    return order;
  }
}
```

**Common Polyglot Patterns:**

```typescript
// Pattern 1: PostgreSQL for core, MongoDB for logs
// Core: Users, Orders, Payments → PostgreSQL
// Logs: Activity logs, audit trails → MongoDB

// Pattern 2: PostgreSQL for OLTP, MongoDB for OLAP
// Transactional: Order processing → PostgreSQL
// Analytics: Sales reports, dashboards → MongoDB

// Pattern 3: PostgreSQL for relational, MongoDB for documents
// Relational: User accounts, permissions → PostgreSQL
// Documents: User profiles, preferences → MongoDB
```

---

## 7. Thực hành: Xây dựng Blog API với MongoDB

### 7.1. Project Setup

```bash
# Create NestJS project
nest new blog-api-mongodb
cd blog-api-mongodb

# Install dependencies
npm install @nestjs/mongoose mongoose
npm install @nestjs/config
npm install class-validator class-transformer
npm install bcrypt
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @types/bcrypt @types/passport-jwt -D
```

**Project Structure:**

```
src/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
│   └── database.config.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── posts/
│   ├── categories/
│   ├── tags/
│   ├── comments/
│   ├── likes/
│   └── analytics/
├── app.module.ts
└── main.ts
```

**Environment Configuration:**

```bash
# .env
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/blog_db
DB_NAME=blog_db

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Pagination
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
```

**Database Config:**

```typescript
// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/blog_db',
  options: {
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    minPoolSize: 5,
  },
}));
```

### 7.2. User Management

**User Schema:**

```typescript
// src/modules/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
})
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ 
    type: String, 
    enum: ['user', 'moderator', 'admin'], 
    default: 'user' 
  })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  bio: string;

  @Prop()
  avatar: string;

  @Prop()
  phoneNumber: string;

  @Prop({ type: Object })
  address: {
    street: string;
    city: string;
    country: string;
  };

  @Prop({ type: Object })
  socialLinks: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    github?: string;
  };

  // Denormalized counts for performance
  @Prop({ default: 0 })
  postCount: number;

  @Prop({ default: 0 })
  followerCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ type: Date })
  lastLoginAt: Date;

  @Prop({ type: Date })
  emailVerifiedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual populate for posts
UserSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'authorId',
});

// Pre-save hook for password hashing
import * as bcrypt from 'bcrypt';

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method for password comparison
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
```

**User DTOs:**

```typescript
// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

// src/modules/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsObject } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsObject()
  address?: {
    street: string;
    city: string;
    country: string;
  };

  @IsOptional()
  @IsObject()
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    github?: string;
  };
}
```

**User Service:**

```typescript
// src/modules/users/users.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = await this.userModel.create(createUserDto);
      return user;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async findAll(page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find({ isActive: true })
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      
      this.userModel.countDocuments({ isActive: true }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async findByIdWithPosts(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .populate({
        path: 'posts',
        select: 'title excerpt createdAt viewCount likeCount',
        options: { limit: 10, sort: { createdAt: -1 } }
      })
      .exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: updateUserDto },
        { new: true, runValidators: true }
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async incrementPostCount(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $inc: { postCount: 1 } }
    );
  }

  async decrementPostCount(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $inc: { postCount: -1 } }
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { lastLoginAt: new Date() } }
    );
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User #${id} not found`);
    }
  }

  // Soft delete
  async deactivate(id: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<any> {
    const user = await this.findById(userId);

    return {
      posts: user.postCount,
      followers: user.followerCount,
      following: user.followingCount,
      joinedAt: user['createdAt'],
      lastLogin: user.lastLoginAt,
    };
  }
}
```

### 7.3. Posts với Categories và Tags

**Category Schema:**

```typescript
// src/modules/categories/schemas/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  postCount: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ slug: 1 });
CategorySchema.index({ isActive: 1, postCount: -1 });
```

**Tag Schema:**

```typescript
// src/modules/tags/schemas/tag.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ timestamps: true })
export class Tag {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ default: 0 })
  postCount: number;

  @Prop()
  color: string; // Hex color for UI

  @Prop({ default: true })
  isActive: boolean;
}

export const TagSchema = SchemaFactory.createForClass(Tag);

TagSchema.index({ slug: 1 });
TagSchema.index({ postCount: -1 });
```

**Post Schema:**

```typescript
// src/modules/posts/schemas/post.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ required: true })
  excerpt: string;

  @Prop({ required: true })
  content: string;

  // Featured image
  @Prop()
  featuredImage: string;

  // Author (hybrid pattern: reference + denormalized data)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  @Prop({ required: true })
  authorName: string;

  @Prop()
  authorAvatar: string;

  // Category
  @Prop({ type: Types.ObjectId, ref: 'Category', index: true })
  categoryId: Types.ObjectId;

  // Tags
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tags: Types.ObjectId[];

  // Status
  @Prop({ 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft',
    index: true
  })
  status: string;

  @Prop({ type: Date })
  publishedAt: Date;

  // Engagement metrics (denormalized for performance)
  @Prop({ default: 0, index: true })
  viewCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  commentCount: number;

  // Computed fields
  @Prop({ default: 0, index: true })
  engagementScore: number; // viewCount + likeCount*5 + commentCount*10

  @Prop({ default: 0, index: true })
  trendingScore: number; // Time-decay engagement score

  // SEO
  @Prop()
  metaTitle: string;

  @Prop()
  metaDescription: string;

  @Prop({ type: [String] })
  metaKeywords: string[];

  // Reading time (in minutes)
  @Prop()
  readingTime: number;

  // Featured post
  @Prop({ default: false, index: true })
  isFeatured: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Indexes
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ authorId: 1, status: 1, createdAt: -1 });
PostSchema.index({ categoryId: 1, status: 1, viewCount: -1 });
PostSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });

// Text index for search
PostSchema.index(
  { 
    title: 'text', 
    content: 'text',
    excerpt: 'text'
  },
  {
    weights: {
      title: 10,
      excerpt: 5,
      content: 1,
    }
  }
);

// Calculate reading time before save
PostSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / wordsPerMinute);
  }
  next();
});

// Update engagement score
PostSchema.methods.updateEngagementScore = function() {
  this.engagementScore = 
    this.viewCount * 1 + 
    this.likeCount * 5 + 
    this.commentCount * 10;
};

// Virtual populate for comments
PostSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
});
```

**Post Service:**

```typescript
// src/modules/posts/posts.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { Tag, TagDocument } from '../tags/schemas/tag.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FilterPostDto } from './dto/filter-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    // Get author info
    const author = await this.userModel.findById(userId).select('name avatar');
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // Validate category
    if (createPostDto.categoryId) {
      const category = await this.categoryModel.findById(createPostDto.categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Validate tags
    if (createPostDto.tags && createPostDto.tags.length > 0) {
      const tagCount = await this.tagModel.countDocuments({
        _id: { $in: createPostDto.tags }
      });
      if (tagCount !== createPostDto.tags.length) {
        throw new NotFoundException('One or more tags not found');
      }
    }

    // Create post with denormalized author info
    const post = await this.postModel.create({
      ...createPostDto,
      authorId: userId,
      authorName: author.name,
      authorAvatar: author.avatar,
      publishedAt: createPostDto.status === 'published' ? new Date() : null,
    });

    // Update counters
    await this.userModel.updateOne(
      { _id: userId },
      { $inc: { postCount: 1 } }
    );

    if (createPostDto.categoryId) {
      await this.categoryModel.updateOne(
        { _id: createPostDto.categoryId },
        { $inc: { postCount: 1 } }
      );
    }

    if (createPostDto.tags && createPostDto.tags.length > 0) {
      await this.tagModel.updateMany(
        { _id: { $in: createPostDto.tags } },
        { $inc: { postCount: 1 } }
      );
    }

    return post;
  }

  async findAll(filterDto: FilterPostDto): Promise<any> {
    const { page = 1, limit = 10, search, categoryId, tags, status = 'published' } = filterDto;
    const skip = (page - 1) * limit;

    // Build filters
    const filters: any = { status };

    if (search) {
      filters.$text = { $search: search };
    }

    if (categoryId) {
      filters.categoryId = categoryId;
    }

    if (tags && tags.length > 0) {
      filters.tags = { $in: tags };
    }

    // Execute query
    const [posts, total] = await Promise.all([
      this.postModel
        .find(filters)
        .select(search ? { score: { $meta: 'textScore' } } : {})
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug')
        .populate('tags', 'name slug color')
        .lean()
        .exec(),
      
      this.postModel.countDocuments(filters),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Post> {
    const post = await this.postModel
      .findById(id)
      .populate('authorId', 'name bio avatar')
      .populate('categoryId', 'name slug description')
      .populate('tags', 'name slug color')
      .populate({
        path: 'comments',
        options: { limit: 10, sort: { createdAt: -1 } }
      })
      .exec();

    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }

    // Increment view count
    await this.incrementView(id);

    return post;
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.postModel
      .findOne({ slug })
      .populate('authorId', 'name bio avatar')
      .populate('categoryId', 'name slug description')
      .populate('tags', 'name slug color')
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with slug "${slug}" not found`);
    }

    // Increment view count
    await this.incrementView(post._id.toString());

    return post;
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.postModel.findById(id);

    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }

    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    // If publishing, set publishedAt
    if (updatePostDto.status === 'published' && post.status !== 'published') {
      updatePostDto['publishedAt'] = new Date();
    }

    const updated = await this.postModel
      .findByIdAndUpdate(
        id,
        { $set: updatePostDto },
        { new: true, runValidators: true }
      )
      .exec();

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.postModel.findById(id);

    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }

    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postModel.deleteOne({ _id: id });

    // Update counters
    await this.userModel.updateOne(
      { _id: post.authorId },
      { $inc: { postCount: -1 } }
    );

    if (post.categoryId) {
      await this.categoryModel.updateOne(
        { _id: post.categoryId },
        { $inc: { postCount: -1 } }
      );
    }

    if (post.tags && post.tags.length > 0) {
      await this.tagModel.updateMany(
        { _id: { $in: post.tags } },
        { $inc: { postCount: -1 } }
      );
    }
  }

  async incrementView(postId: string): Promise<void> {
    await this.postModel.updateOne(
      { _id: postId },
      { $inc: { viewCount: 1 } }
    );
  }

  async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    return this.postModel
      .find({ status: 'published' })
      .sort({ trendingScore: -1 })
      .limit(limit)
      .populate('authorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .lean()
      .exec();
  }

  async getFeaturedPosts(limit: number = 5): Promise<Post[]> {
    return this.postModel
      .find({ status: 'published', isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('authorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .lean()
      .exec();
  }
}
```

### 7.4. Comments (Embedded)

**Comment Schema:**

```typescript
// src/modules/comments/schemas/comment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true, index: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Denormalized user info
  @Prop({ required: true })
  userName: string;

  @Prop()
  userAvatar: string;

  @Prop({ required: true, trim: true })
  content: string;

  // Nested comments (replies)
  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parentId: Types.ObjectId | null;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ type: Date })
  editedAt: Date;

  // Moderation
  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ default: false })
  isSpam: boolean;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1 });
CommentSchema.index({ isApproved: 1, isSpam: 1 });

// Virtual for replies
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
});
```

**Comment DTOs:**

```typescript
// src/modules/comments/dto/create-comment.dto.ts
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsMongoId } from 'class-validator';

export class CreateCommentDto {
  @IsMongoId()
  @IsNotEmpty()
  postId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string; // For nested replies
}

// src/modules/comments/dto/update-comment.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}
```

**Comment Service:**

```typescript
// src/modules/comments/comments.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
    // Verify post exists
    const post = await this.postModel.findById(createCommentDto.postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Get user info for denormalization
    const user = await this.userModel.findById(userId).select('name avatar');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If parent comment exists, verify it
    if (createCommentDto.parentId) {
      const parentComment = await this.commentModel.findById(createCommentDto.parentId);
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      if (parentComment.postId.toString() !== createCommentDto.postId) {
        throw new ForbiddenException('Parent comment belongs to different post');
      }
    }

    // Create comment
    const comment = await this.commentModel.create({
      ...createCommentDto,
      userId,
      userName: user.name,
      userAvatar: user.avatar,
      isApproved: true, // Auto-approve for now (can add moderation later)
    });

    // Increment post comment count
    await this.postModel.updateOne(
      { _id: createCommentDto.postId },
      { 
        $inc: { commentCount: 1 },
        $set: { 
          engagementScore: post.viewCount + post.likeCount * 5 + (post.commentCount + 1) * 10
        }
      }
    );

    return comment;
  }

  async findByPost(
    postId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    // Get top-level comments (no parent)
    const [comments, total] = await Promise.all([
      this.commentModel
        .find({ 
          postId, 
          parentId: null,
          isApproved: true,
          isSpam: false
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'replies',
          match: { isApproved: true, isSpam: false },
          options: { sort: { createdAt: 1 }, limit: 5 }
        })
        .lean()
        .exec(),
      
      this.commentModel.countDocuments({ 
        postId, 
        parentId: null,
        isApproved: true,
        isSpam: false
      }),
    ]);

    return {
      data: comments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findReplies(parentId: string): Promise<Comment[]> {
    return this.commentModel
      .find({ 
        parentId,
        isApproved: true,
        isSpam: false
      })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async update(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto
  ): Promise<Comment> {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    const updated = await this.commentModel
      .findByIdAndUpdate(
        commentId,
        {
          $set: {
            content: updateCommentDto.content,
            isEdited: true,
            editedAt: new Date(),
          }
        },
        { new: true }
      )
      .exec();

    return updated;
  }

  async remove(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete comment and all replies
    await this.commentModel.deleteMany({
      $or: [
        { _id: commentId },
        { parentId: commentId }
      ]
    });

    // Decrement post comment count
    const replyCount = await this.commentModel.countDocuments({ parentId: commentId });
    const totalDeleted = 1 + replyCount;

    await this.postModel.updateOne(
      { _id: comment.postId },
      { $inc: { commentCount: -totalDeleted } }
    );
  }

  async likeComment(commentId: string): Promise<void> {
    await this.commentModel.updateOne(
      { _id: commentId },
      { $inc: { likeCount: 1 } }
    );
  }

  async unlikeComment(commentId: string): Promise<void> {
    await this.commentModel.updateOne(
      { _id: commentId },
      { $inc: { likeCount: -1 } }
    );
  }

  // Moderation methods
  async approveComment(commentId: string): Promise<Comment> {
    return this.commentModel
      .findByIdAndUpdate(
        commentId,
        { $set: { isApproved: true } },
        { new: true }
      )
      .exec();
  }

  async markAsSpam(commentId: string): Promise<Comment> {
    return this.commentModel
      .findByIdAndUpdate(
        commentId,
        { $set: { isSpam: true, isApproved: false } },
        { new: true }
      )
      .exec();
  }

  async getPendingComments(page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.commentModel
        .find({ isApproved: false, isSpam: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('postId', 'title slug')
        .lean()
        .exec(),
      
      this.commentModel.countDocuments({ isApproved: false, isSpam: false }),
    ]);

    return {
      data: comments,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
```

**Comment Controller:**

```typescript
// src/modules/comments/comments.controller.ts
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
  Request
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() createCommentDto: CreateCommentDto) {
    return this.commentsService.create(req.user.userId, createCommentDto);
  }

  @Get('post/:postId')
  findByPost(
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentsService.findByPost(postId, page, limit);
  }

  @Get(':id/replies')
  findReplies(@Param('id') id: string) {
    return this.commentsService.findReplies(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, req.user.userId, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  like(@Param('id') id: string) {
    return this.commentsService.likeComment(id);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  unlike(@Param('id') id: string) {
    return this.commentsService.unlikeComment(id);
  }
}
```

### 7.5. Likes và Views Counting

**Like Schema:**

```typescript
// src/modules/likes/schemas/like.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true })
export class Like {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  likedAt: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Compound unique index: user can like post only once
LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
LikeSchema.index({ postId: 1, likedAt: -1 });
LikeSchema.index({ userId: 1, likedAt: -1 });
```

**Like Service:**

```typescript
// src/modules/likes/likes.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like, LikeDocument } from './schemas/like.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async likePost(userId: string, postId: string): Promise<Like> {
    // Check if post exists
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    try {
      // Create like
      const like = await this.likeModel.create({
        userId,
        postId,
      });

      // Increment post like count and update engagement score
      await this.postModel.updateOne(
        { _id: postId },
        {
          $inc: { likeCount: 1 },
          $set: {
            engagementScore: post.viewCount + (post.likeCount + 1) * 5 + post.commentCount * 10
          }
        }
      );

      return like;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('You already liked this post');
      }
      throw error;
    }
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    const result = await this.likeModel.deleteOne({
      userId,
      postId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Like not found');
    }

    // Decrement post like count
    const post = await this.postModel.findById(postId);
    if (post) {
      await this.postModel.updateOne(
        { _id: postId },
        {
          $inc: { likeCount: -1 },
          $set: {
            engagementScore: post.viewCount + (post.likeCount - 1) * 5 + post.commentCount * 10
          }
        }
      );
    }
  }

  async hasUserLikedPost(userId: string, postId: string): Promise<boolean> {
    const like = await this.likeModel.findOne({ userId, postId });
    return !!like;
  }

  async getUserLikes(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.likeModel
        .find({ userId })
        .sort({ likedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'postId',
          select: 'title slug excerpt featuredImage authorName createdAt',
        })
        .lean()
        .exec(),
      
      this.likeModel.countDocuments({ userId }),
    ]);

    return {
      data: likes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostLikes(postId: string): Promise<number> {
    return this.likeModel.countDocuments({ postId });
  }

  async getRecentLikers(postId: string, limit: number = 10): Promise<any[]> {
    return this.likeModel
      .find({ postId })
      .sort({ likedAt: -1 })
      .limit(limit)
      .populate('userId', 'name avatar')
      .lean()
      .exec();
  }
}
```

**View Tracking Service:**

```typescript
// src/modules/analytics/views.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../posts/schemas/post.schema';

@Injectable()
export class ViewsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Simple view tracking
  async trackView(postId: string, ipAddress?: string): Promise<void> {
    await this.postModel.updateOne(
      { _id: postId },
      { $inc: { viewCount: 1 } }
    );
  }

  // Advanced view tracking with deduplication
  private viewCache = new Map<string, Set<string>>();

  async trackUniqueView(postId: string, ipAddress: string): Promise<boolean> {
    // Create cache key for today
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${today}:${postId}`;

    // Get or create set of IPs that viewed this post today
    if (!this.viewCache.has(cacheKey)) {
      this.viewCache.set(cacheKey, new Set());
    }

    const viewedIPs = this.viewCache.get(cacheKey);

    // Check if this IP already viewed today
    if (viewedIPs.has(ipAddress)) {
      return false; // Already counted
    }

    // Add IP to cache
    viewedIPs.add(ipAddress);

    // Increment view count
    await this.postModel.updateOne(
      { _id: postId },
      { $inc: { viewCount: 1 } }
    );

    return true; // New view counted
  }

  // Clean old cache entries (run daily)
  cleanViewCache(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    for (const key of this.viewCache.keys()) {
      if (key.startsWith(yesterdayStr)) {
        this.viewCache.delete(key);
      }
    }
  }

  // Get trending posts (most viewed in last 24 hours)
  async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return this.postModel
      .find({
        status: 'published',
        createdAt: { $gte: oneDayAgo }
      })
      .sort({ viewCount: -1 })
      .limit(limit)
      .populate('authorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .lean()
      .exec();
  }
}
```

### 7.6. Full-text Search

**Search Service:**

```typescript
// src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../posts/schemas/post.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async searchPosts(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.postModel
        .find(
          {
            $text: { $search: query },
            status: 'published',
          },
          { score: { $meta: 'textScore' } }
        )
        .select('title excerpt slug featuredImage authorName createdAt viewCount likeCount')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      
      this.postModel.countDocuments({
        $text: { $search: query },
        status: 'published',
      }),
    ]);

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query,
      },
    };
  }

  async searchWithFilters(
    query: string,
    filters: {
      categoryId?: string;
      tags?: string[];
      authorId?: string;
      fromDate?: Date;
      toDate?: Date;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    const skip = (page - 1) * limit;

    // Build filter object
    const filterObj: any = {
      status: 'published',
    };

    if (query) {
      filterObj.$text = { $search: query };
    }

    if (filters.categoryId) {
      filterObj.categoryId = filters.categoryId;
    }

    if (filters.tags && filters.tags.length > 0) {
      filterObj.tags = { $in: filters.tags };
    }

    if (filters.authorId) {
      filterObj.authorId = filters.authorId;
    }

    if (filters.fromDate || filters.toDate) {
      filterObj.createdAt = {};
      if (filters.fromDate) {
        filterObj.createdAt.$gte = filters.fromDate;
      }
      if (filters.toDate) {
        filterObj.createdAt.$lte = filters.toDate;
      }
    }

    const projection = query ? { score: { $meta: 'textScore' } } : {};
    const sort = query ? { score: { $meta: 'textScore' } } : { createdAt: -1 };

    const [results, total] = await Promise.all([
      this.postModel
        .find(filterObj, projection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug')
        .populate('tags', 'name slug color')
        .lean()
        .exec(),
      
      this.postModel.countDocuments(filterObj),
    ]);

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query,
        filters,
      },
    };
  }

  async searchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    const results = await this.postModel
      .find(
        {
          $text: { $search: query },
          status: 'published',
        },
        { score: { $meta: 'textScore' } }
      )
      .select('title')
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean()
      .exec();

    return results.map(r => r.title);
  }

  // Autocomplete using regex (for prefix matching)
  async autocomplete(prefix: string, limit: number = 5): Promise<string[]> {
    const results = await this.postModel
      .find({
        title: { $regex: `^${prefix}`, $options: 'i' },
        status: 'published',
      })
      .select('title')
      .limit(limit)
      .lean()
      .exec();

    return results.map(r => r.title);
  }
}
```

**Search Controller:**

```typescript
// src/modules/search/search.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.searchPosts(query, page, limit);
  }

  @Get('advanced')
  advancedSearch(
    @Query('q') query: string,
    @Query('categoryId') categoryId?: string,
    @Query('tags') tags?: string,
    @Query('authorId') authorId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const filters: any = {};

    if (categoryId) filters.categoryId = categoryId;
    if (tags) filters.tags = tags.split(',');
    if (authorId) filters.authorId = authorId;
    if (fromDate) filters.fromDate = new Date(fromDate);
    if (toDate) filters.toDate = new Date(toDate);

    return this.searchService.searchWithFilters(query, filters, page, limit);
  }

  @Get('suggestions')
  suggestions(@Query('q') query: string) {
    return this.searchService.searchSuggestions(query);
  }

  @Get('autocomplete')
  autocomplete(@Query('q') prefix: string) {
    return this.searchService.autocomplete(prefix);
  }
}
```

### 7.7. Analytics với Aggregation

**Analytics Service:**

```typescript
// src/modules/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Comment, CommentDocument } from '../comments/schemas/comment.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {}

  // Overall statistics
  async getOverallStats(): Promise<any> {
    const [
      totalPosts,
      publishedPosts,
      totalUsers,
      totalComments,
      totalViews,
      totalLikes,
    ] = await Promise.all([
      this.postModel.countDocuments(),
      this.postModel.countDocuments({ status: 'published' }),
      this.userModel.countDocuments({ isActive: true }),
      this.commentModel.countDocuments({ isApproved: true }),
      this.postModel.aggregate([
        { $group: { _id: null, total: { $sum: '$viewCount' } } }
      ]).then(r => r[0]?.total || 0),
      this.postModel.aggregate([
        { $group: { _id: null, total: { $sum: '$likeCount' } } }
      ]).then(r => r[0]?.total || 0),
    ]);

    return {
      posts: {
        total: totalPosts,
        published: publishedPosts,
        draft: totalPosts - publishedPosts,
      },
      users: totalUsers,
      comments: totalComments,
      engagement: {
        totalViews,
        totalLikes,
        avgViewsPerPost: Math.round(totalViews / (publishedPosts || 1)),
        avgLikesPerPost: Math.round(totalLikes / (publishedPosts || 1)),
      },
    };
  }

  // Posts by category
  async getPostsByCategory(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalLikes: { $sum: '$likeCount' },
          totalComments: { $sum: '$commentCount' },
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: '$category.name',
          count: 1,
          totalViews: 1,
          totalLikes: 1,
          totalComments: 1,
          avgViewsPerPost: { 
            $round: [{ $divide: ['$totalViews', '$count'] }, 0] 
          },
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  // Top authors
  async getTopAuthors(limit: number = 10): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $group: {
          _id: '$authorId',
          postCount: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalLikes: { $sum: '$likeCount' },
          totalComments: { $sum: '$commentCount' },
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $addFields: {
          engagementScore: {
            $add: [
              '$totalViews',
              { $multiply: ['$totalLikes', 5] },
              { $multiply: ['$totalComments', 10] }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          authorId: '$_id',
          authorName: '$author.name',
          authorAvatar: '$author.avatar',
          postCount: 1,
          totalViews: 1,
          totalLikes: 1,
          totalComments: 1,
          engagementScore: 1,
          avgViewsPerPost: { 
            $round: [{ $divide: ['$totalViews', '$postCount'] }, 0] 
          },
        }
      },
      { $sort: { engagementScore: -1 } },
      { $limit: limit }
    ]);
  }

  // Monthly growth
  async getMonthlyGrowth(year: number): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: {
          status: 'published',
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          postCount: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalLikes: { $sum: '$likeCount' },
          totalComments: { $sum: '$commentCount' },
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          postCount: 1,
          totalViews: 1,
          totalLikes: 1,
          totalComments: 1,
        }
      }
    ]);
  }

  // Tag popularity
  async getTagPopularity(limit: number = 20): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
        }
      },
      {
        $lookup: {
          from: 'tags',
          localField: '_id',
          foreignField: '_id',
          as: 'tag'
        }
      },
      { $unwind: '$tag' },
      {
        $project: {
          _id: 0,
          tagId: '$_id',
          tagName: '$tag.name',
          tagSlug: '$tag.slug',
          tagColor: '$tag.color',
          count: 1,
          totalViews: 1,
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);
  }

  // User engagement over time
  async getUserEngagement(userId: string): Promise<any> {
    const [posts, likes, comments] = await Promise.all([
      this.postModel.aggregate([
        {
          $match: { authorId: userId, status: 'published' }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: '$createdAt' }
            },
            count: { $sum: 1 },
            views: { $sum: '$viewCount' },
            likes: { $sum: '$likeCount' },
          }
        },
        { $sort: { _id: 1 } }
      ]),

      this.postModel.aggregate([
        {
          $match: { authorId: userId, status: 'published' }
        },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: '$likeCount' },
          }
        }
      ]),

      this.commentModel.countDocuments({ userId }),
    ]);

    return {
      monthlyActivity: posts,
      totalLikesReceived: likes[0]?.totalLikes || 0,
      totalCommentsMade: comments,
    };
  }

  // Reading time distribution
  async getReadingTimeDistribution(): Promise<any[]> {
    return this.postModel.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $bucket: {
          groupBy: '$readingTime',
          boundaries: [0, 3, 5, 10, 15, 20, 30],
          default: '30+',
          output: {
            count: { $sum: 1 },
            avgViews: { $avg: '$viewCount' },
          }
        }
      }
    ]);
  }

  // Top performing posts
  async getTopPosts(
    metric: 'views' | 'likes' | 'comments' | 'engagement' = 'engagement',
    limit: number = 10,
    days?: number
  ): Promise<Post[]> {
    const match: any = { status: 'published' };

    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      match.createdAt = { $gte: date };
    }

    const sortField = {
      views: 'viewCount',
      likes: 'likeCount',
      comments: 'commentCount',
      engagement: 'engagementScore',
    }[metric];

    return this.postModel
      .find(match)
      .select('title slug excerpt featuredImage authorName viewCount likeCount commentCount engagementScore createdAt')
      .sort({ [sortField]: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
```

**Analytics Controller:**

```typescript
// src/modules/analytics/analytics.controller.ts
import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles('admin', 'moderator')
  getOverallStats() {
    return this.analyticsService.getOverallStats();
  }

  @Get('categories')
  @Roles('admin', 'moderator')
  getPostsByCategory() {
    return this.analyticsService.getPostsByCategory();
  }

  @Get('authors/top')
  @Roles('admin', 'moderator')
  getTopAuthors(@Query('limit') limit?: number) {
    return this.analyticsService.getTopAuthors(limit);
  }

  @Get('growth/monthly')
  @Roles('admin', 'moderator')
  getMonthlyGrowth(@Query('year') year: number = new Date().getFullYear()) {
    return this.analyticsService.getMonthlyGrowth(year);
  }

  @Get('tags/popular')
  getTagPopularity(@Query('limit') limit?: number) {
    return this.analyticsService.getTagPopularity(limit);
  }

  @Get('users/:userId/engagement')
  getUserEngagement(@Param('userId') userId: string) {
    return this.analyticsService.getUserEngagement(userId);
  }

  @Get('posts/top')
  getTopPosts(
    @Query('metric') metric?: 'views' | 'likes' | 'comments' | 'engagement',
    @Query('limit') limit?: number,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getTopPosts(metric, limit, days);
  }

  @Get('reading-time')
  @Roles('admin', 'moderator')
  getReadingTimeDistribution() {
    return this.analyticsService.getReadingTimeDistribution();
  }
}
```


