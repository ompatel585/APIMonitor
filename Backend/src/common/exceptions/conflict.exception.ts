import { DomainException } from './domain.exception';

export class ConflictDomainException extends DomainException {
  readonly code: string;
  readonly statusCode = 409;

  constructor(message: string, code = 'RESOURCE_CONFLICT') {
    super(message);
    this.code = code;
  }
}
