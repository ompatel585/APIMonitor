import { z } from 'zod';

export const ALLOWED_INTERVAL_SECONDS = [30, 60, 300, 600, 900, 1800, 3600] as const;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 30_000;

export const monitorFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    url: z.string().url('Enter a valid http or https URL').refine(
      (value) => value.startsWith('http://') || value.startsWith('https://'),
      'URL must use http or https',
    ),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']),
    intervalSeconds: z.coerce.number().refine(
      (value) => (ALLOWED_INTERVAL_SECONDS as readonly number[]).includes(value),
      'Choose one of the allowed intervals',
    ),
    timeoutMs: z.coerce.number().min(MIN_TIMEOUT_MS).max(MAX_TIMEOUT_MS),
    expectedStatusCodes: z.string().min(1, 'Enter at least one status code (e.g. 200)'),
  })
  .refine((data) => data.timeoutMs < data.intervalSeconds * 1000, {
    message: 'Timeout must be less than the check interval',
    path: ['timeoutMs'],
  });

export type MonitorFormValues = z.infer<typeof monitorFormSchema>;
