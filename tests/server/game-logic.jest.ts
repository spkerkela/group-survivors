import { createPlayer } from "../../server/game-logic/player";
import { addSpellToPlayer } from "../../server/game-logic/spells";

const testSpellId = "damageAura";
describe("Spells", () => {
  it("adding a spell to a player should add it to the player's spell list", () => {
    const player = createPlayer("test", "test", { x: 0, y: 0 });
    addSpellToPlayer(testSpellId, player);
    expect(player.spells).toContain(testSpellId);
  });
  it("adding a spell twice to a player should not add it twice to the player's spell list", () => {
    const player = createPlayer("test", "test", { x: 0, y: 0 });
    addSpellToPlayer(testSpellId, player);
    addSpellToPlayer(testSpellId, player);
    expect(player.spells).toEqual([testSpellId]);
  });
  it("adding a spell should create a spell state machine entry", () => {
    const player = createPlayer("test", "test", { x: 0, y: 0 });
    addSpellToPlayer(testSpellId, player);
    expect(player.spellSMs).toHaveProperty(testSpellId);
  });
});
