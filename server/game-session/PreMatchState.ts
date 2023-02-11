import { State } from "../../common/StateMachine";
import { MatchState } from "./MatchState";
import { StateMachineData } from "./GameSessionStateMachine";

export class PreMatchState implements State<StateMachineData> {
  update(_dt: number, { scene, playersRequired }: StateMachineData) {
    scene.sendEvents();
    if (scene.gameCanStart(playersRequired)) {
      return new MatchState(0);
    }
    return this;
  }
  exit({ scene }: StateMachineData): void {
    scene.clearMatchState();
  }
}
