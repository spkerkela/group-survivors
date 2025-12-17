import EventSystem from "../../common/EventSystem";
import { spellDB } from "../../common/data";
import { GameServer } from "../../server/GameServer";
import { ServerScene } from "../../server/ServerScene";
import { createPlayer } from "../../server/game-logic/player";
import { createTestConnection } from "./connectionUtils";
import { levelData } from "./fixtures";

describe("Spell Limits", () => {
  let server: GameServer | null = null;
  let serverScene: ServerScene | null = null;
  
  // Backup original spellDB
  const originalSpellDB = { ...spellDB };

  beforeEach(() => {
    serverScene = new ServerScene({
      gameEventSystem: new EventSystem(),
      connectionSystems: {},
    });
    server = new GameServer(serverScene, levelData);
    
    // Clear and Mock spellDB
    Object.keys(spellDB).forEach(key => delete spellDB[key]);
    Object.assign(spellDB, {
        "s1": { id: "s1", type: "aura" },
        "s2": { id: "s2", type: "aura" },
        "s3": { id: "s3", type: "aura" },
        "s4": { id: "s4", type: "aura" },
        "s5": { id: "s5", type: "aura" }, // Player will have these 5
        "s6": { id: "s6", type: "aura" }, // New spell
        "s7": { id: "s7", type: "aura" }, // New spell
    });
  });

  afterEach(() => {
    // Restore spellDB
    Object.keys(spellDB).forEach(key => delete spellDB[key]);
    Object.assign(spellDB, originalSpellDB);
  });

  it("should only offer upgrades for existing spells if active spell limit (5) is reached", () => {
    // 1. Create player
    const playerId = "p1";
    const player = createPlayer(playerId, "Player 1", { x: 0, y: 0 });
    serverScene!.gameState.players.push(player);

    // 2. Give player 5 spells (Limit reached)
    player.spells = {
        "s1": 1,
        "s2": 1,
        "s3": 1,
        "s4": 1,
        "s5": 1
    };
    player.pendingLevels = 1;

    // 3. Generate choices
    serverScene!.generateUpgradeChoices(playerId);
    const choices = serverScene!.getUpgradeChoices(playerId)[0];

    // 4. Verify choices
    // Since limit is 5, and we have 5, we should ONLY see s1-s5 offered.
    // s6 and s7 should NEVER be offered.
    expect(choices.length).toBeGreaterThan(0);
    choices.forEach(choice => {
        expect(["s1", "s2", "s3", "s4", "s5"]).toContain(choice.spellId);
        expect(["s6", "s7"]).not.toContain(choice.spellId);
    });
  });

  it("should offer new spells if active spell limit is NOT reached", () => {
     // 1. Create player
     const playerId = "p1";
     const player = createPlayer(playerId, "Player 1", { x: 0, y: 0 });
     serverScene!.gameState.players.push(player);
 
     // 2. Give player 4 spells (Limit NOT reached)
     player.spells = {
         "s1": 1,
         "s2": 1,
         "s3": 1,
         "s4": 1
     };
     player.pendingLevels = 1;
 
     // 3. Generate choices repeatedly to ensure we eventually see a new spell
     // Since selection is random, we might need multiple tries or just assert valid set.
     // But wait, generateUpgradeChoices generates one set.
     // To test "can offer", we might need to rely on probability or mock random.
     // However, simpler check: Valid choices include ALL spells (s1-s7).
     
     // Let's just generate a lot of choices (by having multiple pending levels)
     player.pendingLevels = 10;
     serverScene!.generateUpgradeChoices(playerId);
     const choiceGroups = serverScene!.getUpgradeChoices(playerId);

     const allOfferedSpellIds = new Set<string>();
     choiceGroups.forEach(group => group.forEach(c => allOfferedSpellIds.add(c.spellId)));

     // Verify that we saw at least one new spell (s5, s6, or s7)
     // This is probabilistic but with 4 choices * 10 levels = 40 picks from 7 items, 
     // chances of missing s5/s6/s7 are tiny.
     const newSpellsSeen = ["s5", "s6", "s7"].some(id => allOfferedSpellIds.has(id));
     expect(newSpellsSeen).toBe(true);
  });
});
