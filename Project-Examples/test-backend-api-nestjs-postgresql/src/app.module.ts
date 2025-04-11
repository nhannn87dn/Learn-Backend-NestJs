import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Ensure this path is correct and matches the installed package
import { DatabaseType, validate } from './config/env.validation';
import { PostsModule } from './modules/posts/posts.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuthModule } from './modules/auth/auth.module';
@Module({
  imports: [
    //Cau hinh bien moi truong
    ConfigModule.forRoot({
      // Cấu hình để đọc file .env
      envFilePath: `.env.${process.env.NODE_ENV}`,
      // Cấu hình để dùng toàn cục không cần import lại
      isGlobal: true,
      validate,
    }),
    //Cau hinh ket noi database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: configService.get<DatabaseType>('DB_TYPE') as DatabaseType,
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        logging: configService.get<boolean>('DB_LOGGING') === true,
        /** __dirname là đường dẫn thực tại thời điểm runtime, nên sẽ đúng cả khi bạn chạy ở src (dev) hoặc dist (prod) */
        entities: [__dirname + '/modules/**/entities/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // Chỉ bật synchronize trong development
      }),
    }),
    // Các module khác của bạn
    PostsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
