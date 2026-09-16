import Link from 'next/link';
import { Button } from '@/components/button';

export function MonitorEmptyState({ projectId }: { projectId: string }): React.JSX.Element {
  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">No monitors yet.</p>
      <Button asChild>
        <Link href={`/projects/${projectId}/monitors/new`}>Create your first monitor</Link>
      </Button>
    </div>
  );
}
