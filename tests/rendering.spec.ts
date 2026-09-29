import { expect, test } from "@playwright/test";
import type Phaser from "phaser";

declare global {
  interface Window {
    testRenderer: Phaser.Game;
  }
}

// Unlike the regular page fixture, this boots the real Phaser renderer.
test("Phaser menu scenes stay free of placeholder text and align with the UI", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let phaser: typeof Phaser;
    Object.defineProperty(window, "Phaser", {
      configurable: true,
      get: () => phaser,
      set(value: typeof Phaser) {
        phaser = value;
        value.Game = new Proxy(value.Game, {
          construct(target, args) {
            const game = Reflect.construct(target, args);
            window.testRenderer = game;
            return game;
          },
        });
      },
    });
  });
  await page.goto("/");
  await page.waitForFunction(() => window.testRenderer?.isBooted);
  for (const name of ["Lobby", "Upgrade", "GameOver"]) {
    await page.evaluate((name) => window.testRenderer.scene.start(name), name);
    await page.waitForFunction(
      (name) => window.testRenderer.scene.isActive(name),
      name,
    );
    expect(
      await page.evaluate(
        (name) =>
          window.testRenderer.scene
            .getScene(name)
            .children.list.filter(
              (child): child is Phaser.GameObjects.Text =>
                child.type === "Text",
            )
            .map((child) => child.text),
        name,
      ),
    ).toEqual([]);
  }
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const canvas = await page.locator("#canvas").boundingBox();
    const ui = await page.locator("#ui").boundingBox();
    expect(canvas).toEqual(ui);
    expect(canvas?.width).toBeLessThan(width);
    expect(
      await page
        .locator(".game-stage")
        .evaluate((el) => getComputedStyle(el).position),
    ).toBe("relative");
  }
});
