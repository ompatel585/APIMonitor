import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DatabaseConfig } from '@config/database.config';
import type { AppConfig } from '@config/app.config';
import { TransactionService } from './transaction.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const database = configService.getOrThrow<DatabaseConfig>('database');
        const app = configService.getOrThrow<AppConfig>('app');

        return {
          type: 'postgres' as const,
          url: database.url,
          entities: ['dist/modules/**/entities/*.entity.js'],
          migrations: ['dist/infrastructure/database/migrations/*.js'],
          synchronize: false,
          poolSize: database.poolSize,
          logging: app.nodeEnv === 'development',
        };
      },
    }),
  ],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class DatabaseModule {}
