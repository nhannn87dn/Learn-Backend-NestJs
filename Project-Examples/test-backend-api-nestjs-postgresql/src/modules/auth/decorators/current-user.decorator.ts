import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuth } from '../interfaces/auth.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: IAuth }>();
    return request.user;
  },
);
