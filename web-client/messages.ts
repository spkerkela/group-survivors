import { MoveUpdate } from "../common/types";

export function sendMoveMessage(
  socket: { emit: (name: string, update: MoveUpdate) => void },
  moveMessage: MoveUpdate
) {
  socket.emit("move", moveMessage);
}
