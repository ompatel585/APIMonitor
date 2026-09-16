import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MONITOR_METHODS, type MonitorMethod } from '../../entities/monitor.entity';
import { ALLOWED_INTERVAL_SECONDS, MAX_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_CONSECUTIVE_THRESHOLD } from '../../constants/monitor-defaults';

export class CreateMonitorDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @ApiPropertyOptional({ enum: MONITOR_METHODS, default: 'GET' })
  @IsOptional()
  @IsIn(MONITOR_METHODS)
  method?: MonitorMethod;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({ enum: ALLOWED_INTERVAL_SECONDS })
  @IsIn(ALLOWED_INTERVAL_SECONDS)
  intervalSeconds!: number;

  @ApiPropertyOptional({ minimum: MIN_TIMEOUT_MS, maximum: MAX_TIMEOUT_MS })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_TIMEOUT_MS)
  @Max(MAX_TIMEOUT_MS)
  timeoutMs?: number;

  @ApiPropertyOptional({ type: [Number], default: [200] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  expectedStatusCodes?: number[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  followRedirects?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  degradedThresholdMs?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_CONSECUTIVE_THRESHOLD })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CONSECUTIVE_THRESHOLD)
  consecutiveFailureThreshold?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_CONSECUTIVE_THRESHOLD })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CONSECUTIVE_THRESHOLD)
  consecutiveSuccessThreshold?: number;
}
