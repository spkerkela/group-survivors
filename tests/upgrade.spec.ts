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

test("confirming upgrades shows waiting feedback and locks controls until the next round", async ({
  page,
}) => {
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: uiScript });
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
  await choices.last().click();
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
