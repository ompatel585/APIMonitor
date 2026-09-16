import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '@modules/projects/projects.module';
import { MonitorsController } from './controllers/monitors.controller';
import { MonitorsService } from './services/monitors.service';
import { MonitorsRepository } from './repositories/monitors.repository';
import { Monitor } from './entities/monitor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Monitor]), ProjectsModule],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsRepository],
  exports: [MonitorsService],
})
export class MonitorsModule {}
