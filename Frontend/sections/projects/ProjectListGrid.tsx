import { ProjectCard } from '@/sections/projects/ProjectCard';
import type { Project } from '@/api/projects.api';

export function ProjectListGrid({ projects }: { projects: Project[] }): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
