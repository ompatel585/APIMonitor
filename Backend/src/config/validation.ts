import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

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
