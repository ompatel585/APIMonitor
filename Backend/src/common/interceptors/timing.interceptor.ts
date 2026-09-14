import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Response } from 'express';

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        response.setHeader('x-response-time-ms', String(Date.now() - startedAt));
      }),
    );
  }
}
