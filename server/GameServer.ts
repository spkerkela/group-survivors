import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SERVER_UPDATE_RATE,
} from "../common/constants";
import EventSystem from "../common/EventSystem";
import { sanitizeName } from "../common/shared";
import {
  GameState,
  Gem,
  MoveUpdate,
  Player,
  StaticObject,
} from "../common/types";
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
import Spawner from "./Spawner";

export class Connector {
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
        createPlayer(`bot-${i}`, `Mr Bot ${i + 1}`, {
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
          }
        });
        const newGameState: GameState = {
          players: this.gameState.players,
          id: id,
          enemies: [],
          gems: [],
          projectiles: [],
          staticObjects: levelData.staticObjects,
        };
        connection.dispatchEvent("begin", newGameState);
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
        connection.dispatchEvent("update", { ...this.gameState, id: id });
        if (this.events[id] != null) {
          this.events[id].forEach((e) => {
            connection.dispatchEvent(e.name, e.data);
          });
        }
        this.events[id] = [];
      }
    );
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
    setInterval(() => {
      this.update();
    }, SERVER_UPDATE_RATE);
    setInterval(() => {
      if (this.playersAlive()) {
        this.spawner.spawnEnemy(this.connector.gameState);
      }
    }, 1000);
  }

  private gameLoop() {
    const gemsToSpawn = this.connector.gameState.enemies
      .filter((enemy) => !enemy.alive)
      .map((enemy) =>
        createGem(`gem-${enemy.id}-${Math.random()}`, enemy.gemType, {
          x: enemy.x,
          y: enemy.y,
        })
      );

    this.connector.gameState.gems =
      this.connector.gameState.gems.concat(gemsToSpawn);

    this.connector.gameState.enemies = removeDeadEnemies(
      this.connector.gameState.enemies
    );
    updatePlayers(this.connector.gameState.players, this.connector.updates);
    const spellEvents = updateSpells(
      this.connector.gameState.players,
      this.connector.gameState.enemies
    );
    const projectileEvents = updateProjectiles(
      this.connector.gameState.projectiles,
      this.connector.gameState.enemies
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
      this.connector.gameState.players
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
          id: e.spellId,
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
        }))
      )
      .filter((p) => p.lifetime > 0);
    const { gemEvents, levelEvents } = updateGems(
      this.connector.gameState.gems,
      this.connector.gameState.players
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
          id: `grave-${p.id}`,
          type: "grave",
          x: p.x,
          y: p.y,
        });
      }
    });
    this.connector.gameState.players = this.connector.gameState.players.filter(
      (p) => p.alive
    );
  }
}
