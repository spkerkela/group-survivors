import EventSystem from "../../common/EventSystem";
import ConnectionStateMachine, {
  GameRetrospectiveState,
  GameUpdateState,
  LobbyState,
} from "../../server/ConnectionStateMachine";
import { createPlayer } from "../../server/game-logic";
import { levelData } from "./fixtures";
import { ServerScene } from "../../server/ServerScene";
import { createTestConnection } from "./connectionUtils";

describe("Connections", () => {
  let sm: ConnectionStateMachine = null;
  let serverScene: ServerScene = null;
  beforeEach(() => {
    serverScene = new ServerScene({
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    });
    serverScene.start(levelData);
    sm = new ConnectionStateMachine(serverScene, 2);
  });
  it("should start in the lobby state", () => {
    expect(sm.stateMachine.state).toBeInstanceOf(LobbyState);
  });
  it("should remain in the lobby state when someone connects", () => {
    createTestConnection(serverScene, "test-id");
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(LobbyState);
  });
  it("should remain in lobby even if enough players join but they have not sent a join evenet", () => {
    createTestConnection(serverScene, "test-id");
    createTestConnection(serverScene, "test-id-2");
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(LobbyState);
  });
  it("should remain in lobby if only some players join", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    createTestConnection(serverScene, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(LobbyState);
  });
  it("should send 'joined' event to player in response to 'join' event", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p1JoinedSpy = jest.fn();
    p1Conn.addEventListener("joined", p1JoinedSpy);
    p1Conn.dispatchEvent("join", "Random Name");
    sm.update(0);
    expect(p1JoinedSpy).toHaveBeenCalled();
  });
  it("should move to the game state if enough players join", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(GameUpdateState);
  });
  it("should send 'beginMatch' event to all players when the game starts", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    const p1JoinedSpy = jest.fn();
    const p2JoinedSpy = jest.fn();
    p1Conn.addEventListener("beginMatch", p1JoinedSpy);
    p2Conn.addEventListener("beginMatch", p2JoinedSpy);
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    sm.update(0);
    sm.update(0);
    expect(p1JoinedSpy).toHaveBeenCalled();
    expect(p2JoinedSpy).toHaveBeenCalled();
  });
  it("should send an 'update' event to all players when the game is in update", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    const p1JoinedSpy = jest.fn();
    const p2JoinedSpy = jest.fn();
    p1Conn.addEventListener("update", p1JoinedSpy);
    p2Conn.addEventListener("update", p2JoinedSpy);
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    serverScene.gameState.players = [
      createPlayer("test-id", "Random Name", { x: 500, y: 500 }),
      createPlayer("test-id-2", "Random Name 2", { x: 1000, y: 1000 }),
    ];
    serverScene.updateQuadTree();
    const gameStates = [];
    Object.entries(serverScene.eventSystems.connectionSystems).forEach(
      ([id]) => {
        const gameState = serverScene.createGameStateMessage(id);
        gameStates.push(gameState);
        serverScene.pushEvent("update", id, gameState);
      }
    );
    sm.update(0);
    expect(p1JoinedSpy).toHaveBeenCalledWith(gameStates[0]);
    expect(p2JoinedSpy).toHaveBeenCalledWith(gameStates[1]);
  });
  it("should not send positions of players that are not close to each other", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    serverScene.gameState.players = [
      createPlayer("test-id", "Random Name", { x: 1, y: 1 }),
      createPlayer("test-id-2", "Random Name 2", { x: 1000, y: 1000 }),
      createPlayer("test-id-3", "Random Name 3", { x: 1001, y: 1000 }),
      createPlayer("test-id-4", "Random Name 4", { x: 1002, y: 1000 }),
      createPlayer("test-id-5", "Random Name 5", { x: 1003, y: 1000 }),
      createPlayer("test-id-6", "Random Name 6", { x: 1004, y: 1000 }),
      createPlayer("test-id-7", "Random Name 7", { x: 1005, y: 1000 }),
      createPlayer("test-id-8", "Random Name 8", { x: 1006, y: 1000 }),
      createPlayer("test-id-9", "Random Name 9", { x: 1007, y: 1000 }),
    ];
    serverScene.updateQuadTree();
    const gameStates = [];
    Object.entries(serverScene.eventSystems.connectionSystems).forEach(
      ([id]) => {
        const gameState = serverScene.createGameStateMessage(id);
        gameStates.push(gameState);
        serverScene.pushEvent("update", id, gameState);
      }
    );
    sm.update(0);
    expect(gameStates[0].players).toHaveLength(1);
    expect(gameStates[1].players).toHaveLength(8);
  });
  it("should move to retrospective state when the game is over", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    sm.update(0);
    sm.update(0);
    serverScene.gameState.players = [];
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(GameRetrospectiveState);
  });
  it("should add new players when they join a game that is in update", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    serverScene.gameState.players = [
      createPlayer("test-id", "Random Name", { x: 500, y: 500 }),
      createPlayer("test-id-2", "Random Name 2", { x: 1000, y: 1000 }),
    ];
    sm.update(0);
    sm.update(0);
    serverScene.updates.newPlayers = [];
    const p3Conn = createTestConnection(serverScene, "test-id-3");
    p3Conn.dispatchEvent("join", "Random Name 3");
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(GameUpdateState);
    expect(serverScene.updates.newPlayers).toStrictEqual([
      {
        id: "test-id-3",
        screenName: "Random Name 3",
      },
    ]);
  });
  it("should send endMatch event to all players when the game is over", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    const p1JoinedSpy = jest.fn();
    const p2JoinedSpy = jest.fn();
    p1Conn.addEventListener("endMatch", p1JoinedSpy);
    p2Conn.addEventListener("endMatch", p2JoinedSpy);
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    sm.update(0);
    sm.update(0);
    serverScene.gameState.players = [];
    sm.update(0);
    expect(p1JoinedSpy).toHaveBeenCalled();
    expect(p2JoinedSpy).toHaveBeenCalled();
  });
  it("should move to the lobby state after ten seconds", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    sm.update(0);
    sm.update(0);
    serverScene.gameState.players = [];
    sm.update(10);
    expect(sm.stateMachine.state).toBeInstanceOf(LobbyState);
  });
  it("should move from Retrospective to Lobby state if no players connected", () => {
    const p1Conn = createTestConnection(serverScene, "test-id");
    const p2Conn = createTestConnection(serverScene, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    sm.update(0);
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(GameRetrospectiveState);
    p1Conn.dispatchEvent("disconnect");
    p2Conn.dispatchEvent("disconnect");
    sm.update(0);
    expect(sm.stateMachine.state).toBeInstanceOf(LobbyState);
  });
});
