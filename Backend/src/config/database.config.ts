import { registerAs } from '@nestjs/config';

export type DatabaseConfig = {
  url: string;
  poolSize: number;
};

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    url: process.env.DATABASE_URL ?? '',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE ?? '10', 10),
  }),
);
