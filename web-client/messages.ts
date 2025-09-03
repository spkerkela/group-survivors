import type { Socket } from "socket.io-client";
import type {
  FromServerEventMap,
  MoveUpdate,
  ToServerEventMap,
  UpgradeChoice,
} from "../common/types";

// Send selected upgrades to the server (custom event)
export function sendUpgradeSelectionMessage(
  socket: Socket<any, any>,
  selected: UpgradeChoice[],
) {
  socket.emit("upgradeSelection", selected);
}

export function sendMoveMessage(
  socket: Socket<FromServerEventMap, ToServerEventMap>,
  moveMessage: MoveUpdate,
) {
  socket.emit("move", moveMessage);
}

export function sendJoinMessage(
  socket: Socket<FromServerEventMap, ToServerEventMap>,
  name: string,
) {
  socket.emit("join", name);
}
