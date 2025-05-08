import type { Player } from "../../common/types";

export function updateBots(players: Player[], deltaTime: number) {
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
