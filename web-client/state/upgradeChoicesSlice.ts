import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PowerUp, UpgradeChoice } from "../../common/types";

export type UiState = "lobby" | "match" | "upgrade" | "gameOver";

export const upgradeChoiceSlice = createSlice({
  name: "upgradeChoices",
  initialState: {
    choices: [] as UpgradeChoice[][],
  },
  reducers: {
    setUpgradeChoices: (state, action: PayloadAction<UpgradeChoice[][]>) => {
      state.choices = action.payload;
    },
  },
});

export const { setUpgradeChoices } = upgradeChoiceSlice.actions;
export default upgradeChoiceSlice.reducer;
