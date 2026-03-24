import * as Joi from 'joi';
import { appSchema } from './app.config';

export const validationSchema = Joi.object({
  ...appSchema,
});
