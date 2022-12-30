import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  INVLUNERABILITY_FRAMES,
} from "../common/constants";
import { chooseRandom } from "../common/random";
import { GameState } from "../common/types";
const playerAsset = new URL("assets/jyrki.png", import.meta.url);
const batAsset = new URL("assets/bat.png", import.meta.url);
const zombieAsset = new URL("assets/zombie.png", import.meta.url);
const skeletonAsset = new URL("assets/skull.png", import.meta.url);
const assets = [
  {
    id: "player",
    url: playerAsset.href,
  },
  {
    id: "bat",
    url: batAsset.href,
  },
  { id: "zombie", url: zombieAsset.href },
  { id: "skeleton", url: skeletonAsset.href },
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
  playerId: string;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.playerId = gameState.id;
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
        gameState.enemies.forEach((e) => {
          const enemy = this.children.getByName(e.id);
          if (enemy instanceof Phaser.GameObjects.Sprite) {
            enemy.setPosition(e.x, e.y);
          } else if (enemy == null) {
            const newEnemy = this.add.sprite(e.x, e.y, e.type);
            newEnemy.setName(e.id);
            newEnemy.setOrigin(0.5, 0.5);
          }
        });
      },
    };
    this.game = new Phaser.Game({
      canvas: canvas,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      type: Phaser.WEBGL,
      roundPixels: false,
      pixelArt: true,
      scene: sceneConfig,
      backgroundColor: "#170332",
    });
  }
  private currentScene() {
    return this.game.scene.scenes[0];
  }
  removePlayer(id: string) {
    const player = this.currentScene().children.getByName(id);
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

  getActivePlayer() {
    return this.currentScene().children.getByName(this.playerId);
  }

  showDamage(amount: number, x: number, y: number, color: string = "red") {
    const scene = this.currentScene();
    const text = scene.add.text(x, y, `${amount}`, {
      color: color,
      font: "bold 24px Arial",
      stroke: "#000000",
      strokeThickness: 2,
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(2, 2, "#333333", 2, true, true);
    scene.tweens.add({
      targets: text,
      y: y - chooseRandom([20, 50, 75]),
      x: x + chooseRandom([-10, 0, 10]),
      alpha: 0,
      duration: 1000,
      ease: "Power1",
      onComplete: () => {
        text.destroy();
      },
    });
  }

  flashWhite(id: string) {
    const player = this.currentScene().children.getByName(id);
    if (player instanceof Phaser.GameObjects.Sprite) {
      player.setTintFill(0xffffff);
      this.currentScene().tweens.add({
        targets: player,
        alpha: 0,
        duration: INVLUNERABILITY_FRAMES,
        ease: "Linear",
        onComplete: () => {
          player.clearTint();
          player.setAlpha(1);
        },
      });
    }
  }
}
