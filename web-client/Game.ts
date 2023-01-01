import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  INVLUNERABILITY_FRAMES,
} from "../common/constants";
import { chooseRandom } from "../common/random";
import { experienceRequiredForLevel } from "../common/shared";
import { GameState, Player } from "../common/types";
import Bar from "./Bar";
import {
  instantiateEnemy,
  instantiateGem,
  instantiatePlayer,
  updateEnemy,
  updateGem,
  updatePlayer,
} from "./middleware";
const playerAsset = new URL("assets/jyrki.png", import.meta.url);
const batAsset = new URL("assets/bat.png", import.meta.url);
const zombieAsset = new URL("assets/zombie.png", import.meta.url);
const skeletonAsset = new URL("assets/skull.png", import.meta.url);
const tombstoneAsset = new URL("assets/tombstone.png", import.meta.url);
const diamondAsset = new URL("assets/diamond.png", import.meta.url);
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
  { id: "tombstone", url: tombstoneAsset.href },
  { id: "diamond", url: diamondAsset.href },
];

let pressedKeys = {};
window.onkeyup = function (e: { keyCode: string | number }) {
  pressedKeys[e.keyCode] = false;
};
window.onkeydown = function (e: { keyCode: string | number }) {
  pressedKeys[e.keyCode] = true;
};

export default class Game {
  game: Phaser.Game;
  playerId: string;
  experienceBar: Bar;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.playerId = gameState.id;
    let gameRef = this;

    const sceneConfig: Phaser.Types.Scenes.CreateSceneFromObjectConfig = {
      preload: function () {
        gameRef.experienceBar = new Bar(this, {
          position: { x: 10, y: 10 },
          width: 200,
          height: 20,
          colorHex: 0x0000ff,
          value: 0,
          maxValue: experienceRequiredForLevel(2),
        });
        assets.forEach(({ id, url }) => {
          this.load.image(id, url);
        });
      },
      create: function () {
        gameState.players.forEach((p) => {
          instantiatePlayer(this, p);
        });
      },
      update: function () {
        gameState.players.forEach((p) => {
          const player = this.children.getByName(p.id);
          if (p.id === gameRef.playerId) {
            gameRef.experienceBar.setValue(
              p.experience - experienceRequiredForLevel(p.level)
            );
          }
          if (player instanceof Phaser.GameObjects.Sprite) {
            updatePlayer(player, p);
          } else if (player == null) {
            instantiatePlayer(this, p);
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
            updateEnemy(enemy, e);
            enemy.setPosition(e.x, e.y);
          } else if (enemy == null) {
            instantiateEnemy(this, e);
          }
        });
        gameState.gems.forEach((g) => {
          const gem = this.children.getByName(g.id);
          if (gem instanceof Phaser.GameObjects.Sprite) {
            updateGem(gem, g);
          } else if (gem == null) {
            instantiateGem(this, g);
          }
        });
        // remove gems that are no longer in the game
        const gemIds = gameState.gems.map((g) => g.id);
        this.children.each((child) => {
          if (
            child instanceof Phaser.GameObjects.Sprite &&
            child.texture.key === "diamond" &&
            !gemIds.includes(child.name)
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

  updateLevel(serverPlayer: Player) {
    const player = this.getActivePlayer();
    player.getData("bar").setUpperBound(serverPlayer.maxHp);
    player.getData("bar").setValue(serverPlayer.hp);
    this.experienceBar.setUpperBound(
      experienceRequiredForLevel(serverPlayer.level + 1) -
        experienceRequiredForLevel(serverPlayer.level)
    );
  }

  showDamageToTarget(targetId: string, amount: number, color: string = "red") {
    const scene = this.currentScene();
    if (scene == null) {
      return;
    }
    const target = this.currentScene().children.getByName(targetId);
    if (target instanceof Phaser.GameObjects.Sprite) {
      this.showDamage(amount, target.x, target.y, color);
    }
  }
  showDamage(amount: number, x: number, y: number, color: string = "red") {
    const scene = this.currentScene();
    if (scene == null) {
      return;
    }
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
    const scene = this.currentScene();
    if (scene == null) {
      return;
    }
    const target = scene.children.getByName(id);
    if (target instanceof Phaser.GameObjects.Sprite) {
      target.setTintFill(0xffffff);
      scene.tweens.add({
        targets: target,
        alpha: 0,
        duration: INVLUNERABILITY_FRAMES,
        ease: "Linear",
        onComplete: () => {
          target.clearTint();
          target.setAlpha(1);
        },
      });
    }
  }
}
