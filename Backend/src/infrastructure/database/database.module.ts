import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DatabaseConfig } from '@config/database.config';
import type { AppConfig } from '@config/app.config';
import { TransactionService } from './transaction.service';

@Global()
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
          entities: [`${__dirname}/../../modules/**/entities/*.entity{.ts,.js}`],
          migrations: [`${__dirname}/migrations/*{.ts,.js}`],
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
