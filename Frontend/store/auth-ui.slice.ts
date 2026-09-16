import { createSlice } from '@reduxjs/toolkit';

type AuthUiState = {
  loggedOut: boolean;
};

const initialState: AuthUiState = { loggedOut: false };

const authUiSlice = createSlice({
  name: 'authUi',
  initialState,
  reducers: {
    markLoggedOut: (state) => {
      state.loggedOut = true;
    },
    markLoggedIn: (state) => {
      state.loggedOut = false;
    },
  },
});

export const { markLoggedOut, markLoggedIn } = authUiSlice.actions;
export const authUiReducer = authUiSlice.reducer;
