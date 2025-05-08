import { ServerScene } from "../../server/ServerScene";
import EventSystem from "../../common/EventSystem";

export function createTestConnection(
	serverScene: ServerScene,
	id: string,
): EventSystem {
	const system = new EventSystem();

	system.addEventListener("joined", () => {});
	system.addEventListener("endMatch", () => {});
	system.addEventListener("update", () => {});
	system.addEventListener("beginMatch", () => {});
	serverScene.eventSystems.gameEventSystem.dispatchEvent(
		"connection",
		id,
		system,
	);
	return system;
}
