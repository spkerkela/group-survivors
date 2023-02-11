import { ENEMY_SIZE } from "../../../common/constants";
import {
  Enemy,
  GameObject,
  Projectile,
  SpellDamageEvent,
} from "../../../common/types";
import QuadTree from "../../../common/QuadTree";

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
