import type { Socket } from "socket.io-client";
import type {
	FromServerEventMap,
	MoveUpdate,
	ToServerEventMap,
} from "../common/types";

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
