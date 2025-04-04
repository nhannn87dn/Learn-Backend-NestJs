import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config'; // Ensure this path is correct and matches the installed package
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      // Cấu hình để đọc file .env
      envFilePath: `.env.${process.env.NODE_ENV}`,
      // Cấu hình để dùng toàn cục không cần import lại
      isGlobal: true,
      validate,
    }),
    // Các module khác của bạn
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
