import type { State } from "../../common/StateMachine";
import { CastSpellState } from "./CastSpellState";
import type { SpellStateData } from "./SpellStateMachine";

export class SpellCooldownState implements State<SpellStateData> {
  cooldown = 0;
  update(dt: number, _data: SpellStateData) {
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      return new CastSpellState();
    }
    return this;
  }
  enter({ spellData, player }: SpellStateData) {
    const powerUps = player.powerUps[spellData.id] || [];
    const reduction = powerUps
      .filter((pu) => pu.type === "cooldown")
      .reduce((sum, pu) => sum + pu.value, 0);
    this.cooldown =
      spellData.cooldown *
      spellData.cooldownMultiplier *
      (1 - Math.min(0.5, reduction));
  }
}
