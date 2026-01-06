// src/redis/redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Blacklist access token
  async blacklistAccessToken(
    userId: string,
    jti: string,
    exp: number,
  ): Promise<void> {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.client.setex(
        `blacklist:access:${jti}`,
        ttl,
        userId,
      );
    }
  }

  // Kiểm tra access token có trong blacklist không
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:access:${jti}`);
    return result !== null;
  }

  // Blacklist refresh token
  async blacklistRefreshToken(
    userId: string,
    jti: string,
    exp: number,
  ): Promise<void> {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.client.setex(
        `blacklist:refresh:${jti}`,
        ttl,
        userId,
      );
    }
  }

  // Kiểm tra refresh token
  async isRefreshTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.client.get(`blacklist:refresh:${jti}`);
    return result !== null;
  }

  // Cache user permissions
  async cacheUserPermissions(
    userId: string,
    permissions: string[],
    ttl: number = 3600,
  ): Promise<void> {
    await this.client.setex(
      `user:permissions:${userId}`,
      ttl,
      JSON.stringify(permissions),
    );
  }

  // Lấy cached permissions
  async getCachedUserPermissions(userId: string): Promise<string[] | null> {
    const cached = await this.client.get(`user:permissions:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }

  // Xóa cached permissions (khi role/permission thay đổi)
  async invalidateUserPermissions(userId: string): Promise<void> {
    await this.client.del(`user:permissions:${userId}`);
  }

  // Thu hồi tất cả token của user
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.client.set(`revoke:user:${userId}`, Date.now().toString());
  }

  // Kiểm tra user có bị revoke không
  async isUserTokensRevoked(userId: string, iat: number): Promise<boolean> {
    const revokeTime = await this.client.get(`revoke:user:${userId}`);
    if (!revokeTime) return false;
    return parseInt(revokeTime) > iat * 1000;
  }

  // Lưu device fingerprint để phát hiện token bị đánh cắp
  async storeDeviceFingerprint(
    userId: string,
    jti: string,
    fingerprint: string,
    ttl: number,
  ): Promise<void> {
    await this.client.setex(
      `device:${userId}:${jti}`,
      ttl,
      fingerprint,
    );
  }

  // Kiểm tra device fingerprint
  async verifyDeviceFingerprint(
    userId: string,
    jti: string,
    fingerprint: string,
  ): Promise<boolean> {
    const stored = await this.client.get(`device:${userId}:${jti}`);
    return stored === fingerprint;
  }
}

// src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}