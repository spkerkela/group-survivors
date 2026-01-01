import { createServer } from "node:http";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import { Server } from "socket.io";
import parser from "socket.io-msgpack-parser";
import { GAME_HEIGHT, GAME_WIDTH } from "../common/constants";
import EventSystem from "../common/EventSystem";
import { initGameEventSystem, type ServerEventSystems } from "./eventSystems";
import { GameServer } from "./GameServer";
import logger from "./logger";
import { ServerScene } from "./ServerScene";

export interface ServerConfig {
  port: number;
  host: string;
}

export default function ({ port, host }: ServerConfig) {
  return function start() {
    const app = express();
    app.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: false,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "ws:", "wss:"],
            imgSrc: ["'self'", "data:", "blob:"],
            upgradeInsecureRequests: null,
          },
        },
        hsts: false,
      }),
    );

    const httpServer = createServer(app);

    app.use(express.static(path.join(__dirname, "dist")));

    httpServer.listen(port, host, () => {
      logger.info(`Server listening on http://${host}:${port}`);
    });

    const io = new Server(httpServer, {
      parser,
    });

    const events: ServerEventSystems = {
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    };

    initGameEventSystem(events.gameEventSystem, io);

    const gameServer = new GameServer(new ServerScene(events), {
      name: "Level 1",
      bots: 6,
      playerStartPosition: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
      enemyTable: {
        zombie: 1500,
        skeleton: 2000,
        bat: 3000,
      },
      staticObjects: [],
      spawnRate: 0.5,
      waveLength: 60,
      waves: 10,
    });

    gameServer.start();
    return function stop() {
      gameServer.stop();
      httpServer.close();
      io.close();
    };
  };
}
