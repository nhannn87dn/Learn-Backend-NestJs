import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SignInDto } from './dto/sign-in.dto';
import { IAuth } from './interfaces/auth.interface';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() signInDto: SignInDto,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.signIn(signInDto);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      path: '/auth/refresh-token',
      secure: true, // Đặt thành true nếu sử dụng HTTPS
      sameSite: 'strict',
    });

    return {
      user,
      accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: { user: IAuth }): IAuth {
    return req.user;
  }

  @Post('refresh')
  async refresh(@Req() req: Request & { cookies: { [key: string]: string } }) {
    const refreshToken: string = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }
    return this.authService.refreshToken({
      refreshToken,
    } as RefreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: Request & { user: IAuth; cookies: { [key: string]: string } },
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }
    return this.authService.logout(req.user.id, refreshToken);
  }
}
