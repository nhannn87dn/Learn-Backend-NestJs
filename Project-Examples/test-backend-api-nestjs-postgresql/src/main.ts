import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các thuộc tính không khai báo trong DTO
      forbidNonWhitelisted: true, // Ném lỗi nếu có thuộc tính không hợp lệ
      transform: true, // Chuyển đổi kiểu dữ liệu theo DTO
    }),
  );
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  //Quản lý phiên bản API bằng URL
  app.enableVersioning({
    type: VersioningType.URI, // 👈 version trong URL
    defaultVersion: '1', // 👈 version mặc định
  });

  // prefix cho tất cả các route
  app.setGlobalPrefix('api', { exclude: ['/api/v1'] }); // 👈 prefix cho tất cả các route

  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('PORT') || 3000;

  await app.listen(PORT, () => {
    console.log(`🚀 Server is running on port http://localhost:${PORT}`);
  });
}
bootstrap();
