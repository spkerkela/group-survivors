import EventSystem from "../../common/EventSystem";
import { ServerEventSystems } from "../../server/eventSystems";
import { Connector, GameServer } from "../../server/GameServer";
import { levelData } from "./fixtures";

describe("player death", () => {
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
  it("admin command to kill player should kill player", () => {
    const testConnection = new EventSystem();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection
    );
    testConnection.dispatchEvent("join", testId);

    game.adminEvents.dispatchEvent("killPlayer", testId);
    game.update();
    expect(game.connector.gameState.players[0].alive).toBe(false);
  });
  it("killing a player should place them in the lobby", () => {
    const testConnection = new EventSystem();
    const testConnection2 = new EventSystem();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection
    );
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      "test-id-2",
      testConnection2
    );
    testConnection.dispatchEvent("join", testId);
    testConnection2.dispatchEvent("join", "test-id-2");
    game.update();
    game.adminEvents.dispatchEvent("killPlayer", testId);
    game.update();
    expect(game.connector.lobby).toContain(testId);
  });
  it("killing a player should remove them from the game", () => {
    const testConnection = new EventSystem();
    const testConnection2 = new EventSystem();
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      testId,
      testConnection
    );
    game.connector.eventSystems.gameEventSystem.dispatchEvent(
      "connection",
      "test-id-2",
      testConnection2
    );
    testConnection.dispatchEvent("join", testId);
    testConnection2.dispatchEvent("join", "test-id-2");
    game.update();
    game.adminEvents.dispatchEvent("killPlayer", testId);
    game.update();
    expect(game.connector.gameState.players.length).toBe(1);
  });
});
