import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type EnvelopedResponse<T> = {
  data: T;
};

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, EnvelopedResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<EnvelopedResponse<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
