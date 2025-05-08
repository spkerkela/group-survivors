import type { PowerUp, PowerUpType } from "./types";

export function randomBetweenExclusive(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export function chooseRandom<T>(array: T[]): T {
  return array[randomBetweenExclusive(0, array.length)];
}
export function randomPowerUp(): PowerUp {
  const type: PowerUpType = chooseRandom([
    "damage",
    "additionalCast",
    "range",
    "cooldown",
  ]);
  if (type === "additionalCast") {
    const value = randomBetweenExclusive(1, 4);
    return { type, value };
  }
  return {
    type,
    value: Math.random() * 0.2,
  };
}
