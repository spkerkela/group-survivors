import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { isValidGameId } from "../common/shared";
import GameContainer from "./GameContainer";
import store from "./store/store";
import UI from "./UI";

const url = new URL(window.location.href);
if (!isValidGameId(url.searchParams.get("game"))) {
  const gameId = Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) =>
    n.toString(16).padStart(8, "0"),
  ).join("");
  url.searchParams.set("game", gameId);
  window.history.replaceState(null, "", url);
}

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
