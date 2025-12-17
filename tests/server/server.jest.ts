import EventSystem from "../../common/EventSystem";
import { type ClientGameState, GameState } from "../../common/types";
import { GameServer } from "../../server/GameServer";
import { createPlayer } from "../../server/game-logic/player";
import { EndMatchState } from "../../server/game-session/EndMatchState";
import { MatchState } from "../../server/game-session/MatchState";
import { PreMatchState } from "../../server/game-session/PreMatchState";
import { ServerScene } from "../../server/ServerScene";
import { createTestConnection } from "./connectionUtils";
import { levelData } from "./fixtures";

describe("Server", () => {
  let server: GameServer | null = null;
  let serverScene: ServerScene | null = null;
  beforeEach(() => {
    serverScene = new ServerScene({
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    });
    server = new GameServer(serverScene, levelData);
  });
  function beginGame(playerCount = 1) {
    for (let i = 0; i < playerCount; i++) {
      const conn = createTestConnection(serverScene!, `test-id-${i}`);
      conn.dispatchEvent("join", `Random Name ${i}`);
    }
    server?.update(0);
  }

  it("should remain in the pre-match state when someone connects", () => {
    createTestConnection(serverScene!, "test-id");
    server?.update(0);
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      PreMatchState,
    );
  });
  it("should remain in pre-match even if enough players join but they have not sent a join evenet", () => {
    createTestConnection(serverScene!, "test-id");
    createTestConnection(serverScene!, "test-id-2");
    server?.update(0);
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      PreMatchState,
    );
  });
  it("should remain in pre-match if only some players join", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    createTestConnection(serverScene!, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    server?.update(0);
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      PreMatchState,
    );
  });
  it("should send 'joined' event to player in response to 'join' event", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p1JoinedSpy = jest.fn();
    p1Conn.addEventListener("joined", p1JoinedSpy);
    p1Conn.dispatchEvent("join", "Random Name");
    server?.update(0);
    expect(p1JoinedSpy).toHaveBeenCalled();
  });
  it("should move to the game state if enough players join", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    server?.update(0);
    server?.update(0);

    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      MatchState,
    );
    expect(serverScene?.gameState.players.length).toBe(2);
  });
  it("should send 'beginMatch' event to all players when the game starts", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    const p1JoinedSpy = jest.fn();
    const p2JoinedSpy = jest.fn();
    p1Conn.addEventListener("beginMatch", p1JoinedSpy);
    p2Conn.addEventListener("beginMatch", p2JoinedSpy);
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    server?.update(0);
    server?.update(0);
    expect(p1JoinedSpy).toHaveBeenCalled();
    expect(p2JoinedSpy).toHaveBeenCalled();
  });
  it("should send an 'update' event to all players when the game is in update", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    const p1JoinedSpy = jest.fn();
    const p2JoinedSpy = jest.fn();
    p1Conn.addEventListener("update", p1JoinedSpy);
    p2Conn.addEventListener("update", p2JoinedSpy);
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    serverScene!.gameState.players = [
      createPlayer("test-id", "Random Name", { x: 500, y: 500 }),
      createPlayer("test-id-2", "Random Name 2", { x: 1000, y: 1000 }),
    ];
    serverScene!.updateQuadTree();
    const gameStates: ClientGameState[] = [];
    Object.entries(serverScene!.eventSystems.connectionSystems).forEach(
      ([id]) => {
        const gameState = serverScene!.createGameStateMessage(id);
        gameStates.push(gameState);
        serverScene!.pushEvent("update", id, gameState);
      },
    );
    server?.update(0);
    expect(p1JoinedSpy).toHaveBeenCalledWith(gameStates[0]);
    expect(p2JoinedSpy).toHaveBeenCalledWith(gameStates[1]);
  });
  it("should not send positions of players that are not close to each other", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    serverScene!.gameState.players = [
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
    serverScene!.updateQuadTree();
    const gameStates: ClientGameState[] = [];
    Object.entries(serverScene!.eventSystems.connectionSystems).forEach(
      ([id]) => {
        const gameState = serverScene!.createGameStateMessage(id);
        gameStates.push(gameState);
        serverScene!.pushEvent("update", id, gameState);
      },
    );
    server?.update(0);
    expect(gameStates[0].players).toHaveLength(1);
    expect(gameStates[1].players).toHaveLength(8);
  });
  it("should move to retrospective state when the game is over", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    server?.update(0);
    server?.update(0);
    [p1Conn, p2Conn].forEach((conn) => {
      conn.dispatchEvent("disconnect");
    });
    server?.update(0);

    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      EndMatchState,
    );
  });
  it("should add new players when they join a game that is in update", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    server?.update(0);
    server?.update(0);
    const p3Conn = createTestConnection(serverScene!, "test-id-3");
    p3Conn.dispatchEvent("join", "Random Name 3");

    expect(serverScene?.updates.newPlayers).toStrictEqual([
      {
        id: "test-id-3",
        screenName: "Random Name 3",
      },
    ]);
    server?.update(0);
    expect(serverScene?.gameState.players).toHaveLength(3);
    expect(serverScene?.updates.newPlayers).toStrictEqual([]);
  });
  it("should send endMatch event to all players when the game is over", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    const p1JoinedSpy = jest.fn();
    const p2JoinedSpy = jest.fn();
    p1Conn.addEventListener("endMatch", p1JoinedSpy);
    p2Conn.addEventListener("endMatch", p2JoinedSpy);
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    server?.update(0);
    server?.update(0);
    serverScene?.gameState.players.forEach((player) => {
      player.hp = 0;
      player.alive = false;
    });
    server?.update(0);
    server?.update(0);
    expect(p1JoinedSpy).toHaveBeenCalled();
    expect(p2JoinedSpy).toHaveBeenCalled();
  });
  it("should move to the lobby state after ten seconds", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    server?.update(0);
    server?.update(0);
    serverScene?.gameState.players.forEach((player) => {
      player.hp = 0;
      player.alive = false;
    });
    server?.update(0);

    server?.update(2);

    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      EndMatchState,
    );
    server?.update(10);

    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      PreMatchState,
    );
  });
  it("should move from Retrospective to Lobby state if no players connected", () => {
    const p1Conn = createTestConnection(serverScene!, "test-id");
    const p2Conn = createTestConnection(serverScene!, "test-id-2");
    p1Conn.dispatchEvent("join", "Random Name");
    p2Conn.dispatchEvent("join", "Random Name 2");
    server?.update(0);
    server?.update(0);
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      MatchState,
    );
    p1Conn.dispatchEvent("disconnect");
    p2Conn.dispatchEvent("disconnect");
    server?.update(0);
    server?.update(0);

    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      PreMatchState,
    );
  });
  it("Game should start in PreMatch", async () => {
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      PreMatchState,
    );
  });

  it("should transition to MatchState when enough players join", async () => {
    beginGame();
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      MatchState,
    );
  });
  it("game state should contain the correct number of players", async () => {
    beginGame(2);
    server?.update(0);
    expect(serverScene?.gameState.players.length).toBe(2);
  });
  it("game should start even with ridiculous number of players", async () => {
    beginGame(100);
    server?.update(0.5);
    server?.update(0.5);
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      MatchState,
    );
    expect(serverScene?.gameState.players.length).toBe(100);
  });
  it("game should not add same player twice", async () => {
    beginGame(1);
    beginGame(1);
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(
      MatchState,
    );
    expect(serverScene?.gameState.players.length).toBe(1);
  });
});
