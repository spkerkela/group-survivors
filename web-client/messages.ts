import { MoveUpdate } from "../common/types";

export function sendMoveMessage(
  socket: { emit: (name: string, update: MoveUpdate) => void },
  moveMessage: MoveUpdate
) {
  socket.emit("move", moveMessage);
}

export function sendJoinMessage(
  socket: { emit: (name: string, joinName: string) => void },
  name: string
) {
  socket.emit("join", name);
}
