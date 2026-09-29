import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { buildSync } from "esbuild";

const image = (name: string) => `http://aura.test/${name}.png`;
const script = buildSync({
  stdin: {
    contents: `
      import { spellDB } from "./common/data";
      import { tickAura } from "./server/game-logic/spells";
      import { instantiatePlayer, updatePlayer, destroyPlayer } from "./web-client/middleware";
      new Phaser.Game({
        type: Phaser.WEBGL, width: 480, height: 360, zoom: 2,
        backgroundColor: "#191820", pixelArt: true, audio: { noAudio: true },
        scene: {
          preload() {
            this.load.spritesheet("player", ${JSON.stringify(image("player_anim"))}, { frameWidth: 16, frameHeight: 16 });
            this.load.image("background", ${JSON.stringify(image("bg"))});
          },
          create() {
            this.add.tileSprite(240, 180, 480, 360, "background").setDepth(-2);
            this.anims.create({ key: "player", frames: this.anims.generateFrameNumbers("player", { start: 0, end: 1 }) });
            const player = { id: "test-player", screenName: "Fiery Aura", x: 240, y: 180, level: 1, spells: { damageAura: 1 }, powerUps: {} };
            const view = instantiatePlayer(this, player);
            const aura = view.getData("aura");
            const emitter = view.getData("auraEmitter");
            window.auraTest = {
              update(level, enabled, multiplier = 1, rangeBonus = 0) {
                player.powerUps.damageAura = [{ type: "range", value: rangeBonus }];
                player.level = level;
                player.spells = enabled ? { damageAura: 1 } : {};
                spellDB.damageAura.rangeMultiplier = multiplier;
                updatePlayer(view, player);
              },
              move() { view.setPosition(300, 240); },
              destroy() { destroyPlayer(view); },
              state() {
                const radius = view.getData("auraRadius");
                const enemies = [
                  { id: "inside", x: player.x + radius - 0.001, y: player.y },
                  { id: "outside", x: player.x + radius + 0.001, y: player.y },
                ];
                const matrix = aura.getWorldTransformMatrix();
                return {
                  radius, visible: aura.visible, drawn: aura.commandBuffer.length > 0,
                  emitting: emitter.on, particles: emitter.alive.length,
                  localParticles: emitter.manager.parentContainer === view,
                  position: [matrix.tx, matrix.ty],
                  hits: tickAura(spellDB.damageAura, player, player.id, player.level, enemies, player.powerUps.damageAura).map(event => event.targetId),
                };
              },
              destroyed() { return !aura.scene && !emitter.manager.scene; },
            };
          },
        },
      });
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
}).outputFiles[0].text;

test("fiery aura always shows the real damage area and follows its owner", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://aura.test/*.png", (route) =>
    route.fulfill({
      contentType: "image/png",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: readFileSync(
        `web-client/assets${new URL(route.request().url()).pathname}`,
      ),
    }),
  );
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.setContent("<body style='margin:0;background:#191820'></body>");
  await page.addScriptTag({ path: "node_modules/phaser/dist/phaser.js" });
  await page.addScriptTag({ content: script });
  await expect
    .poll(
      async () =>
        (await page.evaluate("!!window.auraTest")) || errors.join("\n"),
    )
    .toBe(true);
  const state = () => page.evaluate("window.auraTest.state()");

  expect(await state()).toMatchObject({
    radius: 40.01,
    visible: true,
    drawn: true,
    emitting: true,
    localParticles: true,
    position: [240, 180],
    hits: ["inside"],
  });
  await expect
    .poll(() => page.evaluate<number>("window.auraTest.state().particles"))
    .toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("fiery-aura.png") });

  // Staying idle through several damage ticks must not hide the area.
  await page.evaluate("new Promise(resolve => setTimeout(resolve, 1000))");
  expect(await state()).toMatchObject({ visible: true, drawn: true });
  await page.evaluate("window.auraTest.update(25, true, 1.5)");
  expect(await state()).toMatchObject({ radius: 60.25, hits: ["inside"] });
  await page.evaluate("window.auraTest.update(25, true, 1, 0.15)");
  expect(await state()).toMatchObject({ radius: 46.25, hits: ["inside"] });
  await page.evaluate("window.auraTest.move()");
  expect(await state()).toMatchObject({
    position: [300, 240],
    localParticles: true,
  });

  await page.evaluate("window.auraTest.update(25, false)");
  expect(await state()).toMatchObject({
    radius: 0,
    visible: false,
    drawn: false,
    emitting: false,
    particles: 0,
  });
  await page.evaluate("window.auraTest.update(25, true)");
  expect(await state()).toMatchObject({
    radius: 40.25,
    visible: true,
    drawn: true,
  });
  await page.evaluate("window.auraTest.destroy()");
  expect(await page.evaluate("window.auraTest.destroyed()")).toBe(true);
  expect(errors).toEqual([]);
});
