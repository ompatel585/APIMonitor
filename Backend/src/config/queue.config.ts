import { registerAs } from '@nestjs/config';

export type QueueConfig = {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
};

export const queueConfig = registerAs(
  'queue',
  (): QueueConfig => ({
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    redisPassword: process.env.REDIS_PASSWORD || undefined,
  }),
);
