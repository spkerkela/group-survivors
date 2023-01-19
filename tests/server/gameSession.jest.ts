import GameSessionStateMachine, {
  MatchState,
  PreMatchState,
} from "../../server/GameSessionStateMachine";
import { ServerScene } from "../../server/ServerScene";
import EventSystem from "../../common/EventSystem";
import { levelData } from "./fixtures";
import { addReadyPlayer, createTestConnection } from "./connectionUtils";

describe("Game session", () => {
  let sm: GameSessionStateMachine = null;
  let scene: ServerScene = null;
  beforeEach(() => {
    scene = new ServerScene({
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    });
    sm = new GameSessionStateMachine(scene, levelData, 1);
    scene.start(levelData);
  });
  function beginGame(playerCount: number = 1) {
    for (let i = 0; i < playerCount; i++) {
      addReadyPlayer(scene, `test-id-${i}`);
    }
    sm.update(0);
  }
  it("Game should start in PreMatch", async () => {
    expect(sm.stateMachine.state).toBeInstanceOf(PreMatchState);
  });
  it("should transition to MatchState when enough players join", async () => {
    beginGame();
    expect(sm.stateMachine.state).toBeInstanceOf(MatchState);
  });
  it("game state should contain the correct number of players", async () => {
    beginGame(2);
    sm.update(0);
    expect(sm.data.scene.gameState.players.length).toBe(2);
  });
  it("game should start even with ridiculous number of players", async () => {
    beginGame(100);
    sm.update(0.5);
    sm.update(0.5);
    expect(sm.stateMachine.state).toBeInstanceOf(MatchState);
    expect(sm.data.scene.gameState.players.length).toBe(100);
  });
  it("game should not add same player twice", async () => {
    beginGame(1);
    beginGame(1);
    expect(sm.stateMachine.state).toBeInstanceOf(MatchState);
    expect(sm.data.scene.gameState.players.length).toBe(1);
  });
  it.skip("should add a player to the game when they join after the game has started", async () => {
    beginGame(1);
    addReadyPlayer(scene, "test-id-2");
    sm.update(0);
    expect(sm.data.scene.gameState.players.length).toBe(2);
  });
});
