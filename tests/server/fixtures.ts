import { LevelData } from "../../server/GameServer";

export const levelData: LevelData = {
  name: "Level 1",
  playerStartPosition: { x: 100, y: 100 },
  bots: 0,
  enemyTable: {
    zombie: 10,
    skeleton: 5,
    bat: 200,
  },
};
