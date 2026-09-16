import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MonitorChecksConfig } from '@config/monitor-checks.config';
import { MonitorChecksRepository } from '../repositories/monitor-checks.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Deletes monitor_checks rows past the retention window. Called on a cron by
 * the scheduler process only — running this from more than one replica would
 * just duplicate wasted work, never cause incorrect data, but there is no
 * reason to pay for it twice.
 */
@Injectable()
export class MonitorChecksRetentionService {
  private readonly logger = new Logger(MonitorChecksRetentionService.name);

  constructor(
    private readonly monitorChecksRepository: MonitorChecksRepository,
    private readonly configService: ConfigService,
  ) {}

  async purgeExpired(): Promise<number> {
    const { retentionDays } = this.configService.getOrThrow<MonitorChecksConfig>('monitorChecks');
    const cutoff = new Date(Date.now() - retentionDays * MS_PER_DAY);

    const deleted = await this.monitorChecksRepository.deleteOlderThan(cutoff);
    this.logger.log(`Purged ${deleted} monitor_checks rows older than ${retentionDays} days`);
    return deleted;
  }
}
