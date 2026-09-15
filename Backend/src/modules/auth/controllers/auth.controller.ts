import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import type { AppConfig } from '@config/app.config';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/requests/register.dto';
import { LoginDto } from '../dto/requests/login.dto';
import { AuthTokensResponseDto } from '../dto/responses/auth-tokens.response.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../types/authenticated-request.type';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResponseDto> {
    const tokens = await this.authService.register(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResponseDto> {
    const tokens = await this.authService.login({
      ...dto,
      deviceInfo: req.headers['user-agent'] ?? null,
    });
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResponseDto> {
    const presentedToken = this.readRefreshCookie(req);
    const tokens = await this.authService.refresh(presentedToken, req.headers['user-agent'] ?? null);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const presentedToken = this.readRefreshCookie(req);
    await this.authService.logout(user.sessionId, presentedToken);
    res.clearCookie(REFRESH_TOKEN_COOKIE);
  }

  private readRefreshCookie(req: Request): string {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return token;
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const appConfig = this.configService.getOrThrow<AppConfig>('app');

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: appConfig.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
  }
}
