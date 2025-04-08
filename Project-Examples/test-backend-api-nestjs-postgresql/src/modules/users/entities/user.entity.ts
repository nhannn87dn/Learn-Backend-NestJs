import { Exclude } from 'class-transformer';
import {
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
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

const passwordRegEx =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

@Entity({ name: 'Auth_User' })
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  @IsNotEmpty({ message: 'User ID must not be empty.' })
  id: string;

  @Column({ name: 'Name', type: 'varchar', length: 160 })
  @IsNotEmpty({ message: 'Name must not be empty.' })
  @MinLength(2, { message: 'Name must have atleast 2 characters.' })
  @MaxLength(160, { message: 'Name must have maximum 160 characters.' })
  name: string;

  @Column({ name: 'Email', unique: true })
  @IsNotEmpty({ message: 'Email must not be empty.' })
  @MaxLength(255, { message: 'Email must have maximum 255 characters.' })
  @IsEmail({}, { message: 'Please provide valid Email.' })
  email: string;

  @Column({ name: 'Password', type: 'varchar' })
  @Exclude({ toPlainOnly: true }) // Loại bỏ password khỏi response
  @IsNotEmpty()
  @Matches(passwordRegEx, {
    message: `Password must contain Minimum 8 and maximum 20 characters, 
    at least one uppercase letter, 
    one lowercase letter, 
    one number and 
    one special character`,
  })
  password: string;

  @Column({ name: 'IsActive', default: true })
  isActive: boolean;

  @Column({ name: 'Avatar', nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @Column({ name: 'LastLoginAt', nullable: true, type: 'timestamp' })
  @IsOptional()
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'CreatedAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'DeletedAt', nullable: true })
  @IsOptional()
  deletedAt?: Date;

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
    this.name = this.name.toUpperCase();
    this.updatedAt = new Date();
  }
}
