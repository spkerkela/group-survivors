import { SERVER_UPDATE_RATE } from "../common/constants";
import { StaticObject } from "../common/types";
import { playersRequired, serverTimeScale } from "./config";
import ConnectionStateMachine from "./ConnectionStateMachine";
import GameSessionStateMachine from "./GameSessionStateMachine";
import { ServerScene } from "./ServerScene";
import logger from "./logger";

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
  connectionStateMachine: ConnectionStateMachine;
  running: boolean;

  constructor(serverScene: ServerScene, levelData: LevelData) {
    this.scene = serverScene;
    this.levelData = levelData;

    this.deltaTime = 0;
    this.gameStateMachine = new GameSessionStateMachine(
      serverScene,
      levelData,
      playersRequired
    );
    this.connectionStateMachine = new ConnectionStateMachine(
      serverScene,
      playersRequired
    );
    this.running = false;
  }

  update(deltaTime: number) {
    this.gameStateMachine.update(deltaTime);
    this.connectionStateMachine.update(deltaTime);
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
