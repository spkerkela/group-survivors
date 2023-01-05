export default class EventSystem {
  private _eventMap: Map<string, Array<Function>>;

  constructor() {
    this._eventMap = new Map();
  }

  public addEventListener(event: string, callback: Function) {
    if (!this._eventMap.has(event)) {
      this._eventMap.set(event, []);
    }
    this._eventMap.get(event).push(callback);
  }

  public removeEventListener(event: string, callback: Function) {
    if (this._eventMap.has(event)) {
      const callbacks = this._eventMap.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  public dispatchEvent(event: string, ...args: any[]) {
    if (this._eventMap.has(event)) {
      const callbacks = this._eventMap.get(event);
      callbacks.forEach((callback) => {
        callback(...args);
      });
    }
  }
}
