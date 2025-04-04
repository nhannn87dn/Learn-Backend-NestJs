

// src/seed/seed.module.ts
import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PermissionsModule, RolesModule, UsersModule],
  providers: [SeedService],
})
export class SeedModule {}

// Cập nhật app.module.ts để thêm SeedModule
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'auth_rbac_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Không dùng trong môi trường production
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SeedModule,
  ],
})
export class AppModule {}

// ---------- BƯỚC 9: TẠO THÊM CÁC DECORATOR VÀ UTILS HỖ TRỢ ----------
// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// src/common/utils/permission.util.ts
// Hàm tiện ích để kiểm tra quyền
export const hasPermission = (user: any, requiredPermission: string): boolean => {
  return user && user.permissions && user.permissions.includes(requiredPermission);
};

// ---------- BƯỚC 10: THÊM REST API VỚI ĐẦY ĐỦ KIỂM TRA PHÂN QUYỀN ----------
// Ví dụ về một module khác sử dụng hệ thống phân quyền
// src/posts/entities/post.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  published: boolean;

  @ManyToOne(() => User)
  @JoinColumn()
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// src/posts/dto/create-post.dto.ts
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

// src/posts/dto/update-post.dto.ts
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

// src/posts/posts.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { User } from '../users/entities/user.entity';
import { hasPermission } from '../common/utils/permission.util';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async create(createPostDto: CreatePostDto, currentUser: User): Promise<Post> {
    const post = this.postsRepository.create({
      ...createPostDto,
      author: currentUser,
    });
    
    return this.postsRepository.save(post);
  }

  async findAll(): Promise<Post[]> {
    return this.postsRepository.find({
      relations: ['author'],
    });
  }

  async findPublished(): Promise<Post[]> {
    return this.postsRepository.find({
      where: { published: true },
      relations: ['author'],
    });
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['author'],
    });
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto, currentUser: User): Promise<Post> {
    const post = await this.findOne(id);
    
    // Kiểm tra quyền: người dùng phải là tác giả hoặc có quyền update:any_post
    if (post.author.id !== currentUser.id && !hasPermission(currentUser, 'update:any_post')) {
      throw new ForbiddenException('You do not have permission to update this post');
    }
    
    const updatedPost = { ...post, ...updatePostDto };
    return this.postsRepository.save(updatedPost);
  }

  async remove(id: number, currentUser: User): Promise<void> {
    const post = await this.findOne(id);
    
    // Kiểm tra quyền: người dùng phải là tác giả hoặc có quyền delete:any_post
    if (post.author.id !== currentUser.id && !hasPermission(currentUser, 'delete:any_post')) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }
    
    await this.postsRepository.remove(post);
  }
}

// src/posts/posts.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('create:posts')
  create(@Body() createPostDto: CreatePostDto, @CurrentUser() user) {
    return this.postsService.create(createPostDto, user);
  }

  @Get()
  async findAll(@Query('published') published: boolean, @CurrentUser() user) {
    if (published === true) {
      return this.postsService.findPublished();
    }
    
    // Nếu muốn xem tất cả bài viết (kể cả chưa publish), phải có quyền
    if (user && hasPermission(user, 'read:all_posts')) {
      return this.postsService.findAll();
    }
    
    // Mặc định chỉ xem được bài đã publish
    return this.postsService.findPublished();
  }

  @Get(':id')
  async findOne(@Param('id') id: number, @CurrentUser() user) {
    const post = await this.postsService.findOne(id);
    
    // Kiểm tra quyền: nếu bài viết chưa publish, chỉ tác giả hoặc admin mới xem được
    if (!post.published && (!user || (post.author.id !== user.id && !hasPermission(user, 'read:all_posts')))) {
      throw new ForbiddenException('You do not have permission to view this post');
    }
    
    return post;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: number,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user,
  ) {
    return this.postsService.update(id, updatePostDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: number, @CurrentUser() user) {
    return this.postsService.remove(id, user);
  }
}

// src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}

// Cập nhật app.module.ts để thêm PostsModule
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SeedModule } from './seed/seed.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'auth_rbac_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Không dùng trong môi trường production
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SeedModule,
    PostsModule,
  ],
})
export class AppModule {}

// ---------- BƯỚC 11: CẢI THIỆN BẢO MẬT ----------
// src/config/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
  ],
})
export class ConfigModule {}

// Tạo file .env.development
// JWT_SECRET=your_secure_jwt_secret_key
// DB_HOST=localhost
// DB_PORT=5432
// DB_USERNAME=postgres
// DB_PASSWORD=password
// DB_DATABASE=auth_rbac_db

// Cập nhật app.module.ts để sử dụng cấu hình từ env
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SeedModule } from './seed/seed.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production', // Chỉ bật synchronize trong development
      }),
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SeedModule,
    PostsModule,
  ],
})
export class AppModule {}

// Cập nhật auth.module.ts để sử dụng JWT_SECRET từ env
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

// Cập nhật jwt.strategy.ts để sử dụng JWT_SECRET từ env
// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}

// ---------- BƯỚC 12: THÊM REFRESH TOKEN ----------
// src/auth/entities/refresh-token.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string;

  @Column()
  expiresAt: Date;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  revoked: boolean;
}

// src/auth/dto/refresh-token.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

// Cập nhật auth.service.ts để hỗ trợ refresh token
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    
    if (user && await user.validatePassword(password)) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;
    const user = await this.validateUser(username, password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const tokens = await this.generateTokens(user);
    
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions.map(p => p.name),
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, revoked: false },
      relations: ['user', 'user.role', 'user.role.permissions'],
    });
    
    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    if (new Date() > token.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }
    
    const user = token.user;
    
    // Revoke the old refresh token
    await this.refreshTokenRepository.update(token.id, { revoked: true });
    
    // Generate new tokens
    const tokens = await this.generateTokens(user);
    
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async logout(userId: number, refreshToken: string) {
    await this.refreshTokenRepository.update(
      { user: { id: userId }, token: refreshToken, revoked: false },
      { revoked: true }
    );
    
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role.name,
      permissions: user.role.permissions.map(p => p.name),
    };
    
    const accessToken = this.jwtService.sign(payload);
    
    // Create refresh token (valid for 7 days)
    const refreshToken = await bcrypt.hash(user.id + Date.now().toString(), 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await this.refreshTokenRepository.save({
      token: refreshToken,
      expiresAt,
      user: { id: user.id },
      revoked: false,
    });
    
    return {
      accessToken,
      refreshToken,
    };
  }
}

// Cập nhật auth.module.ts để import RefreshToken entity
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' }, // Giảm thời gian sống của access token
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

// Cập nhật auth.controller.ts để thêm endpoint refresh token
// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req, @Body() body: { refreshToken: string }) {
    return this.authService.logout(req.user.id, body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
