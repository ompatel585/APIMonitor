import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { QueueConfig } from '@config/queue.config';
import { QUEUE_NAMES } from './queue.constants';
import { MonitorCheckQueueProducer } from './monitor-check-queue.producer';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queue = configService.getOrThrow<QueueConfig>('queue');
        return {
          connection: {
            host: queue.redisHost,
            port: queue.redisPort,
            password: queue.redisPassword,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.MONITOR_CHECK }),
  ],
  providers: [MonitorCheckQueueProducer],
  exports: [BullModule, MonitorCheckQueueProducer],
})
export class QueueModule {}
