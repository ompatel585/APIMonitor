import Link from 'next/link';
import { INCIDENT_CAUSE_LABELS } from '@/constants/incident-presentation';
import { dayjs } from '@/lib/dayjs';
import type { Incident } from '@/api/incidents.api';

function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return 'Ongoing';
  }
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} minutes`;
  }
  return `${(seconds / 3600).toFixed(1)} hours`;
}

export function IncidentDetailFacts({ incident }: { incident: Incident }): React.JSX.Element {
  return (
    <div className="space-y-2 text-sm">
      <p>
        <span className="text-muted-foreground">Cause:</span> {INCIDENT_CAUSE_LABELS[incident.cause]}
      </p>
      <p>
        <span className="text-muted-foreground">Monitor:</span>{' '}
        <Link
          href={`/projects/${incident.projectId}/monitors/${incident.monitorId}`}
          className="hover:underline"
        >
          View monitor
        </Link>
      </p>
      <p>
        <span className="text-muted-foreground">Started:</span>{' '}
        {dayjs(incident.startedAt).format('MMM D, YYYY HH:mm:ss')}
      </p>
      <p>
        <span className="text-muted-foreground">Duration:</span> {formatDuration(incident.durationSeconds)}
      </p>
      <p>
        <span className="text-muted-foreground">Failed checks:</span> {incident.failureCount}
      </p>
      {incident.acknowledgedAt ? (
        <p>
          <span className="text-muted-foreground">Acknowledged:</span>{' '}
          {dayjs(incident.acknowledgedAt).format('MMM D, YYYY HH:mm:ss')}
        </p>
      ) : null}
      {incident.resolvedAt ? (
        <p>
          <span className="text-muted-foreground">Resolved:</span>{' '}
          {dayjs(incident.resolvedAt).format('MMM D, YYYY HH:mm:ss')}
          {incident.resolvedBy ? ' (manually)' : ' (automatically)'}
        </p>
      ) : null}
      {incident.isFlapping ? (
        <p className="text-muted-foreground">
          This monitor is flapping — it has opened several incidents in a short window.
        </p>
      ) : null}
    </div>
  );
}
