export function normalize(x: number, y: number) {
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const length = Math.sqrt(x * x + y * y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: x / length, y: y / length };
}
