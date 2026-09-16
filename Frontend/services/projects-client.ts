'use client';

import { httpClient } from '@/lib/http/http-client';
import type { components } from '@/types/api/generated';

type CreateProjectDto = components['schemas']['CreateProjectDto'];
type UpdateProjectDto = components['schemas']['UpdateProjectDto'];
type ProjectResponseDto = components['schemas']['ProjectResponseDto'];

export const projectsService = {
  list: (organizationId: string) =>
    httpClient.get<ProjectResponseDto[]>(`/organizations/${organizationId}/projects`),
  get: (organizationId: string, id: string) =>
    httpClient.get<ProjectResponseDto>(`/organizations/${organizationId}/projects/${id}`),
  create: (organizationId: string, input: CreateProjectDto) =>
    httpClient.post<ProjectResponseDto>(`/organizations/${organizationId}/projects`, input),
  update: (organizationId: string, id: string, input: UpdateProjectDto) =>
    httpClient.patch<ProjectResponseDto>(`/organizations/${organizationId}/projects/${id}`, input),
  remove: (organizationId: string, id: string) =>
    httpClient.delete<void>(`/organizations/${organizationId}/projects/${id}`),
};
