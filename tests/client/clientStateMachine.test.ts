import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";
import EventSystem from "../../common/EventSystem";
import ClientStateMachine, {
  ConnectedState,
  DisconnectedState,
  GameLoopState,
} from "../../web-client/ClientStateMachine";
import type { GameFrontend } from "../../web-client/middleware";

describe("Client State Machine", () => {
  const testId = "test";
  let sm: ClientStateMachine;
  let frontend: GameFrontend;
  let serverEvents: EventSystem;
  beforeEach(() => {
    frontend = {
      init: mock.fn(),
      setScene: mock.fn(),
      update: mock.fn(),
    };
    serverEvents = new EventSystem();
    sm = new ClientStateMachine(serverEvents, frontend);
  });
  it("should transition from DisconnectedState to ConnectedState", () => {
    sm.update(0);
    assert.ok(sm.stateMachine.state instanceof DisconnectedState);
    serverEvents.dispatchEvent("joined", { id: testId });
    sm.update(0);
    assert.ok(sm.stateMachine.state instanceof ConnectedState);
  });
  it("should transition from ConnectedState to GameLoopState", () => {
    serverEvents.dispatchEvent("joined", { id: testId });
    sm.update(0);
    assert.ok(sm.stateMachine.state instanceof ConnectedState);
    serverEvents.dispatchEvent("beginMatch", { id: testId });
    sm.update(0);
    assert.ok(sm.stateMachine.state instanceof GameLoopState);
  });
  it("should transition from ConnectedState to GameLoopState if it receives update before beginMatch", () => {
    serverEvents.dispatchEvent("joined", { id: testId });
    sm.update(0);
    assert.ok(sm.stateMachine.state instanceof ConnectedState);
    serverEvents.dispatchEvent("update", { id: testId });
    sm.update(0);
    assert.ok(sm.stateMachine.state instanceof GameLoopState);
  });
});
