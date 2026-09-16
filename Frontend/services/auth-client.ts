'use client';

import { httpClient } from '@/lib/http/http-client';
import type { components } from '@/types/api/generated';

type RegisterDto = components['schemas']['RegisterDto'];
type LoginDto = components['schemas']['LoginDto'];
type RequestPasswordResetDto = components['schemas']['RequestPasswordResetDto'];
type ConfirmPasswordResetDto = components['schemas']['ConfirmPasswordResetDto'];

export const authService = {
  register: (input: RegisterDto) => httpClient.post('/auth/register', input),
  login: (input: LoginDto) => httpClient.post('/auth/login', input),
  logout: () => httpClient.post<void>('/auth/logout'),
  requestPasswordReset: (input: RequestPasswordResetDto) =>
    httpClient.post('/auth/password/reset/request', input),
  confirmPasswordReset: (input: ConfirmPasswordResetDto) =>
    httpClient.post('/auth/password/reset/confirm', input),
  requestEmailVerification: () => httpClient.post<void>('/auth/password/verify-email/request'),
  confirmEmailVerification: (token: string) =>
    httpClient.post<void>(`/auth/password/verify-email/confirm?token=${encodeURIComponent(token)}`),
};
