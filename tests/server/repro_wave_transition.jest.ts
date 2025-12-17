import EventSystem from "../../common/EventSystem";
import { GameServer } from "../../server/GameServer";
import { ServerScene } from "../../server/ServerScene";
import { MatchState } from "../../server/game-session/MatchState";
import { UpgradeState } from "../../server/game-session/UpgradeState";
import { createTestConnection } from "./connectionUtils";
import { levelData } from "./fixtures";

describe("Wave Transition", () => {
  let server: GameServer | null = null;
  let serverScene: ServerScene | null = null;
  const shortLevelData = { ...levelData, waveLength: 1, waves: 2 }; // 1 second waves, 2 waves

  beforeEach(() => {
    serverScene = new ServerScene({
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    });
    server = new GameServer(serverScene, shortLevelData);
  });

  it("should retain players when transitioning from Wave 1 -> Upgrade -> Wave 2", () => {
    // 1. Join players
    const p1Conn = createTestConnection(serverScene!, "p1");
    const p2Conn = createTestConnection(serverScene!, "p2");
    p1Conn.dispatchEvent("join", "Player 1");
    p2Conn.dispatchEvent("join", "Player 2");

    // 2. Start Game
    server?.update(0); // Process events
    server?.update(0); // Transition to MatchState
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(MatchState);
    expect(serverScene?.gameState.players.length).toBe(2);

    // 3. Fast forward to UpgradeState
    server?.update(1.1); // > 1s waveLength
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(UpgradeState);

    // 4. Simulate Upgrade Selection (or timeout)
    // We'll just wait for the timeout (countdown)
    // UpgradeState has a countdown of 30s. We can force it by updating with huge dt.
    server?.update(31); 
    
    // 5. Verify transition to Wave 2
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(MatchState);
    
    // Tick once more to allow MatchState.update to process newPlayers
    server?.update(0);

    const matchState = server?.gameStateMachine.stateMachine.state as MatchState;
    expect(matchState.wave).toBe(1); // 0-indexed, so 1 is Wave 2

    // 6. CHECK FOR PLAYERS
    // This is where I expect it to fail
    expect(serverScene?.gameState.players.length).toBe(2);
  });
});
