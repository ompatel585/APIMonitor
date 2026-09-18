import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min } from 'class-validator';

export class AlertRuleEscalationDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  afterMinutesUnacknowledged!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  channelIds!: string[];
}
