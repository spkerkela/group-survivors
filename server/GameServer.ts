import { GAME_HEIGHT, GAME_WIDTH } from "../common/constants";
import { GameState, Player } from "../common/types";
import { PlayerUpdate, update } from "./game";

export interface Connector {
  start: (levelData: LevelData) => void;
  players: Player[];
  updates: {
    moves: { [key: string]: PlayerUpdate };
  };
}

export class SocketIOConnector implements Connector {
  onPlayerConnected: () => void;
  io: any;
  players: Player[];
  disconnects: string[];
  updates: {
    moves: { [key: string]: PlayerUpdate };
  };
  constructor(io) {
    this.io = io;
    this.players = [];
    this.disconnects = [];
    this.updates = { moves: {} };
  }
  start(levelData: LevelData) {
    for (let i = 0; i < levelData.bots; i++) {
      this.players.push({
        id: `bot-${i}`,
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
      });
    }
    this.io.on("connection", (socket) => {
      const id = socket.id;
      this.players.push({
        id,
        x: levelData.playerStartPosition.x,
        y: levelData.playerStartPosition.y,
      });
      const newGameState: GameState = {
        players: this.players,
        id: id,
      };
      socket.emit("begin", newGameState);
      let interval = setInterval(() => {
        socket.emit("update", { players: this.players, id });
        if (this.disconnects.length > 0) {
          socket.emit("disconnected", this.disconnects);
          this.disconnects = [];
        }
      }, 16);
      socket.on("disconnect", () => {
        this.players = this.players.filter((p) => p.id !== id);
        this.disconnects.push(id);
        clearInterval(interval);
      });
      socket.on("move", (data) => {
        if (data.id !== id) return;
        const player = this.players.find((p) => p.id === id);
        if (player) {
          const { up, down, left, right } = data;
          const moveVector = {
            x: (right ? 1 : 0) - (left ? 1 : 0),
            y: (down ? 1 : 0) - (up ? 1 : 0),
          };
          this.updates.moves[id] = {
            x: player.x + moveVector.x,
            y: player.y + moveVector.y,
          };
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
    }, 16);
  }
  update() {
    update(this.connector.players, this.connector.updates.moves);
  }
}
