import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Pagination } from '@/common/interfaces/response.interface';
import { PasswordService } from '@/common/services/password.service';

@Injectable()
export class UsersService {
  // Inject TypeORM repository for User entity
  constructor(
    @InjectRepository(User)
    protected userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
  ) {}

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id, deletedAt: IsNull() } });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    //Make sure email is unique
    const existingUser = await this.findUserByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash the password before saving the user
    createUserDto.password = await this.passwordService.hash(
      createUserDto.password,
    );

    return await this.userRepository.save(createUserDto);
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
    // Check if the email is being updated and if it already exists

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findUserByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await this.hashString(updateUserDto.password);
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

  private async hashString(str: string): Promise<string> {
    const salt = await bcrypt.genSalt(10); // Ensure SALT_ROUNDS is a valid number
    return await bcrypt.hash(str, salt);
  }

  private async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}
