import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SERVER_UPDATE_RATE,
} from "../common/constants";
import { GameState, Gem, MoveUpdate, Player } from "../common/types";
import {
  createMoveUpdate,
  PlayerUpdate,
  updateEnemies,
  updatePlayers,
  updateSpells,
  removeDeadEnemies,
  updateGems,
  GemEvent,
} from "./game-logic";
import Spawner from "./Spawner";

export interface Connector {
  start: (levelData: LevelData) => void;
  gameState: GameState;
  updates: {
    moves: { [key: string]: PlayerUpdate };
  };
  pushEvent: (name: string, playerId: string, data: any) => void;
}

export class SocketIOConnector implements Connector {
  io: any;
  gameState: GameState;
  updates: {
    moves: { [key: string]: PlayerUpdate };
  };
  events: {
    [key: string]: { name: string; data: any }[];
  };
  constructor(io) {
    this.io = io;
    this.gameState = {
      players: [],
      enemies: [],
      gems: [],
      id: "",
    };
    this.updates = { moves: {} };
    this.events = {};
  }
  pushEvent(name: string, playerId: string, data: any) {
    this.events[playerId].push({ name, data });
  }
  getPlayer(id: string) {
    return this.gameState.players.find((p) => p.id === id);
  }
  start(levelData: LevelData) {
    for (let i = 0; i < levelData.bots; i++) {
      this.gameState.players.push({
        id: `bot-${i}`,
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        speed: 2,
        invulnerabilityFrames: 0,
        hp: 100,
        alive: true,
        level: 1,
        experience: 0,
        spells: {
          damageAura: {
            cooldown: 0,
            level: 1,
          },
        },
      });
    }
    this.io.on("connection", (socket) => {
      const id = socket.id;
      this.events[id] = [];
      this.gameState.players.push({
        id,
        x: levelData.playerStartPosition.x,
        y: levelData.playerStartPosition.y,
        speed: 5,
        invulnerabilityFrames: 0,
        hp: 100,
        alive: true,
        level: 1,
        experience: 0,
        spells: {
          damageAura: {
            cooldown: 0,
            level: 1,
          },
        },
      });
      const newGameState: GameState = {
        players: this.gameState.players,
        id: id,
        enemies: [],
        gems: [],
      };
      socket.emit("begin", newGameState);
      let interval = setInterval(() => {
        socket.emit("update", { ...this.gameState, id: id });
        if (this.events[id] != null) {
          this.events[id].forEach((e) => {
            socket.emit(e.name, e.data);
          });
        }
        this.events[id] = [];
      }, SERVER_UPDATE_RATE);
      socket.on("disconnect", () => {
        this.gameState.players = this.gameState.players.filter(
          (p) => p.id !== id
        );
        delete this.events[id];
        clearInterval(interval);
      });
      socket.on("move", (data: MoveUpdate) => {
        if (data.id !== id) return;
        if (this.getPlayer(id)) {
          const { up, down, left, right } = data;
          this.updates.moves[id] = createMoveUpdate({ up, down, left, right });
        }
      });
    });
  }
}

interface LevelData {
  name: string;
  bots: number;
  playerStartPosition: { x: number; y: number };
  enemyTable: { [key: string]: number };
}

export class GameServer {
  connector: Connector;
  levelData: LevelData;
  spawner: Spawner;
  constructor(connector: Connector, levelData: LevelData) {
    this.connector = connector;
    this.levelData = levelData;
    this.spawner = new Spawner(levelData.enemyTable);
  }
  start() {
    this.connector.start(this.levelData);
    setInterval(() => {
      this.update();
    }, SERVER_UPDATE_RATE);
    setInterval(() => {
      this.spawner.spawnEnemy(this.connector.gameState);
    }, 1000);
  }
  update() {
    const gemsToSpawn = this.connector.gameState.enemies
      .filter((enemy) => !enemy.alive)
      .map((enemy) => ({
        id: `gem-${enemy.id}-${Math.random()}`,
        x: enemy.x,
        y: enemy.y,
        type: enemy.gemType,
      }));

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

    this.connector.gameState.players.forEach((p) => {
      if (p.id.startsWith("bot-")) {
        return;
      }
    });
    spellEvents.forEach((spellEvent) => {
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

    enemyEvents
      .filter((e) => !e.data.playerId.startsWith("bot-"))
      .forEach((e) => {
        this.connector.pushEvent(e.name, e.data.playerId, e.data);
      });

    spellEvents
      .filter((e) => !e.fromId.startsWith("bot-"))
      .forEach((e) => {
        this.connector.pushEvent("spell", e.fromId, e);
      });
    const gemEvents = updateGems(
      this.connector.gameState.gems,
      this.connector.gameState.players
    );

    this.connector.gameState.gems = this.connector.gameState.gems.filter(
      (g) => !gemEvents.map((e) => e.gemId).includes(g.id) // remove gems that have been picked up
    );
  }
}
