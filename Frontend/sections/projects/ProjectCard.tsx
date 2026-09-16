import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import type { Project } from '@/api/projects.api';

export function ProjectCard({ project }: { project: Project }): React.JSX.Element {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="transition-colors hover:bg-secondary/50">
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          {project.description ? <CardDescription>{project.description}</CardDescription> : null}
        </CardHeader>
      </Card>
    </Link>
  );
}
