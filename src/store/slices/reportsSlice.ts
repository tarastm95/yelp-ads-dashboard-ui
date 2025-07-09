
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReportData } from '../../types/yelp';

interface ReportsState {
  dailyData: ReportData[];
  monthlyData: ReportData[];
  dateRange: {
    start: string;
    end: string;
  };
  loading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  dailyData: [],
  monthlyData: [],
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  },
  loading: false,
  error: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setDailyData: (state, action: PayloadAction<ReportData[]>) => {
      state.dailyData = action.payload;
    },
    setMonthlyData: (state, action: PayloadAction<ReportData[]>) => {
      state.monthlyData = action.payload;
    },
    setDateRange: (state, action: PayloadAction<{ start: string; end: string }>) => {
      state.dateRange = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setDailyData, setMonthlyData, setDateRange, clearError } = reportsSlice.actions;
export default reportsSlice.reducer;
