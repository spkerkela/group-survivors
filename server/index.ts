import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { GAME_HEIGHT, GAME_WIDTH } from "../common/constants";
import { GameServer, SocketIOConnector } from "./GameServer";

const app = express();

const httpServer = createServer(app);

app.use(express.static(path.join(__dirname, "dist")));

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;

httpServer.listen(port, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

const io = new Server(httpServer);
const gameServer = new GameServer(new SocketIOConnector(io), {
  name: "Level 1",
  bots: 1,
  playerStartPosition: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
});

gameServer.start();
