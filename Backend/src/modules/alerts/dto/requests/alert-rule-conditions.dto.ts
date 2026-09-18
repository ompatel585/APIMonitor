import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class AlertRuleConditionsDto {
  @ApiPropertyOptional({ enum: ['MINOR', 'MAJOR', 'CRITICAL'] })
  @IsOptional()
  @IsIn(['MINOR', 'MAJOR', 'CRITICAL'])
  minSeverity?: 'MINOR' | 'MAJOR' | 'CRITICAL';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  causes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minDurationSeconds?: number;
}
