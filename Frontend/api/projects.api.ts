import { baseApi } from '@/store/base-api';
import type { components } from '@/types/api/generated';

export type Project = components['schemas']['ProjectResponseDto'];
type CreateProjectDto = components['schemas']['CreateProjectDto'];
type UpdateProjectDto = components['schemas']['UpdateProjectDto'];

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listProjects: builder.query<Project[], { organizationId: string }>({
      query: ({ organizationId }) => `/organizations/${organizationId}/projects`,
      providesTags: (result) =>
        result
          ? [...result.map((project) => ({ type: 'Project' as const, id: project.id })), { type: 'Project' as const, id: 'LIST' }]
          : [{ type: 'Project' as const, id: 'LIST' }],
    }),
    getProject: builder.query<Project, { organizationId: string; id: string }>({
      query: ({ organizationId, id }) => `/organizations/${organizationId}/projects/${id}`,
      providesTags: (_result, _error, { id }) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation<Project, { organizationId: string; body: CreateProjectDto }>({
      query: ({ organizationId, body }) => ({
        url: `/organizations/${organizationId}/projects`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
    updateProject: builder.mutation<Project, { organizationId: string; id: string; body: UpdateProjectDto }>({
      query: ({ organizationId, id, body }) => ({
        url: `/organizations/${organizationId}/projects/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Project', id }, { type: 'Project', id: 'LIST' }],
    }),
    deleteProject: builder.mutation<void, { organizationId: string; id: string }>({
      query: ({ organizationId, id }) => ({
        url: `/organizations/${organizationId}/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi;
