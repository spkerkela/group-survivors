import { Server, Socket } from "socket.io";
import EventSystem from "../common/EventSystem";
import {
  FromServerEventMap,
  GameOverData,
  ClientGameState,
  MoveUpdate,
  ToServerEventMap,
  DamageEvent,
  LevelEvent,
  SpellDamageEvent,
  SpellProjectileEvent,
  UpgradeEvent,
} from "../common/types";

export interface ServerEventSystems {
  gameEventSystem: EventSystem;
  connectionSystems: { [key: string]: EventSystem };
}

export function initGameEventSystem(
  eventSystem: EventSystem,
  io: Server<ToServerEventMap, FromServerEventMap, any>
) {
  io.on("connection", (socket) => {
    const connectionEventSystem = new EventSystem();
    initConnectedClientEventSystem(connectionEventSystem, socket);
    eventSystem.dispatchEvent("connection", socket.id, connectionEventSystem);
  });
}

export function initConnectedClientEventSystem(
  eventSystem: EventSystem,
  socket: Socket<ToServerEventMap, FromServerEventMap, any>
) {
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
    }
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
  return eventSystem;
}
