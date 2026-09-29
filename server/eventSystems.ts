import type { Server, Socket } from "socket.io";
import EventSystem from "../common/EventSystem";
import { isValidGameId } from "../common/shared";
import type {
  ClientGameState,
  DamageEvent,
  FromServerEventMap,
  GameOverData,
  LevelEvent,
  MoveUpdate,
  SpellDamageEvent,
  SpellProjectileEvent,
  ToServerEventMap,
  UpgradeEvent,
} from "../common/types";
import { GameServer, type LevelData } from "./GameServer";
import { ServerScene } from "./ServerScene";

export interface ServerEventSystems {
  gameEventSystem: EventSystem;
  connectionSystems: { [key: string]: EventSystem };
}

export function initGameEventSystem(
  io: Server<ToServerEventMap, FromServerEventMap, any>,
  levelData: LevelData,
) {
  // ponytail: games live in this process until empty; add persistence for resumable games.
  const games = new Map<string, GameServer>();
  io.use((socket, next) => {
    next(
      isValidGameId(socket.handshake.auth.gameId)
        ? undefined
        : new Error("Invalid game ID"),
    );
  });
  io.on("connection", (socket) => {
    const gameId = socket.handshake.auth.gameId as string;
    let game = games.get(gameId);
    if (!game) {
      game = new GameServer(
        new ServerScene({
          gameEventSystem: new EventSystem(),
          connectionSystems: {},
        }),
        levelData,
      );
      games.set(gameId, game);
      game.start();
    }
    const connectionEventSystem = new EventSystem();
    initConnectedClientEventSystem(connectionEventSystem, socket);
    game.scene.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      socket.id,
      connectionEventSystem,
    );
    const currentGame = game;
    socket.on("disconnect", () => {
      if (currentGame.scene.connectionIds().length === 0) {
        currentGame.stop();
        games.delete(gameId);
      }
    });
  });
  return () => {
    games.forEach((game) => {
      game.stop();
    });
    games.clear();
  };
}

export function initConnectedClientEventSystem(
  eventSystem: EventSystem,
  socket: Socket<ToServerEventMap, FromServerEventMap, any>,
) {
  socket.on("upgradeSelection", (selected) => {
    eventSystem.dispatchEvent("upgradeSelection", selected);
  });
  socket.on("upgradeReroll", () => {
    eventSystem.dispatchEvent("upgradeReroll");
  });
  socket.on("join", (joinName: string) => {
    eventSystem.dispatchEvent("join", joinName);
  });

  eventSystem.addEventListener("beginMatch", (gameState: ClientGameState) => {
    socket.emit("beginMatch", gameState);
  });

  eventSystem.addEventListener("update", (gameState: ClientGameState) => {
    socket.emit("update", gameState);
  });
  socket.on("disconnect", () => {
    eventSystem.dispatchEvent("disconnect");
  });
  socket.on("move", (move: MoveUpdate) => {
    eventSystem.dispatchEvent("move", move);
  });
  eventSystem.addEventListener("spell", (spell: SpellDamageEvent) => {
    socket.emit("spell", spell);
  });
  eventSystem.addEventListener("damage", (damage: DamageEvent) => {
    socket.emit("damage", damage);
  });
  eventSystem.addEventListener("level", (level: LevelEvent) => {
    socket.emit("level", level);
  });
  eventSystem.addEventListener(
    "projectile",
    (projectile: SpellProjectileEvent) => {
      socket.emit("projectile", projectile);
    },
  );
  eventSystem.addEventListener("joined", (gameState: ClientGameState) => {
    socket.emit("joined", gameState);
  });
  eventSystem.addEventListener("endMatch", () => {
    socket.emit("endMatch");
  });
  eventSystem.addEventListener("gameOver", (data: GameOverData) => {
    socket.emit("gameOver", data);
  });
  eventSystem.addEventListener("preMatch", () => {
    socket.emit("preMatch");
  });
  eventSystem.addEventListener("upgrade", (choiceData: UpgradeEvent) => {
    socket.emit("upgrade", choiceData);
  });
  eventSystem.addEventListener("upgradeTimeLeft", (timeLeft: number | null) => {
    socket.emit("upgradeTimeLeft", timeLeft);
  });
  return eventSystem;
}
