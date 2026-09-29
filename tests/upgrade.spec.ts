import { buildSync } from "esbuild";
import { expect, test } from "./fixtures";

// Render the real UI without Phaser or waiting through a full multiplayer wave.
const uiScript = buildSync({
  stdin: {
    contents: `
      import { createRoot } from "react-dom/client";
      import { Provider } from "react-redux";
      import EventSystem from "./common/EventSystem";
      import UI from "./web-client/UI";
      import store from "./web-client/store/store";
      import { setServerEventSystem } from "./web-client/serverEventSystem";
      window.store = store;
      window.upgradeEvents = [];
      const events = new EventSystem();
      for (const name of ["upgradeSelection", "upgradeReroll"]) {
        events.addEventListener(name, (data) => window.upgradeEvents.push({ name, data }));
      }
      setServerEventSystem(events);
      store.dispatch({ type: "gold/setGold", payload: 100 });
      store.dispatch({ type: "upgradeChoices/setUpgradeChoices", payload: {
        choices: [[
          { id: "first", spellId: "damageAura", powerUp: { type: "damage", value: 0.1 } },
          { id: "second", spellId: "damageAura", powerUp: { type: "range", value: 0.1 } }
        ]], rerollCost: 5, timeLeft: 60
      }});
      store.dispatch({ type: "game/setState", payload: "upgrade" });
      createRoot(document.getElementById("root")).render(<Provider store={store}><UI /></Provider>);
    `,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"test"' },
}).outputFiles[0].text;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(
    '<div id="app"><main id="root" class="game-stage"></main></div>',
  );
  await page.addStyleTag({ path: "web-client/style.css" });
  await page.addScriptTag({ content: uiScript });
});

test("confirming upgrades shows waiting feedback and locks controls until the next round", async ({
  page,
}) => {
  const confirm = page.locator(".upgrade-confirm-btn");
  const reroll = page.getByRole("button", { name: /Reroll/ });
  const choices = page.locator(".upgrade-choice-wrapper");

  await expect(confirm).toBeDisabled();
  await expect(reroll).toBeEnabled();
  await choices.first().click();
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(confirm).toHaveText("Upgrades Confirmed");
  await expect(confirm).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText(
    "Waiting for other players…",
  );
  await expect(reroll).toBeDisabled();
  await expect(page.getByRole("radio").last()).toBeDisabled();
  await page
    .getByRole("radio")
    .last()
    .evaluate((input: HTMLInputElement) => input.click());
  await expect(choices.first()).toHaveClass(/selected/);
  await expect(choices.last()).not.toHaveClass(/selected/);
  await confirm.evaluate((button: HTMLButtonElement) => button.click());
  await reroll.evaluate((button: HTMLButtonElement) => button.click());
  expect(await page.evaluate("window.upgradeEvents")).toEqual([
    {
      name: "upgradeSelection",
      data: [
        {
          id: "first",
          spellId: "damageAura",
          powerUp: { type: "damage", value: 0.1 },
        },
      ],
    },
  ]);

  await page.evaluate(
    'window.store.dispatch({ type: "upgradeChoices/setUpgradeTimeLeft", payload: 59 })',
  );
  await expect(page.getByRole("status")).toHaveText(
    "Waiting for other players…",
  );
  await page.evaluate(
    'window.store.dispatch({ type: "game/setState", payload: "match" })',
  );
  await expect(confirm).toHaveCount(0);
  await page.evaluate(
    'window.store.dispatch({ type: "game/setState", payload: "upgrade" })',
  );
  await expect(confirm).toHaveText("Confirm Upgrades");
  await expect(page.getByRole("status")).toBeEmpty();
  await expect(reroll).toBeEnabled();
  await choices.first().click();
  await expect(confirm).toBeEnabled();
});

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`polished screens stay usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.evaluate(`
      const groups = window.store.getState().upgradeChoices.choices;
      window.store.dispatch({ type: "upgradeChoices/setUpgradeChoices", payload: {
        choices: [groups[0], groups[0].map(c => ({ ...c, id: c.id + "-next" }))], rerollCost: 5, timeLeft: 9
      }});
    `);
    const firstSet = page.getByRole("group", {
      name: "Upgrade 1",
      exact: true,
    });
    await firstSet.getByRole("radio").first().focus();
    await page.keyboard.press("Space");
    await expect(firstSet.getByRole("radio").first()).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(firstSet.getByRole("radio").last()).toBeChecked();
    await page
      .getByRole("group", { name: "Upgrade 2", exact: true })
      .getByRole("radio")
      .first()
      .check();
    const confirm = page.getByRole("button", { name: "Confirm Upgrades" });
    await confirm.scrollIntoViewIfNeeded();
    await expect(confirm).toBeInViewport();
    expect(
      await page
        .locator("#ui")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("upgrades.png"),
      fullPage: true,
    });
    await confirm.click();
    expect(
      await page.evaluate("window.upgradeEvents[0].data.map(c => c.id)"),
    ).toEqual(["second", "first-next"]);

    await page.evaluate(
      'window.store.dispatch({ type: "game/setState", payload: "lobby" })',
    );
    await page
      .getByRole("textbox", { name: "Your survivor name" })
      .fill("A very long survivor name for layout checks");
    await expect(
      page.getByRole("button", { name: "Join the fight" }),
    ).toBeEnabled();
    await page.screenshot({
      path: testInfo.outputPath("lobby.png"),
      fullPage: true,
    });
    await page.getByRole("textbox").press("Enter");
    await expect(page.getByRole("status")).toHaveText("Waiting for the game…");

    await page.evaluate(`
      window.store.dispatch({ type: "health/setHealth", payload: { currentHealth: 75, maxHealth: 100 } });
      window.store.dispatch({ type: "activeSpells/setActiveSpells", payload: { damageAura: 3, missile: 2, dagger: 1, voidOrb: 4, fireball: 2 } });
      window.store.dispatch({ type: "game/setWave", payload: 12 });
      window.store.dispatch({ type: "game/setTimeLeft", payload: 65 });
      window.store.dispatch({ type: "game/setState", payload: "match" });
    `);
    await expect(
      page.getByRole("progressbar", { name: "Health" }),
    ).toHaveAttribute("aria-valuenow", "75");
    await expect(page.getByRole("timer")).toContainText("1:05");
    await page.screenshot({
      path: testInfo.outputPath("hud.png"),
      fullPage: true,
    });
    await page.evaluate(
      'window.store.dispatch({ type: "game/setState", payload: "gameOver" })',
    );
    await expect(
      page.getByRole("heading", { name: "Game Over" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(
      "Returning to the lobby shortly…",
    );
    await page.screenshot({
      path: testInfo.outputPath("game-over.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate("document.documentElement.scrollWidth <= innerWidth"),
    ).toBe(true);
  });
}

test("rerolls clear selections, unaffordable rerolls lock, and an empty round can continue", async ({
  page,
}) => {
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: /Reroll/ }).click();
  expect(await page.evaluate("window.upgradeEvents")).toEqual([
    { name: "upgradeReroll" },
  ]);
  await page.evaluate(`
    window.store.dispatch({ type: "upgradeChoices/setUpgradeChoices", payload: {
      choices: [[{ id: "new", spellId: "missile", powerUp: { type: "cooldown", value: 0.1 } }]], rerollCost: 200, timeLeft: 10
    }});
  `);
  await expect(page.getByRole("radio")).not.toBeChecked();
  await expect(page.getByRole("button", { name: /Reroll/ })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Confirm Upgrades" }),
  ).toBeDisabled();
  await page.evaluate(
    'window.store.dispatch({ type: "upgradeChoices/setUpgradeChoices", payload: { choices: [], rerollCost: 5, timeLeft: null } })',
  );
  await page.getByRole("button", { name: "Continue" }).click();
  expect(await page.evaluate("window.upgradeEvents[1]")).toEqual({
    name: "upgradeSelection",
    data: [],
  });
});
