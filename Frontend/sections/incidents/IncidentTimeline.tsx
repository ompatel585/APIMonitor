import { INCIDENT_EVENT_LABELS } from '@/constants/incident-presentation';
import { dayjs } from '@/lib/dayjs';
import type { IncidentEvent } from '@/api/incidents.api';

export function IncidentTimeline({ events }: { events: IncidentEvent[] }): React.JSX.Element {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No timeline entries yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-border" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{INCIDENT_EVENT_LABELS[event.type]}</p>
            {event.message ? <p className="text-sm text-muted-foreground">{event.message}</p> : null}
            <p className="text-xs text-muted-foreground">
              {dayjs(event.createdAt).format('MMM D, YYYY HH:mm:ss')}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
