export const serverTimeScale = 1;
export const playersRequired = parseInt(process.env.PLAYERS_REQUIRED, 2) || 1;
export const port = parseInt(process.env.PORT, 2) || 3000;
export const host = process.env.HOST || "localhost";
