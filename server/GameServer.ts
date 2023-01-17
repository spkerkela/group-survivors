import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SERVER_UPDATE_RATE,
} from "../common/constants";
import EventSystem from "../common/EventSystem";
import QuadTree from "../common/QuadTree";
import { sanitizeName } from "../common/shared";
import {
  GameObject,
  GameState,
  isEnemy,
  isGem,
  isPlayer,
  isProjectile,
  isStaticObject,
  MoveUpdate,
  StaticObject,
} from "../common/types";
import { serverTimeScale } from "./config";
import { ServerEventSystems } from "./eventSystems";

import {
  createMoveUpdate,
  PlayerUpdate,
  updateEnemies,
  updatePlayers,
  updateSpells,
  removeDeadEnemies,
  updateGems,
  createPlayer,
  createGem,
  SpellProjectileEvent,
  updateProjectiles,
} from "./game-logic";
import { generateId } from "./id-generator";
import Spawner from "./Spawner";

export class Connector {
  gameObjectQuadTree: QuadTree<GameObject>;
  gameState: GameState;
  updates: {
    moves: { [key: string]: PlayerUpdate };
  };
  events: {
    [key: string]: { name: string; data: any }[];
  };
  eventSystems: ServerEventSystems;
  lobby: string[];

  constructor(eventSystems: ServerEventSystems) {
    this.gameObjectQuadTree = new QuadTree(
      { x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT },
      5
    );

    this.gameState = {
      players: [],
      enemies: [],
      gems: [],
      projectiles: [],
      id: "",
      staticObjects: [],
    };
    this.updates = { moves: {} };
    this.events = {};
    this.lobby = [];
    this.eventSystems = eventSystems;
  }

  pushEvent(name: string, playerId: string, data: any) {
    if (!this.events[playerId]) return;
    this.events[playerId].push({ name, data });
  }

  getPlayer(id: string) {
    return this.gameState.players.find((p) => p.id === id);
  }

  start(levelData: LevelData) {
    for (let i = 0; i < levelData.bots; i++) {
      this.gameState.players.push(
        createPlayer(generateId("bot"), `Mr Bot ${i + 1}`, {
          x: Math.random() * GAME_WIDTH,
          y: Math.random() * GAME_HEIGHT,
        })
      );
    }
    this.eventSystems.gameEventSystem.addEventListener(
      "connection",
      (id: string, connection: EventSystem) => {
        this.eventSystems.connectionSystems[id] = connection;
        this.lobby.push(id);
        this.events[id] = [];
        connection.addEventListener("join", (screenName: string) => {
          if (this.lobby.includes(id)) {
            this.lobby = this.lobby.filter((p) => p !== id);
            this.gameState.players = this.gameState.players.filter(
              (p) => p.id !== id
            );
            this.gameState.players.push(
              createPlayer(id, sanitizeName(screenName), {
                x: levelData.playerStartPosition.x,
                y: levelData.playerStartPosition.y,
              })
            );
            connection.dispatchEvent("joined", this.createGameStateMessage(id));
          }
        });

        connection.dispatchEvent("begin", this.createGameStateMessage(id));
        connection.addEventListener("disconnect", () => {
          this.gameState.players = this.gameState.players.filter(
            (p) => p.id !== id
          );
          this.lobby = this.lobby.filter((p) => p !== id);
          delete this.events[id];
          delete this.eventSystems.connectionSystems[id];
        });
        connection.addEventListener("move", (data: MoveUpdate) => {
          if (data.id !== id) return;
          if (this.getPlayer(id)) {
            const { up, down, left, right } = data;
            this.updates.moves[id] = createMoveUpdate({
              up,
              down,
              left,
              right,
            });
          }
        });
      }
    );
  }
  update() {
    Object.entries(this.eventSystems.connectionSystems).forEach(
      ([id, connection]) => {
        const gameState = this.createGameStateMessage(id);
        connection.dispatchEvent("update", gameState);
        if (this.events[id] != null) {
          this.events[id].forEach((e) => {
            connection.dispatchEvent(e.name, e.data);
          });
        }
        this.events[id] = [];
      }
    );
  }
  createGameStateMessage(id: string) {
    const player = this.getPlayer(id);
    const rectX = player ? player.x : GAME_WIDTH / 2;
    const rectY = player ? player.y : GAME_HEIGHT / 2;

    const visibleRectangle = {
      x: rectX - SCREEN_WIDTH / 2,
      y: rectY - SCREEN_HEIGHT / 2,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    };
    const playerVisibleObjects =
      this.gameObjectQuadTree.retrieve(visibleRectangle);
    let gameState: GameState = {
      players: [],
      enemies: [],
      gems: [],
      projectiles: [],
      staticObjects: [],
      id: id,
    };
    playerVisibleObjects.forEach((o) => {
      if (isPlayer(o)) {
        gameState.players.push(o);
      } else if (isEnemy(o)) {
        gameState.enemies.push(o);
      } else if (isGem(o)) {
        gameState.gems.push(o);
      } else if (isProjectile(o)) {
        gameState.projectiles.push(o);
      } else if (isStaticObject(o)) {
        gameState.staticObjects.push(o);
      }
    });
    if (player && !gameState.players.includes(player)) {
      gameState.players.push(player);
    }
    gameState.debug = {
      cullingRect: visibleRectangle,
    };
    this.gameState.debug = gameState.debug;
    return gameState;
  }
}

export interface LevelData {
  name: string;
  bots: number;
  playerStartPosition: { x: number; y: number };
  enemyTable: { [key: string]: number };
  staticObjects: StaticObject[];
}

export class GameServer {
  connector: Connector;
  levelData: LevelData;
  spawner: Spawner;
  adminEvents: EventSystem;
  deltaTime: number;

  constructor(connector: Connector, levelData: LevelData) {
    this.connector = connector;
    this.levelData = levelData;
    this.spawner = new Spawner(levelData.enemyTable);
    this.connector.start(this.levelData);
    this.adminEvents = new EventSystem();
    this.adminEvents.addEventListener("spawn", (enemyType: string) => {
      this.spawner.spawnEnemyOfType(this.connector.gameState, enemyType);
    });
    this.adminEvents.addEventListener("killPlayer", (id: string) => {
      const player = this.connector.gameState.players.find((p) => p.id === id);
      if (player) {
        player.hp = 0;
        player.alive = false;
      }
    });
    this.deltaTime = 0;
  }

  private playersAlive() {
    return this.connector.gameState.players.filter((p) => p.alive).length > 0;
  }

  update() {
    this.connector.update();
    if (this.playersAlive() || this.connector.lobby.length > 0) {
      this.gameLoop();
    }
  }

  start() {
    let previousTime = Date.now();
    setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - previousTime;
      previousTime = currentTime;
      this.deltaTime = (elapsedTime / 1000) * serverTimeScale;
      this.update();
    }, SERVER_UPDATE_RATE);
    setInterval(() => {
      if (this.playersAlive()) {
        this.spawner.spawnEnemy(this.connector.gameState);
      }
    }, 1000);
  }

  private gameLoop() {
    this.connector.gameObjectQuadTree.clear();
    this.connector.gameState.players.forEach((player) => {
      this.connector.gameObjectQuadTree.insert(player);
    });
    this.connector.gameState.enemies.forEach((enemy) => {
      this.connector.gameObjectQuadTree.insert(enemy);
    });
    this.connector.gameState.gems.forEach((gem) => {
      this.connector.gameObjectQuadTree.insert(gem);
    });
    this.connector.gameState.projectiles.forEach((projectile) => {
      this.connector.gameObjectQuadTree.insert(projectile);
    });
    this.connector.gameState.staticObjects.forEach((staticObject) => {
      this.connector.gameObjectQuadTree.insert(staticObject);
    });
    const deltaTime = this.deltaTime;
    const gemsToSpawn = this.connector.gameState.enemies
      .filter((enemy) => !enemy.alive)
      .map((enemy) =>
        createGem(generateId(`gem-${enemy.id}`), enemy.gemType, {
          x: enemy.x,
          y: enemy.y,
        })
      );

    this.connector.gameState.gems =
      this.connector.gameState.gems.concat(gemsToSpawn);

    this.connector.gameState.enemies = removeDeadEnemies(
      this.connector.gameState.enemies
    );
    updatePlayers(
      this.connector.gameState.players,
      this.connector.updates,
      deltaTime
    );
    const spellEvents = updateSpells(
      this.connector.gameState.players,
      this.connector.gameObjectQuadTree,
      deltaTime
    );
    const projectileEvents = updateProjectiles(
      this.connector.gameState.projectiles,
      this.connector.gameObjectQuadTree,
      deltaTime
    );

    const spellDamageEvents = spellEvents.damageEvents.concat(projectileEvents);

    spellDamageEvents.forEach((spellEvent) => {
      const target = this.connector.gameState.enemies.find(
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
      this.connector.gameState.enemies,
      this.connector.gameObjectQuadTree,
      deltaTime
    );
    this.connector.gameState.players.forEach((p) => {
      if (p.id.startsWith("bot-")) {
        return;
      }
      if (!p.alive) {
        this.connector.lobby.push(p.id);
        return;
      }
    });
    enemyEvents.forEach((e) => {
      this.connector.pushEvent("damage", e.playerId, e);
    });

    spellDamageEvents.forEach((e) => {
      this.connector.pushEvent("spell", e.fromId, e);
    });
    spellEvents.projectileEvents.forEach((e) => {
      this.connector.pushEvent("projectile", e.fromId, e);
    });
    this.connector.gameState.projectiles = this.connector.gameState.projectiles
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
      this.connector.gameState.gems,
      this.connector.gameObjectQuadTree,
      deltaTime
    );

    this.connector.gameState.gems = this.connector.gameState.gems.filter(
      (g) => !gemEvents.map((e) => e.gemId).includes(g.id) // remove gems that have been picked up
    );
    levelEvents.forEach((e) => {
      this.connector.pushEvent("level", e.playerId, e);
    });
    this.connector.gameState.players.forEach((p) => {
      if (!p.alive) {
        this.connector.gameState.staticObjects.push({
          id: generateId("grave"),
          objectType: "staticObject",
          type: "grave",
          x: p.x,
          y: p.y,
        });
      }
    });
    this.connector.gameState.players = this.connector.gameState.players.filter(
      (p) => p.alive
    );
    this.connector.gameState.gems = this.connector.gameState.gems.filter(
      (g) => !expiredGems.includes(g.id)
    );
  }
}
