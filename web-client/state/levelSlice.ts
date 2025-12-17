import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const levelSlice = createSlice({
  name: "level",
  initialState: {
    level: 1,
    pendingLevels: 0,
  },
  reducers: {
    increment: (state) => {
      state.level += 1;
    },
    set: (
      state,
      action: PayloadAction<{ level: number; pendingLevels: number }>,
    ) => {
      state.level = action.payload.level;
      state.pendingLevels = action.payload.pendingLevels;
    },
  },
});
export const { increment, set } = levelSlice.actions;
export default levelSlice.reducer;
