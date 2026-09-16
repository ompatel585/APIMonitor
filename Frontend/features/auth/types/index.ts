import type { components } from '@/types/api/generated';

export type RegisterInput = components['schemas']['RegisterDto'];
export type LoginInput = components['schemas']['LoginDto'];
export type RequestPasswordResetInput = components['schemas']['RequestPasswordResetDto'];
export type ConfirmPasswordResetInput = components['schemas']['ConfirmPasswordResetDto'];
