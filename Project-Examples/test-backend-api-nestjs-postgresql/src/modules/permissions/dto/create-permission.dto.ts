import { OmitType } from '@nestjs/mapped-types';
import { Permission } from '../entities/permission.entity';

export class CreatePermissionDto extends OmitType(Permission, ['id']) {}
