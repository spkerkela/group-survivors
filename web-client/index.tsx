import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import GameContainer from "./GameContainer";
import store from "./store/store";
import UI from "./UI";

const container = document.getElementById("app");
const root = createRoot(container!);
root.render(
  <Provider store={store}>
    <main className="game-stage" aria-label="Group Survivors game">
      <GameContainer />
      <UI />
    </main>
  </Provider>,
);
