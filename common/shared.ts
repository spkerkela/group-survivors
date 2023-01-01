export function experienceRequiredForLevel(level: number) {
  if (level === 1) return 0;
  return Math.pow(level, 2) * 100;
}
