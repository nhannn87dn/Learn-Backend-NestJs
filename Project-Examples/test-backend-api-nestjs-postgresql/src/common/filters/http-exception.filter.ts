// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  // HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    //log stack trace
    console.error(exception.stack);
    const request = ctx.getRequest<Request>();
    console.log('🚀 request.body===>>', request.body);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const safeErrorResponse: Record<string, unknown> =
      typeof errorResponse === 'object' && errorResponse !== null
        ? (errorResponse as Record<string, unknown>)
        : {};

    response.status(status).json({
      status: 'error',
      statusCode: status,
      message: (safeErrorResponse['message'] as string) || exception.message,
      ...(typeof safeErrorResponse['errors'] === 'object' &&
      safeErrorResponse['errors'] !== null
        ? { errors: safeErrorResponse['errors'] }
        : {}),
      data: null,
    });
  }
}
