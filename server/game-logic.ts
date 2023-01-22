import {
  ENEMY_SIZE,
  GAME_HEIGHT,
  GAME_WIDTH,
  INVULNERABILITY_SECONDS,
  PLAYER_SIZE,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../common/constants";
import { normalize } from "../common/math";
import { randomBetweenExclusive } from "../common/random";
import { experienceRequiredForLevel } from "../common/shared";
import {
  Enemy,
  GameObject,
  PickUp,
  InputState,
  Player,
  Position,
  Projectile,
} from "../common/types";
import { pickUpDB, SpellData, spellDB } from "../common/data";
import QuadTree from "../common/QuadTree";

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

export function updatePlayers(
  players: Player[],
  updates: Updates,
  deltaTime: number
) {
  players.forEach((player) => {
    const update = updates.moves[player.id];
    if (player.alive && update) {
      player.x += update.x * (player.speed * deltaTime);
      player.y += update.y * (player.speed * deltaTime);
      delete updates.moves[player.id];
      if (player.x < 0) player.x = 0;
      if (player.y < 0) player.y = 0;
      if (player.x > GAME_WIDTH) player.x = GAME_WIDTH;
      if (player.y > GAME_HEIGHT) player.y = GAME_HEIGHT;
    }
    player.invulnerabilityFrames -= deltaTime;
  });
  updateBots(players, deltaTime);
}

function updateBots(players: Player[], deltaTime: number) {
  players.forEach((player) => {
    if (player.alive && player.id.startsWith("bot")) {
      const x =
        player.x + Math.cos(player.y / 100) * (player.speed * deltaTime);
      const y =
        player.y + Math.sin(player.x / 100) * (player.speed * deltaTime);
      player.x = x;
      player.y = y;
    }
  });
}

export function updateEnemies(
  enemies: Enemy[],
  gameObjectQuadTree: QuadTree<GameObject>,
  deltaTime: number
): DamageEvent[] {
  let events: DamageEvent[] = [];
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const players = gameObjectQuadTree
      .retrieve({
        x: enemy.x - SCREEN_WIDTH / 2,
        y: enemy.y - SCREEN_HEIGHT / 2,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      })
      .filter(
        (gameObject): gameObject is Player => gameObject.objectType === "player"
      );

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
        enemy.x += nx * (enemy.speed * deltaTime);
        enemy.y += ny * (enemy.speed * deltaTime);
      } else {
        if (player.invulnerabilityFrames <= 0) {
          const damage = randomBetweenExclusive(
            enemy.damageMin,
            enemy.damageMax
          );
          events.push({
            playerId: player.id,
            damageType: enemy.damageType,
            amount: damage,
          });
          player.invulnerabilityFrames = INVULNERABILITY_SECONDS;
          player.hp -= damage;
          player.alive = player.hp > 0;
        }
      }
    } else {
      enemy.x += Math.cos(enemy.y / 100) * (enemy.speed * deltaTime);
      enemy.y += Math.sin(enemy.x / 100) * (enemy.speed * deltaTime);
    }
  });

  return events;
}

export interface SpellDamageEvent {
  fromId: string;
  targetId: string;
  damage: number;
  damageType: string;
  critical: boolean;
  spellId: string;
}

export interface SpellProjectileEvent {
  fromId: string;
  position: Position;
  targetDirection: Position;
  spellId: string;
  damage: number;
  damageType: string;
  critical: boolean;
  lifetime: number;
  maxPierceCount: number;
  speed: number;
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
      spellId: spellData.id,
    };
  });
}

function shootAtNearestEnemy(
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
    const x = enemy.x - player.x;
    const y = enemy.y - player.y;
    const { x: nx, y: ny } = normalize(x, y);
    const direction = { x: nx, y: ny };
    const critical = Math.random() < spellData.critChance + 0.01 * player.level;
    const damage = critical
      ? spellData.baseDamage * spellData.critMultiplier
      : spellData.baseDamage;
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

interface SpellCastEvent {
  damageEvents: SpellDamageEvent[];
  projectileEvents: SpellProjectileEvent[];
}

export function castSpell(
  spell: string,
  player: Player,
  enemies: Enemy[]
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

export function updateSpells(
  players: Player[],
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

      const spells = Object.keys(player.spells);
      for (let j = 0; j < spells.length; j++) {
        const spell = spells[j];
        const spellData = player.spells[spell];
        if (spellData.cooldown >= 0) {
          spellData.cooldown -= deltaTime;
        } else {
          spellData.cooldown = Math.max(
            spellDB[spell].cooldown *
              (spellDB[spell].cooldownMultiplier - player.level * 0.01),
            0.01
          );
          const newEvents = castSpell(spell, player, enemies);
          events.damageEvents = events.damageEvents.concat(
            newEvents.damageEvents
          );
          events.projectileEvents = events.projectileEvents.concat(
            newEvents.projectileEvents
          );
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

export interface DamageEvent {
  playerId: string;
  damageType: string;
  amount: number;
}

export interface PickUpEvent {
  playerId: string;
  pickUpId: string;
}

export interface LevelEvent {
  playerId: string;
  player: Player;
}

export function updatePickUps(
  pickUps: PickUp[],
  gameObjectQuadTree: QuadTree<GameObject>,
  deltaTime: number
): {
  expiredPickUps: string[];
  pickUpEvents: PickUpEvent[];
  levelEvents: LevelEvent[];
} {
  let events: {
    expiredPickUps: string[];
    pickUpEvents: PickUpEvent[];
    levelEvents: LevelEvent[];
  } = {
    pickUpEvents: [],
    levelEvents: [],
    expiredPickUps: [],
  };

  pickUps.forEach((pickUp) => {
    pickUp.lifetime -= deltaTime;
    if (pickUp.lifetime <= 0) {
      events.expiredPickUps.push(pickUp.id);
      return;
    }
    const players = gameObjectQuadTree
      .retrieve({
        x: pickUp.x - PLAYER_SIZE,
        y: pickUp.y - PLAYER_SIZE,
        width: PLAYER_SIZE * 2,
        height: PLAYER_SIZE * 2,
      })
      .filter(
        (gameObject): gameObject is Player => gameObject.objectType === "player"
      );

    players.forEach((player) => {
      if (player.alive) {
        const distance = Math.sqrt(
          Math.pow(player.x - pickUp.x, 2) + Math.pow(player.y - pickUp.y, 2)
        );

        if (distance < PLAYER_SIZE) {
          events.pickUpEvents.push({
            playerId: player.id,
            pickUpId: pickUp.id,
          });
          if (pickUp.type === "exp") {
            player.experience += pickUpDB[pickUp.type].value;
          } else if (pickUp.type === "hp") {
            player.hp = Math.min(
              player.hp + pickUpDB[pickUp.type].value,
              player.maxHp
            );
          } else if (pickUp.type === "gold") {
            player.gold += pickUpDB[pickUp.type].value;
          }
          while (checkPlayerExperience(player)) {
            events.levelEvents.push({
              playerId: player.id,
              player: player,
            });
          }
        }
      }
    });
  });
  return events;
}

export function updateProjectiles(
  projectiles: Projectile[],
  gameObjectQuadTree: QuadTree<GameObject>,
  deltaTime: number
): SpellDamageEvent[] {
  projectiles.forEach((projectile) => {
    projectile.lifetime -= deltaTime;
  });
  const aliveProjectiles = projectiles.filter(
    (projectile) => projectile.lifetime > 0
  );
  const events: SpellDamageEvent[] = [];
  aliveProjectiles.forEach((projectile) => {
    projectile.x += projectile.direction.x * (projectile.speed * deltaTime);
    projectile.y += projectile.direction.y * (projectile.speed * deltaTime);
    const enemies = gameObjectQuadTree
      .retrieve({
        x: projectile.x - ENEMY_SIZE,
        y: projectile.y - ENEMY_SIZE,
        width: projectile.x + ENEMY_SIZE,
        height: projectile.y + ENEMY_SIZE,
      })
      .filter(
        (gameObject): gameObject is Enemy => gameObject.objectType === "enemy"
      );
    enemies.forEach((enemy) => {
      if (enemy.alive) {
        const distance = Math.sqrt(
          Math.pow(enemy.x - projectile.x, 2) +
            Math.pow(enemy.y - projectile.y, 2)
        );
        if (distance < ENEMY_SIZE) {
          // an enemy can only be hit once per projectile
          if (!projectile.hitEnemies.includes(enemy.id)) {
            projectile.hitEnemies.push(enemy.id);
            if (projectile.hitEnemies.length >= projectile.maxPierceCount) {
              projectile.lifetime = 0;
            }
            events.push({
              fromId: projectile.fromId,
              targetId: enemy.id,
              damage: projectile.damage,
              damageType: projectile.damageType,
              critical: projectile.critical,
              spellId: projectile.spellId,
            });
          }
        }
      }
    });
  });
  return events;
}

export function createPlayer(
  id: string,
  name: string,
  { x, y }: Position
): Player {
  return {
    id: id,
    objectType: "player",
    screenName: name,
    x: x,
    y: y,
    hp: 200,
    maxHp: 200,
    alive: true,
    speed: 100,
    level: 1,
    experience: 0,
    invulnerabilityFrames: 0,
    spells: {
      damageAura: {
        cooldown: 0,
        level: 1,
      },
      missile: {
        cooldown: 0,
        level: 1,
      },
    },
    gold: 0,
  };
}

export function createPickUp(
  id: string,
  type: string,
  { x, y }: Position
): PickUp {
  return {
    id: id,
    objectType: "pickup",
    x: x,
    y: y,
    type: type,
    lifetime: 15,
    visual: pickUpDB[type].visual,
  };
}
