import { ExecutionContext, ForbiddenException, Injectable, type CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PermissionService } from '../services/permission.service';
import type { Permission } from '../constants/permissions';
import type { AuthenticatedUser } from '../types/authenticated-request.type';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser; params: { orgId?: string } }>();

    const organizationId = request.params.orgId;
    if (!organizationId) {
      throw new ForbiddenException('This action requires an organization context');
    }

    const hasPermission = await this.permissionService.hasPermission(
      organizationId,
      request.user.id,
      requiredPermission,
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
