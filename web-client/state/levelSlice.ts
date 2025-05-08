import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export const levelSlice = createSlice({
	name: "level",
	initialState: {
		level: 1,
	},
	reducers: {
		increment: (state) => {
			state.level += 1;
		},
		set: (state, action: PayloadAction<number>) => {
			state.level = action.payload;
		},
	},
});
export const { increment, set } = levelSlice.actions;
export default levelSlice.reducer;
