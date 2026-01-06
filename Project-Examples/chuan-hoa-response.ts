// ============================================
// 1. INTERFACES & TYPES
// ============================================

// common/interfaces/response.interface.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: ErrorDetail;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    pagination: PaginationMeta;
  };
  timestamp: string;
  path: string;
}

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: any;
}

// ============================================
// 2. RESPONSE BUILDER
// ============================================

// common/builders/response.builder.ts
import { Request } from 'express';

export class ResponseBuilder {
  static success<T>(
    data: T,
    message = 'Success',
    request?: Request,
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      path: request?.url || '',
    };
  }

  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    message = 'Success',
    request?: Request,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      message,
      data: {
        items,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      timestamp: new Date().toISOString(),
      path: request?.url || '',
    };
  }

  static error(
    code: string,
    message: string,
    details?: any,
    request?: Request,
  ): ApiResponse {
    return {
      success: false,
      message: 'Error occurred',
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path: request?.url || '',
    };
  }
}

// ============================================
// 3. INTERCEPTOR
// ============================================

// common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const RESPONSE_MESSAGE_KEY = 'response_message';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const message = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    ) || 'Success';

    return next.handle().pipe(
      map((data) => {
        // Nếu data đã là response đúng format, trả về luôn
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Nếu data có pagination info
        if (data && data.items && data.pagination) {
          return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        // Response thông thường
        return ResponseBuilder.success(data, message, request);
      }),
    );
  }
}

// ============================================
// 4. DECORATOR
// ============================================

// common/decorators/response-message.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);

// ============================================
// 5. EXCEPTION FILTER
// ============================================

// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        details = (exceptionResponse as any).error;
      } else {
        message = exceptionResponse as string;
      }
      
      code = HttpStatus[status] || code;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = ResponseBuilder.error(
      code,
      message,
      details,
      request,
    );

    response.status(status).json(errorResponse);
  }
}

// ============================================
// 6. DTOs
// ============================================

// common/dto/pagination.dto.ts
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

// ============================================
// 7. SERVICE HELPER
// ============================================

// common/helpers/pagination.helper.ts
import { PaginationDto } from '../dto/pagination.dto';

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class PaginationHelper {
  static paginate<T>(
    items: T[],
    total: number,
    paginationDto: PaginationDto,
  ): PaginatedResult<T> {
    const { page = 1, limit = 10 } = paginationDto;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}

// ============================================
// 8. MAIN SETUP
// ============================================

// main.ts
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Global interceptors
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
bootstrap();

// ============================================
// 9. USAGE EXAMPLES
// ============================================

// users/users.controller.ts
import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Example 1: List với phân trang
  @Get()
  @ResponseMessage('Get users successfully')
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  // Example 2: Get single resource
  @Get(':id')
  @ResponseMessage('Get user successfully')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Example 3: Create resource
  @Post()
  @ResponseMessage('User created successfully')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}

// users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PaginationHelper } from '../common/helpers/pagination.helper';

@Injectable()
export class UsersService {
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    
    // Query database with pagination
    const [users, total] = await Promise.all([
      // Your database query here
      this.getUsersFromDB(page, limit),
      this.getTotalUsersCount(),
    ]);

    return PaginationHelper.paginate(users, total, paginationDto);
  }

  async findOne(id: string) {
    // Return data trực tiếp, interceptor sẽ wrap
    return { id, name: 'John Doe', email: 'john@example.com' };
  }

  async create(createUserDto: CreateUserDto) {
    // Create user logic
    return { id: '1', ...createUserDto };
  }

  private async getUsersFromDB(page: number, limit: number) {
    // Mock data - thay bằng query thực tế
    return [
      { id: '1', name: 'User 1' },
      { id: '2', name: 'User 2' },
    ];
  }

  private async getTotalUsersCount() {
    return 100; // Mock total count
  }
}