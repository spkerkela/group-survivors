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

  it("rerolls only the requested level, preserving other picks and rejecting invalid or confirmed requests", () => {
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
    assert.equal(initialChoices.length, 3);

    for (const invalid of [
      undefined,
      null,
      -1,
      3,
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
    connection.dispatchEvent("upgradeReroll", 1);

    assert.equal(player.gold, 5);
    assert.equal(player.pendingLevels, 0);
    const newChoices = structuredClone(serverScene.getUpgradeChoices(playerId));
    assert.equal(newChoices.length, 3);
    assert.deepEqual(newChoices[0], initialChoices[0]);
    assert.notDeepEqual(newChoices[1], initialChoices[1]);
    assert.equal(newChoices[1].length, 4);
    assert.deepEqual(newChoices[2], initialChoices[2]);

    connection.dispatchEvent("upgradeSelection", [
      initialChoices[0][1],
      newChoices[1][0],
      initialChoices[2][0],
    ]);
    connection.dispatchEvent("upgradeReroll", 1);
    assert.equal(player.gold, 5);
    assert.deepEqual(serverScene.getUpgradeChoices(playerId), newChoices);
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
