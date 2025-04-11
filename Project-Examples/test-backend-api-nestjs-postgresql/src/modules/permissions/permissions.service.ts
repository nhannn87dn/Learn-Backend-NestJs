import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pagination } from '@/common/interfaces/response.interface';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    protected readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(
    keyword?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<Pagination<Permission>> {
    const queryBuilder =
      this.permissionRepository.createQueryBuilder('permission');

    if (keyword && keyword.trim() !== '') {
      queryBuilder.where(
        '(permission.name LIKE :keyword OR permission.description LIKE :keyword)',
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

  async findOne(id: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.permissionRepository.findOneBy({ name });
  }
  async create(createPermissionDto: CreatePermissionDto) {
    //Check if the permission name is empty
    if (!createPermissionDto.name || createPermissionDto.name === '') {
      throw new BadRequestException('Permission name must not be empty');
    }
    //Check if the permission already exists
    const existingPermission = await this.findByName(
      createPermissionDto.name.toLowerCase(),
    );
    if (existingPermission) {
      throw new ConflictException('Permission already exists');
    }
    //convert the name to lowercase
    createPermissionDto.name = createPermissionDto.name.toLowerCase();
    //Save the permission
    return this.permissionRepository.save(createPermissionDto);
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.findOne(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    //check if the permission name is empty
    if (!updatePermissionDto.name || updatePermissionDto.name === '') {
      throw new BadRequestException('Permission name must not be empty');
    }
    //Convert the name to lowercase
    if (updatePermissionDto.name) {
      updatePermissionDto.name = updatePermissionDto.name.toLowerCase();
      // Check if the permission name already exists
      const existingPermission = await this.findByName(
        updatePermissionDto.name,
      );
      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException('Permission name already exists');
      }
    }

    //merge the updatePermissionDto with the existing permission
    Object.assign(permission, updatePermissionDto);
    // Save the updated permission
    return this.permissionRepository.save(permission);
  }

  async remove(id: string) {
    const permission = await this.findOne(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    //remove the permission
    await this.permissionRepository.delete(id);
    //return a message
    // In a real application, you might want to return the deleted permission or a success message
    return permission;
  }
}
