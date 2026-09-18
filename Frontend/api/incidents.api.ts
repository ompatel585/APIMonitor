import { baseApi } from '@/store/base-api';
import type { components } from '@/types/api/generated';

export type Incident = components['schemas']['IncidentResponseDto'];
export type IncidentEvent = components['schemas']['IncidentEventResponseDto'];
export type IncidentStatus = Incident['status'];
export type IncidentCause = Incident['cause'];
export type IncidentSeverity = Incident['severity'];

/**
 * The generated `CursorPageDto` loses its generic parameter through Swagger
 * (it comes through as `unknown[][]`), so the page shape is declared here
 * against the incident DTO rather than using that broken generic.
 */
export type IncidentPage = {
  items: Incident[];
  nextCursor: string | null;
};

type ListIncidentsArgs = {
  organizationId: string;
  projectId?: string;
  monitorId?: string;
  status?: IncidentStatus;
  cursor?: string;
  limit?: number;
};

type IncidentScope = { organizationId: string; id: string };

function base(organizationId: string): string {
  return `/organizations/${organizationId}/incidents`;
}

export const incidentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listIncidents: builder.query<IncidentPage, ListIncidentsArgs>({
      query: ({ organizationId, ...params }) => ({
        url: base(organizationId),
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((incident) => ({ type: 'Incident' as const, id: incident.id })),
              { type: 'Incident' as const, id: 'LIST' },
            ]
          : [{ type: 'Incident' as const, id: 'LIST' }],
    }),
    getIncident: builder.query<Incident, IncidentScope>({
      query: ({ organizationId, id }) => `${base(organizationId)}/${id}`,
      providesTags: (_result, _error, { id }) => [{ type: 'Incident', id }],
    }),
    getIncidentTimeline: builder.query<IncidentEvent[], IncidentScope>({
      query: ({ organizationId, id }) => `${base(organizationId)}/${id}/timeline`,
      providesTags: (_result, _error, { id }) => [{ type: 'Incident', id: `${id}-timeline` }],
    }),
    acknowledgeIncident: builder.mutation<Incident, IncidentScope>({
      query: ({ organizationId, id }) => ({
        url: `${base(organizationId)}/${id}/actions/acknowledge`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Incident', id },
        { type: 'Incident', id: `${id}-timeline` },
        { type: 'Incident', id: 'LIST' },
      ],
    }),
    resolveIncident: builder.mutation<Incident, IncidentScope>({
      query: ({ organizationId, id }) => ({
        url: `${base(organizationId)}/${id}/actions/resolve`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Incident', id },
        { type: 'Incident', id: `${id}-timeline` },
        { type: 'Incident', id: 'LIST' },
        { type: 'Monitor', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListIncidentsQuery,
  useGetIncidentQuery,
  useGetIncidentTimelineQuery,
  useAcknowledgeIncidentMutation,
  useResolveIncidentMutation,
} = incidentsApi;
