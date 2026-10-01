import assert from "node:assert/strict";
import { test } from "node:test";
import EventSystem from "../common/EventSystem";
import ClientStateMachine, {
  ConnectedState,
  DisconnectedState,
  GameLoopState,
  UpgradeState,
} from "../web-client/ClientStateMachine";

// Characterization checks: these confirm TLC's witnesses exist in the real code.
// After fixing a defect, update the model and replace its witness with a regression.
for (const { name, events, stuck, wanted } of [
  {
    name: "disconnect in GameLoop has no listener",
    events: ["disconnect"],
    stuck: GameLoopState,
    wanted: DisconnectedState,
  },
  {
    name: "endMatch/gameOver in GameLoop have no listeners",
    events: ["endMatch", "gameOver"],
    stuck: GameLoopState,
    wanted: ConnectedState,
  },
  {
    name: "beginMatch before the upgrade frame is dropped",
    events: ["endMatch", "upgrade", "beginMatch"],
    stuck: UpgradeState,
    wanted: GameLoopState,
  },
]) {
  test(`TLC counterexample matches TypeScript: ${name}`, () => {
    const serverEvents = new EventSystem();
    const sm = new ClientStateMachine(serverEvents, {
      init() {},
      update() {},
      setScene() {},
    });
    serverEvents.dispatchEvent("joined", { id: "p1" });
    sm.update(0);
    serverEvents.dispatchEvent("beginMatch", { id: "p1" });
    sm.update(0);
    assert.ok(sm.stateMachine.state instanceof GameLoopState);

    for (const event of events) serverEvents.dispatchEvent(event, { id: "p1" });
    for (let frame = 0; frame < 3; frame++) sm.update(0);
    assert.ok(sm.stateMachine.state instanceof stuck);
    assert.ok(!(sm.stateMachine.state instanceof wanted));
  });
}
