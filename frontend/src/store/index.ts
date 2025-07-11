
import { configureStore } from '@reduxjs/toolkit';
import { yelpApi } from './api/yelpApi';
import programsReducer from './slices/programsSlice';
import reportsReducer from './slices/reportsSlice';
import authReducer from './slices/authSlice';

const stored = localStorage.getItem('credentials');
let preloadedState: { auth: { username: string; password: string } } | undefined;
if (stored) {
  try {
    preloadedState = { auth: JSON.parse(stored) };
  } catch (err) {
    console.error('Failed to parse credentials from localStorage', err);
    localStorage.removeItem('credentials');
  }
}

export const store = configureStore({
  reducer: {
    [yelpApi.reducerPath]: yelpApi.reducer,
    programs: programsReducer,
    reports: reportsReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(yelpApi.middleware),
  preloadedState,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
