import { Player } from "../common/types";
export interface PlayerUpdate {
  x: number;
  y: number;
}

type Updates = { [key: string]: PlayerUpdate };

export function update(players: Player[], updates: Updates) {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const update = updates[player.id];
    if (update) {
      player.x = update.x;
      player.y = update.y;
    }
  }
  updateBots(players);
}

function updateBots(players: Player[]) {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (player.id.startsWith("bot")) {
      const x = player.x + Math.cos(player.y / 100) * 2;
      const y = player.y + Math.sin(player.x / 100) * 2;
      player.x = x;
      player.y = y;
    }
  }
}
