import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../common/constants";
import { GameState } from "../common/types";
const playerAsset = new URL("assets/pixel_player.png", import.meta.url);
const assets = [
  {
    id: "player",
    url: playerAsset.href,
  },
];

let pressedKeys = {};
window.onkeyup = function (e) {
  pressedKeys[e.keyCode] = false;
};
window.onkeydown = function (e) {
  pressedKeys[e.keyCode] = true;
};

export default class Game {
  game: Phaser.Game;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    const sceneConfig: Phaser.Types.Scenes.CreateSceneFromObjectConfig = {
      preload: function () {
        assets.forEach(({ id, url }) => {
          this.load.image(id, url);
        });
      },
      create: function () {
        gameState.players.forEach((p) => {
          const player = this.add.sprite(p.x, p.y, "player");
          player.setName(p.id);
          player.setScale(3);
          player.setOrigin(0.5, 0.5);
        });
      },
      update: function () {
        gameState.players.forEach((p) => {
          const player = this.children.getByName(p.id);
          if (player instanceof Phaser.GameObjects.Sprite) {
            player.setPosition(p.x, p.y);
          } else if (player == null) {
            const newPlayer = this.add.sprite(p.x, p.y, "player");
            newPlayer.setName(p.id);
            newPlayer.setScale(3);
            newPlayer.setOrigin(0.5, 0.5);
          }
        });
        const playerIds = gameState.players.map((p) => p.id);
        // remove players that are no longer in the game
        this.children.each((child) => {
          if (
            child instanceof Phaser.GameObjects.Sprite &&
            !playerIds.includes(child.name)
          ) {
            child.destroy();
          }
        });
      },
    };
    this.game = new Phaser.Game({
      canvas: canvas,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      type: Phaser.CANVAS,
      roundPixels: false,
      pixelArt: true,
      scene: sceneConfig,
    });
  }
  removePlayer(id: string) {
    const player = this.game.scene.scenes[0].children.getByName(id);
    if (player instanceof Phaser.GameObjects.Sprite) {
      player.destroy();
    }
  }

  getInputState() {
    const up = pressedKeys[38] || pressedKeys[87];
    const down = pressedKeys[40] || pressedKeys[83];
    const left = pressedKeys[37] || pressedKeys[65];
    const right = pressedKeys[39] || pressedKeys[68];
    return { up, down, left, right };
  }
}
