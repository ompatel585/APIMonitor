import { Monitor } from '../entities/monitor.entity';
import { MonitorResponseDto } from '../dto/responses/monitor.response.dto';

export function toMonitorResponseDto(monitor: Monitor): MonitorResponseDto {
  return {
    id: monitor.id,
    organizationId: monitor.organizationId,
    projectId: monitor.projectId,
    name: monitor.name,
    url: monitor.url,
    method: monitor.method,
    headers: monitor.headers,
    body: monitor.body,
    intervalSeconds: monitor.intervalSeconds,
    timeoutMs: monitor.timeoutMs,
    expectedStatusCodes: monitor.expectedStatusCodes,
    followRedirects: monitor.followRedirects,
    degradedThresholdMs: monitor.degradedThresholdMs,
    isActive: monitor.isActive,
    consecutiveFailureThreshold: monitor.consecutiveFailureThreshold,
    consecutiveSuccessThreshold: monitor.consecutiveSuccessThreshold,
    status: monitor.status,
    lastCheckAt: monitor.lastCheckAt ? monitor.lastCheckAt.toISOString() : null,
    lastLatencyMs: monitor.lastLatencyMs,
    createdAt: monitor.createdAt.toISOString(),
  };
}
