import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const CurrentOrg = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ organizationId?: string }>();
  return request.organizationId ?? '';
});
