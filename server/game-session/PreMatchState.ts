import type { State } from "../../common/StateMachine";
import { MatchState } from "./MatchState";
import type { StateMachineData } from "./GameSessionStateMachine";

export class PreMatchState implements State<StateMachineData> {
	update(_dt: number, { scene, playersRequired }: StateMachineData) {
		scene.sendEvents();
		if (scene.gameCanStart(playersRequired)) {
			return new MatchState(0);
		}
		return this;
	}
	enter({ scene }: StateMachineData) {
		scene.connectionIds().forEach((id) => {
			scene.pushEvent("preMatch", id, {});
		});
	}
	exit({ scene }: StateMachineData): void {
		scene.clearMatchState();
	}
}
