import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { GAME_HEIGHT, GAME_WIDTH } from "../common/constants";
import { GameState } from "../common/types";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer);
app.use(express.static(path.join(__dirname, "dist")));

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;

let players: { id: string; x: number; y: number }[] = [];
// create 50 bot players
for (let i = 0; i < 50; i++) {
  players.push({
    id: `bot-${i}`,
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
  });
}
let disconnects: string[] = [];
interface PlayerUpdate {
  x: number;
  y: number;
}
let updates: { [key: string]: PlayerUpdate } = {};
io.on("connection", (socket) => {
  const id = socket.id;
  players.push({ id, x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const newGameState: GameState = {
    players,
    id,
  };
  socket.emit("begin", newGameState);
  let interval = setInterval(() => {
    socket.emit("update", { players, id });
    if (disconnects.length > 0) {
      socket.emit("disconnected", disconnects);
      disconnects = [];
    }
  }, 16);
  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== id);
    disconnects.push(id);
    clearInterval(interval);
  });
  socket.on("move", (data) => {
    if (data.id !== id) return;
    const player = players.find((p) => p.id === id);
    if (player) {
      const { up, down, left, right } = data;
      const moveVector = {
        x: (right ? 1 : 0) - (left ? 1 : 0),
        y: (down ? 1 : 0) - (up ? 1 : 0),
      };
      updates[id] = {
        x: player.x + moveVector.x,
        y: player.y + moveVector.y,
      };
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

setInterval(() => {
  players.forEach((p) => {
    if (updates[p.id]) {
      p.x = updates[p.id].x;
      p.y = updates[p.id].y;
    }
    if (p.id.startsWith("bot-")) {
      let x = p.x + Math.cos(p.y / 100) * 2;
      let y = p.y + Math.sin(p.x / 100) * 2;
      p.x = x;
      p.y = y;
    }
  });
}, 16);
