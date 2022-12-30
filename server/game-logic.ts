import {
  GAME_WIDTH,
  INVLUNERABILITY_FRAMES,
  PLAYER_SIZE,
  SERVER_UPDATE_RATE,
} from "../common/constants";
import { normalize } from "../common/math";
import { randomBetweenExclusive } from "../common/random";
import { Enemy, InputState, Player } from "../common/types";
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
