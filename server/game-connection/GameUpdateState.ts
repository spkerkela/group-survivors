import { State } from "../../common/StateMachine";
import { ServerScene } from "../ServerScene";
import EventSystem from "../../common/EventSystem";
import { sanitizeName } from "../../common/shared";
import { MoveUpdate } from "../../common/types";
import { createMoveUpdate } from "../game-logic";
import { ConnectionData } from "./ConnectionStateMachine";
import { GameRetrospectiveState } from "./GameRetrospectiveState";

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
          scene.pushEvent("joined", id, scene.createGameStateMessage(id));

          scene.updates.newPlayers.push({
            id,
            screenName: sanitizedScreenName,
          });

          scene.pushEvent("beginMatch", id, scene.createGameStateMessage(id));
        };
        connection.addEventListener("join", this.callbacks.join[id]);
        this.setupMoveListener(id, connection, scene);
      }
    );
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
