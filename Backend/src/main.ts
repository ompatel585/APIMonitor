import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { writeFileSync } from 'node:fs';
import { AppModule } from './app.module';
import type { AppConfig } from '@config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('APIMonitor API').setVersion('1.0').build(),
  );

  writeFileSync('openapi.json', JSON.stringify(document));

  if (appConfig.nodeEnv !== 'production') {
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(appConfig.port);
}

void bootstrap();
