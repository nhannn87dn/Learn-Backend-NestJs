import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './common/configs/config.module';
import { BooksModule } from './modules/books/books.module';

@Module({
  imports: [
    //Cấu hình môi trường với ConfigModule
    AppConfigModule,
    BooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
