import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { UsersService } from '@modules/users/services/users.service';
import { OrganizationsService } from '@modules/organizations/services/organizations.service';
import { ValidationDomainException } from '@common/exceptions/validation.exception';
import { MailerService } from '@infrastructure/mailer/mailer.service';
import { passwordResetEmail } from '@infrastructure/mailer/templates/password-reset.template';
import { emailVerificationEmail } from '@infrastructure/mailer/templates/email-verification.template';
import { PasswordService } from './password.service';
import { TokenService, type IssuedTokens } from './token.service';
import { SessionService } from './session.service';
import { PasswordResetTokensRepository } from '../repositories/password-reset-tokens.repository';
import { EmailVerificationTokensRepository } from '../repositories/email-verification-tokens.repository';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
};

export type LoginInput = {
  email: string;
  password: string;
  deviceInfo: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly mailerService: MailerService,
    private readonly passwordResetTokensRepository: PasswordResetTokensRepository,
    private readonly emailVerificationTokensRepository: EmailVerificationTokensRepository,
  ) {}

  async register(input: RegisterInput): Promise<IssuedTokens> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ValidationDomainException('An account with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(input.password);

    const user = await this.usersService.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });

    await this.organizationsService.createWithOwner(input.organizationName, user.id);

    const sessionId = randomUUID();
    const accessToken = this.tokenService.signAccessToken(user.id, sessionId);
    const refreshToken = await this.tokenService.issueRefreshTokenFamily(user.id, null);

    return { accessToken, refreshToken };
  }

  async login(input: LoginInput): Promise<IssuedTokens> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new ValidationDomainException('Invalid email or password');
    }

    const isValid = await this.passwordService.verify(user.passwordHash, input.password);
    if (!isValid) {
      throw new ValidationDomainException('Invalid email or password');
    }

    const sessionId = randomUUID();
    const accessToken = this.tokenService.signAccessToken(user.id, sessionId);
    const refreshToken = await this.tokenService.issueRefreshTokenFamily(user.id, input.deviceInfo);

    return { accessToken, refreshToken };
  }

  async refresh(presentedRefreshToken: string, deviceInfo: string | null): Promise<IssuedTokens> {
    return this.tokenService.rotateRefreshToken(presentedRefreshToken, deviceInfo);
  }

  async logout(sessionId: string, refreshToken: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
    await this.tokenService.revokeByPresentedToken(refreshToken);
  }

  async logoutEverywhere(userId: string): Promise<void> {
    await this.tokenService.revokeAllForUser(userId);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    await this.passwordResetTokensRepository.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const { subject, text } = passwordResetEmail(token);
    await this.mailerService.send({ to: user.email, subject, text });
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const record = await this.passwordResetTokensRepository.findByTokenHash(hashToken(token));

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new ValidationDomainException('Invalid or expired reset token');
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.usersService.updatePasswordHash(record.userId, passwordHash);
    await this.passwordResetTokensRepository.markUsed(record.id);
    await this.tokenService.revokeAllForUser(record.userId);
  }

  async requestEmailVerification(userId: string, email: string): Promise<void> {
    const token = randomBytes(32).toString('hex');
    await this.emailVerificationTokensRepository.create({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    });

    const { subject, text } = emailVerificationEmail(token);
    await this.mailerService.send({ to: email, subject, text });
  }

  async confirmEmailVerification(token: string): Promise<void> {
    const record = await this.emailVerificationTokensRepository.findByTokenHash(hashToken(token));

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new ValidationDomainException('Invalid or expired verification token');
    }

    await this.usersService.markEmailVerified(record.userId);
    await this.emailVerificationTokensRepository.markUsed(record.id);
  }
}
