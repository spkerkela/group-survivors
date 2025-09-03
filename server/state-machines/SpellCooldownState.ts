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
    // Apply all cooldown power-ups for this spell (multiplicative)
    const powerUps = player.powerUps[spellData.id] || [];
    const cooldownMultiplier = powerUps
      .filter((pu) => pu.type === "cooldown")
      .reduce((acc, pu) => acc * (1 - pu.value), 1);
    this.cooldown = Math.max(
      spellData.cooldown * spellData.cooldownMultiplier * cooldownMultiplier -
        player.level * 0.01,
      0.01,
    );
  }
}
