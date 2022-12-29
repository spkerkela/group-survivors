export function randomBetweenExclusive(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export function chooseRandom<T>(array: T[]): T {
  return array[randomBetweenExclusive(0, array.length)];
}
