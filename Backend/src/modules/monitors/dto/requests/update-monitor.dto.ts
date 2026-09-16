import { ApiPropertyOptional } from '@nestjs/swagger';
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
  Length,
  Max,
  Min,
} from 'class-validator';
import { MONITOR_METHODS, type MonitorMethod } from '../../entities/monitor.entity';
import { ALLOWED_INTERVAL_SECONDS, MAX_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_CONSECUTIVE_THRESHOLD } from '../../constants/monitor-defaults';

export class UpdateMonitorDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url?: string;

  @ApiPropertyOptional({ enum: MONITOR_METHODS })
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

  @ApiPropertyOptional({ enum: ALLOWED_INTERVAL_SECONDS })
  @IsOptional()
  @IsIn(ALLOWED_INTERVAL_SECONDS)
  intervalSeconds?: number;

  @ApiPropertyOptional({ minimum: MIN_TIMEOUT_MS, maximum: MAX_TIMEOUT_MS })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_TIMEOUT_MS)
  @Max(MAX_TIMEOUT_MS)
  timeoutMs?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  expectedStatusCodes?: number[];

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
