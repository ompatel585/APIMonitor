import { baseApi } from '@/store/base-api';
import type { components } from '@/types/api/generated';

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  createdAt: string;
};

export type Membership = components['schemas']['MembershipResponseDto'];

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<CurrentUser, void>({
      query: () => '/users/me',
      providesTags: ['CurrentUser'],
    }),
    getMyMemberships: builder.query<Membership[], void>({
      query: () => '/users/me/memberships',
      providesTags: ['Membership'],
    }),
  }),
});

export const { useGetCurrentUserQuery, useGetMyMembershipsQuery } = usersApi;
