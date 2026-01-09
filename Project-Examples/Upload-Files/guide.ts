// ============================================
// 1. FILE UPLOAD CONFIGURATION
// ============================================
// src/common/config/multer.config.ts
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  destination?: string;
  allowedExtensions?: string[];
  maxSize?: number; // in bytes
  required?: boolean;
}

export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      // Get destination from request metadata (set by decorator)
      const uploadPath = req['uploadDestination'] || './uploads';
      
      // Ensure directory exists
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      
      callback(null, uploadPath);
    },
    filename: (req, file, callback) => {
      // Generate unique filename
      const fileExtension = extname(file.originalname);
      const baseName = file.originalname.replace(fileExtension, '');
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueId = uuidv4();
      const filename = `${sanitizedBaseName}-${uniqueId}${fileExtension}`;
      
      callback(null, filename);
    },
  }),
};

// ============================================
// 2. FILE VALIDATION PIPE
// ============================================
// src/common/pipes/file-validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { extname } from 'path';

export interface FileValidationOptions {
  allowedExtensions?: string[];
  maxSize?: number;
  required?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions = {}) {}

  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    // Check if file is required
    if (this.options.required && !file) {
      throw new BadRequestException({
        success: false,
        errorCode: 'FILE_001',
        message: 'File is required',
        details: 'No file was uploaded',
      });
    }

    // If file is optional and not provided, return null
    if (!file) {
      return null;
    }

    // Validate file extension
    if (this.options.allowedExtensions?.length > 0) {
      const fileExtension = extname(file.originalname).toLowerCase();
      const isValidExtension = this.options.allowedExtensions
        .map((ext) => ext.toLowerCase())
        .includes(fileExtension);

      if (!isValidExtension) {
        throw new BadRequestException({
          success: false,
          errorCode: 'FILE_002',
          message: 'Invalid file extension',
          details: `Allowed extensions: ${this.options.allowedExtensions.join(', ')}`,
        });
      }
    }

    // Validate file size
    if (this.options.maxSize && file.size > this.options.maxSize) {
      const maxSizeMB = (this.options.maxSize / (1024 * 1024)).toFixed(2);
      throw new BadRequestException({
        success: false,
        errorCode: 'FILE_003',
        message: 'File size exceeds limit',
        details: `Maximum file size is ${maxSizeMB}MB`,
      });
    }

    // Validate MIME type (additional security check)
    if (this.options.allowedExtensions?.length > 0) {
      const fileExtension = extname(file.originalname).toLowerCase();
      const expectedMimeTypes = this.getMimeTypesForExtensions(
        this.options.allowedExtensions,
      );
      
      if (!expectedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException({
          success: false,
          errorCode: 'FILE_004',
          message: 'Invalid file type',
          details: `File MIME type does not match extension`,
        });
      }
    }

    return file;
  }

  private getMimeTypesForExtensions(extensions: string[]): string[] {
    const mimeTypeMap: Record<string, string[]> = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.webp': ['image/webp'],
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      '.xls': ['application/vnd.ms-excel'],
      '.xlsx': [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      '.txt': ['text/plain'],
      '.csv': ['text/csv'],
      '.mp4': ['video/mp4'],
      '.avi': ['video/x-msvideo'],
      '.mov': ['video/quicktime'],
      '.mp3': ['audio/mpeg'],
      '.wav': ['audio/wav'],
    };

    const mimeTypes: string[] = [];
    extensions.forEach((ext) => {
      const types = mimeTypeMap[ext.toLowerCase()];
      if (types) {
        mimeTypes.push(...types);
      }
    });

    return mimeTypes;
  }
}

// ============================================
// 3. CUSTOM UPLOAD FILE DECORATOR
// ============================================
// src/common/decorators/upload-file.decorator.ts
import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';

export interface UploadFileOptions {
  destination: string;
  allowedExtensions?: string[];
  maxSize?: number; // in bytes
  required?: boolean;
  fieldName?: string;
}

export function UploadFile(options: UploadFileOptions) {
  const {
    destination,
    allowedExtensions = [],
    maxSize,
    fieldName = 'file',
  } = options;

  // Create multer options
  const multerOptions: MulterOptions = {
    storage: diskStorage({
      destination: (req, file, callback) => {
        // Ensure directory exists
        if (!existsSync(destination)) {
          mkdirSync(destination, { recursive: true });
        }
        callback(null, destination);
      },
      filename: (req, file, callback) => {
        const fileExtension = extname(file.originalname);
        const baseName = file.originalname.replace(fileExtension, '');
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        const uniqueId = uuidv4();
        const filename = `${sanitizedBaseName}-${uniqueId}${fileExtension}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      // Validate extension
      if (allowedExtensions.length > 0) {
        const fileExtension = extname(file.originalname).toLowerCase();
        const isValidExtension = allowedExtensions
          .map((ext) => ext.toLowerCase())
          .includes(fileExtension);

        if (!isValidExtension) {
          return callback(
            new Error(
              `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
            ),
            false,
          );
        }
      }

      callback(null, true);
    },
    limits: maxSize ? { fileSize: maxSize } : undefined,
  };

  return applyDecorators(UseInterceptors(FileInterceptor(fieldName, multerOptions)));
}

// ============================================
// 4. MULTIPLE FILES DECORATOR
// ============================================
// src/common/decorators/upload-files.decorator.ts
import { FilesInterceptor } from '@nestjs/platform-express';

export interface UploadFilesOptions {
  destination: string;
  allowedExtensions?: string[];
  maxSize?: number;
  maxCount?: number;
  fieldName?: string;
}

export function UploadFiles(options: UploadFilesOptions) {
  const {
    destination,
    allowedExtensions = [],
    maxSize,
    maxCount = 10,
    fieldName = 'files',
  } = options;

  const multerOptions: MulterOptions = {
    storage: diskStorage({
      destination: (req, file, callback) => {
        if (!existsSync(destination)) {
          mkdirSync(destination, { recursive: true });
        }
        callback(null, destination);
      },
      filename: (req, file, callback) => {
        const fileExtension = extname(file.originalname);
        const baseName = file.originalname.replace(fileExtension, '');
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        const uniqueId = uuidv4();
        const filename = `${sanitizedBaseName}-${uniqueId}${fileExtension}`;
        callback(null, filename);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (allowedExtensions.length > 0) {
        const fileExtension = extname(file.originalname).toLowerCase();
        const isValidExtension = allowedExtensions
          .map((ext) => ext.toLowerCase())
          .includes(fileExtension);

        if (!isValidExtension) {
          return callback(
            new Error(
              `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
            ),
            false,
          );
        }
      }
      callback(null, true);
    },
    limits: {
      fileSize: maxSize,
      files: maxCount,
    },
  };

  return applyDecorators(
    UseInterceptors(FilesInterceptor(fieldName, maxCount, multerOptions)),
  );
}

// ============================================
// 5. USAGE EXAMPLES IN CONTROLLERS
// ============================================
// src/modules/users/users.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  Body,
  UseGuards,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { UploadFile } from '../../common/decorators/upload-file.decorator';
import { UploadFiles } from '../../common/decorators/upload-files.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  // Example 1: Upload avatar with custom decorator
  @Post('avatar')
  @UploadFile({
    destination: './uploads/avatars',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    required: true,
  })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    return {
      message: 'Avatar uploaded successfully',
      filename: file.filename,
      path: file.path,
      size: file.size,
      url: `/uploads/avatars/${file.filename}`,
    };
  }

  // Example 2: Upload with NestJS built-in ParseFilePipeBuilder
  @Post('avatar-v2')
  @UploadFile({
    destination: './uploads/avatars',
  })
  async uploadAvatarV2(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return {
      message: 'Avatar uploaded successfully',
      file: file.filename,
    };
  }

  // Example 3: Multiple files upload
  @Post('documents')
  @UploadFiles({
    destination: './uploads/documents',
    allowedExtensions: ['.pdf', '.doc', '.docx'],
    maxSize: 10 * 1024 * 1024, // 10MB per file
    maxCount: 5,
  })
  async uploadDocuments(
    @UploadedFile() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    return {
      message: `${files.length} documents uploaded successfully`,
      files: files.map((file) => ({
        filename: file.filename,
        size: file.size,
        url: `/uploads/documents/${file.filename}`,
      })),
    };
  }
}

// ============================================
// 6. PRODUCTS CONTROLLER EXAMPLE
// ============================================
// src/modules/products/products.controller.ts
@Controller('products')
export class ProductsController {
  @Post('images')
  @UploadFiles({
    destination: './uploads/products',
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    maxSize: 3 * 1024 * 1024, // 3MB
    maxCount: 10,
  })
  async uploadProductImages(
    @UploadedFile() files: Express.Multer.File[],
  ) {
    return {
      message: 'Product images uploaded',
      images: files.map((f) => `/uploads/products/${f.filename}`),
    };
  }
}

// ============================================
// 7. MODULE CONFIGURATION
// ============================================
// src/modules/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get('UPLOAD_DESTINATION', './uploads'),
        limits: {
          fileSize: configService.get('MAX_FILE_SIZE', 10 * 1024 * 1024),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [MulterModule],
})
export class UploadModule {}

// ============================================
// 8. MAIN.TS - SERVE STATIC FILES
// ============================================
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(3000);
}
bootstrap();