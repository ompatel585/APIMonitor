import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/table';
import { MonitorTableRow } from '@/sections/monitors/MonitorTableRow';
import type { Monitor } from '@/api/monitors.api';

type MonitorTableProps = {
  monitors: Monitor[];
  projectId: string;
  busyMonitorId: string | undefined;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
};

export function MonitorTable({ monitors, projectId, busyMonitorId, onPause, onResume }: MonitorTableProps): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Latency</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {monitors.map((monitor) => (
          <MonitorTableRow
            key={monitor.id}
            monitor={monitor}
            projectId={projectId}
            isBusy={busyMonitorId === monitor.id}
            onPause={onPause}
            onResume={onResume}
          />
        ))}
      </TableBody>
    </Table>
  );
}
