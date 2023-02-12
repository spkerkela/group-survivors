import { configureStore } from "@reduxjs/toolkit";
import levelReducer from "../state/levelSlice";
import userNameReducer from "../state/userNameSlice";
import gameReducer from "../state/gameSlice";
import experienceReducer from "../state/experienceSlice";
import goldReducer from "../state/goldSlice";
import healthReducer from "../state/healthSlice";

const store = configureStore({
  reducer: {
    level: levelReducer,
    userName: userNameReducer,
    game: gameReducer,
    experience: experienceReducer,
    health: healthReducer,
    gold: goldReducer,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
