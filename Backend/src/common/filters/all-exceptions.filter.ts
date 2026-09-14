import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';
import { getRequestContext } from '@infrastructure/logger/request-context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = getRequestContext()?.requestId ?? 'unknown';

    const { statusCode, code, message } = this.resolve(exception);

    this.logger.error({ err: exception, requestId }, message);

    response.status(statusCode).json({
      code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): { statusCode: number; code: string; message: string } {
    if (exception instanceof DomainException) {
      return { statusCode: exception.statusCode, code: exception.code, message: exception.message };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string' ? response : ((response as { message?: string }).message ?? exception.message);
      return { statusCode: exception.getStatus(), code: ERROR_CODES.VALIDATION_FAILED, message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.UNEXPECTED_ERROR,
      message: 'An unexpected error occurred',
    };
  }
}
