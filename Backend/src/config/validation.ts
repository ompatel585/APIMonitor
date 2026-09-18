import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, Validate, validateSync } from 'class-validator';
import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { ValidatorConstraint } from 'class-validator';

/**
 * ENCRYPTION_KEY must decode (base64) to exactly 32 bytes — the key length
 * AES-256-GCM requires. Validated here so a missing or malformed key crashes
 * startup immediately, per this repo's "no production fallback for a secret"
 * rule, rather than failing lazily the first time a channel secret is encrypted.
 */
@ValidatorConstraint({ name: 'isBase64EncryptionKey', async: false })
class IsBase64EncryptionKeyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }
    try {
      return Buffer.from(value, 'base64').length === 32;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a base64-encoded 32-byte key`;
  }
}

enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

enum AppRole {
  Api = 'api',
  Worker = 'worker',
  Scheduler = 'scheduler',
}

class EnvironmentVariables {
  @IsIn(Object.values(NodeEnv))
  NODE_ENV!: NodeEnv;

  @IsIn(Object.values(AppRole))
  APP_ROLE!: AppRole;

  @IsInt()
  @Min(1)
  @Max(65535)
  APP_PORT!: number;

  @IsString()
  CORS_ORIGIN!: string;

  @IsString()
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  DATABASE_POOL_SIZE!: number;

  @IsString()
  REDIS_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT!: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsOptional()
  @IsString()
  MAIL_HOST?: string;

  @IsOptional()
  @IsInt()
  MAIL_PORT?: number;

  @IsOptional()
  @IsString()
  MAIL_USER?: string;

  @IsOptional()
  @IsString()
  MAIL_PASSWORD?: string;

  @IsString()
  MAIL_FROM!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  MONITOR_CHECKS_RETENTION_DAYS?: number;

  @IsString()
  @Validate(IsBase64EncryptionKeyConstraint)
  ENCRYPTION_KEY!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
