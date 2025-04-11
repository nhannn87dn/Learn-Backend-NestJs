import { Role } from '@/modules/roles/entities/role.entity';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity({ name: 'Auth_Permissions' })
export class Permission {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  @IsNotEmpty({ message: 'Permission ID must not be empty.' })
  id: string;

  @Column({ unique: true, name: 'Name' })
  @IsNotEmpty({ message: 'Permission name must not be empty.' })
  @IsString()
  name: string;

  @Column({ nullable: true, name: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = uuidv4();
    }
    this.name = this.name.toLowerCase();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.name = this.name.toLowerCase();
  }
}
