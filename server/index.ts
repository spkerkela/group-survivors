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
let disconnects: string[] = [];
io.on("connection", (socket) => {
  const id = socket.id;
  players.push({ id, x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const newGameState: GameState = {
    players,
    id,
  };
  socket.emit("begin", newGameState);
  let interval = setInterval(() => {
    socket.emit("players", players);
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
});

httpServer.listen(port, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

setInterval(() => {
  // move players in a circle:

  players.forEach((p) => {
    let x = p.x + Math.cos(p.y / 100) * 2;
    let y = p.y + Math.sin(p.x / 100) * 2;
    p.x = x;
    p.y = y;
  });
}, 16);
