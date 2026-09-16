import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  displayName: z.string().min(1, 'Name is required').max(100),
  organizationName: z.string().min(1, 'Organization name is required').max(100),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
