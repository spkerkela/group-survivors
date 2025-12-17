import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ActiveSpellsState {
  spells: { [key: string]: number };
}

const initialState: ActiveSpellsState = {
  spells: {},
};

export const activeSpellsSlice = createSlice({
  name: "activeSpells",
  initialState,
  reducers: {
    setActiveSpells: (
      state,
      action: PayloadAction<{ [key: string]: number }>,
    ) => {
      state.spells = action.payload;
    },
  },
});

export const { setActiveSpells } = activeSpellsSlice.actions;
export default activeSpellsSlice.reducer;
