export const REDACTION_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.accessToken',
  '*.refreshToken',
  '*.token',
  '*.jwt',
  '*.apiKeySecret',
  '*.secret',
  '*.webhookSecret',
  '*.databaseUrl',
];
