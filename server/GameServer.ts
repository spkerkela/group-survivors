import { SERVER_UPDATE_RATE } from "../common/constants";
import { StaticObject } from "../common/types";
import { playersRequired, serverTimeScale } from "./config";
import ConnectionStateMachine from "./ConnectionStateMachine";
import GameSessionStateMachine from "./GameSessionStateMachine";
import { ServerScene } from "./ServerScene";

export interface LevelData {
  name: string;
  bots: number;
  playerStartPosition: { x: number; y: number };
  enemyTable: { [key: string]: number };
  spawnRate: number;
  staticObjects: StaticObject[];
}

export class GameServer {
  scene: ServerScene;
  levelData: LevelData;
  deltaTime: number;
  gameStateMachine: GameSessionStateMachine;
  connectionStateMachine: ConnectionStateMachine;

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
  }

  update(deltaTime: number) {
    this.gameStateMachine.update(deltaTime);
    this.connectionStateMachine.update(deltaTime);
  }

  start() {
    this.scene.start(this.levelData);
    let previousTime = Date.now();
    let deltaTime = 0;
    setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - previousTime;
      previousTime = currentTime;
      deltaTime = (elapsedTime / 1000) * serverTimeScale;
      this.update(deltaTime);
    }, SERVER_UPDATE_RATE);
  }
}
