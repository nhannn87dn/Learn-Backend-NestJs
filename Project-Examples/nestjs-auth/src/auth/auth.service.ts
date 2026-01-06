// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RedisService } from '../redis/redis.service';

interface TokenPayload {
  sub: string;
  email: string;
  jti: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async register(
    email: string,
    password: string,
  ): Promise<Partial<User>> {
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await argon2.hash(password);
    const user = this.usersRepository.create({
      email,
      passwordHash,
    });

    const savedUser = await this.usersRepository.save(user);
    delete savedUser.passwordHash;
    return savedUser;
  }

  async login(
    email: string,
    password: string,
    deviceInfo?: any,
    ipAddress?: string,
  ): Promise<LoginResponse> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      deviceInfo,
      ipAddress,
    );

    delete user.passwordHash;
    return { accessToken, refreshToken, user };
  }

  async generateTokens(
    user: User,
    deviceInfo?: any,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessTokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      jti: accessJti,
      type: 'access',
    };

    const refreshTokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      jti: refreshJti,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
    });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });

    // Lưu refresh token vào database
    const refreshTokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokensRepository.save({
      userId: user.id,
      tokenHash: refreshTokenHash,
      deviceInfo,
      ipAddress,
      expiresAt,
    });

    // Cache device fingerprint
    const deviceFingerprint = this.generateDeviceFingerprint(
      deviceInfo,
      ipAddress,
    );
    const accessTtl = 15 * 60; // 15 minutes
    await this.redisService.storeDeviceFingerprint(
      user.id,
      accessJti,
      deviceFingerprint,
      accessTtl,
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
    deviceInfo?: any,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: TokenPayload;

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Kiểm tra blacklist
    const isBlacklisted = await this.redisService.isRefreshTokenBlacklisted(
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

    // Verify refresh token trong database
    const storedTokens = await this.refreshTokensRepository.find({
      where: { userId: payload.sub, revokedAt: null },
    });

    let isValid = false;
    for (const token of storedTokens) {
      if (await argon2.verify(token.tokenHash, refreshToken)) {
        isValid = true;
        // Thu hồi token cũ
        await this.refreshTokensRepository.update(token.id, {
          revokedAt: new Date(),
        });
        break;
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Tạo tokens mới
    return this.generateTokens(user, deviceInfo, ipAddress);
  }

  async logout(userId: string, accessJti: string, accessExp: number): Promise<void> {
    // Blacklist access token
    await this.redisService.blacklistAccessToken(userId, accessJti, accessExp);

    // Thu hồi tất cả refresh tokens trong database
    await this.refreshTokensRepository.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );

    // Xóa cached permissions
    await this.redisService.invalidateUserPermissions(userId);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    // Đánh dấu tất cả tokens bị revoke
    await this.redisService.revokeAllUserTokens(userId);

    // Thu hồi refresh tokens trong database
    await this.refreshTokensRepository.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );

    // Xóa cached permissions
    await this.redisService.invalidateUserPermissions(userId);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    // Kiểm tra cache trước
    const cached = await this.redisService.getCachedUserPermissions(userId);
    if (cached) {
      return cached;
    }

    // Load từ database
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      return [];
    }

    const permissions = user.roles.flatMap((role) =>
      role.permissions.map((p) => `${p.resource}:${p.action}`),
    );

    const uniquePermissions = [...new Set(permissions)];

    // Cache lại
    await this.redisService.cacheUserPermissions(userId, uniquePermissions);

    return uniquePermissions;
  }

  async verifyDeviceFingerprint(
    userId: string,
    jti: string,
    deviceInfo: any,
    ipAddress: string,
  ): Promise<boolean> {
    const fingerprint = this.generateDeviceFingerprint(deviceInfo, ipAddress);
    return this.redisService.verifyDeviceFingerprint(userId, jti, fingerprint);
  }

  private generateDeviceFingerprint(deviceInfo: any, ipAddress: string): string {
    const data = JSON.stringify({ deviceInfo, ipAddress });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}