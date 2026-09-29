import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auraRadius, STARTING_WEAPONS, spellDB } from "../../common/data";
import EventSystem from "../../common/EventSystem";
import type { Enemy } from "../../common/types";
import { GameServer } from "../../server/GameServer";
import { checkPlayerExperience } from "../../server/game-logic/pickUps";
import { createPlayer } from "../../server/game-logic/player";
import { addSpellToPlayer, tickAura } from "../../server/game-logic/spells";
import {
  availablePowerUps,
  generateUpgradeChoiceGroup,
} from "../../server/game-logic/upgrades";
import { ServerScene } from "../../server/ServerScene";
import { CastSpellState } from "../../server/state-machines/CastSpellState";
import { SpellCooldownState } from "../../server/state-machines/SpellCooldownState";
import { createTestConnection } from "./connectionUtils";
import { levelData } from "./fixtures";

function setup() {
  const scene = new ServerScene({
    gameEventSystem: new EventSystem(),
    connectionSystems: {},
  });
  const server = new GameServer(scene, {
    ...levelData,
    waveLength: 1,
    waves: 3,
  });
  return { scene, server };
}

describe("Weapon progression", () => {
  it("uses the selected starter, including late joins and the next run; rejects invalid starters", () => {
    const { scene, server } = setup();
    const connection = createTestConnection(scene, "p1");
    assert.equal(STARTING_WEAPONS.length, 3);
    for (const invalid of ["fireball", "not-a-weapon", "__proto__", null, {}]) {
      connection.dispatchEvent("join", "Player", invalid);
      assert.equal(scene.readyToJoin.length, 0);
    }
    connection.dispatchEvent("join", "Player", "dagger");
    server.update(0);
    server.update(0);
    assert.deepEqual(scene.gameState.players[0].spells, { dagger: 1 });
    const late = createTestConnection(scene, "p2");
    late.dispatchEvent("join", "Late", "fireball");
    server.update(0);
    assert.equal(scene.gameState.players.length, 1);
    late.dispatchEvent("join", "Late", "damageAura");
    server.update(0);
    assert.deepEqual(scene.gameState.players[1].spells, { damageAura: 1 });
    scene.gameState.players.forEach((p) => {
      p.alive = false;
    });
    server.update(0);
    server.update(10);
    connection.dispatchEvent("join", "Player", "missile");
    server.update(0);
    server.update(0);
    assert.deepEqual(scene.gameState.players[0].spells, { missile: 1 });
  });

  it("offers distinct weapons, base unlocks, and only meaningful fixed bonuses", (t) => {
    const player = createPlayer("p", "Player", { x: 0, y: 0 });
    addSpellToPlayer("missile", player);
    for (const random of [0, 0.25, 0.5, 0.999999]) {
      const mock = t.mock.method(Math, "random", () => random);
      const group = generateUpgradeChoiceGroup(player);
      assert.equal(group.length, 4);
      assert.equal(new Set(group.map((c) => c.spellId)).size, 4);
      assert.equal(group[0].spellId, "missile");
      assert.ok(group[0].powerUp);
      for (const choice of group) {
        if (choice.powerUp) {
          assert.ok(player.spells[choice.spellId]);
          assert.ok(
            availablePowerUps(player, choice.spellId).some(
              (powerUp) =>
                powerUp.type === choice.powerUp?.type &&
                powerUp.value === choice.powerUp?.value,
            ),
          );
        } else assert.equal(player.spells[choice.spellId], undefined);
      }
      mock.mock.restore();
    }
    for (const id of Object.keys(spellDB)) addSpellToPlayer(id, player);
    for (let i = 0; i < 50; i++) {
      const group = generateUpgradeChoiceGroup(player);
      assert.equal(new Set(group.map((c) => c.spellId)).size, 4);
      assert.ok(group.every((choice) => choice.powerUp !== null));
    }
  });

  it("stops offering unlocks after filling the fifth slot, even with levels left", (t) => {
    spellDB.sixth = { ...spellDB.missile, id: "sixth" };
    t.after(() => {
      delete spellDB.sixth;
    });
    const { scene, server } = setup();
    const connection = createTestConnection(scene, "p1");
    connection.dispatchEvent("join", "Player");
    server.update(0);
    server.update(0);
    const player = scene.gameState.players[0];
    for (const id of ["damageAura", "dagger", "voidOrb"])
      addSpellToPlayer(id, player);
    player.pendingLevels = 2;
    server.update(1.1);
    // Select a deterministic pool position that includes an unowned weapon.
    t.mock.method(Math, "random", () => 0.999999);
    scene.clearUpgradeChoices(player.id);
    scene.generateUpgradeChoices(player.id);
    const unlock = scene
      .getUpgradeChoices(player.id)[0]
      .find((c) => c.powerUp === null);
    assert.ok(unlock);
    connection.dispatchEvent("upgradeSelection", [unlock]);
    assert.equal(Object.keys(player.spells).length, 5);
    assert.ok(
      scene
        .getUpgradeChoices(player.id)[0]
        .every((c) => c.powerUp && player.spells[c.spellId]),
    );
    const unowned = Object.keys(spellDB).find((id) => !player.spells[id]);
    assert.ok(unowned);
    assert.equal(addSpellToPlayer(unowned, player), false);
  });

  it("resolves levels sequentially, trusts server cards only, and persists the chosen build", () => {
    const { scene, server } = setup();
    const connection = createTestConnection(scene, "p1");
    connection.dispatchEvent("join", "Player", "missile");
    server.update(0);
    server.update(0);
    const player = scene.gameState.players[0];
    player.pendingLevels = 3;
    player.gold = 10;
    server.update(1.1);
    const first = scene.getUpgradeChoices("p1")[0];
    for (const invalid of [null, {}, [null], [{ id: "fake" }], first]) {
      connection.dispatchEvent("upgradeSelection", invalid);
      assert.equal(player.level, 1);
    }
    const unlock = first.find((choice) => choice.powerUp === null);
    assert.ok(unlock);
    // A valid ID with forged stats must still apply only the canonical unlock.
    connection.dispatchEvent("upgradeSelection", [
      {
        ...unlock,
        spellId: "fireball",
        powerUp: { type: "damage", value: 999 },
      },
    ]);
    assert.equal(player.spells[unlock.spellId], 1);
    assert.deepEqual(player.powerUps, {});
    assert.equal(player.pendingLevels, 2);
    connection.dispatchEvent("upgradeSelection", [unlock]);
    assert.equal(player.pendingLevels, 2);

    const second = scene.getUpgradeChoices("p1")[0];
    assert.ok(
      second
        .filter((c) => c.spellId === unlock.spellId)
        .every((c) => c.powerUp !== null),
    );
    const bonus = second[0];
    assert.ok(bonus.powerUp);
    connection.dispatchEvent("upgradeSelection", [
      { ...bonus, powerUp: { type: "additionalCast", value: 999 } },
    ]);
    assert.deepEqual(player.powerUps[bonus.spellId], [bonus.powerUp]);
    const third = scene.getUpgradeChoices("p1")[0][0];
    connection.dispatchEvent("upgradeSelection", [third]);
    connection.dispatchEvent("upgradeSelection", [third]);
    assert.equal(player.level, 4);
    assert.equal(player.pendingLevels, 0);
    const spells = { ...player.spells };
    const powerUps = structuredClone(player.powerUps);
    server.update(0);
    server.update(0);
    assert.deepEqual(scene.gameState.players[0].spells, spells);
    assert.deepEqual(scene.gameState.players[0].powerUps, powerUps);
  });

  it("keeps XP thresholds stable while choices are pending or rerolled", () => {
    const { scene } = setup();
    const player = createPlayer("p", "Player", { x: 0, y: 0 });
    scene.gameState.players.push(player);
    player.experience = 400;
    assert.equal(checkPlayerExperience(player), true);
    scene.generateUpgradeChoices(player.id);
    assert.equal(player.pendingLevels, 1);
    assert.equal(checkPlayerExperience(player), false);
    scene.clearUpgradeChoices(player.id);
    scene.generateUpgradeChoices(player.id);
    assert.equal(checkPlayerExperience(player), false);
  });

  it("caps cooldown and multicast, and range increases the actual aura radius", () => {
    const player = createPlayer("p", "Player", { x: 0, y: 0 });
    player.level = 100;
    player.powerUps.missile = [
      ...Array.from({ length: 5 }, () => ({
        type: "cooldown" as const,
        value: 0.1,
      })),
      { type: "additionalCast", value: 1 },
      { type: "additionalCast", value: 1 },
    ];
    assert.deepEqual(availablePowerUps(player, "missile"), [
      { type: "damage", value: 0.15 },
    ]);
    assert.ok(
      !availablePowerUps(player, "damageAura").some(
        (p) => p.type === "additionalCast",
      ),
    );
    const data = {
      player,
      spellData: spellDB.missile,
      enemies: [],
      events: { damageEvents: [], projectileEvents: [] },
    };
    const cooldown = new SpellCooldownState();
    cooldown.enter(data);
    assert.equal(cooldown.cooldown, spellDB.missile.cooldown * 0.5);
    const cast = new CastSpellState();
    cast.enter(data);
    assert.equal(cast.castCount, 3);
    player.powerUps.missile.push(
      { type: "cooldown", value: 0.9 },
      { type: "additionalCast", value: 100 },
    );
    cooldown.enter(data);
    cast.enter(data);
    assert.equal(cooldown.cooldown, spellDB.missile.cooldown * 0.5);
    assert.equal(cast.castCount, 3);
    const range = [{ type: "range" as const, value: 0.15 }];
    const radius = auraRadius(spellDB.damageAura, player.level, range);
    assert.equal(radius, 47);
    const enemies = [
      { id: "inside", x: radius - 0.001, y: 0 },
      { id: "outside", x: radius + 0.001, y: 0 },
    ] as Enemy[];
    assert.equal(
      tickAura(spellDB.damageAura, player, player.id, player.level, enemies)
        .length,
      0,
    );
    assert.deepEqual(
      tickAura(
        spellDB.damageAura,
        player,
        player.id,
        player.level,
        enemies,
        range,
      ).map((event) => event.targetId),
      ["inside"],
    );
  });
});
