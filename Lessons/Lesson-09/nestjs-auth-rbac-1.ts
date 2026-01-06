// Hướng dẫn toàn diện triển khai Authentication và RBAC trong NestJS với TypeORM

// ---------- BƯỚC 1: THIẾT LẬP DỰ ÁN ----------
// Tạo dự án NestJS mới
// $ nest new auth-rbac-project
// $ cd auth-rbac-project
// $ npm install @nestjs/typeorm typeorm pg @nestjs/passport passport passport-jwt passport-local @nestjs/jwt bcrypt class-validator class-transformer

// ---------- BƯỚC 2: CẤU HÌNH DATABASE ----------
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';

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
  ],
})
export class AppModule {}

// ---------- BƯỚC 3: TẠO CÁC ENTITY ----------
// src/permissions/entities/permission.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];
}

// src/roles/entities/role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({ name: 'roles_permissions' })
  permissions: Permission[];

  @OneToMany(() => User, user => user.role)
  users: User[];
}

// src/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // Loại bỏ password khỏi response
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Role, role => role.users)
  @JoinColumn()
  role: Role;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

// ---------- BƯỚC 4: TẠO CÁC MODULE VÀ SERVICE ----------
// src/permissions/permissions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Permission])],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService],
})
export class PermissionsModule {}

// src/permissions/permissions.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const permission = this.permissionsRepository.create(createPermissionDto);
    return this.permissionsRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionsRepository.find();
  }

  async findOne(id: number): Promise<Permission> {
    return this.permissionsRepository.findOneBy({ id });
  }

  async findByName(name: string): Promise<Permission> {
    return this.permissionsRepository.findOneBy({ name });
  }
}

// src/permissions/dto/create-permission.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePermissionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  description?: string;
}

// src/roles/roles.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), PermissionsModule],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}

// src/roles/roles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private permissionsService: PermissionsService,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, description, permissionIds } = createRoleDto;
    
    const role = this.rolesRepository.create({
      name,
      description,
    });

    if (permissionIds && permissionIds.length > 0) {
      role.permissions = [];
      for (const id of permissionIds) {
        const permission = await this.permissionsService.findOne(id);
        if (permission) {
          role.permissions.push(permission);
        }
      }
    }

    return this.rolesRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({ relations: ['permissions'] });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    
    return role;
  }

  async findByName(name: string): Promise<Role> {
    return this.rolesRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const { name, description, permissionIds } = updateRoleDto;
    const role = await this.findOne(id);
    
    if (name) role.name = name;
    if (description) role.description = description;
    
    if (permissionIds) {
      role.permissions = [];
      for (const id of permissionIds) {
        const permission = await this.permissionsService.findOne(id);
        if (permission) {
          role.permissions.push(permission);
        }
      }
    }
    
    return this.rolesRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    await this.rolesRepository.remove(role);
  }
}

// src/roles/dto/create-role.dto.ts
import { IsNotEmpty, IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  permissionIds?: number[];
}

// src/roles/dto/update-role.dto.ts
import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  permissionIds?: number[];
}

// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RolesModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

// src/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private rolesService: RolesService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password, roleId } = createUserDto;
    
    // Kiểm tra user đã tồn tại chưa
    const existingUser = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });
    
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }
    
    const user = this.usersRepository.create({
      username,
      email,
      password,
    });
    
    if (roleId) {
      const role = await this.rolesService.findOne(roleId);
      user.role = role;
    } else {
      // Gán role mặc định (ví dụ: 'user')
      const defaultRole = await this.rolesService.findByName('user');
      if (defaultRole) {
        user.role = defaultRole;
      }
    }
    
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['role', 'role.permissions'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['role', 'role.permissions'],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    const { username, email, password, roleId, isActive } = updateUserDto;
    
    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = password; // Password sẽ được hash tự động
    if (isActive !== undefined) user.isActive = isActive;
    
    if (roleId) {
      const role = await this.rolesService.findOne(roleId);
      user.role = role;
    }
    
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}

// src/users/dto/create-user.dto.ts
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNumber()
  @IsOptional()
  roleId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// src/users/dto/update-user.dto.ts
import { IsString, IsEmail, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsNumber()
  @IsOptional()
  roleId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ---------- BƯỚC 5: TRIỂN KHAI AUTHENTICATION ----------
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: 'super-secret-key', // Trong production nên sử dụng biến môi trường
      signOptions: { expiresIn: '1d' }, // token hết hạn sau 1 ngày
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
    
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role.name,
      permissions: user.role.permissions.map(p => p.name),
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions.map(p => p.name),
      },
    };
  }
}

// src/auth/dto/login.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

// src/auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return user;
  }
}

// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'super-secret-key', // Trong production nên sử dụng biến môi trường
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

// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}

// src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// ---------- BƯỚC 6: TRIỂN KHAI AUTHORIZATION (RBAC) ----------
// src/auth/guards/permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    
    if (!requiredPermissions) {
      return true; // Nếu không yêu cầu quyền cụ thể, cho phép truy cập
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.permissions) {
      throw new ForbiddenException('User has no permissions');
    }
    
    // Kiểm tra người dùng có quyền cần thiết không
    const hasPermission = requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      throw new ForbiddenException('User does not have required permissions');
    }
    
    return true;
  }
}

// src/auth/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Permissions = (...permissions: string[]) => SetMetadata('permissions', permissions);

// ---------- BƯỚC 7: TRIỂN KHAI CONTROLLERS ----------
// src/permissions/permissions.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('create:permissions')
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('read:permissions')
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('read:permissions')
  findOne(@Param('id') id: number) {
    return this.permissionsService.findOne(id);
  }
}

// src/roles/roles.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('create:roles')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('read:roles')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('read:roles')
  findOne(@Param('id') id: number) {
    return this.rolesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('update:roles')
  update(@Param('id') id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('delete:roles')
  remove(@Param('id') id: number) {
    return this.rolesService.remove(id);
  }
}

// src/users/users.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('create:users')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('read:users')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('read:users')
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('update:users')
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('delete:users')
  remove(@Param('id') id: number) {
    return this.usersService.remove(id);
  }
}

// ---------- BƯỚC 8: TẠO DỮ LIỆU BAN ĐẦU ----------
// src/seed/seed.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private permissionsService: PermissionsService,
    private rolesService: RolesService,
    private usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedUsers();
  }

  async seedPermissions() {
    const permissions = [
      { name: 'create:users', description: 'Can create users' },
      { name: 'read:users', description: 'Can view users' },
      { name: 'update:users', description: 'Can update users' },
      { name: 'delete:users', description: 'Can delete users' },
      { name: 'create:roles', description: 'Can create roles' },
      { name: 'read:roles', description: 'Can view roles' },
      { name: 'update:roles', description: 'Can update roles' },
      { name: 'delete:roles', description: 'Can delete roles' },
      { name: 'create:permissions', description: 'Can create permissions' },
      { name: 'read:permissions', description: 'Can view permissions' },
    ];

    for (const permission of permissions) {
      const existing = await this.permissionsService.findByName(permission.name);
      if (!existing) {
        await this.permissionsService.create(permission);
      }
    }
  }

  async seedRoles() {
    // Admin role with all permissions
    const adminPermissions = await this.permissionsService.findAll();
    const adminPermissionIds = adminPermissions.map(p => p.id);
    
    let adminRole = await this.rolesService.findByName('admin');
    if (!adminRole) {
      await this.rolesService.create({
        name: 'admin',
        description: 'Administrator with full access',
        permissionIds: adminPermissionIds,
      });
    } else {
      await this.rolesService.update(adminRole.id, {
        permissionIds: adminPermissionIds,
      });
    }

    // User role with limited permissions
    const userPermissions = await Promise.all([
      this.permissionsService.findByName('read:users'),
      this.permissionsService.findByName('read:roles'),
      this.permissionsService.findByName('read:permissions'),
    ]);
    const userPermissionIds = userPermissions.map(p => p.id);
    
    let userRole = await this.rolesService.findByName('user');
    if (!userRole) {
      await this.rolesService.create({
        name: 'user',
        description: 'Regular user with limited access',
        permissionIds: userPermissionIds,
      });
    } else {
      await this.rolesService.update(userRole.id, {
        permissionIds: userPermissionIds,
      });
    }
  }

  async seedUsers() {
    // Create admin user
    const adminRole = await this.rolesService.findByName('admin');
    let adminUser = await this.usersService.findByUsername('admin');
    
    if (!adminUser) {
      await this.usersService.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin123!',
        roleId: adminRole.id,
      });
    }

    // Create regular user
    const userRole = await this.rolesService.findByName('user');
    let regularUser = await this.usersService.findByUsername('user');
    
    if (!regularUser) {
      await this.usersService.create({
        username: 'user',
        email: 'user@example.com',
        password: 'User123!',
        roleId: userRole.id,
      });
    }
  }
}