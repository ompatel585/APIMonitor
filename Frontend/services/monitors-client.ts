'use client';

import { httpClient } from '@/lib/http/http-client';
import type { components } from '@/types/api/generated';

type CreateMonitorDto = components['schemas']['CreateMonitorDto'];
type UpdateMonitorDto = components['schemas']['UpdateMonitorDto'];
type MonitorResponseDto = components['schemas']['MonitorResponseDto'];

function base(organizationId: string, projectId: string): string {
  return `/organizations/${organizationId}/projects/${projectId}/monitors`;
}

export const monitorsService = {
  list: (organizationId: string, projectId: string) =>
    httpClient.get<MonitorResponseDto[]>(base(organizationId, projectId)),
  get: (organizationId: string, projectId: string, id: string) =>
    httpClient.get<MonitorResponseDto>(`${base(organizationId, projectId)}/${id}`),
  create: (organizationId: string, projectId: string, input: CreateMonitorDto) =>
    httpClient.post<MonitorResponseDto>(base(organizationId, projectId), input),
  update: (organizationId: string, projectId: string, id: string, input: UpdateMonitorDto) =>
    httpClient.patch<MonitorResponseDto>(`${base(organizationId, projectId)}/${id}`, input),
  pause: (organizationId: string, projectId: string, id: string) =>
    httpClient.post<MonitorResponseDto>(`${base(organizationId, projectId)}/${id}/actions/pause`),
  resume: (organizationId: string, projectId: string, id: string) =>
    httpClient.post<MonitorResponseDto>(`${base(organizationId, projectId)}/${id}/actions/resume`),
  remove: (organizationId: string, projectId: string, id: string) =>
    httpClient.delete<void>(`${base(organizationId, projectId)}/${id}`),
};
