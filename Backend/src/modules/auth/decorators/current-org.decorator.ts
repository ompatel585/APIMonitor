import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const CurrentOrg = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ params: { orgId?: string } }>();
  return request.params.orgId ?? '';
});
