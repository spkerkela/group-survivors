import { State } from "../../common/StateMachine";
import { LobbyState } from "./LobbyState";
import { ConnectionData } from "./ConnectionStateMachine";

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
        monstersKilled: 2,
      });
    });
  }

  exit(data: ConnectionData): void {}
}
