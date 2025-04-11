import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SignInDto } from './dto/sign-in.dto';
import { ISignIn } from './interfaces/auth.interface';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    return await this.usersService.validateUserByEmail(email, password);
  }
  async signIn(signInDto: SignInDto): Promise<ISignIn> {
    const user = await this.usersService.validateUserByEmail(
      signInDto.email,
      signInDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    // TODO: Generate a JWT and return it here

    // attachment refresh token to cookie
    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name,
        permissions: user.role?.permissions.map((p) => p.name) ?? [],
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, revoked: false },
      relations: ['user', 'user.role', 'user.role.permissions'],
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > token.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = token.user;

    // Revoke the old refresh token
    await this.refreshTokenRepository.update(token.id, { revoked: true });

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    await this.refreshTokenRepository.update(
      { user: { id: userId }, token: refreshToken, revoked: false },
      { revoked: true },
    );

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: Omit<User, 'password'>): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      name: user.name,
      role: user.role?.name,
      permissions: user.role?.permissions.map((p) => p.name) ?? [],
    };

    const accessToken = this.jwtService.sign(payload);

    // Create refresh token (valid for 7 days)
    const refreshToken = this.jwtService.sign(payload);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      token: refreshToken,
      expiresAt,
      user: { id: user.id },
      revoked: false,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
