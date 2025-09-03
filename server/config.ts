export const serverTimeScale = 1;
export const playersRequired =
  Number.parseInt(process.env.PLAYERS_REQUIRED ?? "1", 10) || 1;
export const port = Number.parseInt(process.env.PORT ?? "3000", 10) || 3000;
export const host = process.env.HOST || "localhost";
