import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@/store/base-api';
import { authUiReducer } from '@/store/auth-ui.slice';

export function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      authUi: authUiReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const store: AppStore = makeStore();
