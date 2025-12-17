import type EventSystem from "../../common/EventSystem";
import StateMachine from "../../common/StateMachine";
import { sanitizeName } from "../../common/shared";
import type { MoveUpdate } from "../../common/types";
import type { LevelData } from "../GameServer";
import logger from "../logger";
import type { ServerScene } from "../ServerScene";
import { PreMatchState } from "./PreMatchState";

export interface StateMachineData {
  scene: ServerScene;
  levelData: LevelData;
  playersRequired: number;
}

export default class GameSessionStateMachine {
  stateMachine: StateMachine<StateMachineData>;
  data: StateMachineData;
  callbacks: {
    join: { [id: string]: (screenName: string) => void };
    move: { [id: string]: (moveUpdate: MoveUpdate) => void };
    disconnect: { [id: string]: () => void };
  } = {
    join: {},
    move: {},
    disconnect: {},
  };
  lobby: string[] = [];
  connectionCallback = (id: string, connection: EventSystem) => {
    const connectionLogger = logger.child({ connectionId: id });
    connectionLogger.info("connection established");
    this.lobby.push(id);
    this.data.scene.eventSystems.connectionSystems[id] = connection;
    this.data.scene.initializeEvents(id);
    this.callbacks.disconnect[id] = () => {
      this.lobby = this.lobby.filter((x) => x !== id);
      this.data.scene.readyToJoin = this.data.scene.readyToJoin.filter(
        (p) => p.id !== id,
      );
      this.data.scene.clearEvents(id);
      delete this.data.scene.eventSystems.connectionSystems[id];
      this.data.scene.updates.playersToRemove.push(id);
      connectionLogger.info("connection closed");
    };
    this.callbacks.join[id] = (screenName: string) => {
      const sanitizedName = sanitizeName(screenName);
      this.lobby = this.lobby.filter((x) => x !== id);
      this.data.scene.readyToJoin.push({ id, screenName: sanitizedName });
      this.data.scene.pushEvent(
        "joined",
        id,
        this.data.scene.createGameStateMessage(id),
      );
      connectionLogger.info("player joined");
    };
    connection.addEventListener("disconnect", this.callbacks.disconnect[id]);
    connection.addEventListener("join", this.callbacks.join[id]);
  };
  constructor(scene: ServerScene, levelData: LevelData, playersRequired = 2) {
    this.data = {
      scene: scene,
      levelData,
      playersRequired,
    };
    scene.eventSystems.gameEventSystem.addEventListener(
      "connection",
      this.connectionCallback,
    );
    this.stateMachine = new StateMachine(new PreMatchState(), this.data);
  }
  update(dt: number) {
    this.stateMachine.update(dt, this.data);
  }
}
