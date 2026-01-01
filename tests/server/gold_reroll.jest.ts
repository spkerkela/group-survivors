import EventSystem from "../../common/EventSystem";
import { GameServer } from "../../server/GameServer";
import { UpgradeState } from "../../server/game-session/UpgradeState";
import { ServerScene } from "../../server/ServerScene";
import { createTestConnection } from "./connectionUtils";
import { levelData } from "./fixtures";

describe("Gold Reroll", () => {
  let server: GameServer | null = null;
  let serverScene: ServerScene | null = null;
  const shortLevelData = { ...levelData, waveLength: 0.1, waves: 2 };

  beforeEach(() => {
    serverScene = new ServerScene({
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    });
    server = new GameServer(serverScene, shortLevelData);
  });

  it("should reroll choices and deduct gold when upgradeReroll event is dispatched", () => {
    const playerId = "p1";
    const connection = createTestConnection(serverScene!, playerId);
    
    // 1. Join and get to UpgradeState
    connection.dispatchEvent("join", "Player 1");
    server?.update(0); // Process join
    server?.update(0); // Enter MatchState
    server?.update(0.2); // Trigger transition to UpgradeState
    
    expect(server?.gameStateMachine.stateMachine.state).toBeInstanceOf(UpgradeState);
    
    const player = serverScene?.gameState.players.find(p => p.id === playerId);
    expect(player).toBeDefined();
    if (!player) return;

    // 2. Setup player with gold and get initial choices
    player.gold = 10;
    player.pendingLevels = 1;
    serverScene?.generateUpgradeChoices(playerId);
    const initialChoices = JSON.stringify(serverScene?.getUpgradeChoices(playerId));
    expect(initialChoices).not.toBe("[]");

    // 3. Dispatch reroll
    connection.dispatchEvent("upgradeReroll");
    
    // 4. Verify results
    expect(player.gold).toBe(5); // Deducted 5 gold
    const newChoices = JSON.stringify(serverScene?.getUpgradeChoices(playerId));
    expect(newChoices).not.toBe(initialChoices); // Choices should be different
  });

  it("should NOT reroll if player has insufficient gold", () => {
    const playerId = "p1";
    const connection = createTestConnection(serverScene!, playerId);
    
    connection.dispatchEvent("join", "Player 1");
    server?.update(0);
    server?.update(0);
    server?.update(0.2);
    
    const player = serverScene?.gameState.players.find(p => p.id === playerId);
    if (!player) return;

    player.gold = 2; // Less than 5
    const initialChoices = JSON.stringify(serverScene?.getUpgradeChoices(playerId));

    connection.dispatchEvent("upgradeReroll");
    
    expect(player.gold).toBe(2); // No deduction
    const newChoices = JSON.stringify(serverScene?.getUpgradeChoices(playerId));
    expect(newChoices).toBe(initialChoices); // Choices same
  });

  it("should emit correct level event payload after reroll", (done) => {
    const playerId = "p1";
    const connection = createTestConnection(serverScene!, playerId);
    
    // Join and get to UpgradeState
    connection.dispatchEvent("join", "Player 1");
    server?.update(0); 
    server?.update(0); 
    server?.update(0.2); 
    
    const player = serverScene?.gameState.players.find(p => p.id === playerId);
    if (!player) {
      done(new Error("Player not found"));
      return;
    }
    player.gold = 10;
    player.pendingLevels = 1;
    serverScene?.generateUpgradeChoices(playerId);

    // Setup listener for level event to verify payload structure
    connection.addEventListener("level", (data: any) => {
      try {
        expect(data).toHaveProperty("playerId", playerId);
        expect(data).toHaveProperty("player");
        expect(data.player).toHaveProperty("gold", 5);
        done();
      } catch (error) {
        done(error);
      }
    });

    // Dispatch reroll
    connection.dispatchEvent("upgradeReroll");
    
    // Process update to flush events
    server?.update(0);
  });
});
