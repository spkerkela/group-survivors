import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { sanitizeName } from "../../common/shared";

const EMPTY_NAME_ERROR = "Please enter a name";

type UserNameState = {
  input: string;
  sanitized: string;
  error: string;
  isValid: boolean;
};

function getStateForInput(input: string): UserNameState {
  const sanitized = sanitizeName(input);
  const isValid = sanitized !== "";
  return {
    input,
    sanitized,
    error: isValid ? "" : EMPTY_NAME_ERROR,
    isValid,
  };
}

export const userNameSlice = createSlice({
  name: "userName",
  initialState: getStateForInput(""),
  reducers: {
    set: (state, action: PayloadAction<string>) => {
      const nextState = getStateForInput(action.payload);
      state.input = nextState.input;
      state.sanitized = nextState.sanitized;
      state.error = nextState.error;
      state.isValid = nextState.isValid;
    },
    reset: (state) => {
      const nextState = getStateForInput("");
      state.input = nextState.input;
      state.sanitized = nextState.sanitized;
      state.error = nextState.error;
      state.isValid = nextState.isValid;
    },
  },
});

export const { set, reset } = userNameSlice.actions;
export default userNameSlice.reducer;
export { EMPTY_NAME_ERROR };
