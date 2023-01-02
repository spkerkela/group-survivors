export function experienceRequiredForLevel(level: number) {
  if (level === 1) return 0;
  return Math.pow(level, 2) * 100;
}

export function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9åäöÅÄÖ ]/g, "")
    .trim()
    .slice(0, 20);
}
