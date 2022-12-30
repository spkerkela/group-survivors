import {
  GAME_WIDTH,
  INVLUNERABILITY_FRAMES,
  PLAYER_SIZE,
  SERVER_UPDATE_RATE,
} from "../common/constants";
import { normalize } from "../common/math";
import { randomBetweenExclusive } from "../common/random";
import { Enemy, Gem, InputState, Player, Position } from "../common/types";
import { SpellData, spellDB } from "./data";
export interface PlayerUpdate {
  x: number;
  y: number;
}

type Updates = { moves: { [key: string]: PlayerUpdate } };

export function createMoveUpdate(inputState: InputState) {
  const { up, down, left, right } = inputState;
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  return normalize(x, y);
}

export function updatePlayers(players: Player[], updates: Updates) {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const update = updates.moves[player.id];
    if (player.alive && update) {
      player.x += update.x * player.speed;
      player.y += update.y * player.speed;
      delete updates.moves[player.id];
      if (player.x < 0) player.x = 0;
      if (player.y < 0) player.y = 0;
      if (player.x > GAME_WIDTH) player.x = GAME_WIDTH;
      if (player.y > GAME_WIDTH) player.y = GAME_WIDTH;
    }
    player.invulnerabilityFrames -= SERVER_UPDATE_RATE;
  }
  updateBots(players);
}

function updateBots(players: Player[]) {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player.alive && player.id.startsWith("bot")) {
      const x = player.x + Math.cos(player.y / 100) * player.speed;
      const y = player.y + Math.sin(player.x / 100) * player.speed;
      player.x = x;
      player.y = y;
    }
  }
}

export function updateEnemies(enemies: Enemy[], players: Player[]) {
  let events = [];
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy.alive) continue;
    const nearestPlayer = players.reduce(
      (nearest, player) => {
        const distance = Math.sqrt(
          Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2)
        );
        if (player.alive && distance < nearest.distance) {
          return { distance, player };
        } else {
          return nearest;
        }
      },
      { distance: Infinity, player: null }
    );
    const { player, distance } = nearestPlayer;

    if (player && player.alive) {
      if (distance > PLAYER_SIZE) {
        const x = player.x - enemy.x;
        const y = player.y - enemy.y;
        const { x: nx, y: ny } = normalize(x, y);
        enemy.x += nx * enemy.speed;
        enemy.y += ny * enemy.speed;
      } else {
        if (player.invulnerabilityFrames <= 0) {
          const damage = randomBetweenExclusive(
            enemy.damageMin,
            enemy.damageMax
          );
          events.push({
            name: "damage",
            data: {
              playerId: player.id,
              damageType: enemy.damageType,
              amount: damage,
            },
          });
          player.invulnerabilityFrames = INVLUNERABILITY_FRAMES;
          player.hp -= damage;
          player.alive = player.hp > 0;
        }
      }
    }
  }

  return events;
}

export interface SpellDamageEvent {
  fromId: string;
  targetId: string;
  damage: number;
  damageType: string;
  critical: boolean;
}

function tickAura(
  spellData: SpellData,
  position: Position,
  fromId: string,
  enemies: Enemy[]
): SpellDamageEvent[] {
  const enemiesInRange = enemies.filter((enemy) => {
    const distance = Math.sqrt(
      Math.pow(enemy.x - position.x, 2) + Math.pow(enemy.y - position.y, 2)
    );
    return distance < spellData.range * spellData.rangeMultiplier;
  });
  return enemiesInRange.map((enemy) => {
    const critical = Math.random() < spellData.critChance;
    const damage = critical
      ? spellData.baseDamage * spellData.critMultiplier
      : spellData.baseDamage;
    return {
      fromId: fromId,
      targetId: enemy.id,
      damage: damage,
      damageType: spellData.damageType,
      critical: critical,
    };
  });
}

export function castSpell(
  spell: string,
  player: Player,
  enemies: Enemy[]
): SpellDamageEvent[] {
  const spellData = spellDB[spell];
  switch (spellData.type) {
    case "aura":
      const events = tickAura(
        spellData,
        { x: player.x, y: player.y },
        player.id,
        enemies
      );
      return events;
    default:
      return [];
  }
}
export function updateSpells(
  players: Player[],
  enemies: Enemy[]
): SpellDamageEvent[] {
  let events = [];
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player.alive) {
      const spells = Object.keys(player.spells);
      for (let j = 0; j < spells.length; j++) {
        const spell = spells[j];
        const spellData = player.spells[spell];
        if (spellData.cooldown > 0) {
          spellData.cooldown -= SERVER_UPDATE_RATE;
        } else {
          spellData.cooldown = Math.max(
            spellDB[spell].cooldown * spellDB[spell].cooldownMultiplier,
            0.01
          );
          events = events.concat(castSpell(spell, player, enemies));
        }
      }
    }
  }
  return events;
}

export function removeDeadEnemies(enemies: Enemy[]) {
  return enemies.filter((enemy) => enemy.alive);
}

export interface GemEvent {
  playerId: string;
  gemId: string;
}

export function updateGems(gems: Gem[], players: Player[]): GemEvent[] {
  let events: GemEvent[] = [];
  for (let i = 0; i < gems.length; i++) {
    const gem = gems[i];
    for (let j = 0; j < players.length; j++) {
      const player = players[j];
      if (player.alive) {
        const distance = Math.sqrt(
          Math.pow(player.x - gem.x, 2) + Math.pow(player.y - gem.y, 2)
        );
        if (distance < PLAYER_SIZE) {
          events.push({
            playerId: player.id,
            gemId: gem.id,
          });
        }
      }
    }
  }
  return events;
}
