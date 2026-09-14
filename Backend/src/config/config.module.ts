import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './app.config';
import { authConfig } from './auth.config';
import { databaseConfig } from './database.config';
import { mailConfig } from './mail.config';
import { queueConfig } from './queue.config';
import { redisConfig } from './redis.config';
import { validateEnv } from './validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      load: [appConfig, authConfig, databaseConfig, redisConfig, queueConfig, mailConfig],
    }),
  ],
})
export class AppConfigModule {}
