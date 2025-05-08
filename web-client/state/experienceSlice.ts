import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { experienceRequiredForLevel } from "../../common/shared";

export const experienceSlice = createSlice({
	name: "experience",
	initialState: {
		currentExperience: 0,
		experienceToNextLevel: experienceRequiredForLevel(2),
	},
	reducers: {
		setExperience: (
			state,
			action: PayloadAction<{
				currentExperience: number;
				experienceToNextLevel: number;
			}>,
		) => {
			state.currentExperience = action.payload.currentExperience;
			state.experienceToNextLevel = action.payload.experienceToNextLevel;
		},
	},
});

export const { setExperience } = experienceSlice.actions;
export default experienceSlice.reducer;
