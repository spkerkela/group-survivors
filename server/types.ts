import { GameState, Player, PowerUp } from "../common/types";
import SpellStateMachine from "./state-machines/SpellStateMachine";

export interface ServerGameState extends GameState {
	players: ServerPlayer[];
}

export interface PlayerMatchState {
	gold: number;
	spells: { [key: string]: number };
	passives: { [key: string]: number };
	level: number;
	experience: number;
	maxHp: number;
	powerUps: { [key: string]: PowerUp[] };
	globalPowerUps: PowerUp[];
}

export interface ServerPlayer extends Player {
	spellSMs: {
		[key: string]: SpellStateMachine;
	};
}
