import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import EventSystem from "../../common/EventSystem";
import { GameServer } from "../../server/GameServer";
import { MatchState } from "../../server/game-session/MatchState";
import { UpgradeState } from "../../server/game-session/UpgradeState";
import { ServerScene } from "../../server/ServerScene";
import { createTestConnection } from "./connectionUtils";
import { levelData } from "./fixtures";

describe("Wave Transition", () => {
  let server: GameServer;
  let serverScene: ServerScene;
  const shortLevelData = { ...levelData, waveLength: 1, waves: 2 };

  beforeEach(() => {
    serverScene = new ServerScene({
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    });
    server = new GameServer(serverScene, shortLevelData);
  });

  it("should retain players when transitioning from Wave 1 -> Upgrade -> Wave 2", () => {
    const p1Conn = createTestConnection(serverScene, "p1");
    const p2Conn = createTestConnection(serverScene, "p2");
    p1Conn.dispatchEvent("join", "Player 1");
    p2Conn.dispatchEvent("join", "Player 2");

    server.update(0);
    server.update(0);
    assert.ok(server.gameStateMachine.stateMachine.state instanceof MatchState);
    assert.equal(serverScene.gameState.players.length, 2);

    server.update(1.1);
    assert.ok(
      server.gameStateMachine.stateMachine.state instanceof UpgradeState,
    );

    // Multiplayer upgrades time out after 60 seconds.
    server.update(60);
    assert.ok(server.gameStateMachine.stateMachine.state instanceof MatchState);
    server.update(0);

    const matchState = server.gameStateMachine.stateMachine.state as MatchState;
    assert.equal(matchState.wave, 1); // 0-indexed, so 1 is Wave 2
    assert.equal(serverScene.gameState.players.length, 2);
  });
});
