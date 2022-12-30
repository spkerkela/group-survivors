import { GAME_HEIGHT, GAME_WIDTH } from "../common/constants";
import { chooseRandom, randomBetweenExclusive } from "../common/random";
import { Enemy, GameState } from "../common/types";
import { enemyDB } from "./data";

interface SpawnTable {
  [key: string]: number;
}

export default class Spawner {
  spawnTable: SpawnTable;
  constructor(spawnTable: SpawnTable) {
    this.spawnTable = spawnTable;
  }

  private createEnemy(enemyType: string): Enemy {
    const enemyInfo = enemyDB[enemyType];
    return {
      id: `${enemyType}-${Math.random()}`,
      x: randomBetweenExclusive(10, GAME_WIDTH - 10),
      y: randomBetweenExclusive(10, GAME_HEIGHT - 10),
      hp: enemyInfo.hp,
      alive: true,
      speed: enemyInfo.speed,
      type: enemyType,
      damageType: enemyInfo.damageType,
      damageMin: enemyInfo.damageMin,
      damageMax: enemyInfo.damageMax,
      gemType: enemyInfo.gemType,
    };
  }

  spawnEnemy(gameState: GameState) {
    const enemyTypesThatCanSpawn = Object.keys(this.spawnTable).filter(
      (enemyType) => {
        return (
          gameState.enemies.filter((enemy) => enemy.type === enemyType).length <
          this.spawnTable[enemyType]
        );
      }
    );
    if (enemyTypesThatCanSpawn.length === 0) {
      return;
    }
    const enemyType = chooseRandom(enemyTypesThatCanSpawn);
    const enemy = this.createEnemy(enemyType);
    gameState.enemies.push(enemy);
    return enemy;
  }
}
