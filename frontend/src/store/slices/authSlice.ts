import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  username: string;
  password: string;
}

const stored = localStorage.getItem('credentials');
const initialState: AuthState = stored
  ? JSON.parse(stored)
  : { username: '', password: '' };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthState>) => {
      state.username = action.payload.username;
      state.password = action.payload.password;
      localStorage.setItem('credentials', JSON.stringify(action.payload));
    },
    clearCredentials: (state) => {
      state.username = '';
      state.password = '';
      localStorage.removeItem('credentials');
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
