import EventSystem from "../../common/EventSystem";
import { ServerEventSystems } from "../../server/eventSystems";
import { Connector, GameServer } from "../../server/GameServer";
import { levelData } from "./fixtures";

function createTestConnection(): EventSystem {
  const system = new EventSystem();
  return system;
}

describe("connections", () => {
  let game: GameServer = null;
  const testId = "test-id";
  beforeEach(() => {
    const eventSystems: ServerEventSystems = {
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    };

    const testConnector = new Connector(eventSystems);
    game = new GameServer(testConnector, levelData);
  });
  it("a new connection should add a player id to the lobby", () => {
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      createTestConnection()
    );
    expect(game.connector.lobby).toContain(testId);
  });

  it("a new connection shouldn't add a player immediately", () => {
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      createTestConnection()
    );
    expect(game.connector.gameState.players.length).toBe(0);
  });
  it("a new connection should add a player after a join event", () => {
    const testConnection = createTestConnection();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection
    );
    testConnection.dispatchEvent("join", testId);
    expect(game.connector.gameState.players.length).toBe(1);
  });
  it("should not add a player if the id is already in use", () => {
    const testConnection = createTestConnection();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection
    );
    testConnection.dispatchEvent("join", testId);
    testConnection.dispatchEvent("join", testId);
    expect(game.connector.gameState.players.length).toBe(1);
  });
  it("two connections should result in two players", () => {
    const testConnection1 = createTestConnection();
    const testConnection2 = createTestConnection();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection1
    );
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      "test-id-2",
      testConnection2
    );
    testConnection1.dispatchEvent("join", testId);
    testConnection2.dispatchEvent("join", "test-id-2");
    expect(game.connector.gameState.players.length).toBe(2);
  });
  it("a player should be removed from the lobby after joining", () => {
    const testConnection = createTestConnection();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection
    );
    testConnection.dispatchEvent("join", testId);
    expect(game.connector.lobby).not.toContain(testId);
  });
  it("a player should be removed from the lobby after disconnecting", () => {
    const testConnection = createTestConnection();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection
    );
    testConnection.dispatchEvent("disconnect");
    expect(game.connector.lobby).not.toContain(testId);
  });
  it("a player should be removed from the game after disconnecting", () => {
    const testConnection = createTestConnection();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection
    );
    testConnection.dispatchEvent("join", testId);
    testConnection.dispatchEvent("disconnect");
    expect(game.connector.gameState.players.length).toBe(0);
  });
});
