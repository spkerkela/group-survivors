import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SERVER_UPDATE_RATE,
} from "../common/constants";
import { chooseRandom, randomBetweenExclusive } from "../common/random";
import { GameState, MoveUpdate, Player } from "../common/types";
import { createMoveUpdate, PlayerUpdate, updatePlayers } from "./game-logic";

export interface Connector {
  start: (levelData: LevelData) => void;
  players: Player[];
  updates: {
    moves: { [key: string]: PlayerUpdate };
  };
  pushEvent: (name: string, playerId: string, data: any) => void;
}

export class SocketIOConnector implements Connector {
  io: any;
  players: Player[];
  updates: {
    moves: { [key: string]: PlayerUpdate };
  };
  events: {
    [key: string]: { name: string; data: any }[];
  };
  constructor(io) {
    this.io = io;
    this.players = [];
    this.updates = { moves: {} };
    this.events = {};
  }
  pushEvent(name: string, playerId: string, data: any) {
    this.events[playerId].push({ name, data });
  }
  getPlayer(id: string) {
    return this.players.find((p) => p.id === id);
  }
  start(levelData: LevelData) {
    for (let i = 0; i < levelData.bots; i++) {
      this.players.push({
        id: `bot-${i}`,
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        speed: 2,
      });
    }
    this.io.on("connection", (socket) => {
      const id = socket.id;
      this.events[id] = [];
      this.players.push({
        id,
        x: levelData.playerStartPosition.x,
        y: levelData.playerStartPosition.y,
        speed: 5,
      });
      const newGameState: GameState = {
        players: this.players,
        id: id,
      };
      socket.emit("begin", newGameState);
      let interval = setInterval(() => {
        socket.emit("update", { players: this.players, id });
        if (this.events[id] != null) {
          this.events[id].forEach((e) => {
            socket.emit(e.name, e.data);
          });
        }
        this.events[id] = [];
      }, SERVER_UPDATE_RATE);
      socket.on("disconnect", () => {
        this.players = this.players.filter((p) => p.id !== id);
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
}

export class GameServer {
  connector: Connector;
  levelData: LevelData;
  constructor(connector: Connector, levelData: LevelData) {
    this.connector = connector;
    this.levelData = levelData;
  }
  start() {
    this.connector.start(this.levelData);
    setInterval(() => {
      this.update();
    }, SERVER_UPDATE_RATE);
  }
  update() {
    updatePlayers(this.connector.players, this.connector.updates);
    this.connector.players.forEach((p) => {
      if (p.id.startsWith("bot-")) {
        return;
      }
      if (Math.random() < 0.01) {
        this.connector.pushEvent("damage", p.id, {
          amount: randomBetweenExclusive(1, 50000),
          damageType: chooseRandom(["physical", "fire", "cold", "poison"]),
        });
      }
    });
  }
}
