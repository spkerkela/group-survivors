import { GAME_WIDTH } from "../common/constants";
import { normalize } from "../common/math";
import { InputState, Player } from "../common/types";
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
    if (update) {
      player.x += update.x * player.speed;
      player.y += update.y * player.speed;
      delete updates.moves[player.id];
      if (player.x < 0) player.x = 0;
      if (player.y < 0) player.y = 0;
      if (player.x > GAME_WIDTH) player.x = GAME_WIDTH;
      if (player.y > GAME_WIDTH) player.y = GAME_WIDTH;
    }
  }
  updateBots(players);
}

function updateBots(players: Player[]) {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player.id.startsWith("bot")) {
      const x = player.x + Math.cos(player.y / 100) * player.speed;
      const y = player.y + Math.sin(player.x / 100) * player.speed;
      player.x = x;
      player.y = y;
    }
  }
}
