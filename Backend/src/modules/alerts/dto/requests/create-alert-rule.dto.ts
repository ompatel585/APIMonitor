import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ALERT_SCOPES, type AlertScope } from '../../constants/alert-scope';
import { ALERT_TRIGGERS, type AlertTrigger } from '../../constants/alert-trigger';
import { AlertRuleConditionsDto } from './alert-rule-conditions.dto';
import { AlertRuleEscalationDto } from './alert-rule-escalation.dto';

export class CreateAlertRuleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: Object.values(ALERT_SCOPES) })
  @IsIn(Object.values(ALERT_SCOPES))
  scope!: AlertScope;

  @ApiPropertyOptional({ description: 'projectId for PROJECT scope, monitorId for MONITOR scope; omit for ORGANIZATION' })
  @ValidateIf((dto: CreateAlertRuleDto) => dto.scope !== ALERT_SCOPES.ORGANIZATION)
  @IsUUID()
  scopeId?: string;

  @ApiProperty({ enum: Object.values(ALERT_TRIGGERS) })
  @IsIn(Object.values(ALERT_TRIGGERS))
  trigger!: AlertTrigger;

  @ApiPropertyOptional({ type: AlertRuleConditionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AlertRuleConditionsDto)
  conditions?: AlertRuleConditionsDto;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  channelIds!: string[];

  @ApiPropertyOptional({ minimum: 0, default: 300 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86_400)
  throttleSeconds?: number;

  @ApiPropertyOptional({ type: AlertRuleEscalationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AlertRuleEscalationDto)
  escalation?: AlertRuleEscalationDto;
}
