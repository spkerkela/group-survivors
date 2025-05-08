import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export type UiState = "lobby" | "match" | "upgrade" | "gameOver";

export const gameSlice = createSlice({
  name: "game",
  initialState: {
    state: "lobby" as UiState,
    timeLeft: 0,
    wave: 0,
  },
  reducers: {
    setState: (state, action: PayloadAction<UiState>) => {
      state.state = action.payload;
    },
    setTimeLeft: (state, action: PayloadAction<number>) => {
      state.timeLeft = action.payload;
    },
    setWave: (state, action: PayloadAction<number>) => {
      state.wave = action.payload;
    },
  },
});

export const { setState, setTimeLeft, setWave } = gameSlice.actions;
export default gameSlice.reducer;
