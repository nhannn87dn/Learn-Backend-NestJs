# Prompt: NestJS RESTful API Starter Project

Bạn là senior backend developer chuyên về NestJS. Hãy tạo cho tôi một project RESTful API starter hoàn chỉnh với NestJS, PostgreSQL và Redis cache với các yêu cầu sau:

## 1. KIẾN TRÚC & CẤU TRÚC DỰ ÁN

### Cấu trúc thư mục:
```
src/
├── common/
│   ├── constants/          # Constants, enums
│   ├── decorators/         # Custom decorators
│   ├── dto/                # Base DTOs
│   ├── entities/           # Base entities
│   ├── exceptions/         # Custom exceptions
│   ├── filters/            # Exception filters
│   ├── guards/             # Guards
│   ├── interceptors/       # Interceptors
│   ├── interfaces/         # Common interfaces
│   ├── middleware/         # Middleware
│   ├── pipes/              # Validation pipes
│   └── utils/              # Helper functions
├── config/                 # Configuration files
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── redis.config.ts
│   ├── multer.config.ts
│   └── app.config.ts
├── database/
│   ├── data-source.ts      # TypeORM DataSource for CLI
│   ├── migrations/         # Database migrations
│   └── seeds/              # Database seeders
│       ├── interfaces/
│       ├── environments/
│       ├── base.seeder.ts
│       ├── 1-roles.seeder.ts
│       ├── 2-permissions.seeder.ts
│       ├── 3-role-permissions.seeder.ts
│       ├── 4-users.seeder.ts
│       └── run-seed.ts
├── modules/
│   ├── auth/               # Authentication module
│   ├── users/              # Users module
│   ├── roles/              # Roles module
│   ├── permissions/        # Permissions module
│   ├── files/              # File management module
│   ├── upload/             # Upload module with multer
│   ├── streaming/          # File streaming module
│   └── health/             # Health check module
├── redis/                  # Redis module
├── app.module.ts
└── main.ts
```

### Yêu cầu kiến trúc:
- Modular architecture (mỗi feature là một module riêng)
- Separation of concerns (controller, service, repository)
- Dependency injection
- Base classes cho entities, DTOs, repositories
- Dễ dàng thêm module mới

## 2. XÁC THỰC & PHÂN QUYỀN (RBAC)

### JWT Authentication:
- **AccessToken**: 
  - Lưu trong httpOnly cookie
  - Thời gian sống: 15 phút
  - Payload: userId, email, jti, type, iat, exp
  
- **RefreshToken**: 
  - Trả về trong response body JSON
  - Thời gian sống: 7 ngày
  - Token rotation (mỗi lần refresh tạo token mới)
  - Lưu hash trong PostgreSQL với device info

### Bảo mật Token:
- Blacklist tokens trong Redis khi logout/revoke
- Device fingerprint tracking (user-agent + IP)
- Phát hiện token bị đánh cắp (verify device fingerprint)
- Thu hồi tất cả tokens của user khi phát hiện bất thường
- Kiểm tra token revocation timestamp trong Redis

### RBAC System:
- **Database schema**: Users → Roles → Permissions (many-to-many)
- **Permission format**: `resource:action` (vd: `users:create`, `posts:delete`)
- **Guards**: JwtAuthGuard, RolesGuard, PermissionsGuard
- **Decorators**: @Public(), @RequireRoles(), @RequirePermissions(), @CurrentUser()
- **Redis cache**: Cache user permissions (TTL: 1 giờ)

### Passport JWT:
- JwtStrategy cho access token (extract từ cookie)
- JwtRefreshStrategy cho refresh token (extract từ body)
- Validate token, check blacklist, verify device

## 3. CHUẨN HÓA RESPONSE

### Success Response Structure:
```typescript
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": { ... },           // hoặc [...] cho danh sách
  "meta": {                  // optional, cho pagination
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  },
  "timestamp": "2025-01-06T10:30:00.000Z"
}
```

### Error Response Structure:
```typescript
{
  "success": false,
  "statusCode": 400,
  "errorCode": "USER_001",   // Mã lỗi chuẩn hóa
  "message": "User message",
  "details": "Technical details for debugging",
  "errors": [                // optional, cho validation errors
    {
      "field": "email",
      "message": "Email is invalid"
    }
  ],
  "timestamp": "2025-01-06T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST"
}
```

### Yêu cầu:
- Tạo `ResponseInterceptor` để transform tất cả success response
- Tạo `HttpExceptionFilter` để transform tất cả error response
- Apply global trong `main.ts`

## 4. EXCEPTION HANDLING

### Custom Exceptions:
Tạo các custom exception classes kế thừa từ HttpException:
- `BusinessException` - Lỗi nghiệp vụ (400)
- `UnauthorizedException` - Lỗi xác thực (401)
- `ForbiddenException` - Lỗi phân quyền (403)
- `NotFoundException` - Không tìm thấy (404)
- `ConflictException` - Xung đột dữ liệu (409)
- `ValidationException` - Lỗi validate (422)
- `InternalServerException` - Lỗi server (500)

### Exception Filter:
- Bắt tất cả exceptions (HttpException, TypeORM errors, Validation errors, Unknown errors)
- Log errors với context (user, request info)
- Transform theo chuẩn error response
- Ẩn sensitive info trong production
- Map TypeORM errors sang business errors

### Error Logging:
- Log level phù hợp (error, warn, info, debug)
- Include request ID để trace
- Stack trace trong development mode

## 5. CHUẨN HÓA MÃ LỖI & MESSAGE

### Error Code Convention:
```typescript
// common/constants/error-codes.constant.ts
export const ERROR_CODES = {
  // Authentication & Authorization (AUTH_xxx)
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Token expired',
  AUTH_003: 'Token invalid',
  AUTH_004: 'Token revoked',
  AUTH_005: 'Insufficient permissions',
  AUTH_006: 'Account inactive',
  AUTH_007: 'Token theft detected',
  
  // User Management (USER_xxx)
  USER_001: 'User not found',
  USER_002: 'Email already exists',
  USER_003: 'Invalid email format',
  USER_004: 'Weak password',
  
  // Validation (VAL_xxx)
  VAL_001: 'Required field missing',
  VAL_002: 'Invalid data format',
  VAL_003: 'Data out of range',
  
  // Database (DB_xxx)
  DB_001: 'Database connection failed',
  DB_002: 'Query execution failed',
  DB_003: 'Constraint violation',
  
  // System (SYS_xxx)
  SYS_001: 'Internal server error',
  SYS_002: 'Service unavailable',
  SYS_003: 'Rate limit exceeded',
};
```

### Message Internationalization:
- Support đa ngôn ngữ (en, vi)
- Error messages rõ ràng, actionable
- User-friendly messages cho client
- Technical details cho development

## 6. HELPERS & UTILITIES

### Common Helpers:
```typescript
// common/utils/
- hash.util.ts          // Argon2 hashing
- crypto.util.ts        // Encryption, random tokens
- date.util.ts          // Date manipulation
- string.util.ts        // String helpers
- validation.util.ts    // Custom validators
- pagination.util.ts    // Pagination helpers
- transformer.util.ts   // Data transformation
```

### Common Decorators:
```typescript
// common/decorators/
- public.decorator.ts           // @Public()
- roles.decorator.ts            // @RequireRoles()
- permissions.decorator.ts      // @RequirePermissions()
- current-user.decorator.ts     // @CurrentUser()
- api-response.decorator.ts     // @ApiSuccessResponse()
- pagination.decorator.ts       // @Paginate()
```

### Common Pipes:
```typescript
// common/pipes/
- parse-uuid.pipe.ts        // UUID validation
- trim.pipe.ts              // Trim strings
- lowercase.pipe.ts         // Lowercase transformation
```

### Common Interfaces:
```typescript
// common/interfaces/
- base-response.interface.ts
- pagination.interface.ts
- jwt-payload.interface.ts
- request-with-user.interface.ts
```

## 7. DATABASE & REDIS

### TypeORM Setup:
- Entities với base class (id, createdAt, updatedAt)
- Repositories với base methods (findOneOrFail, softDelete, etc.)
- Migrations
- Seeders cho initial data (roles, permissions, admin user)
- Database naming conventions (snake_case)

### Redis Setup:
- Token blacklist (prefix: `blacklist:access:`, `blacklist:refresh:`)
- User permissions cache (prefix: `user:permissions:`)
- User revocation timestamps (prefix: `revoke:user:`)
- Device fingerprints (prefix: `device:`)
- Session data nếu cần
- TTL tự động cho mỗi loại data

## 8. CONFIGURATION

### Environment Variables:
```bash
# .env file
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nestjs_starter

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Config Module:
- Separate config files cho từng service (database.config.ts, jwt.config.ts, redis.config.ts)
- Validation cho env variables
- Type-safe configuration

## 9. VALIDATION

### Class Validator:
- DTOs với class-validator decorators
- Custom validators nếu cần
- Transform options (whitelist, forbidNonWhitelisted)
- Global validation pipe

### Example DTO:
```typescript
export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and number'
  })
  password: string;
}
```

## 10. LOGGING

### Winston Logger:
- Console transport cho development
- File transport cho production
- Log rotation
- Request ID trong mỗi log
- Structured logging (JSON format)

## 11. HEALTH CHECK

### Health Module:
- `/health` endpoint
- Check database connection
- Check Redis connection
- Memory usage
- Uptime

## 12. SECURITY

### Helmet:
- Security headers
- CORS configuration
- Rate limiting
- Request size limits

### Additional:
- SQL injection prevention (TypeORM parametrized queries)
- XSS prevention (httpOnly cookies, sanitization)
- CSRF protection nếu cần

## 13. FILE UPLOAD & STORAGE

### Multer Configuration:
```typescript
// common/config/multer.config.ts
- Flexible storage configuration (local, S3, etc.)
- Dynamic destination paths per controller
- File size limits per route
- Allowed file extensions validation
- File type validation (MIME type)
- Filename sanitization
- Unique filename generation
```

### Upload Decorator & Interceptor:
```typescript
// common/decorators/upload-file.decorator.ts
@UploadFile({
  destination: 'uploads/avatars',
  allowedExtensions: ['.jpg', '.png', '.jpeg'],
  maxSize: 5 * 1024 * 1024, // 5MB
  required: true
})

@UploadFiles({
  destination: 'uploads/documents',
  allowedExtensions: ['.pdf', '.doc', '.docx'],
  maxSize: 10 * 1024 * 1024, // 10MB
  maxCount: 5
})
```

### File Validation Pipe:
```typescript
// common/pipes/file-validation.pipe.ts
- Validate file extension
- Validate file size
- Validate MIME type
- Custom validation rules
- Detailed error messages với error codes:
  FILE_001: Invalid file extension
  FILE_002: File size exceeds limit
  FILE_003: Invalid file type
  FILE_004: Too many files
  FILE_005: File upload failed
```

### File Storage Structure:
```
uploads/
├── avatars/           # User avatars
├── documents/         # PDF, DOC files
├── images/            # General images
├── videos/            # Video files
└── temp/              # Temporary uploads
```

### Upload Module Features:
- Single file upload
- Multiple files upload
- File metadata storage (database)
- File validation
- Automatic cleanup old files
- Virus scanning integration ready
- Image processing (resize, compress) với sharp

### Example Usage:
```typescript
@Post('avatar')
@UseInterceptors(FileInterceptor('file'))
@UploadFile({
  destination: 'uploads/avatars',
  allowedExtensions: ['.jpg', '.png'],
  maxSize: 2 * 1024 * 1024
})
async uploadAvatar(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser('userId') userId: string
) {
  return this.usersService.updateAvatar(userId, file);
}

@Post('documents')
@UseInterceptors(FilesInterceptor('files', 5))
@UploadFiles({
  destination: 'uploads/documents',
  allowedExtensions: ['.pdf', '.doc', '.docx'],
  maxSize: 10 * 1024 * 1024
})
async uploadDocuments(
  @UploadedFiles() files: Express.Multer.File[]
) {
  return this.documentsService.createMany(files);
}
```

### File Entity:
```typescript
@Entity('files')
export class File extends BaseEntity {
  @Column()
  originalName: string;

  @Column()
  filename: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  @Column()
  path: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User)
  user: User;
}
```

## 14. FILE STREAMING

### Streaming Module:
```typescript
// modules/streaming/streaming.module.ts
- Stream large files without loading into memory
- Support range requests (video streaming, resume downloads)
- Video streaming với adaptive bitrate
- Audio streaming
- PDF preview streaming
- Download with progress tracking
```

### Streaming Controller:
```typescript
@Controller('stream')
export class StreamingController {
  // Stream file with range support
  @Get('file/:id')
  async streamFile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    // Handle range requests
    // Set proper headers
    // Stream file chunks
  }

  // Stream video
  @Get('video/:id')
  async streamVideo(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    // Support HLS/DASH streaming
    // Handle quality selection
    // Resume capability
  }

  // Download file
  @Get('download/:id')
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    // Force download
    // Track download analytics
  }
}
```

### Streaming Service Features:
- ReadStream implementation
- Chunk size optimization
- Memory efficient streaming
- Error handling during stream
- Stream progress tracking
- Concurrent streams limit
- Cache headers setup
- CORS for streaming

### Example Implementation:
```typescript
async streamFile(fileId: string, range: string, res: Response) {
  const file = await this.filesRepository.findOne({ where: { id: fileId } });
  
  if (!file) {
    throw new NotFoundException('File not found');
  }

  const filePath = path.join(process.cwd(), file.path);
  const stat = await fs.promises.stat(filePath);
  const fileSize = stat.size;

  if (range) {
    // Parse range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.status(206); // Partial Content
    res.set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': file.mimetype,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    res.set({
      'Content-Length': fileSize,
      'Content-Type': file.mimetype,
      'Accept-Ranges': 'bytes',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
```

### Video Streaming Features:
- Support MP4, WebM, AVI formats
- Adaptive bitrate streaming
- Thumbnail generation
- Video metadata extraction
- Multiple quality options
- Seek support

## 15. DATABASE MIGRATIONS & SEEDING

### TypeORM Migration Configuration:

#### DataSource Configuration:
```typescript
// src/database/data-source.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nestjs_starter',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false, // NEVER true in production
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: false,
  migrationsTableName: 'migrations',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
```

#### Package.json Scripts:
```json
{
  "scripts": {
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli",
    "migration:generate": "npm run typeorm -- migration:generate -d src/database/data-source.ts",
    "migration:create": "npm run typeorm -- migration:create",
    "migration:run": "npm run typeorm -- migration:run -d src/database/data-source.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d src/database/data-source.ts",
    "migration:show": "npm run typeorm -- migration:show -d src/database/data-source.ts",
    "seed": "ts-node -r tsconfig-paths/register src/database/seeds/run-seed.ts",
    "seed:dev": "npm run migration:run && npm run seed",
    "db:reset": "npm run migration:revert && npm run migration:run && npm run seed"
  }
}
```

### Migration Structure:
```typescript
// src/database/migrations/1234567890123-CreateUsersTable.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1234567890123 implements MigrationInterface {
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
            default: 'gen_random_uuid()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_EMAIL',
        columnNames: ['email'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### Seeding System:

#### Seed Interface:
```typescript
// src/database/seeds/interfaces/seeder.interface.ts
export interface Seeder {
  seed(): Promise<void>;
}
```

#### Base Seeder:
```typescript
// src/database/seeds/base.seeder.ts
import { DataSource } from 'typeorm';

export abstract class BaseSeeder {
  constructor(protected dataSource: DataSource) {}

  abstract run(): Promise<void>;

  protected async transaction(callback: Function): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await callback(queryRunner);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

#### Specific Seeders:
```typescript
// src/database/seeds/1-roles.seeder.ts
export class RolesSeeder extends BaseSeeder {
  async run(): Promise<void> {
    await this.transaction(async (queryRunner) => {
      const roles = [
        { name: 'admin', description: 'Administrator' },
        { name: 'user', description: 'Regular User' },
      ];

      for (const role of roles) {
        await queryRunner.query(
          `INSERT INTO roles (name, description) 
           VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
          [role.name, role.description],
        );
      }
    });
  }
}

// src/database/seeds/2-permissions.seeder.ts
export class PermissionsSeeder extends BaseSeeder {
  async run(): Promise<void> {
    await this.transaction(async (queryRunner) => {
      const permissions = [
        { name: 'users:read', resource: 'users', action: 'read' },
        { name: 'users:write', resource: 'users', action: 'write' },
        // ... more permissions
      ];

      for (const perm of permissions) {
        await queryRunner.query(
          `INSERT INTO permissions (name, resource, action) 
           VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
          [perm.name, perm.resource, perm.action],
        );
      }
    });
  }
}

// src/database/seeds/3-role-permissions.seeder.ts
export class RolePermissionsSeeder extends BaseSeeder {
  async run(): Promise<void> {
    await this.transaction(async (queryRunner) => {
      // Map permissions to roles
      const mappings = {
        admin: ['users:read', 'users:write', 'posts:read', 'posts:write'],
        user: ['posts:read'],
      };

      for (const [roleName, permissions] of Object.entries(mappings)) {
        const role = await queryRunner.query(
          'SELECT id FROM roles WHERE name = $1',
          [roleName],
        );

        for (const permName of permissions) {
          const perm = await queryRunner.query(
            'SELECT id FROM permissions WHERE name = $1',
            [permName],
          );

          if (role[0] && perm[0]) {
            await queryRunner.query(
              `INSERT INTO role_permissions (role_id, permission_id) 
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [role[0].id, perm[0].id],
            );
          }
        }
      }
    });
  }
}

// src/database/seeds/4-users.seeder.ts
export class UsersSeeder extends BaseSeeder {
  async run(): Promise<void> {
    await this.transaction(async (queryRunner) => {
      const password = await argon2.hash('Admin@123');
      
      const result = await queryRunner.query(
        `INSERT INTO users (email, password_hash, is_active) 
         VALUES ($1, $2, true) 
         ON CONFLICT (email) DO UPDATE SET password_hash = $2
         RETURNING id`,
        ['admin@example.com', password],
      );

      // Assign admin role
      const adminRole = await queryRunner.query(
        'SELECT id FROM roles WHERE name = $1',
        ['admin'],
      );

      if (result[0] && adminRole[0]) {
        await queryRunner.query(
          `INSERT INTO user_roles (user_id, role_id) 
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [result[0].id, adminRole[0].id],
        );
      }
    });
  }
}
```

#### Seed Runner:
```typescript
// src/database/seeds/run-seed.ts
import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { RolesSeeder } from './1-roles.seeder';
import { PermissionsSeeder } from './2-permissions.seeder';
import { RolePermissionsSeeder } from './3-role-permissions.seeder';
import { UsersSeeder } from './4-users.seeder';

async function runSeeders() {
  try {
    await dataSource.initialize();
    console.log('✅ Data Source initialized');

    const seeders = [
      new RolesSeeder(dataSource),
      new PermissionsSeeder(dataSource),
      new RolePermissionsSeeder(dataSource),
      new UsersSeeder(dataSource),
    ];

    for (const seeder of seeders) {
      console.log(`🌱 Running ${seeder.constructor.name}...`);
      await seeder.run();
      console.log(`✅ ${seeder.constructor.name} completed`);
    }

    console.log('🎉 All seeders completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeders();
```

### Migration Best Practices:
- One migration per feature/change
- Always provide up AND down methods
- Use transactions for data migrations
- Add indexes for foreign keys
- Use meaningful names (timestamp-DescriptiveName)
- Test rollback functionality
- Never modify existing migrations
- Document complex migrations

### Environment-specific Seeds:
```typescript
// src/database/seeds/environments/development.seeds.ts
export class DevelopmentSeeds extends BaseSeeder {
  async run(): Promise<void> {
    // Development-only data
    // Test users, sample posts, etc.
  }
}

// src/database/seeds/environments/production.seeds.ts
export class ProductionSeeds extends BaseSeeder {
  async run(): Promise<void> {
    // Production-only data
    // Essential roles, permissions, admin user
  }
}
```

## 16. DOCUMENTATION

### Comments:
- JSDoc cho public methods
- Inline comments cho complex logic
- README.md với:
  - Project setup instructions
  - API endpoints documentation
  - Environment variables
  - Database schema
  - Migration & Seeding guide
  - File upload configuration
  - Architecture decisions

### Swagger (Optional):
- API documentation với @nestjs/swagger
- DTO decorators cho schema
- Example responses
- File upload endpoints documentation

## 17. TESTING (Bonus)

### Unit Tests:
- Services với mocked dependencies
- Test coverage cho business logic

### E2E Tests:
- Authentication flow
- RBAC scenarios
- Error handling

## YÊU CẦU ĐẶC BIỆT

1. **Code quality**: Clean code, SOLID principles, DRY
2. **Type safety**: Strict TypeScript, avoid `any`
3. **Error handling**: Comprehensive error handling ở mọi layer
4. **Performance**: Optimize queries, use indexes, cache khi cần
5. **Scalability**: Dễ dàng thêm module, feature mới
6. **Security**: Follow OWASP best practices
7. **Maintainability**: Consistent naming, clear structure

## OUTPUT YÊU CẦU

Hãy cung cấp:
1. Cấu trúc thư mục đầy đủ
2. Code cho tất cả các module, service, controller
3. Base classes, utilities, helpers
4. Exception filters, interceptors
5. Configuration files
6. **File Upload Module**:
   - Multer configuration với custom validation
   - Upload decorators và interceptors
   - File validation pipes
   - File storage service
   - Example controllers với upload
7. **Streaming Module**:
   - Streaming service với range support
   - Video/audio streaming
   - Download handlers
   - Example controllers
8. **Database Migration & Seeding**:
   - DataSource configuration
   - Migration templates
   - Seeder system với base classes
   - Run scripts
   - Package.json scripts đầy đủ
9. Database schema & migrations
10. Seed data scripts (roles, permissions, admin user)
11. Environment variables example
12. README.md với:
    - Setup instructions
    - Migration commands
    - Seeding guide
    - Upload configuration
    - Streaming usage
13. Package.json với scripts cần thiết:
    - Migration: generate, create, run, revert, show
    - Seeding: seed, seed:dev, db:reset
    - Development: start:dev, start:debug
    - Build & production: build, start:prod

Tất cả code phải production-ready, có error handling đầy đủ, follow best practices, và có comments giải thích rõ ràng.