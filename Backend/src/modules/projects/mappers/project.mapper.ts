import { Project } from '../entities/project.entity';
import { ProjectResponseDto } from '../dto/responses/project.response.dto';

export function toProjectResponseDto(project: Project): ProjectResponseDto {
  return {
    id: project.id,
    organizationId: project.organizationId,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
  };
}
