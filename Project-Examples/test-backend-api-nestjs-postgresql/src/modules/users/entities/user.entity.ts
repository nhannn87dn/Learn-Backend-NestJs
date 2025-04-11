import { PASSWORD_REGEX } from '@/common/constants';
import { Role } from '@/modules/roles/entities/role.entity';
import { Exclude } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity({ name: 'Auth_User' })
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  @IsNotEmpty({ message: 'User ID must not be empty.' })
  id: string;

  @Column({ name: 'Name', type: 'varchar', length: 160 })
  @IsNotEmpty({ message: 'Name must not be empty.' })
  @MinLength(2, { message: 'Name must have atleast 2 characters.' })
  @MaxLength(160, { message: 'Name must have maximum 160 characters.' })
  @IsString()
  name: string;

  @Column({ name: 'Email', unique: true })
  @IsNotEmpty({ message: 'Email must not be empty.' })
  @MaxLength(255, { message: 'Email must have maximum 255 characters.' })
  @IsEmail({}, { message: 'Please provide valid Email.' })
  email: string;

  @Column({ name: 'Password', type: 'varchar' })
  @Exclude({ toPlainOnly: true }) // Loại bỏ password khỏi response
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, {
    message: `Password must contain Minimum 8 and maximum 20 characters, 
    at least one uppercase letter, 
    one lowercase letter, 
    one number and 
    one special character`,
  })
  password: string;

  @Column({ name: 'IsActive', default: true })
  @IsBoolean()
  isActive: boolean;

  @Column({ name: 'Avatar', nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @Column({ name: 'LastLoginAt', nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'CreatedAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'DeletedAt', nullable: true })
  @IsOptional()
  deletedAt?: Date;

  //relations
  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn()
  role: Role;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.createdAt) {
      this.createdAt = new Date(); // Cập nhật thời gian tạo
    }
    this.email = this.email.toLowerCase();
    this.name = this.name.toUpperCase();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.email = this.email.toLowerCase();
    this.updatedAt = new Date();
  }
}
