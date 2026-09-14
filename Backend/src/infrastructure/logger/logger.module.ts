import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { AppConfig } from '@config/app.config';
import { REDACTION_PATHS } from './redaction';
import { getRequestContext } from './request-context';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const app = configService.getOrThrow<AppConfig>('app');
        const isDevelopment = app.nodeEnv === 'development';

        return {
          pinoHttp: {
            level: isDevelopment ? 'debug' : 'info',
            transport: isDevelopment ? { target: 'pino-pretty' } : undefined,
            redact: { paths: REDACTION_PATHS, censor: '[REDACTED]' },
            customProps: () => {
              const context = getRequestContext();
              return {
                requestId: context?.requestId,
                correlationId: context?.correlationId,
                userId: context?.userId,
                organizationId: context?.organizationId,
              };
            },
          },
        };
      },
    }),
  ],
})
export class AppLoggerModule {}
