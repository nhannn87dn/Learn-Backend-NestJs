import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { Pagination } from '@/common/interfaces/response.interface';
import { PermissionsService } from '../permissions/permissions.service';
import { Permission } from '../permissions/entities/permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private permissionsService: PermissionsService,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, description, permissionIds } = createRoleDto;
    // Validate role name
    if (!name || name.trim() === '') {
      throw new BadRequestException('Role name must not be empty');
    }

    const lowerName = createRoleDto.name.toLowerCase();
    // Check if role name already exists
    const existingRole = await this.findByName(lowerName);
    if (existingRole) {
      throw new ConflictException('Role already exists');
    }

    //create new role
    const role = this.roleRepository.create({
      name: lowerName,
      description,
      isActive: true,
    });

    // Set permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      role.permissions = [];
      for (const id of permissionIds) {
        const permission = await this.permissionsService.findOne(id);
        if (permission) {
          role.permissions.push(permission);
        }
      }
    }
    return this.roleRepository.save(role);
  }

  async findAll(
    keyword?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<Pagination<Role>> {
    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    queryBuilder.andWhere('role.isActive = true');

    if (keyword && keyword.trim() !== '') {
      queryBuilder.andWhere(
        '(role.name LIKE :keyword OR role.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
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

  async findOne(id: string): Promise<Role | null> {
    const role = await this.roleRepository.findOne({
      where: { id, isActive: true },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOneBy({ name, isActive: true });
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const { name, description, permissionIds } = updateRoleDto;

    if (name) {
      const lowerName = name.toLowerCase();
      const existingRole = await this.findByName(lowerName);
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException('Role name already exists');
      }
      role.name = lowerName;
    }
    if (description) {
      role.description = description;
    }

    if (permissionIds) {
      role.permissions = [];
      for (const id of permissionIds) {
        const permission = await this.permissionsService.findOne(id);
        if (permission) {
          role.permissions.push(permission);
        }
      }
    }

    return this.roleRepository.save(role);
  }

  async remove(id: string): Promise<Role> {
    const role = await this.findOne(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    //soft delete
    await this.roleRepository.softDelete(id);
    //await this.roleRepository.delete(id);
    return role;
  }

  async getPermissionsByRoleName(roleName: string): Promise<Permission[]> {
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    return role.permissions;
  }
}
