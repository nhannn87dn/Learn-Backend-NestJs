# Custom Exception Handling trong NestJS

Bộ **Exception Handling** đầy đủ, tổ chức chuyên nghiệp, dễ maintain, phù hợp với dự án NestJS thực tế dùng PostgreSQL và JWT.

---

## 📁 Cấu trúc folder

```
src/
├── common/
│   ├── filters/
│   │   ├── all-exceptions.filter.ts
│   │   ├── database-exception.filter.ts
│   │   ├── http-exception.filter.ts
│   │   ├── jwt-exception.filter.ts
│   │   └── base.exception.ts
│   └── interfaces/
│       └── error-response.interface.ts
```

---

## ✅ 1. Interface lỗi chuẩn

```ts
// src/common/interfaces/error-response.interface.ts
export interface ErrorResponse {
  status: 'error';
  statusCode: number;
  message: string;
  errors?: string[] | Record<string, string[]>;
  path: string;
  timestamp: string;
  data: null;
}
```

---

## ✅ 2. Exception cơ sở (BaseException)

```ts
// src/common/filters/base.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message }, status);
  }
}
```

---

## ✅ 3. HttpExceptionFilter (Validation, NotFound, ...)

```ts
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const response = exception.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as any)?.message || 'Unknown error';

    const errorResponse: ErrorResponse = {
      status: 'error',
      statusCode: status,
      message: Array.isArray(message) ? 'Validation failed' : message,
      errors: Array.isArray(message) ? message : undefined,
      path: req.url,
      timestamp: new Date().toISOString(),
      data: null,
    };

    res.status(status).json(errorResponse);
  }
}
```

---

## ✅ 4. AllExceptionsFilter (fallback cho mọi lỗi)

```ts
// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: ErrorResponse = {
      status: 'error',
      statusCode: status,
      message: exception?.message || 'Internal server error',
      path: req.url,
      timestamp: new Date().toISOString(),
      data: null,
    };

    res.status(status).json(errorResponse);
  }
}
```

---

## ✅ 5. DatabaseExceptionFilter (ví dụ với PostgreSQL)

```ts
// src/common/filters/database-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const errorResponse: ErrorResponse = {
      status: 'error',
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Database query error',
      errors: [exception.message],
      path: req.url,
      timestamp: new Date().toISOString(),
      data: null,
    };

    res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  }
}
```

---

## ✅ 6. JwtExceptionFilter (JWT lỗi sai, hết hạn, v.v.)

```ts
// src/common/filters/jwt-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/error-response.interface';

@Catch(UnauthorizedException)
export class JwtExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const errorResponse: ErrorResponse = {
      status: 'error',
      statusCode: 401,
      message: 'Unauthorized - Invalid or expired token',
      errors: [exception.message],
      path: req.url,
      timestamp: new Date().toISOString(),
      data: null,
    };

    res.status(401).json(errorResponse);
  }
}
```

---

## 🚀 Dùng toàn cục trong `main.ts`

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { JwtExceptionFilter } from './common/filters/jwt-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new DatabaseExceptionFilter(),
    new JwtExceptionFilter(),
    new AllExceptionsFilter(),
  );

  await app.listen(3000);
}
bootstrap();
```

---

