import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { RedisConfig } from '@config/redis.config';
import { REDIS_CACHE_CLIENT } from './redis.constants';
import { CacheService } from './cache.service';
import { LockService } from './lock.service';

@Global()
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
