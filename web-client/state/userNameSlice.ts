import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import { sanitizeName } from "../../common/shared";

export const userNameSlice = createSlice({
	name: "userName",
	initialState: {
		userName: "",
		error: "",
	},
	reducers: {
		set: (state, action: PayloadAction<string>) => {
			const newName = action.payload;
			if (sanitizeName(newName) === "") {
				state.error = "Please enter a name";
			} else {
				state.error = "";
			}
			state.userName = action.payload;
		},
	},
});
export const { set } = userNameSlice.actions;
export default userNameSlice.reducer;
