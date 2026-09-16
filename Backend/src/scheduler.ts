import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { SchedulerModule } from './scheduler/scheduler.module';
import type { AppConfig } from '@config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(SchedulerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

  await app.listen(appConfig.port);
}

void bootstrap();
