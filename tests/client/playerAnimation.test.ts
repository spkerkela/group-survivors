import assert from "node:assert/strict";
import { it, mock } from "node:test";
import type Phaser from "phaser";
import type { Player } from "../../common/types";
import { updatePlayer } from "../../web-client/middleware";

it("players walk only while moving and settle on the idle frame", () => {
  const sprite = {
    play: mock.fn(),
    stop: mock.fn(() => sprite),
    setFrame: mock.fn(),
  };
  const container = {
    x: 100,
    y: 200,
    getAt: () => sprite,
    getData: () => undefined,
    scene: { add: { tween: mock.fn() } },
  };
  const update = (x: number, y: number) =>
    updatePlayer(
      container as unknown as Phaser.GameObjects.Container,
      { x, y } as Player,
    );

  update(100, 200);
  assert.equal(sprite.play.mock.callCount(), 0);
  assert.deepEqual(sprite.setFrame.mock.calls.at(-1)?.arguments, [0]);

  for (const [x, y] of [
    [110, 200],
    [100, 210],
    [90, 190],
  ]) {
    update(x, y);
    // Continuing movement must not restart the animation each render frame.
    assert.deepEqual(sprite.play.mock.calls.at(-1)?.arguments, [
      { key: "player", repeat: -1, frameRate: 8 },
      true,
    ]);
  }
  assert.equal(sprite.play.mock.callCount(), 3);

  update(100.001, 200);
  update(100, 200);
  assert.equal(sprite.play.mock.callCount(), 3);
  assert.equal(sprite.stop.mock.callCount(), 3);
  assert.deepEqual(sprite.setFrame.mock.calls.at(-1)?.arguments, [0]);

  update(100, 190);
  assert.equal(sprite.play.mock.callCount(), 4);
});
