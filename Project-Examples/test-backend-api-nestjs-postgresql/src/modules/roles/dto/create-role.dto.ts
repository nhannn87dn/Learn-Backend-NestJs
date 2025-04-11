import { OmitType } from '@nestjs/mapped-types';
import { Role } from '../entities/role.entity';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto extends OmitType(Role, ['id']) {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}
