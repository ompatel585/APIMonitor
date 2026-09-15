import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../constants/permissions';

export const PERMISSION_KEY = 'requiredPermission';

export const RequirePermission = (
  permission: Permission,
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSION_KEY, permission);
