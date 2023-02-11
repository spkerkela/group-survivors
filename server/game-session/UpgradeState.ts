import { State } from "../../common/StateMachine";
import { EndMatchState } from "./EndMatchState";
import { MatchState } from "./MatchState";
import { StateMachineData } from "./GameSessionStateMachine";

export class UpgradeState implements State<StateMachineData> {
  wave: number;
  constructor(wave: number) {
    this.wave = wave;
  }
  update(_dt: number, { levelData }: StateMachineData) {
    if (this.wave + 1 >= levelData.waves) {
      return new EndMatchState();
    } else {
      return new MatchState(this.wave + 1);
    }
  }
  enter() {}
  exit() {}
}
