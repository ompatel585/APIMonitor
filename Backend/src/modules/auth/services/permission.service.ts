import { Injectable } from '@nestjs/common';
import { MembershipsService } from '@modules/organizations/services/memberships.service';
import { ROLE_PERMISSIONS } from '../constants/role-permissions';
import type { Permission } from '../constants/permissions';

@Injectable()
export class PermissionService {
  constructor(private readonly membershipsService: MembershipsService) {}

  async getPermissions(organizationId: string, userId: string): Promise<Permission[]> {
    const membership = await this.membershipsService.findForActor(organizationId, userId);
    if (!membership) {
      return [];
    }
    return ROLE_PERMISSIONS[membership.role];
  }

  async hasPermission(organizationId: string, userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getPermissions(organizationId, userId);
    return permissions.includes(permission);
  }
}
