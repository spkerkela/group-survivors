export function experienceRequiredForLevel(level: number) {
  if (level === 1) return 0;
  return level ** 2 * 100;
}

export function sanitizeName(name: string): string {
  // if name is only numbers and whitespace, return empty string
  if (/^\d+$/.test(name.replace(/ /g, ""))) {
    return "";
  }
  return name
    .replace(/[^a-zA-Z0-9åäöÅÄÖ ]/g, "")
    .trim()
    .slice(0, 20);
}
