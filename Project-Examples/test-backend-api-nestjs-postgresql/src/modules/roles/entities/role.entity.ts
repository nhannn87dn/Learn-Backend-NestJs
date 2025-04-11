import { Permission } from '@/modules/permissions/entities/permission.entity';
import { User } from '@/modules/users/entities/user.entity';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'Auth_Roles' })
export class Role {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  @IsNotEmpty({ message: 'Role ID must not be empty.' })
  id: string;

  @Column({ unique: true, name: 'Name' })
  @IsNotEmpty({ message: 'Role name must not be empty.' })
  @IsString()
  name: string;

  @Column({ nullable: true, name: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({ name: 'IsActive', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'CreatedAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt' })
  updatedAt: Date;

  //Soft delete
  @DeleteDateColumn({ name: 'DeletedAt', nullable: true })
  @IsOptional()
  deletedAt?: Date;

  //relations

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({ name: 'Auth_Roles_Permissions' })
  permissions: Permission[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];

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
