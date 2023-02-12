import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const gameSlice = createSlice({
  name: "game",
  initialState: {
    running: false,
    timeLeft: 0,
    wave: 0,
  },
  reducers: {
    start: (state) => {
      state.running = true;
    },
    stop: (state) => {
      state.running = false;
    },
    setTimeLeft: (state, action: PayloadAction<number>) => {
      state.timeLeft = action.payload;
    },
    setWave: (state, action: PayloadAction<number>) => {
      state.wave = action.payload;
    },
  },
});

export const { start, stop, setTimeLeft, setWave } = gameSlice.actions;
export default gameSlice.reducer;
