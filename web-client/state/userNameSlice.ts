import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import { sanitizeName } from "../../common/shared";

const EMPTY_NAME_ERROR = "Please enter a name";

function getErrorMessage(name: string) {
  return sanitizeName(name) === "" ? EMPTY_NAME_ERROR : "";
}

export const userNameSlice = createSlice({
  name: "userName",
  initialState: {
    userName: "",
    error: getErrorMessage(""),
  },
  reducers: {
    set: (state, action: PayloadAction<string>) => {
      const newName = action.payload;
      state.error = getErrorMessage(newName);
      state.userName = action.payload;
    },
  },
});
export const { set } = userNameSlice.actions;
export default userNameSlice.reducer;
