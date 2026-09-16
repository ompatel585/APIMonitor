import { memo } from 'react';
import Link from 'next/link';
import { TableCell, TableRow } from '@/components/table';
import { Button } from '@/components/button';
import { MonitorStatusBadge } from '@/sections/monitors/MonitorStatusBadge';
import type { Monitor } from '@/api/monitors.api';

type MonitorTableRowProps = {
  monitor: Monitor;
  projectId: string;
  isBusy: boolean;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
};

export const MonitorTableRow = memo(function MonitorTableRow({
  monitor,
  projectId,
  isBusy,
  onPause,
  onResume,
}: MonitorTableRowProps): React.JSX.Element {
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
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => onPause(monitor.id)}>
            Pause
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => onResume(monitor.id)}>
            Resume
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
});
