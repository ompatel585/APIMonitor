import { DomainException } from './domain.exception';

export class NotFoundDomainException extends DomainException {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly statusCode = 404;

  constructor(resource: string) {
    super(`${resource} not found`);
  }
}
