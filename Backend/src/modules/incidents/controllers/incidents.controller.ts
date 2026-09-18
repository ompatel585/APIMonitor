import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { CursorPageDto } from '@common/dto/cursor-page.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@common/types/authenticated-user.type';
import { RequirePermission } from '@modules/auth/decorators/require-permission.decorator';
import { PERMISSIONS } from '@modules/auth/constants/permissions';
import { IncidentsService } from '../services/incidents.service';
import { ListIncidentsQueryDto } from '../dto/requests/list-incidents.query.dto';
import { IncidentResponseDto } from '../dto/responses/incident.response.dto';
import { IncidentEventResponseDto } from '../dto/responses/incident-event.response.dto';
import { toIncidentEventResponseDto, toIncidentResponseDto } from '../mappers/incident.mapper';

@ApiTags('incidents')
@Controller('organizations/:orgId/incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @RequirePermission(PERMISSIONS.INCIDENT_READ)
  @ApiOkResponse({ type: CursorPageDto })
  @Get()
  async list(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Query() query: ListIncidentsQueryDto,
  ): Promise<CursorPageDto<IncidentResponseDto>> {
    const result = await this.incidentsService.list(
      orgId,
      { projectId: query.projectId, monitorId: query.monitorId, status: query.status },
      { limit: query.limit ?? 20, cursor: query.cursor },
    );

    return {
      items: result.items.map(toIncidentResponseDto),
      nextCursor: result.nextCursor,
    };
  }

  @RequirePermission(PERMISSIONS.INCIDENT_READ)
  @ApiOkResponse({ type: IncidentResponseDto })
  @Get(':id')
  async findOne(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentsService.findByIdOrThrow(orgId, id);
    return toIncidentResponseDto(incident);
  }

  @RequirePermission(PERMISSIONS.INCIDENT_READ)
  @ApiOkResponse({ type: IncidentEventResponseDto, isArray: true })
  @Get(':id/timeline')
  async timeline(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<IncidentEventResponseDto[]> {
    await this.incidentsService.findByIdOrThrow(orgId, id);
    const events = await this.incidentsService.listTimeline(id);
    return events.map(toIncidentEventResponseDto);
  }

  @RequirePermission(PERMISSIONS.INCIDENT_ACKNOWLEDGE)
  @ApiOkResponse({ type: IncidentResponseDto })
  @Post(':id/actions/acknowledge')
  async acknowledge(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentsService.acknowledge(orgId, id, user.id);
    return toIncidentResponseDto(incident);
  }

  @RequirePermission(PERMISSIONS.INCIDENT_RESOLVE)
  @ApiOkResponse({ type: IncidentResponseDto })
  @Post(':id/actions/resolve')
  async resolve(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IncidentResponseDto> {
    const incident = await this.incidentsService.resolveManually(orgId, id, user.id);
    return toIncidentResponseDto(incident);
  }
}
