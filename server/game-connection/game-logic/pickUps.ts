import { PLAYER_SIZE } from "../../../common/constants";
import {
  GameObject,
  LevelEvent,
  PickUp,
  PickUpEvent,
  Player,
  PowerUp,
  PowerUpType,
} from "../../../common/types";
import { pickUpDB } from "../../../common/data";
import QuadTree from "../../../common/QuadTree";
import { chooseRandom, randomBetweenExclusive } from "../../../common/random";
import { experienceRequiredForLevel } from "../../../common/shared";

function randomPowerUp(): PowerUp {
  const type: PowerUpType = chooseRandom(["damage", "additionalCast"]);
  if (type === "damage") {
    const value = Math.random() * 0.2;
    return { type, value };
  }
  return {
    type,
    value: randomBetweenExclusive(1, 4),
  };
}

export function checkPlayerExperience(player: Player): boolean {
  const nextLevel = player.level + 1;
  if (player.experience >= experienceRequiredForLevel(nextLevel)) {
    const newHp = 200 + nextLevel * 10;
    player.level = nextLevel;
    player.hp = newHp;
    player.maxHp = newHp;
    const spellId = chooseRandom(Object.keys(player.spells));
    const powerUp = randomPowerUp();
    if (player.powerUps[spellId] == null) {
      player.powerUps[spellId] = [];
    }
    player.powerUps[spellId].push(powerUp);
    return true;
  }
  return false;
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
