import StateMachine from "../../common/StateMachine";
import { LevelData } from "../GameServer";
import { ServerScene } from "../ServerScene";
import { PreMatchState } from "./PreMatchState";

export interface StateMachineData {
  scene: ServerScene;
  levelData: LevelData;
  playersRequired: number;
}

export default class GameSessionStateMachine {
  stateMachine: StateMachine<StateMachineData>;
  data: StateMachineData;
  constructor(
    scene: ServerScene,
    levelData: LevelData,
    playersRequired: number = 2
  ) {
    this.data = {
      scene: scene,
      levelData,
      playersRequired,
    };
    this.stateMachine = new StateMachine(new PreMatchState(), this.data);
  }
  update(dt: number) {
    this.stateMachine.update(dt, this.data);
  }
}
