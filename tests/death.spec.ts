import { expect, test } from "@playwright/test";
import { build } from "esbuild";

let uiScript: string;

test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `
        import { createRoot } from "react-dom/client";
        import { Provider } from "react-redux";
        import GameContainer from "./web-client/GameContainer";
        import UI from "./web-client/UI";
        import store from "./web-client/store/store";
        createRoot(document.getElementById("root")).render(
          <Provider store={store}><GameContainer /><UI /></Provider>
        );
      `,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"test"' },
    // Keep the real socket event handlers and Redux/UI flow; stub transport and canvas.
    plugins: [
      {
        name: "game-boundaries",
        setup(build) {
          build.onResolve(
            { filter: /^(socket.io-client|\.\/phaser-middleware)$/ },
            (args) => ({
              path: args.path,
              namespace: "stub",
            }),
          );
          build.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
            contents:
              args.path === "socket.io-client"
                ? `export function io() {
                window.serverEvents = {};
                return { on(name, callback) { window.serverEvents[name] = callback; } };
              }`
                : "export default class { init() {} update() {} setScene() {} }",
          }));
        },
      },
    ],
  });
  uiScript = result.outputFiles[0].text;
});

test("dead players wait for the round to end, then return to the normal UI", async ({
  page,
}) => {
  await page.setContent(
    '<div id="app"><main id="root" class="game-stage"></main></div>',
  );
  await page.addStyleTag({ path: "web-client/style.css" });
  await page.addScriptTag({ content: uiScript });
  await page.waitForFunction("window.serverEvents?.update");
  await page.evaluate(`
    window.liveUpdate = {
      player: { hp: 200, maxHp: 200, level: 1, pendingLevels: 0, experience: 0, gold: 0, spells: {} },
      wave: 0, waveSecondsRemaining: 30
    };
    window.serverEvents.beginMatch(window.liveUpdate);
    window.serverEvents.update(window.liveUpdate);
  `);
  const notice = page.getByText("You fell in battle.");
  await expect(notice).toHaveCount(0);

  // The server removes a dead player before sending the next update.
  await page.evaluate(
    "window.serverEvents.update({ ...window.liveUpdate, player: null })",
  );
  await expect(page.getByRole("status")).toContainText(
    "Wait for the round to end. Your group fights on.",
  );
  await expect(
    page.getByRole("timer", { name: "Wave time remaining" }),
  ).toContainText("0:30");
  await page.evaluate(
    "window.serverEvents.update({ ...window.liveUpdate, player: null, waveSecondsRemaining: 20 })",
  );
  await expect(notice).toBeVisible();

  await page.evaluate(
    "window.serverEvents.upgrade({ choices: [], rerollCost: 5, timeLeft: null })",
  );
  await expect(notice).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await page.evaluate(`
    window.serverEvents.beginMatch(window.liveUpdate);
    window.serverEvents.update(window.liveUpdate);
  `);
  await expect(notice).toHaveCount(0);
  await expect(page.locator(".bars")).toContainText("200/200");

  await page.evaluate(
    "window.serverEvents.update({ ...window.liveUpdate, player: null })",
  );
  await expect(notice).toBeVisible();
  await page.evaluate("window.serverEvents.gameOver({})");
  await expect(notice).toHaveCount(0);
  await expect(page.getByText("Game Over")).toBeVisible();
});
