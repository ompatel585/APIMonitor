import { DomainException } from './domain.exception';

export class ValidationDomainException extends DomainException {
  readonly code = 'VALIDATION_FAILED';
  readonly statusCode = 422;

  constructor(message: string) {
    super(message);
  }
}
