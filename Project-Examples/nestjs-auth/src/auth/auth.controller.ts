// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

class RegisterDto {
  email: string;
  password: string;
}

class LoginDto {
  email: string;
  password: string;
}

class RefreshTokenDto {
  refreshToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      acceptLanguage: req.headers['accept-language'],
    };
    const ipAddress = req.ip || req.connection.remoteAddress;

    const { accessToken, refreshToken, user } = await this.authService.login(
      loginDto.email,
      loginDto.password,
      deviceInfo,
      ipAddress,
    );

    // Set access token trong httpOnly cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Trả refresh token trong response body
    return {
      message: 'Login successful',
      refreshToken,
      user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      acceptLanguage: req.headers['accept-language'],
    };
    const ipAddress = req.ip || req.connection.remoteAddress;

    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      deviceInfo,
      ipAddress,
    );

    // Set access token mới trong cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    return {
      message: 'Tokens refreshed successfully',
      refreshToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.userId, user.jti, user.exp);

    // Xóa cookie
    res.clearCookie('accessToken');

    return {
      message: 'Logout successful',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('revoke-all')
  @HttpCode(HttpStatus.OK)
  async revokeAllTokens(
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokeAllUserTokens(userId);

    res.clearCookie('accessToken');

    return {
      message: 'All tokens revoked successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      userId: user.userId,
      email: user.email,
      roles: user.roles.map((r) => r.name),
    };
  }
}