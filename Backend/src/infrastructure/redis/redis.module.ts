import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { RedisConfig } from '@config/redis.config';
import { CacheService } from './cache.service';
import { LockService } from './lock.service';

export const REDIS_CACHE_CLIENT = 'REDIS_CACHE_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_CACHE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const redis = configService.getOrThrow<RedisConfig>('redis');
        return new Redis({
          host: redis.host,
          port: redis.port,
          password: redis.password,
        });
      },
    },
    CacheService,
    LockService,
  ],
  exports: [CacheService, LockService],
})
export class RedisModule {}
