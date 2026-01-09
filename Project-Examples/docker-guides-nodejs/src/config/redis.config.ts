// src/config/redis.config.ts
import { CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

export const getRedisConfig = async (): Promise<CacheModuleOptions> => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    store: await redisStore({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
      ttl: 60 * 60, // Default TTL: 1 hour
      max: 100, // Maximum number of items in cache
      // Retry strategy
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    }),
    isGlobal: true,
  };
};

// Alternative: Sử dụng ioredis
// src/config/redis-ioredis.config.ts
import { RedisOptions } from 'ioredis';

export const getRedisIOConfig = (): RedisOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => {
      if (times > 3) {
        console.error('Redis connection failed');
        return null;
      }
      return Math.min(times * 50, 2000);
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    lazyConnect: true,
  };
};