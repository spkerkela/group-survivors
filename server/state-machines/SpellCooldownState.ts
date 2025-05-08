import type { State } from "../../common/StateMachine";
import { CastSpellState } from "./CastSpellState";
import type { SpellStateData } from "./SpellStateMachine";

export class SpellCooldownState implements State<SpellStateData> {
  cooldown = 0;
  update(dt: number, data: SpellStateData) {
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      return new CastSpellState();
    }
    return this;
  }
  enter({ spellData, player }: SpellStateData) {
    this.cooldown = Math.max(
      spellData.cooldown * spellData.cooldownMultiplier - player.level * 0.01,
      0.01,
    );
  }
}
