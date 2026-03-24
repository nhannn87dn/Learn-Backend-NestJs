import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import { validationSchema } from './validationConfig.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validationSchema: validationSchema,
      load: [appConfig], // 👈 key point
    }),
  ],
})
export class AppConfigModule {}
