
import { configureStore } from '@reduxjs/toolkit';
import { yelpApi } from './api/yelpApi';
import programsReducer from './slices/programsSlice';
import reportsReducer from './slices/reportsSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    [yelpApi.reducerPath]: yelpApi.reducer,
    programs: programsReducer,
    reports: reportsReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(yelpApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
