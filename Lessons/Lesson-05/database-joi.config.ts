// src/config/database.config.ts
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';
import { DataSourceOptions } from 'typeorm';

/**
 * Joi Schema để validate environment variables cho database
 */
export const databaseSchema = {
  DB_TYPE: Joi.string().valid('postgres', 'mysql', 'mariadb', 'sqlite', 'mssql').default('postgres'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),
  DB_MAX_CONNECTIONS: Joi.number().min(1).max(100).default(10),
  DB_MIN_CONNECTIONS: Joi.number().min(1).max(10).default(2),
  DB_IDLE_TIMEOUT: Joi.number().min(1000).default(30000),
};

/**
 * Database configuration factory
 */
export default registerAs(
  'database',
  (): DataSourceOptions => ({
    type: process.env.DB_TYPE as any || 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    
    // SSL configuration
    ssl: process.env.DB_SSL === 'true' 
      ? { rejectUnauthorized: false } 
      : false,
    
    // Connection pool settings
    extra: {
      max: Number(process.env.DB_MAX_CONNECTIONS) || 10,
      min: Number(process.env.DB_MIN_CONNECTIONS) || 2,
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 30000,
    },
  }),
);