import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitorScheduleService } from '@modules/monitors/services/monitor-schedule.service';
import { MonitorChecksRetentionService } from '@modules/monitor-checks/services/monitor-checks-retention.service';

/**
 * Owns everything that must run on exactly one replica: rebuilding the
 * repeatable-job schedule at boot (so a restart or a manual Redis flush never
 * leaves an active monitor unscheduled) and the daily retention purge.
 */
@Injectable()
export class SchedulerBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerBootstrapService.name);

  constructor(
    private readonly monitorScheduleService: MonitorScheduleService,
    private readonly monitorChecksRetentionService: MonitorChecksRetentionService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Reconciling monitor schedule on scheduler startup');
    await this.monitorScheduleService.reconcileAll();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runRetention(): Promise<void> {
    await this.monitorChecksRetentionService.purgeExpired();
  }
}
