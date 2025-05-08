import EventSystem from "../../common/EventSystem";

describe("EventSystem", () => {
  it("should add event listener", () => {
    const eventSystem = new EventSystem();
    const callback = jest.fn();
    eventSystem.addEventListener("test", callback);
    eventSystem.dispatchEvent("test");
    expect(callback).toHaveBeenCalled();
  });
  it("should remove event listener", () => {
    const eventSystem = new EventSystem();
    const callback = jest.fn();
    eventSystem.addEventListener("test", callback);
    eventSystem.removeEventListener("test", callback);
    eventSystem.dispatchEvent("test");
    expect(callback).not.toHaveBeenCalled();
  });
});
