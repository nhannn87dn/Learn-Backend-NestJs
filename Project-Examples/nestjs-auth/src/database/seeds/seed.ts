// src/database/seeds/seed.ts
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';

export async function seed(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Tạo permissions
    const permissions = [
      // User permissions
      { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
      { name: 'users:create', resource: 'users', action: 'create', description: 'Create users' },
      { name: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
      { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
      
      // Post permissions
      { name: 'posts:read', resource: 'posts', action: 'read', description: 'View posts' },
      { name: 'posts:create', resource: 'posts', action: 'create', description: 'Create posts' },
      { name: 'posts:update', resource: 'posts', action: 'update', description: 'Update posts' },
      { name: 'posts:delete', resource: 'posts', action: 'delete', description: 'Delete posts' },
      
      // Role permissions
      { name: 'roles:read', resource: 'roles', action: 'read', description: 'View roles' },
      { name: 'roles:manage', resource: 'roles', action: 'manage', description: 'Manage roles' },
    ];

    for (const perm of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, resource, action, description) 
         VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
        [perm.name, perm.resource, perm.action, perm.description],
      );
    }

    // 2. Tạo roles
    const roles = [
      { name: 'admin', description: 'Administrator with full access' },
      { name: 'manager', description: 'Manager with limited administrative access' },
      { name: 'editor', description: 'Editor can create and update content' },
      { name: 'user', description: 'Regular user with basic access' },
    ];

    for (const role of roles) {
      await queryRunner.query(
        `INSERT INTO roles (name, description) 
         VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [role.name, role.description],
      );
    }

    // 3. Gán permissions cho roles
    const rolePermissions = {
      admin: [
        'users:read', 'users:create', 'users:update', 'users:delete',
        'posts:read', 'posts:create', 'posts:update', 'posts:delete',
        'roles:read', 'roles:manage',
      ],
      manager: [
        'users:read', 'users:update',
        'posts:read', 'posts:create', 'posts:update', 'posts:delete',
      ],
      editor: [
        'posts:read', 'posts:create', 'posts:update',
      ],
      user: [
        'posts:read',
      ],
    };

    for (const [roleName, permNames] of Object.entries(rolePermissions)) {
      const role = await queryRunner.query(
        `SELECT id FROM roles WHERE name = $1`,
        [roleName],
      );

      for (const permName of permNames) {
        const perm = await queryRunner.query(
          `SELECT id FROM permissions WHERE name = $1`,
          [permName],
        );

        if (role[0] && perm[0]) {
          await queryRunner.query(
            `INSERT INTO role_permissions (role_id, permission_id) 
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [role[0].id, perm[0].id],
          );
        }
      }
    }

    // 4. Tạo test users
    const password = await argon2.hash('password123');
    
    const testUsers = [
      { email: 'admin@example.com', role: 'admin' },
      { email: 'manager@example.com', role: 'manager' },
      { email: 'editor@example.com', role: 'editor' },
      { email: 'user@example.com', role: 'user' },
    ];

    for (const testUser of testUsers) {
      // Insert user
      const userResult = await queryRunner.query(
        `INSERT INTO users (email, password_hash, is_active) 
         VALUES ($1, $2, true) 
         ON CONFLICT (email) DO UPDATE SET password_hash = $2
         RETURNING id`,
        [testUser.email, password],
      );

      // Assign role
      const roleResult = await queryRunner.query(
        `SELECT id FROM roles WHERE name = $1`,
        [testUser.role],
      );

      if (userResult[0] && roleResult[0]) {
        await queryRunner.query(
          `INSERT INTO user_roles (user_id, role_id) 
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userResult[0].id, roleResult[0].id],
        );
      }
    }

    await queryRunner.commitTransaction();
    console.log('Seed completed successfully!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Script để chạy seed
// src/database/seeds/run-seed.ts
import { DataSource } from 'typeorm';
import { seed } from './seed';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nestjs_auth',
});

async function runSeed() {
  try {
    await dataSource.initialize();
    console.log('Data Source initialized');
    
    await seed(dataSource);
    
    await dataSource.destroy();
    console.log('Seed process completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during seed:', error);
    process.exit(1);
  }
}

runSeed();