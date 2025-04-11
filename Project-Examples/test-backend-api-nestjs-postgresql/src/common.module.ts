import { Module } from '@nestjs/common';
import { PasswordService } from './common/providers/password';

/**
 * CommonModule
 * This module provides common services that can be used across the application.
 */
@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class CommonModule {}
