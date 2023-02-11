import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../../common/constants";
import {
  Enemy,
  GameObject,
  Player,
  Position,
  PowerUp,
  SpellCastEvent,
  SpellDamageEvent,
  SpellProjectileEvent,
} from "../../common/types";
import { SpellData, spellDB } from "../../common/data";
import QuadTree from "../../common/QuadTree";
import { ServerPlayer } from "../types";
import SpellStateMachine from "../state-machines/SpellStateMachine";

import { normalize } from "../../common/math";

export function updateSpells(
  players: ServerPlayer[],
  gameObjectQuadTree: QuadTree<GameObject>,
  deltaTime: number
): SpellCastEvent {
  let events: SpellCastEvent = {
    damageEvents: [],
    projectileEvents: [],
  };
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player.alive) {
      const enemies = gameObjectQuadTree
        .retrieve({
          x: player.x - SCREEN_WIDTH / 2,
          y: player.y - SCREEN_HEIGHT / 2,
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
        })
        .filter(
          (gameObject): gameObject is Enemy => gameObject.objectType === "enemy"
        );

      Object.keys(player.spells).forEach((spell) => {
        const spellData = spellDB[spell];
        if (player.spellSMs[spell] == null) {
          player.spellSMs[spell] = new SpellStateMachine(
            spellData,
            player,
            enemies
          );
        }

        player.spellSMs[spell].update(deltaTime, {
          events: events,
          spellData: spellData,
          player: player,
          enemies: enemies,
        });
      });
    }
  }
  return events;
}

export function castSpell(
  spell: string,
  player: Player,
  enemies: Enemy[],
  powerUps: PowerUp[] = []
): SpellCastEvent {
  const spellData = spellDB[spell];
  let result = {
    damageEvents: [],
    projectileEvents: [],
  };
  switch (spellData.type) {
    case "aura":
      result.damageEvents = tickAura(
        spellData,
        { x: player.x, y: player.y },
        player.id,
        player.level,
        enemies
      );
      break;
    case "projectile-target":
      const projectileEvent = shootAtNearestEnemy(spellData, player, enemies);
      if (projectileEvent) {
        result.projectileEvents.push(projectileEvent);
      }
      break;
    default:
      return result;
  }
  return result;
}

export function addSpellToPlayer(
  spellId: string,
  player: ServerPlayer
): boolean {
  if (player.spells[spellId] != null) {
    return false;
  }
  if (player.spellSMs[spellId] == null) {
    const spellData = spellDB[spellId];
    if (spellData == null) {
      return false;
    }
    player.spellSMs[spellId] = new SpellStateMachine(spellData, player);
  }
  player.spells[spellId] = 0;
  return true;
}
export function shootAtNearestEnemy(
  spellData: SpellData,
  player: Player,
  enemies: Enemy[]
): SpellProjectileEvent | null {
  const nearestEnemy = enemies.reduce(
    (nearest, enemy) => {
      const distance = Math.sqrt(
        Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)
      );
      if (enemy.alive && distance < nearest.distance) {
        return { distance, enemy };
      } else {
        return nearest;
      }
    },
    { distance: Infinity, enemy: null }
  );
  const { enemy, distance } = nearestEnemy;

  if (enemy && enemy.alive) {
    const powerUps = player.powerUps[spellData.id] || [];
    const additionalSpellDamage = powerUps
      .filter((powerUp) => powerUp.type === "damage")
      .map((powerUp) => powerUp.value)
      .reduce((a, b) => a + b, 0);

    const x = enemy.x - player.x;
    const y = enemy.y - player.y;
    const { x: nx, y: ny } = normalize(x, y);
    const direction = { x: nx, y: ny };

    const critical = Math.random() < spellData.critChance + 0.01 * player.level;
    const baseDamage = spellData.baseDamage * (1 + additionalSpellDamage);
    const damage = critical
      ? baseDamage * spellData.critMultiplier
      : baseDamage;
    return {
      fromId: player.id,
      position: { x: player.x, y: player.y },
      targetDirection: direction,
      spellId: spellData.id,
      damage: damage * player.level,
      damageType: spellData.damageType,
      critical: critical,
      lifetime: spellData.lifetime,
      speed: spellData.speed,
      maxPierceCount: spellData.maxPierceCount + player.level - 1,
    };
  }
  return null;
}

export function tickAura(
  spellData: SpellData,
  position: Position,
  fromId: string,
  playerLevel: number,
  enemies: Enemy[]
): SpellDamageEvent[] {
  const enemiesInRange = enemies.filter((enemy) => {
    const distance = Math.sqrt(
      Math.pow(enemy.x - position.x, 2) + Math.pow(enemy.y - position.y, 2)
    );
    return (
      distance <
      spellData.range * spellData.rangeMultiplier + 0.01 * playerLevel
    );
  });
  return enemiesInRange.map((enemy) => {
    const critical = Math.random() < spellData.critChance + 0.01 * playerLevel;
    const damage = critical
      ? spellData.baseDamage * spellData.critMultiplier
      : spellData.baseDamage;
    return {
      fromId: fromId,
      targetId: enemy.id,
      damage: damage * playerLevel,
      damageType: spellData.damageType,
      critical: critical,
      spellId: spellData.id,
    };
  });
}
