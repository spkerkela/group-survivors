import { GAME_HEIGHT, GAME_WIDTH } from "../../common/constants";
import { pickUpDB } from "../../common/data";
import type {
  PickUp,
  Player,
  Position,
  PowerUp,
  Updates,
} from "../../common/types";
import type { ServerPlayer } from "../types";
import { updateBots } from "./bots";

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

export function createPlayer(
  id: string,
  name: string,
  { x, y }: Position
): ServerPlayer {
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
    pendingLevels: 0,
    invulnerabilityFrames: 0,
    spells: {},
    passives: {},
    gold: 0,
    spellSMs: {},
    powerUps: {},
    globalPowerUps: [],
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
export function applyPowerUp(
  player: Player,
  spellId: string,
  powerUp: PowerUp
) {
  if (player.powerUps[spellId] == null) {
    player.powerUps[spellId] = [];
  }
  player.powerUps[spellId].push(powerUp);
}
