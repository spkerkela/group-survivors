import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";
import EventSystem from "../../common/EventSystem";
import type { LevelEvent } from "../../common/types";
import { GameServer } from "../../server/GameServer";
import { UpgradeState } from "../../server/game-session/UpgradeState";
import { ServerScene } from "../../server/ServerScene";
import { createTestConnection } from "./connectionUtils";
import { levelData } from "./fixtures";

describe("Gold Reroll", () => {
  let server: GameServer;
  let serverScene: ServerScene;
  const shortLevelData = { ...levelData, waveLength: 0.1, waves: 2 };

  beforeEach(() => {
    serverScene = new ServerScene({
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    });
    server = new GameServer(serverScene, shortLevelData);
  });

  it("rerolls the current offer without spending a level, rejecting stale selections and confirmed requests", () => {
    const playerId = "p1";
    const connection = createTestConnection(serverScene, playerId);

    connection.dispatchEvent("join", "Player 1");
    server.update(0);
    server.update(0);
    server.update(0.2);
    assert.ok(
      server.gameStateMachine.stateMachine.state instanceof UpgradeState,
    );

    const player = serverScene.gameState.players.find((p) => p.id === playerId);
    assert.ok(player);
    player.gold = 10;
    player.pendingLevels = 3;
    serverScene.generateUpgradeChoices(playerId);
    const initialChoices = structuredClone(
      serverScene.getUpgradeChoices(playerId),
    );
    assert.equal(initialChoices.length, 1);

    for (const invalid of [
      undefined,
      null,
      -1,
      1,
      0.5,
      "1",
      {},
      NaN,
      Infinity,
    ]) {
      connection.dispatchEvent("upgradeReroll", invalid);
      assert.equal(player.gold, 10);
      assert.deepEqual(serverScene.getUpgradeChoices(playerId), initialChoices);
    }
    connection.dispatchEvent("upgradeReroll", 0);

    assert.equal(player.gold, 5);
    assert.equal(player.pendingLevels, 3);
    const newChoices = structuredClone(serverScene.getUpgradeChoices(playerId));
    assert.equal(newChoices.length, 1);
    assert.notDeepEqual(newChoices[0], initialChoices[0]);
    assert.equal(newChoices[0].length, 4);
    connection.dispatchEvent("upgradeSelection", [initialChoices[0][0]]);
    assert.equal(player.level, 1);

    for (let i = 0; i < 3; i++) {
      connection.dispatchEvent("upgradeSelection", [
        serverScene.getUpgradeChoices(playerId)[0][0],
      ]);
      assert.equal(player.level, i + 2);
    }
    connection.dispatchEvent("upgradeReroll", 0);
    assert.equal(player.gold, 5);
    assert.deepEqual(serverScene.getUpgradeChoices(playerId), []);
    server.update(0);
    assert.equal(player.level, 4);
  });

  it("should NOT reroll if player has insufficient gold", () => {
    const playerId = "p1";
    const connection = createTestConnection(serverScene, playerId);

    connection.dispatchEvent("join", "Player 1");
    server.update(0);
    server.update(0);
    server.update(0.2);

    const player = serverScene.gameState.players.find((p) => p.id === playerId);
    assert.ok(player);
    player.gold = 2;
    player.pendingLevels = 1;
    serverScene.generateUpgradeChoices(playerId);
    const initialChoices = JSON.stringify(
      serverScene.getUpgradeChoices(playerId),
    );

    connection.dispatchEvent("upgradeReroll", 0);

    assert.equal(player.gold, 2);
    const newChoices = JSON.stringify(serverScene.getUpgradeChoices(playerId));
    assert.equal(newChoices, initialChoices);
  });

  it("should emit correct level event payload after reroll", () => {
    const playerId = "p1";
    const connection = createTestConnection(serverScene, playerId);

    connection.dispatchEvent("join", "Player 1");
    server.update(0);
    server.update(0);
    server.update(0.2);

    const player = serverScene.gameState.players.find((p) => p.id === playerId);
    assert.ok(player);
    player.gold = 10;
    player.pendingLevels = 1;
    serverScene.generateUpgradeChoices(playerId);

    const onLevel = mock.fn((data: LevelEvent) => {
      assert.equal(data.playerId, playerId);
      assert.ok(data.player);
      assert.equal(data.player.gold, 5);
    });
    connection.addEventListener("level", onLevel);
    connection.dispatchEvent("upgradeReroll", 0);
    server.update(0);
    assert.equal(onLevel.mock.callCount(), 1);
  });
});
