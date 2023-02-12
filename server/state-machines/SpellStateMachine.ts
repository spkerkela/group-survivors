import { SpellData } from "../../common/data";
import StateMachine from "../../common/StateMachine";
import { SpellCastEvent, Enemy, Player } from "../../common/types";
import { CastSpellState } from "./CastSpellState";

export interface SpellStateData {
  spellData: SpellData;
  player: Player;
  enemies: Enemy[];
  events: SpellCastEvent;
}

export default class SpellStateMachine {
  private sm: StateMachine<SpellStateData>;
  constructor(spellData: SpellData, player: Player, enemies: Enemy[] = []) {
    this.sm = new StateMachine(new CastSpellState(), {
      spellData,
      player,
      enemies,
      events: {
        damageEvents: [],
        projectileEvents: [],
      },
    });
  }
  update(dt: number, data: SpellStateData): SpellCastEvent {
    this.sm.update(dt, data);
    return data.events;
  }
}
