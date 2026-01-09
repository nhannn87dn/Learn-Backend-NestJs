// src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: !isProduction, // QUAN TRỌNG: Tắt synchronize ở production
    logging: !isProduction,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Connection pool settings
    extra: {
      max: isProduction ? 20 : 10, // Maximum number of connections
      min: isProduction ? 5 : 2,   // Minimum number of connections
      idleTimeoutMillis: 30000,    // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Timeout khi kết nối
    },
    // Retry settings
    retryAttempts: 5,
    retryDelay: 3000,
  };
};