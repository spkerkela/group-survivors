import type { Socket } from "socket.io-client";
import EventSystem from "../common/EventSystem";
import type {
  ClientGameState,
  FromServerEventMap,
  GameOverData,
  MoveUpdate,
  ToServerEventMap,
  UpgradeEvent,
} from "../common/types";
import {
  sendJoinMessage,
  sendMoveMessage,
  sendUpgradeSelectionMessage,
} from "./messages";

export const globalEventSystem = new EventSystem();

export function initServerEventSystem(
  serverEventSystem: EventSystem,
  io: Socket<FromServerEventMap, ToServerEventMap>
) {
  io.on("beginMatch", (gameState: ClientGameState) => {
    serverEventSystem.dispatchEvent("beginMatch", gameState);
  });

  io.on("disconnect", () => {
    serverEventSystem.dispatchEvent("disconnect");
  });

  io.on("spell", (data) => {
    serverEventSystem.dispatchEvent("spell", data);
  });

  io.on("update", (gameState: ClientGameState) => {
    serverEventSystem.dispatchEvent("update", gameState);
  });

  io.on("damage", (data) => {
    serverEventSystem.dispatchEvent("damage", data);
  });

  io.on("level", (data) => {
    serverEventSystem.dispatchEvent("level", data);
  });

  serverEventSystem.addEventListener("move", (move: MoveUpdate) => {
    sendMoveMessage(io, move);
  });

  serverEventSystem.addEventListener("join", (name: string) => {
    sendJoinMessage(io, name);
  });

  // Listen for upgrade selection and send to server
  serverEventSystem.addEventListener("upgradeSelection", (selected: any) => {
    sendUpgradeSelectionMessage(io, selected);
  });

  io.on("joined", (gameState: ClientGameState) => {
    serverEventSystem.dispatchEvent("joined", gameState);
  });

  io.on("endMatch", () => {
    serverEventSystem.dispatchEvent("endMatch");
  });

  io.on("gameOver", (data: GameOverData) => {
    serverEventSystem.dispatchEvent("gameOver", data);
  });

  io.on("preMatch", () => {
    serverEventSystem.dispatchEvent("preMatch");
  });

  io.on("upgrade", (data: UpgradeEvent) => {
    serverEventSystem.dispatchEvent("upgrade", data);
  });

  return serverEventSystem;
}
