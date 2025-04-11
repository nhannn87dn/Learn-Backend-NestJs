import { OmitType } from '@nestjs/mapped-types';
import { User } from '../entities/user.entity';
import { IsOptional, IsString } from 'class-validator';

export class CreateUserDto extends OmitType(User, [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  //   'author',
  //   'comments',
]) {
  // role cho user
  @IsString()
  @IsOptional()
  roleId?: string;
}
