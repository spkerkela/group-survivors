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

export function checkPlayerExperience(player: Player): boolean {
  const nextLevel = player.level + 1;
  if (player.experience >= experienceRequiredForLevel(nextLevel)) {
    const newHp = player.maxHp + 10;
    player.hp += 10;
    player.level = nextLevel;
    player.maxHp = newHp;
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
          Math.pow(player.x - pickUp.x, 2) + Math.pow(player.y - pickUp.y, 2),
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
