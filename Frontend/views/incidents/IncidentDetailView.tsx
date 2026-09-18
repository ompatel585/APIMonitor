'use client';

import { useParams } from 'next/navigation';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization-id';
import {
  useAcknowledgeIncidentMutation,
  useGetIncidentQuery,
  useGetIncidentTimelineQuery,
  useResolveIncidentMutation,
} from '@/api/incidents.api';
import { IncidentStatusBadge } from '@/sections/incidents/IncidentStatusBadge';
import { IncidentSeverityBadge } from '@/sections/incidents/IncidentSeverityBadge';
import { IncidentDetailFacts } from '@/sections/incidents/IncidentDetailFacts';
import { IncidentTimeline } from '@/sections/incidents/IncidentTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Button } from '@/components/button';
import { Spinner } from '@/components/spinner';
import { ErrorMessage } from '@/components/error-message';
import { INCIDENT_CAUSE_LABELS } from '@/constants/incident-presentation';

export function IncidentDetailView(): React.JSX.Element {
  const { incidentId } = useParams<{ incidentId: string }>();
  const organizationId = useCurrentOrganizationId();
  const scope = { organizationId: organizationId ?? '', id: incidentId };

  const { data: incident, isLoading, isError, error } = useGetIncidentQuery(scope, { skip: !organizationId });
  const { data: timeline, isLoading: timelineLoading } = useGetIncidentTimelineQuery(scope, {
    skip: !organizationId,
  });

  const [acknowledge, { isLoading: isAcknowledging, isError: ackFailed, error: ackError }] =
    useAcknowledgeIncidentMutation();
  const [resolve, { isLoading: isResolving, isError: resolveFailed, error: resolveError }] =
    useResolveIncidentMutation();

  if (isLoading || !organizationId) {
    return <Spinner className="h-6 w-6" />;
  }

  if (isError || !incident) {
    return <ErrorMessage error={error} />;
  }

  const isResolved = incident.status === 'RESOLVED';
  const isBusy = isAcknowledging || isResolving;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>{INCIDENT_CAUSE_LABELS[incident.cause]}</CardTitle>
              <IncidentStatusBadge status={incident.status} />
              <IncidentSeverityBadge severity={incident.severity} />
            </div>
            {isResolved ? null : (
              <div className="flex gap-2">
                {incident.status === 'OPEN' ? (
                  <Button variant="outline" size="sm" disabled={isBusy} onClick={() => acknowledge(scope)}>
                    Acknowledge
                  </Button>
                ) : null}
                <Button size="sm" disabled={isBusy} onClick={() => resolve(scope)}>
                  Resolve
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ackFailed ? <ErrorMessage error={ackError} /> : null}
          {resolveFailed ? <ErrorMessage error={resolveError} /> : null}
          <IncidentDetailFacts incident={incident} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? <Spinner className="h-5 w-5" /> : <IncidentTimeline events={timeline ?? []} />}
        </CardContent>
      </Card>
    </div>
  );
}
