import ClientStateMachine, {
  ConnectedState,
  DisconnectedState,
  GameLoopState
} from "../../web-client/ClientStateMachine";
import { GameFrontend } from "../../web-client/middleware";
import EventSystem from "../../common/EventSystem";

describe("Client State Machine", () => {
  const testId = "test"
  let sm: ClientStateMachine = null;
  let frontend: GameFrontend = null;
  let serverEvents: EventSystem = null;
  beforeEach(() => {
    frontend = {
      init: jest.fn(),
      setScene: jest.fn(),
      update: jest.fn()
    };
    serverEvents = new EventSystem();
    sm = new ClientStateMachine(serverEvents,frontend);
  });
  it("should transition from DisconnectedState to ConnectedState", () => {
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(DisconnectedState);
    serverEvents.dispatchEvent("joined", { id: testId });
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(ConnectedState);
  });
  it("should transition from ConnectedState to GameLoopState", () => {
    serverEvents.dispatchEvent("joined", { id: testId });
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(ConnectedState);
    serverEvents.dispatchEvent("beginMatch", { id: testId });
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(GameLoopState);
  });
  it("should transition from ConnectedState to GameLoopState if it receives update before beginMatch", () => {
    serverEvents.dispatchEvent("joined", { id: testId });
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(ConnectedState);
    serverEvents.dispatchEvent("update", { id: testId });
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(GameLoopState);
  });
})