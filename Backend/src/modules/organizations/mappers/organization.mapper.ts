import { Organization } from '../entities/organization.entity';
import { OrganizationResponseDto } from '../dto/responses/organization.response.dto';

export function toOrganizationResponseDto(organization: Organization): OrganizationResponseDto {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    createdAt: organization.createdAt.toISOString(),
  };
}
