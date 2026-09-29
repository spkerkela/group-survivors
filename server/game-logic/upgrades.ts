import { MAX_ACTIVE_SPELLS, spellDB } from "../../common/data";
import { chooseRandom } from "../../common/random";
import type { Player, PowerUp, UpgradeChoice } from "../../common/types";
import { generateId } from "../id-generator";

// Fixed bonuses: randomize the options, not their strength.
export function availablePowerUps(player: Player, spellId: string): PowerUp[] {
  const upgrades = player.powerUps[spellId] || [];
  const count = (type: PowerUp["type"]) =>
    upgrades.filter((powerUp) => powerUp.type === type).length;
  const options: PowerUp[] = [{ type: "damage", value: 0.15 }];
  if (count("cooldown") < 5) options.push({ type: "cooldown", value: 0.1 });
  if (spellDB[spellId].type === "aura") {
    options.push({ type: "range", value: 0.15 });
  } else if (count("additionalCast") < 2) {
    options.push({ type: "additionalCast", value: 1 });
  }
  return options;
}

export function generateUpgradeChoiceGroup(player: Player): UpgradeChoice[] {
  const owned = Object.keys(spellDB).filter((id) => player.spells[id] != null);
  const unowned = Object.keys(spellDB).filter(
    (id) => player.spells[id] == null,
  );
  const pool =
    owned.length < MAX_ACTIVE_SPELLS ? [...owned, ...unowned] : [...owned];
  const choices: UpgradeChoice[] = [];
  while (pool.length && choices.length < 4) {
    // Guarantee at least one upgrade to an owned weapon, then sample without replacement.
    const spellId = chooseRandom(
      choices.length === 0 && owned.length ? owned : pool,
    );
    pool.splice(pool.indexOf(spellId), 1);
    choices.push({
      id: generateId("upgrade"),
      spellId,
      powerUp:
        player.spells[spellId] != null
          ? chooseRandom(availablePowerUps(player, spellId))
          : null,
    });
  }
  return choices;
}
