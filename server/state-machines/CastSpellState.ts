import { State } from "../../common/StateMachine";
import { PowerUp } from "../../common/types";
import { castSpell } from "../game-logic/spells";
import { SpellStateData } from "./SpellStateMachine";
import { SpellCooldownState } from "./SpellCooldownState";

export class CastSpellState implements State<SpellStateData> {
  cooldown: number;
  castCount: number;
  castsDone: number;
  update(dt: number, { spellData, player, enemies, events }: SpellStateData) {
    this.cooldown -= dt;
    if (this.castsDone < this.castCount) {
      if (this.cooldown <= 0) {
        const newEvents = castSpell(spellData.id, player, enemies);
        events.damageEvents = events.damageEvents.concat(
          newEvents.damageEvents
        );
        events.projectileEvents = events.projectileEvents.concat(
          newEvents.projectileEvents
        );
        this.castsDone++;
        this.cooldown = spellData.multiCastCooldown;
      }

      return this;
    }
    return new SpellCooldownState();
  }
  enter({ spellData, player }: SpellStateData) {
    const powerUps = player.powerUps[spellData.id] || [];
    this.castCount = powerUps
      .filter((pu: PowerUp) => pu.type === "additionalCast")
      .reduce((acc: number, pu: PowerUp) => acc + pu.value, 1);
    this.castsDone = 0;
    this.cooldown = 0;
  }
}
