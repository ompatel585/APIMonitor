import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '@modules/users/users.module';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { MailerModule } from '@infrastructure/mailer/mailer.module';
import { AuthController } from './controllers/auth.controller';
import { PasswordController } from './controllers/password.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';
import { PermissionService } from './services/permission.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PoliciesGuard } from './guards/policies.guard';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetTokensRepository } from './repositories/password-reset-tokens.repository';
import { EmailVerificationTokensRepository } from './repositories/email-verification-tokens.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, PasswordResetToken, EmailVerificationToken]),
    JwtModule.register({}),
    UsersModule,
    OrganizationsModule,
    MailerModule,
  ],
  controllers: [AuthController, PasswordController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    SessionService,
    PermissionService,
    PasswordResetTokensRepository,
    EmailVerificationTokensRepository,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
  ],
  exports: [PermissionService],
})
export class AuthModule {}
