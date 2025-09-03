import crypto from "node:crypto";
export function generateId(prefix: string) {
  const uuid = crypto.randomUUID();
  return `${prefix}-${uuid}`;
}
