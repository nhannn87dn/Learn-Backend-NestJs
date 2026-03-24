import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export default registerAs('app', () => ({
  port: Number(process.env.PORT),
  env: process.env.NODE_ENV,
}));

export const appSchema = {
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
};
