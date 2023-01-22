import { SERVER_UPDATE_RATE } from "../common/constants";
import { ClientGameState } from "../common/types";
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
  gameState: ClientGameState;

  constructor(serverEventSystem: EventSystem, frontend: GameFrontend) {
    this.gameState = {
      players: [],
      enemies: [],
      pickUps: [],
      projectiles: [],
      id: "",
      staticObjects: [],
    };

    frontend.init(this.gameState, serverEventSystem);

    let inputInterval: NodeJS.Timeout | null = null;

    serverEventSystem.addEventListener(
      "joined",
      (newGameState: ClientGameState) => {
        this.gameState = newGameState;
        globalEventSystem.dispatchEvent("disableJoinUI");
      }
    );

    serverEventSystem.addEventListener("endMatch", () => {
      this.gameState = {
        id: this.gameState.id,
        players: [],
        enemies: [],
        pickUps: [],
        projectiles: [],
        staticObjects: [],
      };
    });

    serverEventSystem.addEventListener(
      "update",
      (newState: ClientGameState) => {
        if (newState.id !== this.gameState.id) return;
        this.gameState.players = newState.players;
        this.gameState.enemies = newState.enemies;
        this.gameState.pickUps = newState.pickUps;
        this.gameState.projectiles = newState.projectiles;
        this.gameState.staticObjects = newState.staticObjects;
        this.gameState.debug = newState.debug;
        const player = newState.players.find((p) => p.id === this.gameState.id);
        if (player == null || !player.alive) {
          globalEventSystem.dispatchEvent("enableJoinUI");
        }
      }
    );
    serverEventSystem.addEventListener("disconnect", () => {
      if (inputInterval) {
        clearInterval(inputInterval);
      }
    });
  }
}
