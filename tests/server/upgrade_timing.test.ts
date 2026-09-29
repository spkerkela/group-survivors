import assert from "node:assert/strict";
import { describe, it } from "node:test";
import EventSystem from "../../common/EventSystem";
import type { UpgradeEvent } from "../../common/types";
import { GameServer } from "../../server/GameServer";
import { MatchState } from "../../server/game-session/MatchState";
import { UpgradeState } from "../../server/game-session/UpgradeState";
import { ServerScene } from "../../server/ServerScene";
import { createTestConnection } from "./connectionUtils";
import { levelData } from "./fixtures";

function startUpgrade(playerCount: number, pendingLevels = 1) {
  const scene = new ServerScene({
    gameEventSystem: new EventSystem(),
    connectionSystems: {},
  });
  const server = new GameServer(scene, {
    ...levelData,
    waveLength: 1,
    waves: 2,
  });
  const connections = Array.from({ length: playerCount }, (_, i) => {
    const connection = createTestConnection(scene, `p${i}`);
    connection.dispatchEvent("join", `Player ${i}`);
    return connection;
  });
  server.update(0);
  server.update(0);
  for (const player of scene.gameState.players) {
    player.pendingLevels = pendingLevels;
    player.gold = 10;
  }
  const upgrades: UpgradeEvent[] = [];
  const times: (number | null)[] = [];
  connections[0].addEventListener("upgrade", (data: UpgradeEvent) =>
    upgrades.push(data),
  );
  connections[0].addEventListener("upgradeTimeLeft", (time: number | null) =>
    times.push(time),
  );
  server.update(1.1);
  server.update(0);
  const confirm = (index: number) =>
    connections[index].dispatchEvent(
      "upgradeSelection",
      scene.getUpgradeChoices(`p${index}`).map((group) => group[0]),
    );
  return { scene, server, connections, upgrades, times, confirm };
}

describe("Upgrade timing", () => {
  it("waits indefinitely for a solo player's confirmation, even with a spectator", () => {
    const { scene, server, upgrades, confirm } = startUpgrade(1);
    createTestConnection(scene, "spectator");
    assert.equal(upgrades[0].timeLeft, null);
    server.update(3600);
    assert.ok(
      server.gameStateMachine.stateMachine.state instanceof UpgradeState,
    );
    confirm(0);
    server.update(0);
    assert.ok(server.gameStateMachine.stateMachine.state instanceof MatchState);
    server.update(0);
    assert.equal(scene.gameState.players[0].level, 2);
  });

  it("allows 60 seconds in multiplayer, keeps the timer on reroll, and applies fallback upgrades", () => {
    const { scene, server, connections, upgrades, times } = startUpgrade(2);
    assert.equal(upgrades[0].timeLeft, 60);
    server.update(31);
    assert.ok(
      server.gameStateMachine.stateMachine.state instanceof UpgradeState,
    );
    assert.equal(times[times.length - 1], 29);
    connections[0].dispatchEvent("upgradeReroll", 0);
    server.update(0);
    assert.equal(upgrades[upgrades.length - 1].timeLeft, 29);
    server.update(28);
    assert.ok(
      server.gameStateMachine.stateMachine.state instanceof UpgradeState,
    );
    assert.equal(times[times.length - 1], 1);
    server.update(1);
    assert.ok(server.gameStateMachine.stateMachine.state instanceof MatchState);
    server.update(0);
    assert.deepEqual(
      scene.gameState.players.map((player) => player.level),
      [2, 2],
    );
  });

  it("applies only the remaining levels on timeout after a partial selection", () => {
    const { scene, server, confirm } = startUpgrade(2, 3);
    confirm(0);
    assert.equal(scene.gameState.players[0].pendingLevels, 2);
    server.update(60);
    server.update(0);
    assert.deepEqual(
      scene.gameState.players.map((p) => [p.level, p.pendingLevels]),
      [
        [4, 0],
        [4, 0],
      ],
    );
  });

  it("resumes early only after everyone confirms", () => {
    const { server, confirm } = startUpgrade(2);
    confirm(0);
    server.update(0);
    assert.ok(
      server.gameStateMachine.stateMachine.state instanceof UpgradeState,
    );
    confirm(1);
    server.update(0);
    assert.ok(server.gameStateMachine.stateMachine.state instanceof MatchState);
  });

  it("removes the time limit if the remaining player becomes solo", () => {
    const { server, connections, times, confirm } = startUpgrade(2);
    confirm(1);
    connections[1].dispatchEvent("disconnect");
    server.update(60);
    assert.ok(
      server.gameStateMachine.stateMachine.state instanceof UpgradeState,
    );
    assert.equal(times[times.length - 1], null);
    confirm(0);
    server.update(0);
    assert.ok(server.gameStateMachine.stateMachine.state instanceof MatchState);
  });
});
