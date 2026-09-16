import { memo } from 'react';
import Link from 'next/link';
import { TableCell, TableRow } from '@/shared/ui/table';
import { Button } from '@/shared/ui/button';
import { MonitorStatusBadge } from '@/features/monitors/components/MonitorStatusBadge';
import { usePauseMonitor, useResumeMonitor } from '@/features/monitors/api/mutations';
import type { Monitor } from '@/features/monitors/types';

type MonitorListItemProps = {
  monitor: Monitor;
  organizationId: string;
  projectId: string;
};

export const MonitorListItem = memo(function MonitorListItem({
  monitor,
  organizationId,
  projectId,
}: MonitorListItemProps): React.JSX.Element {
  const pause = usePauseMonitor(organizationId, projectId);
  const resume = useResumeMonitor(organizationId, projectId);
  const isBusy = pause.isPending || resume.isPending;

  return (
    <TableRow>
      <TableCell>
        <Link href={`/projects/${projectId}/monitors/${monitor.id}`} className="font-medium hover:underline">
          {monitor.name}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">{monitor.url}</TableCell>
      <TableCell>
        <MonitorStatusBadge status={monitor.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {monitor.lastLatencyMs !== null ? `${monitor.lastLatencyMs}ms` : '—'}
      </TableCell>
      <TableCell className="text-right">
        {monitor.isActive ? (
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => pause.mutate(monitor.id)}>
            Pause
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => resume.mutate(monitor.id)}>
            Resume
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
});
