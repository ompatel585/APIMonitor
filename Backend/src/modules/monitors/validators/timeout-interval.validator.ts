import { ValidationDomainException } from '@common/exceptions/validation.exception';

export function assertTimeoutFitsInterval(timeoutMs: number, intervalSeconds: number): void {
  if (timeoutMs >= intervalSeconds * 1000) {
    throw new ValidationDomainException('timeoutMs must be strictly less than intervalSeconds * 1000');
  }
}
