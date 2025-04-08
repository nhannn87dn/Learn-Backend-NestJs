import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

export enum DatabaseType {
  Postgres = 'postgres',
  MySQL = 'mysql',
  SQLite = 'sqlite',
  MongoDB = 'mongodb',
  MariaDB = 'mariadb',
  MSSQL = 'mssql',
  Oracle = 'oracle',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @Transform(({ value }) => (value as Environment) || Environment.Development)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(0)
  @Max(65535)
  @Transform(({ value }) => Number(value ?? 8080))
  PORT: number;

  @IsEnum(DatabaseType)
  @Transform(({ value }) => (value as DatabaseType) || DatabaseType.Postgres)
  DB_TYPE: string;

  @IsString()
  @Transform(({ value }) => (value as string) ?? 'localhost')
  DB_HOST: string;

  @IsNumber()
  @IsPositive()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  @IsString()
  @IsOptional()
  DB_SCHEMA: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => (value as boolean) ?? false)
  DB_LOGGING: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => (value as boolean) ?? false)
  DB_SYNCHRONIZE: boolean;

  @IsString()
  @Transform(({ value }) => (value as string) ?? 'your-secret-key')
  JWT_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
