
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Program } from '../../types/yelp';

interface ProgramsState {
  programs: Program[];
  selectedProgram: Program | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProgramsState = {
  programs: [],
  selectedProgram: null,
  loading: false,
  error: null,
};

const programsSlice = createSlice({
  name: 'programs',
  initialState,
  reducers: {
    setSelectedProgram: (state, action: PayloadAction<Program | null>) => {
      state.selectedProgram = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setSelectedProgram, clearError } = programsSlice.actions;
export default programsSlice.reducer;
