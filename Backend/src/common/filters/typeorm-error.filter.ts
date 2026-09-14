import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes.constants';
import { getRequestContext } from '@infrastructure/logger/request-context';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Catch(QueryFailedError)
export class TypeOrmErrorFilter implements ExceptionFilter {
  catch(exception: QueryFailedError & { code?: string }, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = getRequestContext()?.requestId ?? 'unknown';

    if (exception.code === POSTGRES_UNIQUE_VIOLATION) {
      response.status(HttpStatus.CONFLICT).json({
        code: ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION,
        message: 'A record with these details already exists',
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ERROR_CODES.UNEXPECTED_ERROR,
      message: 'An unexpected error occurred',
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
