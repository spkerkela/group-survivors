import { State } from "../../common/StateMachine";
import { ServerScene } from "../ServerScene";
import { ConnectionData } from "./ConnectionStateMachine";
import { GameUpdateState } from "./GameUpdateState";

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
