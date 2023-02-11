import StateMachine from "../../common/StateMachine";
import { ServerScene } from "../ServerScene";
import EventSystem from "../../common/EventSystem";
import { sanitizeName } from "../../common/shared";
import { MoveUpdate } from "../../common/types";
import logger from "../logger";
import { LobbyState } from "./LobbyState";

export interface ConnectionData {
  scene: ServerScene;
  playersRequired: number;
}

export default class ConnectionStateMachine {
  stateMachine: StateMachine<ConnectionData>;
  data: ConnectionData;
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
        (p) => p.id !== id
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
        this.data.scene.createGameStateMessage(id)
      );
      connectionLogger.info("player joined");
    };
    connection.addEventListener("disconnect", this.callbacks.disconnect[id]);
    connection.addEventListener("join", this.callbacks.join[id]);
  };
  constructor(scene: ServerScene, playersRequired: number = 2) {
    this.data = { scene: scene, playersRequired };
    scene.eventSystems.gameEventSystem.addEventListener(
      "connection",
      this.connectionCallback
    );
    this.stateMachine = new StateMachine<ConnectionData>(
      new LobbyState(scene),
      this.data
    );
  }

  update(dt: number) {
    this.stateMachine.update(dt, this.data);
  }
}
