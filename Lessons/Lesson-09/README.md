# Lesson 09: Authorization với NestJS

## 1. Authorization là gì?

### Khái niệm Authorization

Authorization (phân quyền) là quá trình xác định xem một người dùng đã được xác thực có **quyền thực hiện một hành động cụ thể** hay không. Nói đơn giản, authorization trả lời câu hỏi: *"Bạn được phép làm gì?"*

Ví dụ: Người dùng đã đăng nhập (authenticated) nhưng chỉ có role `user` thì không được phép truy cập trang quản trị dành cho `admin`.

### Authentication vs Authorization

| Tiêu chí | Authentication | Authorization |
|---|---|---|
| Câu hỏi | *Bạn là ai?* | *Bạn được làm gì?* |
| Mục đích | Xác minh danh tính | Kiểm soát quyền truy cập |
| Thứ tự | Xảy ra trước | Xảy ra sau authentication |
| Ví dụ | Đăng nhập bằng email/password | Chỉ admin mới xóa được user |
| Kỹ thuật | JWT, Session, OAuth | RBAC, ABAC, Policy |

---

## 2. Các Mô hình Authorization trong Backend

### Role-based Access Control (RBAC)

RBAC phân quyền dựa trên **vai trò (role)** của người dùng. Mỗi user được gán một hoặc nhiều role, mỗi role có tập hợp các quyền nhất định.

```
User → Role (admin, user, moderator) → Permissions
```

**Ưu điểm:** Đơn giản, dễ quản lý, phù hợp hầu hết ứng dụng.  
**Nhược điểm:** Kém linh hoạt khi cần kiểm soát quyền ở mức độ chi tiết cao.

### Permission-based Authorization

Thay vì kiểm tra role, hệ thống kiểm tra trực tiếp từng **permission** mà user có. Permission thường được đặt tên theo pattern: `resource:action`.

```
user:read, user:write, post:delete, order:approve
```

**Ưu điểm:** Linh hoạt, kiểm soát chi tiết hơn RBAC thuần túy.  
**Nhược điểm:** Phức tạp hơn khi số lượng permission tăng lên.

### Ownership-based Authorization

Kiểm tra xem người dùng có phải là **chủ sở hữu** của tài nguyên không. Ví dụ: user chỉ được sửa bài viết do chính mình tạo ra.

```typescript
// Chỉ cho phép nếu user là chủ sở hữu
if (post.authorId !== currentUser.id) {
  throw new ForbiddenException();
}
```

---

## 3. RBAC Implementation

### Tạo Role và Permission

Bước 1: Định nghĩa enum cho Role và Permission để tránh magic string:

```typescript
// src/modules/auth/types/role.enum.ts
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

// src/modules/auth/types/permission.enum.ts
export enum Permission {
  READ_USER    = 'user:read',
  WRITE_USER   = 'user:write',
  DELETE_USER  = 'user:delete',
  READ_POST    = 'post:read',
  DELETE_POST  = 'post:delete',
}
```

Tạo custom decorator để đánh dấu route yêu cầu role hoặc permission cụ thể:

```typescript
// src/modules/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

Bước 2: Tạo RoleEntity và PermissionEntity

```typescript
// src/modules/auth/entities/role.entity.ts
@Entity()
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  description: string;

  @ManyToMany(() => PermissionEntity)
  @JoinTable()
  permissions: PermissionEntity[];
}

```

```typescript
// src/modules/auth/entities/permission.entity.ts
@Entity()
export class PermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  description: string;
}
```

Bước 3: Tạo bảng trung gian UserRole để gán nhiều role cho một user:

```typescript
// src/modules/auth/entities/user-role.entity.ts
@Entity()
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userRoles)
  user: User;

  @ManyToOne(() => RoleEntity, (role) => role.userRoles)
  role: RoleEntity;
}
```

Bước 4: Cập nhật User entity để liên kết với UserRole:

```typescript
// src/modules/user/entities/user.entity.ts
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  //... các trường khác như email, password

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];
}
```

Bước 5: Tạo service để quản lý role và permission, ví dụ:



**RoleService** để quản lý role;

```typescript
// src/modules/auth/role.service.ts
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
  ) {}

  //get all roles
  async findAll(): Promise<RoleEntity[]> {
    //TODO: pagination and filtering
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  //get single role by id
  async findOne(id: number): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne(id, { relations: ['permissions'] });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async createRole(name: string, description?: string): Promise<RoleEntity> {
    const role = this.roleRepository.create({ name, description });
    return this.roleRepository.save(role);
  }

  //update role
  async updateRole(id: number, name?: string, description?: string): Promise<RoleEntity> {
    const role = await this.findOne(id);
    if (name) role.name = name;
    if (description) role.description = description;
    return await this.roleRepository.save(role);
  }

  async assignPermissionToRole(roleId: number, permissionId: number) {
    
    //ToDO: validate if role and permission exist
        
    const role = await this.roleRepository.findOne(roleId, { relations: ['permissions'] });
    const permission = await this.permissionRepository.findOne(permissionId);
    role.permissions.push(permission);
    await this.roleRepository.save(role);
  }

  //assign multiple permissions to role
  async assignPermissionsToRole(roleId: number, permissionIds: number[]) {
    const role = await this.roleRepository.findOne(roleId, { relations: ['permissions'] });
    const permissions = await this.permissionRepository.findByIds(permissionIds);
    role.permissions.push(...permissions);
    await this.roleRepository.save(role);
  }

  //remove permission from role
  async removePermissionFromRole(roleId: number, permissionId: number) {
    const role = await this.roleRepository.findOne(roleId, { relations: ['permissions'] });
    role.permissions = role.permissions.filter((p) => p.id !== permissionId);
    await this.roleRepository.save(role);
  }

  //remove multiple permissions from role
  async removePermissionsFromRole(roleId: number, permissionIds: number[]) {
    const role = await this.roleRepository.findOne(roleId, { relations: ['permissions'] });
    role.permissions = role.permissions.filter((p) => !permissionIds.includes(p.id));
    await this.roleRepository.save(role);
  }


  //delete role
  async deleteRole(id: number): Promise<void> {
    //validate if role exists
    const role = await this.findOne(id);
    await this.roleRepository.delete(role.id);
  }
}
```

**PermissionService** để quản lý permission:

```typescript
// src/modules/auth/permission.service.ts
@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private permissionRepository: Repository<PermissionEntity>,
  ) {}

  async findAll(): Promise<PermissionEntity[]> {
    //TODO: pagination and filtering
    return this.permissionRepository.find();
  }

  async findOne(id: number): Promise<PermissionEntity> {
    const permission = await this.permissionRepository.findOne(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }

  async createPermission(name: string, description?: string): Promise<PermissionEntity> {
    const permission = this.permissionRepository.create({ name, description });
    return this.permissionRepository.save(permission);
  }

  async updatePermission(id: number, name?: string, description?: string): Promise<PermissionEntity> {
    const permission = await this.findOne(id);
    if (name) permission.name = name;
    if (description) permission.description = description;
    return await this.permissionRepository.save(permission);
  }

  async deletePermission(id: number): Promise<void> {
    //validate if permission exists
    const permission = await this.findOne(id);
    await this.permissionRepository.delete(permission.id);
  }
}
```


Bước 6: Refactor authentication flow để gán role vào user và đưa role vào JWT payload.

Khi tạo hoặc cập nhật user, gán role vào entity:

```typescript
//src/modules/user/entities/user.entity.ts
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  //... các trường khác như email, password

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;
}
```

Khi đăng nhập thành công, đưa role vào JWT payload:

```typescript
// auth.service.ts
async login(loginDto: LoginDto) {
        // 1. Validate user
        const user = await this.validateUser(loginDto.email, loginDto.password);
        
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        
        // 2. Tạo payload cho JWT
        const payload = {
            sub: user.id,      // Subject: User ID
            email: user.email,
            role: user.role //add role vào payload để có thể kiểm tra trong guard
        };
        
        // 3. Tạo tokens
        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: '15m' // 15 phút
        });
        
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: '7d' // 7 ngày
        });
        
        return {
            accessToken,
            refreshToken,
            user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role // trả về role để client có thể hiển thị giao diện phù hợp
            }
        };
        }
```

Tương tự như vậy hãy thêm vào `refreshToken` method trong `auth.service.ts` để đảm bảo token mới cũng có role:

```typescript
async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            const user = await this.usersService.findById(payload.sub);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Tạo payload mới cho access token
            const newPayload = {
                sub: user.id,
                email: user.email,
                role: user.role // đảm bảo role được cập nhật trong payload mới
            };

            const newAccessToken = this.jwtService.sign(newPayload, {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: '15m',
            });

            return {
                accessToken: newAccessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            };
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
```

---

## 4. Protecting Routes với Authorization Guards

### Tạo AuthGuard

Guard trong NestJS implement interface `CanActivate`. Guard trả về `true` để cho phép, `false` hoặc throw exception để từ chối.

```typescript
//src/modules/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { ROLE_PERMISSIONS } from '../constants/role-permissions';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách roles yêu cầu từ metadata
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Không yêu cầu role → cho phép truy cập
    if (!requiredRoles) return true;

    // Lấy user từ request (đã được JwtAuthGuard gán vào)
    const { user } = context.switchToHttp().getRequest();

    // Kiểm tra user có role phù hợp không
    return requiredRoles.some((role) => user.role === role);
  }
}
```

Guard kiểm tra permission:

```typescript
// src/modules/auth/guards/permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    const userPermissions = ROLE_PERMISSIONS[user.role] ?? [];

    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }
}
```

### Sử dụng Guards trong Controllers

Đăng ký guard toàn cục trong `main.ts` hoặc `AppModule`:

```typescript
// app.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },   // Xác thực trước
  { provide: APP_GUARD, useClass: RolesGuard },      // Phân quyền sau
],
```

Sử dụng decorator trong controller:

Ví dụ trong `PostsController` để chỉ user có role `admin` hoặc `moderator` mới được xóa bài viết:

```typescript
// src/modules/posts/posts.controller.ts
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  //... các route khác
  
  @Delete(':id')
  @Roles(Role.ADMIN, Role.MODERATOR) // Chỉ admin và moderator mới được xóa bài viết
  remove(@Param('id') id: number) {
    return this.postsService.remove(id);
  }
}
```


Ví dụ trong RolesController và PermissionsController để chỉ admin mới được phép quản lý role và permission:

```typescript
// src/modules/auth/controllers/roles.controller.ts
@Controller('roles')
export class RolesController {
  constructor(private roleService: RoleService) {}

  @Post()
  @Roles(Role.ADMIN) // Chỉ admin mới được tạo role
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.createRole(createRoleDto.name, createRoleDto.description);
  }

  @Get()
  @Roles(Role.ADMIN) // Chỉ admin mới xem được danh sách role
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: number) {
    return this.roleService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.updateRole(id, updateRoleDto.name, updateRoleDto.description);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: number) {
    return this.roleService.deleteRole(id);
  }

  //assign permission to role
  @Post(':id/permissions')
  @Roles(Role.ADMIN)
  assignPermissions(@Param('id') id: number, @Body() assignPermissionsDto: AssignPermissionsDto) {
    return this.roleService.assignPermissionsToRole(id, assignPermissionsDto.permissionIds);
  }

   //remove permission from role
  @Delete(':id/permissions')
  @Roles(Role.ADMIN)
  removePermissions(@Param('id') id: number, @Body() removePermissionsDto:
RemovePermissionsDto) {
    return this.roleService.removePermissionsFromRole(id, removePermissionsDto.permissionIds);
}
}
```

```typescript
// src/modules/auth/controllers/permissions.controller.ts
@Controller('permissions')
export class PermissionsController {
  constructor(private permissionService: PermissionService) {}

  @Post()
  @Roles(Role.ADMIN) // Chỉ admin mới được tạo permission
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.createPermission(createPermissionDto.name, createPermissionDto.description);
  }

  @Get()
  @Roles(Role.ADMIN) // Chỉ admin mới xem được danh sách permission
  findAll() {
    return this.permissionService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: number) {
    return this.permissionService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: number, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionService.updatePermission(id, updatePermissionDto.name, updatePermissionDto.description);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: number) {
    return this.permissionService.deletePermission(id);
  }
}
```


---

## 5. Advanced Authorization

### Attribute-based Access Control (ABAC)

ABAC mở rộng RBAC bằng cách đưa thêm các **thuộc tính (attribute)** vào quyết định phân quyền. Các thuộc tính có thể đến từ:

- **Subject**: thông tin của user (role, department, age...)
- **Resource**: thông tin tài nguyên (owner, status, classification...)
- **Environment**: ngữ cảnh (thời gian, IP, location...)

```typescript
// Ví dụ: chỉ cho phép nếu user cùng department VÀ document ở trạng thái draft
canAccess(user: User, document: Document, action: string): boolean {
  if (action === 'edit') {
    return (
      user.department === document.department &&
      document.status === 'draft'
    );
  }
  return false;
}
```

### Policy-based Authorization

Policy-based authorization tổ chức logic phân quyền thành các **policy class** riêng biệt, giúp code dễ bảo trì và mở rộng. Đây là pattern phổ biến trong các hệ thống lớn.

```typescript
// post.policy.ts
@Injectable()
export class PostPolicy {
  canCreate(user: User): boolean {
    return [Role.USER, Role.ADMIN].includes(user.role);
  }

  canUpdate(user: User, post: Post): boolean {
    // Admin hoặc chính chủ mới được sửa
    return user.role === Role.ADMIN || post.authorId === user.id;
  }

  canDelete(user: User, post: Post): boolean {
    return user.role === Role.ADMIN || post.authorId === user.id;
  }
}
```

Sử dụng trong service:

```typescript
// posts.service.ts
@Injectable()
export class PostsService {
  constructor(private postPolicy: PostPolicy) {}

  async update(user: User, postId: number, dto: UpdatePostDto) {
    const post = await this.findOne(postId);

    if (!this.postPolicy.canUpdate(user, post)) {
      throw new ForbiddenException('Bạn không có quyền sửa bài viết này');
    }

    return this.postRepository.save({ ...post, ...dto });
  }
}
```

---

> **Tóm tắt:** Authorization là lớp bảo vệ thứ hai sau Authentication. Tùy vào độ phức tạp của ứng dụng, bạn có thể chọn RBAC cho các hệ thống đơn giản, Permission-based cho kiểm soát chi tiết hơn, hoặc ABAC/Policy-based cho các hệ thống enterprise cần logic phân quyền phức tạp.