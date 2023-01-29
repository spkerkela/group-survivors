import { GameState, Player } from "../common/types";
import SpellStateMachine from "./SpellStateMachine";

export interface ServerGameState extends GameState {
  players: ServerPlayer[];
}
export interface ServerPlayer extends Player {
  spellSMs: {
    [key: string]: SpellStateMachine;
  };
}
