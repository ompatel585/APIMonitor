import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@infrastructure/redis/cache.service';
import { parseDurationSeconds } from '@common/utils/duration.util';
import type { AuthConfig } from '@config/auth.config';

const DENYLIST_KEY_PREFIX = 'cache:auth:denylist:session:';

@Injectable()
export class SessionService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async revokeSession(sessionId: string): Promise<void> {
    const authConfig = this.configService.getOrThrow<AuthConfig>('auth');
    const ttlSeconds = parseDurationSeconds(authConfig.accessTokenExpiresIn);
    await this.cacheService.set(`${DENYLIST_KEY_PREFIX}${sessionId}`, true, ttlSeconds);
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    const value = await this.cacheService.get<boolean>(`${DENYLIST_KEY_PREFIX}${sessionId}`);
    return value === true;
  }
}
