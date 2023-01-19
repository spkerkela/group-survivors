import StateMachine, { State } from "../common/StateMachine";
import {
  createGem,
  removeDeadEnemies,
  updatePlayers,
  updateSpells,
  updateProjectiles,
  updateEnemies,
  SpellProjectileEvent,
  updateGems,
  createPlayer,
} from "./game-logic";
import { LevelData } from "./GameServer";
import { generateId } from "./id-generator";
import Spawner from "./Spawner";
import { ServerScene } from "./ServerScene";

class PreMatchState implements State<StateMachineData> {
  update(dt: number, { connector, playersRequired }: StateMachineData) {
    if (connector.gameCanStart(playersRequired)) {
      return new MatchState();
    }
    return this;
  }
}

class MatchState implements State<StateMachineData> {
  spawner: Spawner;
  spawnTicker: number;
  update(dt: number, { levelData, connector }: StateMachineData) {
    connector.updates.newPlayers.forEach((player) => {
      connector.gameState.players.push(
        createPlayer(
          player.id,
          player.screenName,
          levelData.playerStartPosition
        )
      );
    });
    connector.updates.newPlayers = [];

    const gemsToSpawn = connector.gameState.enemies
      .filter((enemy) => !enemy.alive)
      .map((enemy) =>
        createGem(generateId(`gem-${enemy.id}`), enemy.gemType, {
          x: enemy.x,
          y: enemy.y,
        })
      );

    connector.gameState.gems = connector.gameState.gems.concat(gemsToSpawn);

    connector.gameState.enemies = removeDeadEnemies(
      connector.gameState.enemies
    );
    updatePlayers(connector.gameState.players, connector.updates, dt);
    const spellEvents = updateSpells(
      connector.gameState.players,
      connector.gameObjectQuadTree,
      dt
    );
    const projectileEvents = updateProjectiles(
      connector.gameState.projectiles,
      connector.gameObjectQuadTree,
      dt
    );

    const spellDamageEvents = spellEvents.damageEvents.concat(projectileEvents);

    spellDamageEvents.forEach((spellEvent) => {
      const target = connector.gameState.enemies.find(
        (e) => e.id === spellEvent.targetId
      );
      if (target) {
        target.hp -= spellEvent.damage;
        if (target.hp <= 0) {
          target.alive = false;
        }
      }
    });
    const enemyEvents = updateEnemies(
      connector.gameState.enemies,
      connector.gameObjectQuadTree,
      dt
    );
    connector.gameState.players.forEach((p) => {
      if (p.id.startsWith("bot-")) {
        return;
      }
      if (!p.alive) {
        connector.lobby.push(p.id);
        return;
      }
    });
    enemyEvents.forEach((e) => {
      connector.pushEvent("damage", e.playerId, e);
    });

    spellDamageEvents.forEach((e) => {
      connector.pushEvent("spell", e.fromId, e);
    });
    spellEvents.projectileEvents.forEach((e) => {
      connector.pushEvent("projectile", e.fromId, e);
    });
    connector.gameState.projectiles = connector.gameState.projectiles
      .concat(
        spellEvents.projectileEvents.map((e: SpellProjectileEvent) => ({
          id: generateId(e.spellId),
          objectType: "projectile",
          type: e.spellId,
          x: e.position.x,
          y: e.position.y,
          direction: e.targetDirection,
          damageType: e.damageType,
          damage: e.damage,
          critical: e.critical,
          lifetime: e.lifetime,
          fromId: e.fromId,
          speed: e.speed,
          maxPierceCount: e.maxPierceCount,
          hitEnemies: [],
          spellId: e.spellId,
        }))
      )
      .filter((p) => p.lifetime > 0);
    const { gemEvents, levelEvents, expiredGems } = updateGems(
      connector.gameState.gems,
      connector.gameObjectQuadTree,
      dt
    );

    connector.gameState.gems = connector.gameState.gems.filter(
      (g) => !gemEvents.map((e) => e.gemId).includes(g.id) // remove gems that have been picked up
    );
    levelEvents.forEach((e) => {
      connector.pushEvent("level", e.playerId, e);
    });
    connector.gameState.players.forEach((p) => {
      if (!p.alive) {
        connector.gameState.staticObjects.push({
          id: generateId("grave"),
          objectType: "staticObject",
          type: "grave",
          x: p.x,
          y: p.y,
        });
      }
    });
    connector.gameState.players = connector.gameState.players.filter(
      (p) => p.alive
    );
    connector.gameState.gems = connector.gameState.gems.filter(
      (g) => !expiredGems.includes(g.id)
    );

    this.spawnTicker += dt;
    if (this.spawnTicker > 1) {
      this.spawnTicker = 0;
      this.spawner.spawnEnemy(connector.gameState);
    }

    connector.updateQuadTree();
    Object.entries(connector.eventSystems.connectionSystems).forEach(([id]) => {
      const gameState = connector.createGameStateMessage(id);
      connector.pushEvent("update", id, gameState);
    });
    if (connector.gameState.players.length === 0) {
      return new EndMatchState();
    }
    return this;
  }
  enter({ levelData, connector }: StateMachineData): void {
    this.spawner = new Spawner(levelData.enemyTable);
    connector.loadLevel(levelData);
    connector.enableInstantJoin();
    this.spawnTicker = 0;
    connector.updateQuadTree();
  }
  exit({ connector }: StateMachineData): void {
    this.spawner = null;
    connector.disableInstantJoin();
    connector.gameState.players.forEach((p) => {
      connector.lobby.push(p.id);
    });
    connector
      .connectionIds()
      .forEach((id) => connector.pushEvent("endMatch", id, {}));
  }
}

class EndMatchState implements State<StateMachineData> {
  timeRemaining: number;
  constructor(seconds: number = 10) {
    this.timeRemaining = seconds;
  }
  update(dt: number, _data: StateMachineData) {
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      return new PreMatchState();
    }
    return this;
  }
}

interface StateMachineData {
  connector: ServerScene;
  levelData: LevelData;
  playersRequired: number;
}

export default class GameSessionStateMachine {
  stateMachine: StateMachine<StateMachineData>;
  data: StateMachineData;
  constructor(
    connector: ServerScene,
    levelData: LevelData,
    playersRequired: number = 2
  ) {
    this.data = {
      connector,
      levelData,
      playersRequired,
    };
    this.stateMachine = new StateMachine(new PreMatchState(), this.data);
  }
  update(dt: number) {
    this.stateMachine.update(dt, this.data);
  }
}
