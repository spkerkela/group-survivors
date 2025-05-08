import type { State } from "../../common/StateMachine";
import type { StateMachineData } from "./GameSessionStateMachine";
import { PreMatchState } from "./PreMatchState";

export class EndMatchState implements State<StateMachineData> {
	timeRemaining: number;
	constructor(seconds = 10) {
		this.timeRemaining = seconds;
	}
	update(dt: number, { scene }: StateMachineData): State<StateMachineData> {
		scene.sendEvents();
		this.timeRemaining -= dt;
		if (this.timeRemaining <= 0) {
			return new PreMatchState();
		}
		if (scene.connectionIds().length === 0) {
			return new PreMatchState();
		}
		return this;
	}
	enter({ scene }: StateMachineData) {
		scene.connectionIds().forEach((id) => {
			scene.pushEvent("gameOver", id, {
				monstersKilled: 2,
			});
		});
	}
}
