'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth-client';
import { setAccessToken } from '@/lib/http/http-client';
import { useAuth } from '@/providers/auth-provider';
import { userKeys } from '@/features/users/api/keys';
import type { RegisterInput, LoginInput, RequestPasswordResetInput, ConfirmPasswordResetInput } from '@/features/auth/types';

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { markLoggedOut } = useAuth();
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      setAccessToken(null);
      markLoggedOut();
      queryClient.removeQueries({ queryKey: userKeys.me() });
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (input: RequestPasswordResetInput) => authService.requestPasswordReset(input),
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (input: ConfirmPasswordResetInput) => authService.confirmPasswordReset(input),
  });
}
