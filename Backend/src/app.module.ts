import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from '@config/config.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { AppLoggerModule } from '@infrastructure/logger/logger.module';
import { HttpModule } from '@infrastructure/http/http.module';
import { MailerModule } from '@infrastructure/mailer/mailer.module';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { TypeOrmErrorFilter } from '@common/filters/typeorm-error.filter';
import { ResponseEnvelopeInterceptor } from '@common/interceptors/response-envelope.interceptor';
import { TimingInterceptor } from '@common/interceptors/timing.interceptor';
import { RequestIdMiddleware } from '@common/middleware/request-id.middleware';
import { HealthModule } from '@health/health.module';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    DatabaseModule,
    RedisModule,
    HttpModule,
    MailerModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: TypeOrmErrorFilter },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TimingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
