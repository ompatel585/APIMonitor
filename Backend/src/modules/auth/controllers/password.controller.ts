import { Body, Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@common/decorators/public.decorator';
import { UsersService } from '@modules/users/services/users.service';
import { AuthService } from '../services/auth.service';
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from '../dto/requests/reset-password.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../types/authenticated-request.type';

@ApiTags('auth')
@Controller('auth/password')
export class PasswordController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset/request')
  async requestReset(@Body() dto: RequestPasswordResetDto): Promise<void> {
    await this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset/confirm')
  async confirmReset(@Body() dto: ConfirmPasswordResetDto): Promise<void> {
    await this.authService.confirmPasswordReset(dto.token, dto.newPassword);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verify-email/request')
  async requestVerification(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    const found = await this.usersService.findById(user.id);
    await this.authService.requestEmailVerification(user.id, found.email);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verify-email/confirm')
  async confirmVerification(@Query('token') token: string): Promise<void> {
    await this.authService.confirmEmailVerification(token);
  }
}
