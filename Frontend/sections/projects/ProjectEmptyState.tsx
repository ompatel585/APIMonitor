import Link from 'next/link';
import { Button } from '@/components/button';

export function ProjectEmptyState(): React.JSX.Element {
  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">No projects yet.</p>
      <Button asChild>
        <Link href="/projects/new">Create your first project</Link>
      </Button>
    </div>
  );
}
