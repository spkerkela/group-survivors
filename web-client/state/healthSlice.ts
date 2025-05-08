import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export const healthSlice = createSlice({
	name: "health",
	initialState: {
		currentHealth: 100,
		maxHealth: 100,
	},
	reducers: {
		setHealth: (
			state,
			action: PayloadAction<{
				currentHealth: number;
				maxHealth: number;
			}>,
		) => {
			state.currentHealth = action.payload.currentHealth;
			state.maxHealth = action.payload.maxHealth;
		},
	},
});

export const { setHealth } = healthSlice.actions;
export default healthSlice.reducer;
