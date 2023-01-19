import { SERVER_UPDATE_RATE } from "../common/constants";
import { GameState } from "../common/types";
import { GameFrontend } from "./middleware";
import EventSystem from "../common/EventSystem";
import { globalEventSystem } from "./eventSystems";
let pressedKeys = {};
window.onkeyup = function (e: { keyCode: string | number }) {
  pressedKeys[e.keyCode] = false;
};
window.onkeydown = function (e: { keyCode: string | number }) {
  pressedKeys[e.keyCode] = true;
};

export default class Game {
  gameState: GameState;

  constructor(serverEventSystem: EventSystem, frontend: GameFrontend) {
    this.gameState = {
      players: [],
      enemies: [],
      gems: [],
      projectiles: [],
      id: "",
      staticObjects: [],
    };

    frontend.init(this.gameState, serverEventSystem);

    let inputInterval: NodeJS.Timeout | null = null;
    serverEventSystem.addEventListener(
      "beginMatch",
      (newGameState: GameState) => {
        this.gameState = newGameState;
        console.log("beginMatch", newGameState);
        inputInterval = setInterval(() => {
          const inputState = this.getInputState();
          serverEventSystem.dispatchEvent("move", {
            ...inputState,
            id: this.gameState.id,
          });
        }, SERVER_UPDATE_RATE);
      }
    );
    serverEventSystem.addEventListener("joined", (newGameState: GameState) => {
      this.gameState = newGameState;
      globalEventSystem.dispatchEvent("disableJoinUI");
    });

    serverEventSystem.addEventListener("endMatch", () => {
      this.gameState = {
        id: this.gameState.id,
        players: [],
        enemies: [],
        gems: [],
        projectiles: [],
        staticObjects: [],
      };
    });

    serverEventSystem.addEventListener("update", (newState: GameState) => {
      if (newState.id !== this.gameState.id) return;
      this.gameState.players = newState.players;
      this.gameState.enemies = newState.enemies;
      this.gameState.gems = newState.gems;
      this.gameState.projectiles = newState.projectiles;
      this.gameState.staticObjects = newState.staticObjects;
      this.gameState.debug = newState.debug;
      const player = newState.players.find((p) => p.id === this.gameState.id);
      if (player == null || !player.alive) {
        globalEventSystem.dispatchEvent("enableJoinUI");
      }
    });
    serverEventSystem.addEventListener("disconnect", () => {
      if (inputInterval) {
        clearInterval(inputInterval);
      }
    });
  }

  getInputState() {
    const up = pressedKeys[38] || pressedKeys[87];
    const down = pressedKeys[40] || pressedKeys[83];
    const left = pressedKeys[37] || pressedKeys[65];
    const right = pressedKeys[39] || pressedKeys[68];
    return { up, down, left, right };
  }
}
