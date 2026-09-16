import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorsModule } from '@modules/monitors/monitors.module';
import { MonitorChecksRepository } from './repositories/monitor-checks.repository';
import { MonitorChecksService } from './services/monitor-checks.service';
import { MonitorChecksRetentionService } from './services/monitor-checks-retention.service';
import { MonitorCheck } from './entities/monitor-check.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MonitorCheck]), MonitorsModule],
  providers: [MonitorChecksRepository, MonitorChecksService, MonitorChecksRetentionService],
  exports: [MonitorChecksService, MonitorChecksRetentionService],
})
export class MonitorChecksModule {}
