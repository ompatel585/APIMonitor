import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { RequirePermission } from '@modules/auth/decorators/require-permission.decorator';
import { PERMISSIONS } from '@modules/auth/constants/permissions';
import { MonitorsService } from '../services/monitors.service';
import { CreateMonitorDto } from '../dto/requests/create-monitor.dto';
import { UpdateMonitorDto } from '../dto/requests/update-monitor.dto';
import { MonitorResponseDto } from '../dto/responses/monitor.response.dto';
import { toMonitorResponseDto } from '../mappers/monitor.mapper';

@ApiTags('monitors')
@Controller('organizations/:orgId/projects/:projectId/monitors')
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @RequirePermission(PERMISSIONS.MONITOR_CREATE)
  @ApiCreatedResponse({ type: MonitorResponseDto })
  @Post()
  async create(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('projectId', ParseUuidPipe) projectId: string,
    @Body() dto: CreateMonitorDto,
  ): Promise<MonitorResponseDto> {
    const monitor = await this.monitorsService.create(orgId, { ...dto, projectId });
    return toMonitorResponseDto(monitor);
  }

  @RequirePermission(PERMISSIONS.MONITOR_READ)
  @ApiOkResponse({ type: MonitorResponseDto, isArray: true })
  @Get()
  async list(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('projectId', ParseUuidPipe) projectId: string,
  ): Promise<MonitorResponseDto[]> {
    const monitors = await this.monitorsService.listByProject(orgId, projectId);
    return monitors.map(toMonitorResponseDto);
  }

  @RequirePermission(PERMISSIONS.MONITOR_READ)
  @ApiOkResponse({ type: MonitorResponseDto })
  @Get(':id')
  async findOne(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<MonitorResponseDto> {
    const monitor = await this.monitorsService.findByIdOrThrow(orgId, id);
    return toMonitorResponseDto(monitor);
  }

  @RequirePermission(PERMISSIONS.MONITOR_UPDATE)
  @ApiOkResponse({ type: MonitorResponseDto })
  @Patch(':id')
  async update(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateMonitorDto,
  ): Promise<MonitorResponseDto> {
    const monitor = await this.monitorsService.update(orgId, id, dto);
    return toMonitorResponseDto(monitor);
  }

  @RequirePermission(PERMISSIONS.MONITOR_UPDATE)
  @ApiOkResponse({ type: MonitorResponseDto })
  @Post(':id/actions/pause')
  async pause(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<MonitorResponseDto> {
    const monitor = await this.monitorsService.pause(orgId, id);
    return toMonitorResponseDto(monitor);
  }

  @RequirePermission(PERMISSIONS.MONITOR_UPDATE)
  @ApiOkResponse({ type: MonitorResponseDto })
  @Post(':id/actions/resume')
  async resume(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<MonitorResponseDto> {
    const monitor = await this.monitorsService.resume(orgId, id);
    return toMonitorResponseDto(monitor);
  }

  @RequirePermission(PERMISSIONS.MONITOR_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<void> {
    await this.monitorsService.remove(orgId, id);
  }
}
