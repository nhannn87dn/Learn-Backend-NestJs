import {
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService implements OnModuleDestroy, OnApplicationShutdown {
  constructor(private configService: ConfigService) {}

  onModuleDestroy() {
    console.log('🧹 Cleaning up module-specific resources...');
  }

  onApplicationShutdown(signal: string) {
    console.log(`⚠️ App shutdown due to: ${signal}`);
  }

  getHello(): string {
    console.log(this.configService.get('NODE_ENV'));
    console.log(this.configService.get('PORT'));
    return 'Hello World!';
  }
}
