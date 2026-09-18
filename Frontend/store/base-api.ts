import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@/store/base-query';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['CurrentUser', 'Membership', 'Project', 'Monitor', 'Incident'],
  endpoints: () => ({}),
});
