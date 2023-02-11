import { State } from "../../common/StateMachine";
import { PreMatchState } from "./PreMatchState";
import { StateMachineData } from "./GameSessionStateMachine";

export class EndMatchState implements State<StateMachineData> {
  timeRemaining: number;
  constructor(seconds: number = 10) {
    this.timeRemaining = seconds;
  }
  update(dt: number, { scene }: StateMachineData) {
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      return new PreMatchState();
    }
    if (scene.connectionIds().length === 0) {
      return new PreMatchState();
    }
    return this;
  }
}
