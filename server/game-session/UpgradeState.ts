import type { State } from "../../common/StateMachine";
import { EndMatchState } from "./EndMatchState";
import { MatchState } from "./MatchState";
import type { StateMachineData } from "./GameSessionStateMachine";
import logger from "../logger";

export class UpgradeState implements State<StateMachineData> {
	wave: number;
	countdown = 30;
	constructor(wave: number) {
		this.wave = wave;
	}
	update(
		dt: number,
		{ levelData, scene }: StateMachineData,
	): State<StateMachineData> {
		scene.sendEvents();
		if (this.wave + 1 >= levelData.waves) {
			return new EndMatchState();
		} else {
			if (this.countdown > 0) {
				this.countdown -= dt;
				return this;
			}
			logger.info("upgrade state finished");

			return new MatchState(this.wave + 1);
		}
	}
	enter({ scene }: StateMachineData) {
		logger.info("upgrade state entered");
		scene.connectionIds().forEach((id) => {
			const playerUpgradeChoices = scene.getUpgradeChoices(id);
			logger.info("upgrade choices", playerUpgradeChoices);
			scene.pushEvent("upgrade", id, {
				choices: playerUpgradeChoices,
			});
		});
	}

	exit() {}
}
