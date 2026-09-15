import { ValidationDomainException } from '../exceptions/validation.exception';

const DURATION_PATTERN = /^(\d+)([smhd])$/;

function unitToMilliseconds(unit: string): number {
  switch (unit) {
    case 's':
      return 1000;
    case 'm':
      return 60_000;
    case 'h':
      return 3_600_000;
    case 'd':
      return 86_400_000;
    default:
      throw new ValidationDomainException(`Invalid duration unit: ${unit}`);
  }
}

export function parseDurationMs(input: string): number {
  const match = DURATION_PATTERN.exec(input);
  if (!match) {
    throw new ValidationDomainException(`Invalid duration format: ${input}`);
  }

  const [, valueStr, unit] = match;
  return Number(valueStr) * unitToMilliseconds(unit ?? '');
}

export function parseDurationSeconds(input: string): number {
  return Math.floor(parseDurationMs(input) / 1000);
}
