import { registerAs } from '@nestjs/config';

export type AppConfig = {
  nodeEnv: string;
  role: string;
  port: number;
  corsOrigin: string;
};

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    role: process.env.APP_ROLE ?? 'api',
    port: parseInt(process.env.APP_PORT ?? '3001', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  }),
);
