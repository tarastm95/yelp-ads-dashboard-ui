
import { configureStore } from '@reduxjs/toolkit';
import { yelpApi } from './api/yelpApi';
import programsReducer from './slices/programsSlice';
import reportsReducer from './slices/reportsSlice';

export const store = configureStore({
  reducer: {
    [yelpApi.reducerPath]: yelpApi.reducer,
    programs: programsReducer,
    reports: reportsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(yelpApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
