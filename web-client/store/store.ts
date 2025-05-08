import { configureStore } from "@reduxjs/toolkit";
import experienceReducer from "../state/experienceSlice";
import gameReducer from "../state/gameSlice";
import goldReducer from "../state/goldSlice";
import healthReducer from "../state/healthSlice";
import levelReducer from "../state/levelSlice";
import upgradeChoiceReducer from "../state/upgradeChoicesSlice";
import userNameReducer from "../state/userNameSlice";

const store = configureStore({
	reducer: {
		level: levelReducer,
		userName: userNameReducer,
		game: gameReducer,
		experience: experienceReducer,
		health: healthReducer,
		gold: goldReducer,
		upgradeChoices: upgradeChoiceReducer,
	},
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
