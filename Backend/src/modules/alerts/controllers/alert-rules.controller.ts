import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { RequirePermission } from '@modules/auth/decorators/require-permission.decorator';
import { PERMISSIONS } from '@modules/auth/constants/permissions';
import { AlertRulesService } from '../services/alert-rules.service';
import { CreateAlertRuleDto } from '../dto/requests/create-alert-rule.dto';
import { UpdateAlertRuleDto } from '../dto/requests/update-alert-rule.dto';
import { AlertRuleResponseDto } from '../dto/responses/alert-rule.response.dto';
import { toAlertRuleResponseDto } from '../mappers/alert-rule.mapper';
import { ALERT_SCOPES } from '../constants/alert-scope';

@ApiTags('alert-rules')
@Controller('organizations/:orgId/alert-rules')
export class AlertRulesController {
  constructor(private readonly alertRulesService: AlertRulesService) {}

  @RequirePermission(PERMISSIONS.ALERT_RULE_MANAGE)
  @ApiOkResponse({ type: AlertRuleResponseDto, isArray: true })
  @Get()
  async list(@Param('orgId', ParseUuidPipe) orgId: string): Promise<AlertRuleResponseDto[]> {
    const rules = await this.alertRulesService.list(orgId);
    return rules.map(toAlertRuleResponseDto);
  }

  @RequirePermission(PERMISSIONS.ALERT_RULE_MANAGE)
  @ApiOkResponse({ type: AlertRuleResponseDto })
  @Get(':id')
  async findOne(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
  ): Promise<AlertRuleResponseDto> {
    const rule = await this.alertRulesService.findByIdOrThrow(orgId, id);
    return toAlertRuleResponseDto(rule);
  }

  @RequirePermission(PERMISSIONS.ALERT_RULE_MANAGE)
  @ApiCreatedResponse({ type: AlertRuleResponseDto })
  @Post()
  async create(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Body() body: CreateAlertRuleDto,
  ): Promise<AlertRuleResponseDto> {
    const rule = await this.alertRulesService.create(orgId, {
      name: body.name,
      scope: body.scope,
      scopeId: body.scope === ALERT_SCOPES.ORGANIZATION ? null : (body.scopeId ?? null),
      trigger: body.trigger,
      conditions: {
        minSeverity: body.conditions?.minSeverity,
        causes: body.conditions?.causes,
        minDurationSeconds: body.conditions?.minDurationSeconds,
      },
      channelIds: body.channelIds,
      throttleSeconds: body.throttleSeconds ?? 300,
      escalation: body.escalation
        ? { afterMinutesUnacknowledged: body.escalation.afterMinutesUnacknowledged, channelIds: body.escalation.channelIds }
        : null,
    });
    return toAlertRuleResponseDto(rule);
  }

  @RequirePermission(PERMISSIONS.ALERT_RULE_MANAGE)
  @ApiOkResponse({ type: AlertRuleResponseDto })
  @Patch(':id')
  async update(
    @Param('orgId', ParseUuidPipe) orgId: string,
    @Param('id', ParseUuidPipe) id: string,
    @Body() body: UpdateAlertRuleDto,
  ): Promise<AlertRuleResponseDto> {
    const rule = await this.alertRulesService.update(orgId, id, {
      name: body.name,
      scope: body.scope,
      scopeId: body.scope
        ? body.scope === ALERT_SCOPES.ORGANIZATION
          ? null
          : (body.scopeId ?? null)
        : undefined,
      trigger: body.trigger,
      conditions: body.conditions
        ? {
            minSeverity: body.conditions.minSeverity,
            causes: body.conditions.causes,
            minDurationSeconds: body.conditions.minDurationSeconds,
          }
        : undefined,
      channelIds: body.channelIds,
      throttleSeconds: body.throttleSeconds,
      escalation:
        body.escalation === undefined
          ? undefined
          : body.escalation
            ? { afterMinutesUnacknowledged: body.escalation.afterMinutesUnacknowledged, channelIds: body.escalation.channelIds }
            : null,
      isActive: body.isActive,
    });
    return toAlertRuleResponseDto(rule);
  }

  @RequirePermission(PERMISSIONS.ALERT_RULE_MANAGE)
  @ApiOkResponse()
  @Delete(':id')
  async remove(@Param('orgId', ParseUuidPipe) orgId: string, @Param('id', ParseUuidPipe) id: string): Promise<void> {
    await this.alertRulesService.delete(orgId, id);
  }
}
