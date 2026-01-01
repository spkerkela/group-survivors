import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UpgradeChoice } from "../../common/types";

export type UiState = "lobby" | "match" | "upgrade" | "gameOver";

export const upgradeChoiceSlice = createSlice({
  name: "upgradeChoices",
  initialState: {
    choices: [] as UpgradeChoice[][],
    rerollCost: 0,
  },
  reducers: {
    setUpgradeChoices: (
      state,
      action: PayloadAction<{ choices: UpgradeChoice[][]; rerollCost: number }>,
    ) => {
      state.choices = action.payload.choices;
      state.rerollCost = action.payload.rerollCost;
    },
  },
});

export const { setUpgradeChoices } = upgradeChoiceSlice.actions;
export default upgradeChoiceSlice.reducer;
