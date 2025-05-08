import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export const goldSlice = createSlice({
	name: "gold",
	initialState: {
		gold: 0,
	},
	reducers: {
		setGold: (state, action: PayloadAction<number>) => {
			state.gold = action.payload;
		},
	},
});

export const { setGold } = goldSlice.actions;
export default goldSlice.reducer;
