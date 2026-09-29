import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UpgradeChoice, UpgradeEvent } from "../../common/types";

export type UiState = "lobby" | "match" | "upgrade" | "gameOver";

export const upgradeChoiceSlice = createSlice({
  name: "upgradeChoices",
  initialState: {
    choices: [] as UpgradeChoice[][],
    rerollCost: 0,
    timeLeft: null as number | null,
  },
  reducers: {
    setUpgradeChoices: (state, action: PayloadAction<UpgradeEvent>) => {
      state.choices = action.payload.choices;
      state.rerollCost = action.payload.rerollCost;
      state.timeLeft = action.payload.timeLeft;
    },
    setUpgradeTimeLeft: (state, action: PayloadAction<number | null>) => {
      state.timeLeft = action.payload;
    },
  },
});

export const { setUpgradeChoices, setUpgradeTimeLeft } =
  upgradeChoiceSlice.actions;
export default upgradeChoiceSlice.reducer;
