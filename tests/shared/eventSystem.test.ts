import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import EventSystem from "../../common/EventSystem";

describe("EventSystem", () => {
  it("should add event listener", () => {
    const eventSystem = new EventSystem();
    const callback = mock.fn();
    eventSystem.addEventListener("test", callback);
    eventSystem.dispatchEvent("test");
    assert.equal(callback.mock.callCount(), 1);
  });
  it("should remove event listener", () => {
    const eventSystem = new EventSystem();
    const callback = mock.fn();
    eventSystem.addEventListener("test", callback);
    eventSystem.removeEventListener("test", callback);
    eventSystem.dispatchEvent("test");
    assert.equal(callback.mock.callCount(), 0);
  });
});
