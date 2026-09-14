import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from '@infrastructure/logger/request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? requestId;

    res.setHeader('x-request-id', requestId);

    runWithRequestContext({ requestId, correlationId }, () => {
      next();
    });
  }
}
