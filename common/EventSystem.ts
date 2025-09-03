// biome-ignore lint/suspicious/noExplicitAny: needed for flexible event callback types
type EventCallback = (...args: any[]) => void;

export default class EventSystem {
  private _eventMap: Map<string, Array<EventCallback>>;

  constructor() {
    this._eventMap = new Map();
  }

  public addEventListener(event: string, callback: EventCallback) {
    if (!this._eventMap.has(event)) {
      this._eventMap.set(event, []);
    }
    this._eventMap.get(event)?.push(callback);
  }

  public removeEventListener(event: string, callback: EventCallback) {
    if (this._eventMap.has(event)) {
      const callbacks = this._eventMap.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  public dispatchEvent(event: string, ...args: unknown[]) {
    if (this._eventMap.has(event)) {
      const callbacks = this._eventMap.get(event) || [];
      for (const callback of callbacks) {
        callback(...args);
      }
    }
  }
}
