import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { IAuthPayload } from '../interfaces/auth.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret', // Trong production nên sử dụng biến môi trường
    });
  }

  validate(payload: IAuthPayload) {
    // Thông tin này sẽ được đính kèm vào request.user
    return {
      id: payload.sub,
      name: payload.name,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
