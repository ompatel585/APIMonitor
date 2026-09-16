import { baseApi } from '@/store/base-api';
import type { components } from '@/types/api/generated';

export type Monitor = components['schemas']['MonitorResponseDto'];
export type MonitorStatus = Monitor['status'];
type CreateMonitorDto = components['schemas']['CreateMonitorDto'];
type UpdateMonitorDto = components['schemas']['UpdateMonitorDto'];

type MonitorScope = { organizationId: string; projectId: string };

function base({ organizationId, projectId }: MonitorScope): string {
  return `/organizations/${organizationId}/projects/${projectId}/monitors`;
}

export const monitorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMonitors: builder.query<Monitor[], MonitorScope>({
      query: (scope) => base(scope),
      providesTags: (result) =>
        result
          ? [...result.map((monitor) => ({ type: 'Monitor' as const, id: monitor.id })), { type: 'Monitor' as const, id: 'LIST' }]
          : [{ type: 'Monitor' as const, id: 'LIST' }],
    }),
    getMonitor: builder.query<Monitor, MonitorScope & { id: string }>({
      query: ({ id, ...scope }) => `${base(scope)}/${id}`,
      providesTags: (_result, _error, { id }) => [{ type: 'Monitor', id }],
    }),
    createMonitor: builder.mutation<Monitor, MonitorScope & { body: CreateMonitorDto }>({
      query: ({ body, ...scope }) => ({ url: base(scope), method: 'POST', body }),
      invalidatesTags: [{ type: 'Monitor', id: 'LIST' }],
    }),
    updateMonitor: builder.mutation<Monitor, MonitorScope & { id: string; body: UpdateMonitorDto }>({
      query: ({ id, body, ...scope }) => ({ url: `${base(scope)}/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Monitor', id }, { type: 'Monitor', id: 'LIST' }],
    }),
    deleteMonitor: builder.mutation<void, MonitorScope & { id: string }>({
      query: ({ id, ...scope }) => ({ url: `${base(scope)}/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Monitor', id: 'LIST' }],
    }),
    pauseMonitor: builder.mutation<Monitor, MonitorScope & { id: string }>({
      query: ({ id, ...scope }) => ({ url: `${base(scope)}/${id}/actions/pause`, method: 'POST' }),
      onQueryStarted: async ({ id, ...scope }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          monitorsApi.util.updateQueryData('listMonitors', scope, (draft) => {
            const monitor = draft.find((m) => m.id === id);
            if (monitor) {
              monitor.status = 'PAUSED';
              monitor.isActive = false;
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Monitor', id }],
    }),
    resumeMonitor: builder.mutation<Monitor, MonitorScope & { id: string }>({
      query: ({ id, ...scope }) => ({ url: `${base(scope)}/${id}/actions/resume`, method: 'POST' }),
      onQueryStarted: async ({ id, ...scope }, { dispatch, queryFulfilled }) => {
        const patch = dispatch(
          monitorsApi.util.updateQueryData('listMonitors', scope, (draft) => {
            const monitor = draft.find((m) => m.id === id);
            if (monitor) {
              monitor.status = 'PENDING';
              monitor.isActive = true;
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Monitor', id }],
    }),
  }),
});

export const {
  useListMonitorsQuery,
  useGetMonitorQuery,
  useCreateMonitorMutation,
  useUpdateMonitorMutation,
  useDeleteMonitorMutation,
  usePauseMonitorMutation,
  useResumeMonitorMutation,
} = monitorsApi;
