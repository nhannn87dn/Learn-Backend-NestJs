# One-to-One Relationship

**Khái niệm:** Mối quan hệ 1-1 nghĩa là một bản ghi ở bảng A chỉ liên kết với đúng một bản ghi ở bảng B và ngược lại.

**Ví dụ thực tế:** Một User có một Profile, một Profile thuộc về một User.

**Cấu trúc:**

```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Profile } from './profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  password: string;

  // Quan hệ One-to-One
  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: true, // Tự động lưu profile khi lưu user
    eager: false,   // Không tự động load profile
  })
  @JoinColumn() // Bên có @JoinColumn sẽ chứa foreign key
  profile: Profile;
}
```

```typescript
// profile.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  avatar: string;

  // Quan hệ ngược lại
  @OneToOne(() => User, (user) => user.profile)
  user: User;
}
```

**Sử dụng:**

```typescript
// user.service.ts
async createUserWithProfile(userData: any) {
  const user = this.userRepository.create({
    email: userData.email,
    password: userData.password,
    profile: {
      firstName: userData.firstName,
      lastName: userData.lastName,
    }
  });
  
  return await this.userRepository.save(user);
  // Cascade: true sẽ tự động lưu cả profile
}

async getUserWithProfile(id: number) {
  return await this.userRepository.findOne({
    where: { id },
    relations: ['profile'], // Load cả profile
  });
}
```
