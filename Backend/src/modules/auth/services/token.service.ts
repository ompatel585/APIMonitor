import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { AuthConfig } from '@config/auth.config';
import { ValidationDomainException } from '@common/exceptions/validation.exception';
import { parseDurationMs } from '@common/utils/duration.util';
import { RefreshToken } from '../entities/refresh-token.entity';

export type AccessTokenClaims = {
  sub: string;
  sid: string;
};

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
};

type CreatedRefreshToken = {
  id: string;
  rawToken: string;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  private get authConfig(): AuthConfig {
    return this.configService.getOrThrow<AuthConfig>('auth');
  }

  signAccessToken(userId: string, sessionId: string): string {
    const claims: AccessTokenClaims = { sub: userId, sid: sessionId };
    return this.jwtService.sign(claims, {
      secret: this.authConfig.accessTokenSecret,
      expiresIn: this.authConfig.accessTokenExpiresIn,
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return this.jwtService.verify<AccessTokenClaims>(token, {
      secret: this.authConfig.accessTokenSecret,
    });
  }

  async issueRefreshTokenFamily(userId: string, deviceInfo: string | null): Promise<string> {
    const familyId = randomUUID();
    const created = await this.createRefreshToken(userId, familyId, deviceInfo);
    return created.rawToken;
  }

  async rotateRefreshToken(presentedToken: string, deviceInfo: string | null): Promise<IssuedTokens> {
    const presentedHash = hashToken(presentedToken);
    const existing = await this.refreshTokens.findOne({ where: { tokenHash: presentedHash } });

    if (!existing) {
      throw new ValidationDomainException('Invalid refresh token');
    }

    if (existing.revokedAt || existing.replacedById) {
      await this.revokeFamily(existing.familyId);
      throw new ValidationDomainException('Refresh token reuse detected; session revoked');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new ValidationDomainException('Refresh token expired');
    }

    const created = await this.createRefreshToken(existing.userId, existing.familyId, deviceInfo);

    await this.refreshTokens.update(
      { id: existing.id },
      { revokedAt: new Date(), replacedById: created.id },
    );

    const sessionId = randomUUID();
    const accessToken = this.signAccessToken(existing.userId, sessionId);

    return { accessToken, refreshToken: created.rawToken };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokens.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeByPresentedToken(presentedToken: string): Promise<void> {
    const presentedHash = hashToken(presentedToken);
    const existing = await this.refreshTokens.findOne({ where: { tokenHash: presentedHash } });
    if (existing) {
      await this.revokeFamily(existing.familyId);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokens.update({ userId }, { revokedAt: new Date() });
  }

  private async createRefreshToken(
    userId: string,
    familyId: string,
    deviceInfo: string | null,
  ): Promise<CreatedRefreshToken> {
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = this.parseExpiryToDate(this.authConfig.refreshTokenExpiresIn);

    const record = this.refreshTokens.create({
      userId,
      familyId,
      tokenHash: hashToken(rawToken),
      expiresAt,
      revokedAt: null,
      replacedById: null,
      deviceInfo,
    });

    const saved = await this.refreshTokens.save(record);
    return { id: saved.id, rawToken };
  }

  private parseExpiryToDate(expiresIn: string): Date {
    return new Date(Date.now() + parseDurationMs(expiresIn));
  }
}
