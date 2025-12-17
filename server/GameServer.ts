import { SERVER_UPDATE_RATE } from "../common/constants";
import type { StaticObject } from "../common/types";
import { playersRequired, serverTimeScale } from "./config";
import GameSessionStateMachine from "./game-session/GameSessionStateMachine";
import logger from "./logger";
import type { ServerScene } from "./ServerScene";

export interface LevelData {
  name: string;
  bots: number;
  playerStartPosition: { x: number; y: number };
  enemyTable: { [key: string]: number };
  spawnRate: number;
  staticObjects: StaticObject[];
  waveLength: number;
  waves: number;
}

export class GameServer {
  scene: ServerScene;
  levelData: LevelData;
  deltaTime: number;
  gameStateMachine: GameSessionStateMachine;
  running: boolean;

  constructor(serverScene: ServerScene, levelData: LevelData) {
    this.scene = serverScene;
    this.levelData = levelData;

    this.deltaTime = 0;
    this.gameStateMachine = new GameSessionStateMachine(
      serverScene,
      levelData,
      playersRequired,
    );

    this.running = false;
  }

  update(deltaTime: number) {
    this.gameStateMachine.update(deltaTime);
  }

  stop() {
    this.running = false;
  }
  start() {
    this.running = true;
    let previousTime = Date.now();
    let deltaTime = 0;
    const updateFn = () => {
      if (!this.running) {
        logger.info("Game server stopped");
        return;
      }
      const currentTime = Date.now();
      const elapsedTime = currentTime - previousTime;
      previousTime = currentTime;
      deltaTime = (elapsedTime / 1000) * serverTimeScale;
      this.update(deltaTime);
      setTimeout(updateFn, SERVER_UPDATE_RATE);
    };
    updateFn();
  }
}
