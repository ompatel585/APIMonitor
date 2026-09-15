import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthConfig } from '@config/auth.config';
import { SessionService } from '../services/session.service';
import type { AccessTokenClaims } from '../services/token.service';
import type { AuthenticatedUser } from '../types/authenticated-request.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {
    const authConfig = configService.getOrThrow<AuthConfig>('auth');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.accessTokenSecret,
    });
  }

  async validate(payload: AccessTokenClaims): Promise<AuthenticatedUser> {
    const isRevoked = await this.sessionService.isSessionRevoked(payload.sid);
    if (isRevoked) {
      throw new UnauthorizedException('Session has been revoked');
    }

    return { id: payload.sub, sessionId: payload.sid };
  }
}
