import { State } from "../../common/StateMachine";
import { updateProjectiles } from "../game-connection/game-logic/projectiles";
import { updatePickUps } from "../game-connection/game-logic/pickUps";
import {
  addSpellToPlayer,
  updateSpells,
} from "../game-connection/game-logic/spells";
import {
  updateEnemies,
  removeDeadEnemies,
} from "../game-connection/game-logic/enemies";
import {
  createPickUp,
  createPlayer,
  updatePlayers,
} from "../game-connection/game-logic/player";
import { generateId } from "../id-generator";
import Spawner from "../Spawner";
import { chooseRandom } from "../../common/random";
import { Logger } from "winston";
import logger from "../logger";
import { spellDB } from "../../common/data";
import { StateMachineData } from "./GameSessionStateMachine";
import { UpgradeState } from "./UpgradeState";
import { EndMatchState } from "./EndMatchState";
import { SpellProjectileEvent } from "../../common/types";

export class MatchState implements State<StateMachineData> {
  spawner: Spawner;
  spawnTicker: number;
  matchLogger: Logger;
  wave: number;
  timer: number;
  constructor(wave: number) {
    this.wave = wave;
    this.timer = 0;
    this.matchLogger = logger.child({ matchId: generateId("match") });
  }
  update(dt: number, { levelData, scene }: StateMachineData) {
    this.timer += dt;
    scene.gameState.waveSecondsRemaining = levelData.waveLength - this.timer;
    if (this.timer > levelData.waveLength) {
      return new UpgradeState(this.wave);
    }
    scene.updates.newPlayers.forEach((player) => {
      if (!scene.gameState.players.find((p) => p.id === player.id)) {
        const playerToAdd = createPlayer(
          player.id,
          player.screenName,
          levelData.playerStartPosition
        );
        const spellToAdd = chooseRandom(Object.keys(spellDB));
        addSpellToPlayer(spellToAdd, playerToAdd);
        scene.gameState.players.push(playerToAdd);
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
    scene.loadLevel(levelData);
    scene.initializeState(this.wave);
    this.spawnTicker = 0;
    scene.updateQuadTree();
    this.matchLogger.info("Match started");
  }
  exit({ scene }: StateMachineData): void {
    this.spawner = null;
    scene.gameState.players.forEach((p) => {
      scene.lobby.push(p.id);
    });
    scene.connectionIds().forEach((id) => scene.pushEvent("endMatch", id, {}));
    this.matchLogger.info("Match ended");
  }
}
