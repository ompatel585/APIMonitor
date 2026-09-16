'use client';

import Link from 'next/link';
import { useMonitorList } from '@/features/monitors/api/queries';
import { MonitorListItem } from '@/features/monitors/components/MonitorListItem';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/components/error/error-message';
import { Spinner } from '@/shared/ui/spinner';

type MonitorListProps = {
  organizationId: string | undefined;
  projectId: string;
};

export function MonitorList({ organizationId, projectId }: MonitorListProps): React.JSX.Element {
  const { data: monitors, isLoading, isError, error } = useMonitorList(organizationId, projectId);

  if (isLoading) {
    return <Spinner className="h-6 w-6" />;
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  if (!monitors || monitors.length === 0) {
    return (
      <div className="space-y-3 rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No monitors yet.</p>
        <Button asChild>
          <Link href={`/projects/${projectId}/monitors/new`}>Create your first monitor</Link>
        </Button>
      </div>
    );
  }

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
          <MonitorListItem
            key={monitor.id}
            monitor={monitor}
            organizationId={organizationId as string}
            projectId={projectId}
          />
        ))}
      </TableBody>
    </Table>
  );
}
