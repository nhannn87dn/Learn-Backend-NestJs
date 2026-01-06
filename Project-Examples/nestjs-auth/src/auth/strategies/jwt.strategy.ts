// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

interface JwtPayload {
  sub: string;
  email: string;
  jti: string;
  type: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extract từ cookie
          return request?.cookies?.accessToken;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Kiểm tra blacklist
    const isBlacklisted = await this.redisService.isAccessTokenBlacklisted(
      payload.jti,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Kiểm tra user tokens có bị revoke không
    const isRevoked = await this.redisService.isUserTokensRevoked(
      payload.sub,
      payload.iat,
    );
    if (isRevoked) {
      throw new UnauthorizedException('All user tokens have been revoked');
    }

    // Verify device fingerprint (phát hiện token bị đánh cắp)
    const deviceInfo = request.headers['user-agent'];
    const ipAddress = request.ip || request.connection.remoteAddress;
    
    const isValidDevice = await this.redisService.verifyDeviceFingerprint(
      payload.sub,
      payload.jti,
      deviceInfo,
      ipAddress,
    );

    if (!isValidDevice) {
      // Token có thể đã bị đánh cắp
      await this.redisService.blacklistAccessToken(
        payload.sub,
        payload.jti,
        payload.exp,
      );
      throw new UnauthorizedException(
        'Token used from different device - possible theft detected',
      );
    }

    // Load user với roles và permissions
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Trả về user object để gắn vào request
    return {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}

// src/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: any) {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const isBlacklisted = await this.redisService.isRefreshTokenBlacklisted(
      payload.jti,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const isRevoked = await this.redisService.isUserTokensRevoked(
      payload.sub,
      payload.iat,
    );
    if (isRevoked) {
      throw new UnauthorizedException('All user tokens have been revoked');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      jti: payload.jti,
    };
  }
}