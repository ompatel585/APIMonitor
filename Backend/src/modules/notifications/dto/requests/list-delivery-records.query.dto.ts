import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class ListDeliveryRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Mutually exclusive with alertId; exactly one of the two is required' })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Mutually exclusive with channelId; exactly one of the two is required' })
  @IsOptional()
  @IsUUID()
  alertId?: string;
}
