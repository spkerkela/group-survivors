import type EventSystem from "../common/EventSystem";
import type { ClientGameState } from "../common/types";
import { globalEventSystem } from "./eventSystems";
import type { GameFrontend } from "./middleware";

const pressedKeys: { [key: string]: boolean } = {};
window.onkeyup = (e: { keyCode: string | number }) => {
  pressedKeys[e.keyCode] = false;
};
window.onkeydown = (e: { keyCode: string | number }) => {
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
      wave: 0,
      waveSecondsRemaining: 0,
      player: null,
    };

    frontend.init(this.gameState, serverEventSystem);

    const inputInterval: NodeJS.Timeout | null = null;

    serverEventSystem.addEventListener(
      "joined",
      (newGameState: ClientGameState) => {
        this.gameState = newGameState;
        globalEventSystem.dispatchEvent("disableJoinUI");
      },
    );

    serverEventSystem.addEventListener("endMatch", () => {
      this.gameState = {
        id: this.gameState.id,
        players: [],
        enemies: [],
        pickUps: [],
        projectiles: [],
        staticObjects: [],
        wave: 0,
        waveSecondsRemaining: 0,
        player: null,
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
      },
    );
    serverEventSystem.addEventListener("disconnect", () => {
      if (inputInterval) {
        clearInterval(inputInterval);
      }
    });
  }
}
