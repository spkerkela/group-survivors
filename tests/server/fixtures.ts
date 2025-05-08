import type { LevelData } from "../../server/GameServer";

export const levelData: LevelData = {
	name: "Level 1",
	playerStartPosition: { x: 100, y: 100 },
	bots: 0,
	enemyTable: {
		zombie: 10,
		skeleton: 5,
		bat: 200,
	},
	staticObjects: [],
	spawnRate: 1,
	waveLength: 60,
	waves: 1,
};
