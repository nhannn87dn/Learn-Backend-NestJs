import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
