import { baseApi } from '@/store/base-api';
import { setAccessToken } from '@/store/base-query';
import { markLoggedIn, markLoggedOut } from '@/store/auth-ui.slice';
import type { components } from '@/types/api/generated';

type RegisterDto = components['schemas']['RegisterDto'];
type LoginDto = components['schemas']['LoginDto'];
type RequestPasswordResetDto = components['schemas']['RequestPasswordResetDto'];
type ConfirmPasswordResetDto = components['schemas']['ConfirmPasswordResetDto'];

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<void, RegisterDto>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['CurrentUser', 'Membership'],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(markLoggedIn());
      },
    }),
    login: builder.mutation<void, LoginDto>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['CurrentUser', 'Membership'],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(markLoggedIn());
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['CurrentUser', 'Membership'],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
        } finally {
          setAccessToken(null);
          dispatch(markLoggedOut());
        }
      },
    }),
    requestPasswordReset: builder.mutation<void, RequestPasswordResetDto>({
      query: (body) => ({ url: '/auth/password/reset/request', method: 'POST', body }),
    }),
    confirmPasswordReset: builder.mutation<void, ConfirmPasswordResetDto>({
      query: (body) => ({ url: '/auth/password/reset/confirm', method: 'POST', body }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
} = authApi;
