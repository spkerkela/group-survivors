import EventSystem from "../common/EventSystem";

// This will be set in GameContainer and imported in UI
export let serverEventSystem: EventSystem | null = null;
export function setServerEventSystem(es: EventSystem) {
  serverEventSystem = es;
}
