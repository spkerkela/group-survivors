import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { GAME_HEIGHT, GAME_WIDTH } from "../common/constants";
import { GameServer, Connector } from "./GameServer";
import parser from "socket.io-msgpack-parser";
import EventSystem from "../common/EventSystem";
import { initGameEventSystem, ServerEventSystems } from "./eventSystems";

const app = express();

const httpServer = createServer(app);

app.use(express.static(path.join(__dirname, "dist")));

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;

httpServer.listen(port, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

const io = new Server(httpServer, {
  parser,
});

const events: ServerEventSystems = {
  gameEventSystem: new EventSystem(),
  connectionSystems: {},
};

initGameEventSystem(events.gameEventSystem, io);

const gameServer = new GameServer(new Connector(events), {
  name: "Level 1",
  bots: 4,
  playerStartPosition: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
  enemyTable: {
    zombie: 10,
    skeleton: 20,
    bat: 30,
  },
  staticObjects: [],
});

gameServer.start();
