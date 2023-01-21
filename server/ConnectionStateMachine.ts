import StateMachine, { State } from "../common/StateMachine";
import { ServerScene } from "./ServerScene";
import EventSystem from "../common/EventSystem";
import { sanitizeName } from "../common/shared";
import { MoveUpdate } from "../common/types";
import { createMoveUpdate } from "./game-logic";

interface ConnectionData {
  scene: ServerScene;
  playersRequired: number;
}

export class LobbyState implements State<ConnectionData> {
  private scene: ServerScene;
  constructor(scene: ServerScene) {
    this.scene = scene;
  }

  update(
    dt: number,
    { scene: scene, playersRequired }: ConnectionData
  ): State<ConnectionData> {
    scene.sendEvents();

    if (scene.gameCanStart(playersRequired)) {
      return new GameUpdateState();
    }

    return this;
  }

  enter({ scene }: ConnectionData): void {}

  exit(data: ConnectionData): void {}
}

export class GameUpdateState implements State<ConnectionData> {
  update(dt: number, { scene }: ConnectionData): State<ConnectionData> {
    scene.sendEvents();
    if (scene.gameState.players.length === 0) {
      return new GameRetrospectiveState();
    }
    return this;
  }

  callbacks: {
    join: { [id: string]: (screenName: string) => void };
    move: { [id: string]: (moveUpdate: MoveUpdate) => void };
  } = {
    join: {},
    move: {},
  };

  setupMoveListener(id: string, connection: EventSystem, scene: ServerScene) {
    this.callbacks.move[id] = (data: MoveUpdate) => {
      const { up, down, left, right } = data;
      scene.updates.moves[id] = createMoveUpdate({
        up,
        down,
        left,
        right,
      });
    };
    connection.addEventListener("move", this.callbacks.move[id]);
  }

  enter({ scene }: ConnectionData): void {
    scene.eventSystems.gameEventSystem.addEventListener(
      "connection",
      (id: string, connection: EventSystem) => {
        this.callbacks.join[id] = (screenName: string) => {
          const sanitizedScreenName = sanitizeName(screenName);
          scene.events[id].push({
            name: "joined",
            data: scene.createGameStateMessage(id),
          });
          scene.updates.newPlayers.push({
            id,
            screenName: sanitizedScreenName,
          });
          scene.events[id].push({
            name: "beginMatch",
            data: scene.createGameStateMessage(id),
          });
        };
        connection.addEventListener("join", this.callbacks.join[id]);
        this.setupMoveListener(id, connection, scene);
      }
    );
    scene.enableInstantJoin();
    scene.readyToJoin.forEach(({ id, screenName }) => {
      scene.pushEvent("beginMatch", id, {
        gameState: scene.createGameStateMessage(id),
      });
      Object.entries(scene.eventSystems.connectionSystems).forEach(
        ([id, connection]) => this.setupMoveListener(id, connection, scene)
      );
    });
  }

  exit(data: ConnectionData): void {
    data.scene.disableInstantJoin();
    data.scene.connectionIds().forEach((id) => {
      data.scene.pushEvent("endMatch", id, {});
    });
    Object.entries(data.scene.eventSystems.connectionSystems).forEach(
      ([id, connection]) => {
        connection.removeEventListener("join", this.callbacks.join[id]);
        connection.removeEventListener("move", this.callbacks.move[id]);
      }
    );
  }
}

export class GameRetrospectiveState implements State<ConnectionData> {
  time: number;

  update(dt: number, data: ConnectionData): State<ConnectionData> {
    data.scene.sendEvents();
    this.time -= dt;
    if (this.time <= 0 || data.scene.connectionIds().length === 0) {
      return new LobbyState(data.scene);
    }
    return this;
  }

  enter(data: ConnectionData): void {
    this.time = 10;
    data.scene.connectionIds().forEach((id) => {
      data.scene.pushEvent("gameOver", id, {
        monstersKilled: 2, //TODO: get this from the scene
      });
    });
  }

  exit(data: ConnectionData): void {}
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
    this.lobby.push(id);
    this.data.scene.eventSystems.connectionSystems[id] = connection;
    this.data.scene.events[id] = [];
    this.callbacks.disconnect[id] = () => {
      this.lobby = this.lobby.filter((x) => x !== id);
      this.data.scene.readyToJoin = this.data.scene.readyToJoin.filter(
        (p) => p.id !== id
      );
      delete this.data.scene.events[id];
      delete this.data.scene.eventSystems.connectionSystems[id];
      this.data.scene.updates.playersToRemove.push(id);
    };
    this.callbacks.join[id] = (screenName: string) => {
      const sanitizedName = sanitizeName(screenName);
      this.lobby = this.lobby.filter((x) => x !== id);
      this.data.scene.readyToJoin.push({ id, screenName: sanitizedName });
      this.data.scene.events[id].push({
        name: "joined",
        data: this.data.scene.createGameStateMessage(id),
      });
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
