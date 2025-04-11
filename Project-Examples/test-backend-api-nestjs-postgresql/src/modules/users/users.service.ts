import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Pagination } from '@/common/interfaces/response.interface';
import { PasswordService } from '@/common/providers/password';
import { RolesService } from '../roles/roles.service';
import { toTitleCase } from '@/common/utils/string.util';
import { Permission } from '../permissions/entities/permission.entity';

@Injectable()
export class UsersService {
  // Inject TypeORM repository for User entity
  constructor(
    @InjectRepository(User)
    protected userRepository: Repository<User>,
    @InjectRepository(Permission)
    protected permissionRepository: Repository<Permission>,
    private readonly passwordService: PasswordService,
    private rolesService: RolesService,
  ) {}

  async validateUserByEmail(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });

    if (user && (await this.passwordService.compare(password, user.password))) {
      const { password, ...result } = user;
      // get all permissions for root user
      if (result.role?.name === 'root') {
        result.role.permissions = await this.permissionRepository.find();
      }

      return result as Omit<User, 'password'>;
    }

    return null;
  }

  async getPermissionsByUserId(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let permissions: Permission[];

    if (user.role?.name === 'root') {
      permissions = await this.permissionRepository.find();
    } else {
      permissions = user.role?.permissions || [];
    }

    // Ngược lại trả về permission gán cho role
    return permissions;
  }

  async getPermissionsByRoleName(roleName: string): Promise<Permission[]> {
    return this.rolesService.getPermissionsByRoleName(roleName);
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions'],
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { name, email, password, roleId } = createUserDto;
    //Make sure email is unique
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash the password before saving the user
    const passwordHashed = await this.passwordService.hash(password);

    // Create a new user instance
    const user = this.userRepository.create({
      name,
      email: email.toLowerCase(),
      password: passwordHashed,
      isActive: false, // false is default
    });

    if (roleId) {
      const role = await this.rolesService.findOne(roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID ${roleId} not found`);
      }
      user.role = role;
    } else {
      // Gán role mặc định (ví dụ: 'user')
      const defaultRole = await this.rolesService.findByName('user');
      if (defaultRole) {
        user.role = defaultRole;
      }
    }

    return await this.userRepository.save(user);
  }

  async findAll(
    keyword?: string,
    page: number = 1,
    limit: number = 10,
    includeDeleted: boolean = false, // Thêm tham số để lọc theo deletedAt
  ): Promise<Pagination<User>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Lọc theo deletedAt nếu includeDeleted = false
    if (!includeDeleted) {
      queryBuilder.where('user.deletedAt IS NULL');
    } else {
      queryBuilder.where('user.deletedAt IS NOT NULL');
    }

    if (keyword && keyword.trim() !== '') {
      queryBuilder.andWhere(
        '(user.name LIKE :keyword OR user.email LIKE :keyword)',
        {
          keyword: `%${keyword}%`,
        },
      );
    }

    const total = await queryBuilder.getCount();

    const data = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      meta: { page, limit, totalRecords: total },
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Check if the email already exists
    const { name, email, password, roleId, isActive } = updateUserDto;

    if (email && email !== user.email) {
      const existingUser = await this.findUserByEmail(email);
      // Check if the email already exists
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
      // Update the email
      user.email = email.toLowerCase();
    }

    if (name && name.trim() !== '') {
      user.name = toTitleCase(name);
    }
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    if (password && password.trim() !== '') {
      user.password = await this.passwordService.hash(password);
    }

    if (roleId) {
      const role = await this.rolesService.findOne(roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID ${roleId} not found`);
      }
      // Update the role
      user.role = role;
    }

    //merge the updateUserDto with the existing user
    Object.assign(user, updateUserDto);
    // Save the updated user
    return this.userRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    //remove the user
    //await this.userRepository.delete(user.id);
    // Soft delete the user
    await this.userRepository.softDelete(user.id);
    //return the deleted user
    // Note: TypeORM does not return the deleted entity by default
    return user;
  }

  async restore(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Restore the user
    await this.userRepository.restore(user.id);
    return user;
  }
}
