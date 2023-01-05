import { Socket } from "socket.io-client";
import {
  FromServerEventMap,
  MoveUpdate,
  ToServerEventMap,
} from "../common/types";

export function sendMoveMessage(
  socket: { emit: (name: string, update: MoveUpdate) => void },
  moveMessage: MoveUpdate
) {
  socket.emit("move", moveMessage);
}

export function sendJoinMessage(
  socket: Socket<FromServerEventMap, ToServerEventMap>,
  name: string
) {
  socket.emit("join", name);
}
