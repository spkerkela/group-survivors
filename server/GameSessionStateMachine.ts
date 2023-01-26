import StateMachine, { State } from "../common/StateMachine";
import {
  createPickUp,
  removeDeadEnemies,
  updatePlayers,
  updateSpells,
  updateProjectiles,
  updateEnemies,
  SpellProjectileEvent,
  updatePickUps,
  createPlayer,
} from "./game-logic";
import { LevelData } from "./GameServer";
import { generateId } from "./id-generator";
import Spawner from "./Spawner";
import { ServerScene } from "./ServerScene";
import { chooseRandom } from "../common/random";

export class PreMatchState implements State<StateMachineData> {
  update(dt: number, { scene, playersRequired }: StateMachineData) {
    if (scene.gameCanStart(playersRequired)) {
      return new MatchState();
    }
    return this;
  }
}

export class MatchState implements State<StateMachineData> {
  spawner: Spawner;
  spawnTicker: number;
  update(dt: number, { levelData, scene }: StateMachineData) {
    scene.updates.newPlayers.forEach((player) => {
      if (!scene.gameState.players.find((p) => p.id === player.id)) {
        scene.gameState.players.push(
          createPlayer(
            player.id,
            player.screenName,
            levelData.playerStartPosition
          )
        );
      }
    });
    scene.updates.newPlayers = [];
    scene.updates.playersToRemove.forEach((playerId) => {
      scene.gameState.players = scene.gameState.players.filter(
        (p) => p.id !== playerId
      );
    });
    scene.updates.playersToRemove = [];

    const pickUpsToSpawn = scene.gameState.enemies
      .filter((enemy) => !enemy.alive)
      .map((enemy) =>
        createPickUp(
          generateId(`pickup-${enemy.id}`),
          chooseRandom(enemy.dropTable),
          {
            x: enemy.x,
            y: enemy.y,
          }
        )
      );

    scene.gameState.pickUps = scene.gameState.pickUps.concat(pickUpsToSpawn);

    scene.gameState.enemies = removeDeadEnemies(scene.gameState.enemies);
    updatePlayers(scene.gameState.players, scene.updates, dt);
    const spellEvents = updateSpells(
      scene.gameState.players,
      scene.gameObjectQuadTree,
      dt
    );
    const projectileEvents = updateProjectiles(
      scene.gameState.projectiles,
      scene.gameObjectQuadTree,
      dt
    );

    const spellDamageEvents = spellEvents.damageEvents.concat(projectileEvents);

    spellDamageEvents.forEach((spellEvent) => {
      const target = scene.gameState.enemies.find(
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
      scene.gameState.enemies,
      scene.gameObjectQuadTree,
      dt
    );
    scene.gameState.players.forEach((p) => {
      if (p.id.startsWith("bot-")) {
        return;
      }
      if (!p.alive) {
        scene.lobby.push(p.id);
        return;
      }
    });
    enemyEvents.forEach((e) => {
      scene.pushEvent("damage", e.playerId, e);
    });

    spellDamageEvents.forEach((e) => {
      scene.pushEvent("spell", e.fromId, e);
    });
    spellEvents.projectileEvents.forEach((e) => {
      scene.pushEvent("projectile", e.fromId, e);
    });
    scene.gameState.projectiles = scene.gameState.projectiles
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
    const { pickUpEvents, levelEvents, expiredPickUps } = updatePickUps(
      scene.gameState.pickUps,
      scene.gameObjectQuadTree,
      dt
    );

    scene.gameState.pickUps = scene.gameState.pickUps.filter(
      (g) => !pickUpEvents.map((e) => e.pickUpId).includes(g.id) // remove gems that have been picked up
    );
    levelEvents.forEach((e) => {
      scene.pushEvent("level", e.playerId, e);
    });
    scene.gameState.players.forEach((p) => {
      if (!p.alive) {
        scene.gameState.staticObjects.push({
          id: generateId("grave"),
          objectType: "staticObject",
          type: "grave",
          x: p.x,
          y: p.y,
        });
      }
    });
    scene.gameState.players = scene.gameState.players.filter((p) => p.alive);
    scene.gameState.pickUps = scene.gameState.pickUps.filter(
      (g) => !expiredPickUps.includes(g.id)
    );

    this.spawnTicker += dt;
    if (this.spawnTicker > levelData.spawnRate) {
      this.spawnTicker = 0;
      this.spawner.spawnEnemy(scene.gameState);
    }

    scene.updateQuadTree();
    Object.entries(scene.eventSystems.connectionSystems).forEach(([id]) => {
      const gameState = scene.createGameStateMessage(id);
      scene.pushEvent("update", id, gameState);
    });
    if (scene.gameState.players.length === 0) {
      return new EndMatchState();
    }
    return this;
  }
  enter({ levelData, scene }: StateMachineData): void {
    this.spawner = new Spawner(levelData.enemyTable);
    scene.initializeState();
    scene.loadLevel(levelData);
    this.spawnTicker = 0;
    scene.updateQuadTree();
  }
  exit({ scene }: StateMachineData): void {
    this.spawner = null;
    scene.gameState.players.forEach((p) => {
      scene.lobby.push(p.id);
    });
    scene.connectionIds().forEach((id) => scene.pushEvent("endMatch", id, {}));
  }
}

export class EndMatchState implements State<StateMachineData> {
  timeRemaining: number;
  constructor(seconds: number = 10) {
    this.timeRemaining = seconds;
  }
  update(dt: number, { scene }: StateMachineData) {
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      return new PreMatchState();
    }
    if (scene.connectionIds().length === 0) {
      return new PreMatchState();
    }
    return this;
  }
}

interface StateMachineData {
  scene: ServerScene;
  levelData: LevelData;
  playersRequired: number;
}

export default class GameSessionStateMachine {
  stateMachine: StateMachine<StateMachineData>;
  data: StateMachineData;
  constructor(
    scene: ServerScene,
    levelData: LevelData,
    playersRequired: number = 2
  ) {
    this.data = {
      scene: scene,
      levelData,
      playersRequired,
    };
    this.stateMachine = new StateMachine(new PreMatchState(), this.data);
  }
  update(dt: number) {
    this.stateMachine.update(dt, this.data);
  }
}
