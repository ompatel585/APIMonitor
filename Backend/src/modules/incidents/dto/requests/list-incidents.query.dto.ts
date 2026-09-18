import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { INCIDENT_STATUSES, type IncidentStatus } from '../../constants/incident-status';

export class ListIncidentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  monitorId?: string;

  @ApiPropertyOptional({ enum: Object.values(INCIDENT_STATUSES) })
  @IsOptional()
  @IsIn(Object.values(INCIDENT_STATUSES))
  status?: IncidentStatus;
}
