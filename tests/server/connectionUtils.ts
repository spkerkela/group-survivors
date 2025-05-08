import EventSystem from "../../common/EventSystem";
import type { ServerScene } from "../../server/ServerScene";

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
