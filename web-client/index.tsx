import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import GameContainer from "./GameContainer";
import UI from "./UI";
import store from "./store/store";
const container = document.getElementById("app");
const root = createRoot(container!);
root.render(
	<Provider store={store}>
		<GameContainer />
		<UI />
	</Provider>,
);
