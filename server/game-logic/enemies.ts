import type QuadTree from "../../common/QuadTree";
import {
	INVULNERABILITY_SECONDS,
	PLAYER_SIZE,
	SCREEN_HEIGHT,
	SCREEN_WIDTH,
} from "../../common/constants";
import { normalize } from "../../common/math";
import { randomBetweenExclusive } from "../../common/random";
import type {
	DamageEvent,
	Enemy,
	GameObject,
	Player,
} from "../../common/types";

export function updateEnemies(
	enemies: Enemy[],
	gameObjectQuadTree: QuadTree<GameObject>,
	deltaTime: number,
): DamageEvent[] {
	const events: DamageEvent[] = [];
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
				(gameObject): gameObject is Player =>
					gameObject.objectType === "player",
			);

		const nearestPlayer = players.reduce(
			(
				nearest: { player: Player | null; distance: number },
				player: Player,
			) => {
				const distance = Math.sqrt(
					Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2),
				);
				if (player.alive && distance < nearest.distance) {
					return { distance, player };
				} else {
					return nearest;
				}
			},
			{ distance: Number.POSITIVE_INFINITY, player: null },
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
						enemy.damageMax,
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
export function removeDeadEnemies(enemies: Enemy[]) {
	return enemies.filter((enemy) => enemy.alive);
}
