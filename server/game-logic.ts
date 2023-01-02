import { GAME_HEIGHT, GAME_WIDTH, INVLUNERABILITY_FRAMES, PLAYER_SIZE, SERVER_UPDATE_RATE } from "../common/constants";
import { normalize } from "../common/math";
import { randomBetweenExclusive } from "../common/random";
import { experienceRequiredForLevel } from "../common/shared";
import { Enemy, Gem, InputState, Player, Position } from "../common/types";
import { gemDB, SpellData, spellDB } from "./data";

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
      if (player.y > GAME_HEIGHT) player.y = GAME_HEIGHT;
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
    } else {
      enemy.x += Math.cos(enemy.y / 100) * enemy.speed;
      enemy.y += Math.sin(enemy.x / 100) * enemy.speed;
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
      return tickAura(
        spellData,
        { x: player.x, y: player.y },
        player.id,
        player.level,
        enemies
      );
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
            spellDB[spell].cooldown *
              (spellDB[spell].cooldownMultiplier - player.level * 0.01),
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

function checkPlayerExperience(player: Player): boolean {
  const nextLevel = player.level + 1;
  if (player.experience >= experienceRequiredForLevel(nextLevel)) {
    const newHp = 200 + nextLevel * 10;
    player.level = nextLevel;
    player.hp = newHp;
    player.maxHp = newHp;
    return true;
  }
  return false;
}

export interface GemEvent {
  playerId: string;
  gemId: string;
}

export interface LevelEvent {
  playerId: string;
  player: Player;
}

export function updateGems(
  gems: Gem[],
  players: Player[]
): { gemEvents: GemEvent[]; levelEvents: LevelEvent[] } {
  let events: { gemEvents: GemEvent[]; levelEvents: LevelEvent[] } = {
    gemEvents: [],
    levelEvents: [],
  };
  for (let i = 0; i < gems.length; i++) {
    const gem = gems[i];
    for (let j = 0; j < players.length; j++) {
      const player = players[j];
      if (player.alive) {
        const distance = Math.sqrt(
          Math.pow(player.x - gem.x, 2) + Math.pow(player.y - gem.y, 2)
        );

        if (distance < PLAYER_SIZE) {
          events.gemEvents.push({
            playerId: player.id,
            gemId: gem.id,
          });
          player.experience += gemDB[gem.type].value;
          while (checkPlayerExperience(player)) {
            events.levelEvents.push({
              playerId: player.id,
              player: player,
            });
          }
        }
      }
    }
  }
  return events;
}

export function createPlayer(id: string, { x, y }: Position): Player {
  return {
    id: id,
    x: x,
    y: y,
    hp: 200,
    maxHp: 200,
    alive: true,
    speed: 3,
    level: 1,
    experience: 0,
    invulnerabilityFrames: 0,
    spells: {
      damageAura: {
        cooldown: 0,
        level: 1,
      },
    },
  };
}

export function createGem(
  id: string,
  gemType: string,
  { x, y }: Position
): Gem {
  return {
    id: id,
    x: x,
    y: y,
    type: gemType,
  };
}
