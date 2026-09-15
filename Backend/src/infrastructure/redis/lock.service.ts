import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CACHE_CLIENT } from './redis.constants';

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export type Lock = {
  key: string;
  token: string;
};

@Injectable()
export class LockService {
  constructor(@Inject(REDIS_CACHE_CLIENT) private readonly redis: Redis) {}

  async acquire(key: string, ttlSeconds: number): Promise<Lock | null> {
    const token = randomUUID();
    const result = await this.redis.set(key, token, 'EX', ttlSeconds, 'NX');

    if (result !== 'OK') {
      return null;
    }

    return { key, token };
  }

  async release(lock: Lock): Promise<boolean> {
    const result = await this.redis.eval(RELEASE_SCRIPT, 1, lock.key, lock.token);
    return result === 1;
  }
}
