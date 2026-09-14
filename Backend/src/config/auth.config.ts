import { registerAs } from '@nestjs/config';

export type AuthConfig = {
  accessTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenSecret: string;
  refreshTokenExpiresIn: string;
};

export const authConfig = registerAs(
  'auth',
  (): AuthConfig => ({
    accessTokenSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  }),
);
