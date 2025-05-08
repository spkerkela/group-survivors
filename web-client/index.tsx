import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import store from "./store/store";
import UI from "./UI";
import GameContainer from "./GameContainer";
const container = document.getElementById("app");
const root = createRoot(container!);
root.render(
	<Provider store={store}>
		<GameContainer />
		<UI />
	</Provider>,
);
