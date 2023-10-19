import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { GAME_HEIGHT, GAME_WIDTH } from "../common/constants";
import { GameServer } from "./GameServer";
import parser from "socket.io-msgpack-parser";
import EventSystem from "../common/EventSystem";
import { initGameEventSystem, ServerEventSystems } from "./eventSystems";
import { ServerScene } from "./ServerScene";
import helmet from "helmet";
import logger from "./logger";

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
      waves: 3,
    });

    gameServer.start();
    return function stop() {
      gameServer.stop();
      httpServer.close();
      io.close();
    };
  };
}
