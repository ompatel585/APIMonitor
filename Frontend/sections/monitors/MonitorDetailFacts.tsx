import type { Monitor } from '@/api/monitors.api';

export function MonitorDetailFacts({ monitor }: { monitor: Monitor }): React.JSX.Element {
  return (
    <div className="space-y-2 text-sm">
      <p>
        <span className="text-muted-foreground">URL:</span> {monitor.method} {monitor.url}
      </p>
      <p>
        <span className="text-muted-foreground">Interval:</span> every {monitor.intervalSeconds}s
      </p>
      <p>
        <span className="text-muted-foreground">Timeout:</span> {monitor.timeoutMs}ms
      </p>
      <p>
        <span className="text-muted-foreground">Expected status codes:</span> {monitor.expectedStatusCodes.join(', ')}
      </p>
      <p>
        <span className="text-muted-foreground">Last check:</span>{' '}
        {monitor.lastCheckAt ? new Date(monitor.lastCheckAt).toLocaleString() : 'Never'}
      </p>
    </div>
  );
}
