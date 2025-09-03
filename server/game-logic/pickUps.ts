import type QuadTree from "../../common/QuadTree";
import { PLAYER_SIZE } from "../../common/constants";
import { pickUpDB } from "../../common/data";
import { experienceRequiredForLevel } from "../../common/shared";
import type {
  GameObject,
  LevelEvent,
  PickUp,
  PickUpEvent,
  Player,
} from "../../common/types";

// Instead of leveling up immediately, increment pendingLevels
export function checkPlayerExperience(player: Player): boolean {
  const nextLevel = player.level + player.pendingLevels + 1;
  if (player.experience >= experienceRequiredForLevel(nextLevel)) {
    player.pendingLevels = player.pendingLevels + 1;
    return true;
  }
  return false;
}

export function updatePickUps(
  pickUps: PickUp[],
  gameObjectQuadTree: QuadTree<GameObject>,
  deltaTime: number,
): {
  expiredPickUps: string[];
  pickUpEvents: PickUpEvent[];
  levelEvents: LevelEvent[];
} {
  const events: {
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
        (gameObject): gameObject is Player =>
          gameObject.objectType === "player",
      );

    players.forEach((player) => {
      if (player.alive) {
        const distance = Math.sqrt(
          (player.x - pickUp.x) ** 2 + (player.y - pickUp.y) ** 2,
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
              player.maxHp,
            );
          } else if (pickUp.type === "gold") {
            player.gold += pickUpDB[pickUp.type].value;
          }
          // Only increment pendingLevels, don't level up immediately
          while (checkPlayerExperience(player)) {
            // Optionally, notify client of pending level (if needed)
          }
        }
      }
    });
  });
  return events;
}
