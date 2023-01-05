import { Server, Socket } from "socket.io";
import EventSystem from "../common/EventSystem";
import {
  FromServerEventMap,
  GameState,
  MoveUpdate,
  Projectile,
  ToServerEventMap,
} from "../common/types";
import {
  DamageEvent,
  LevelEvent,
  SpellDamageEvent,
  SpellProjectileEvent,
} from "./game-logic";

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

  eventSystem.addEventListener("begin", (gameState: GameState) => {
    socket.emit("begin", gameState);
  });

  eventSystem.addEventListener("update", (gameState: GameState) => {
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

  return eventSystem;
}
