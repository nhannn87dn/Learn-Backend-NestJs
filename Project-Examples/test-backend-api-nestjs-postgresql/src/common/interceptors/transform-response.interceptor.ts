// src/common/interceptors/transform-response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { map, Observable } from 'rxjs';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<{
    status: 'success' | 'error';
    statusCode: number;
    message: string;
    data: any;
  }> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<import('express').Response>();

    return next.handle().pipe(
      map((data: { message?: string; data?: unknown; meta?: unknown }) => {
        const statusCode = response.statusCode || 200;
        /** Loại bỏ các trường đánh dấu exclude trong entity ra khỏi object */
        const reData =
          typeof data?.data !== 'undefined'
            ? instanceToPlain(data.data)
            : instanceToPlain(data);
        return {
          status: 'success',
          statusCode,
          message: data?.message || 'successful',
          errors: null,
          data: reData,
          meta: data?.meta !== undefined ? data.meta : undefined, // if not present, do not display
        };
      }),
    );
  }
}
