import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  INVLUNERABILITY_FRAMES,
  SERVER_UPDATE_RATE,
} from "../common/constants";
import { chooseRandom } from "../common/random";
import { experienceRequiredForLevel } from "../common/shared";
import { GameState, Player, Position } from "../common/types";
import Bar from "./Bar";
import {
  instantiateEnemy,
  instantiateGem,
  instantiatePlayer,
  updateEnemy,
  updateGem,
  updatePlayer,
} from "./middleware";
import { assets } from "./assets";
import EventSystem from "../common/EventSystem";
import { globalEventSystem } from "./eventSystems";
const colorFromDamageType = (damageType: string) => {
  switch (damageType) {
    case "fire":
      return "red";
    case "cold":
      return "blue";
    case "poison":
      return "green";
    case "physical":
      return "white";
    default:
      return "white";
  }
};

let pressedKeys = {};
window.onkeyup = function (e: { keyCode: string | number }) {
  pressedKeys[e.keyCode] = false;
};
window.onkeydown = function (e: { keyCode: string | number }) {
  pressedKeys[e.keyCode] = true;
};

export default class Game {
  phaserInstance: Phaser.Game;
  experienceBar: Bar;
  gameState: GameState;

  constructor(canvas: HTMLCanvasElement, serverEventSystem: EventSystem) {
    let gameRef = this;
    this.gameState = {
      players: [],
      enemies: [],
      gems: [],
      projectiles: [],
      id: "",
    };
    const sceneConfig: Phaser.Types.Scenes.CreateSceneFromObjectConfig = {
      preload: function () {
        assets.forEach(({ id, url }) => {
          this.load.image(id, url);
        });
      },
      create: function () {
        this.add.tileSprite(
          0,
          0,
          GAME_WIDTH * 2,
          GAME_HEIGHT * 2,
          "background"
        );
        gameRef.experienceBar = new Bar(this, {
          position: { x: 10, y: 10 },
          width: GAME_WIDTH - 20,
          height: 20,
          colorHex: 0x0000ff,
          value: 0,
          maxValue: experienceRequiredForLevel(2),
        });

        gameRef.gameState.players.forEach((p) => {
          instantiatePlayer(this, p);
        });
      },
      update: function () {
        gameRef.gameState.players.forEach((p) => {
          const player = this.children.getByName(p.id);
          if (p.id === gameRef.gameState.id) {
            gameRef.experienceBar.setValue(
              p.experience - experienceRequiredForLevel(p.level)
            );
          }
          if (player instanceof Phaser.GameObjects.Sprite) {
            updatePlayer(player, p);
          } else if (player == null && p.alive) {
            instantiatePlayer(this, p);
          }
        });
        const playerIds = gameRef.gameState.players.map((p) => p.id);
        // remove players that are no longer in the game
        this.children.each((child) => {
          if (
            child instanceof Phaser.GameObjects.Sprite &&
            !playerIds.includes(child.name)
          ) {
            child.getData("bar")?.destroy();
            child.destroy();
          }
        });
        gameRef.gameState.enemies.forEach((e) => {
          const enemy = this.children.getByName(e.id);
          if (enemy instanceof Phaser.GameObjects.Sprite) {
            updateEnemy(enemy, e);
            enemy.setPosition(e.x, e.y);
          } else if (enemy == null) {
            instantiateEnemy(this, e);
          }
        });
        gameRef.gameState.gems.forEach((g) => {
          const gem = this.children.getByName(g.id);
          if (gem instanceof Phaser.GameObjects.Sprite) {
            updateGem(gem, g);
          } else if (gem == null) {
            instantiateGem(this, g);
          }
        });
        // remove gems that are no longer in the game
        const gemIds = gameRef.gameState.gems.map((g) => g.id);
        this.children.each((child) => {
          if (
            child instanceof Phaser.GameObjects.Sprite &&
            child.texture.key === "diamond" &&
            !gemIds.includes(child.name)
          ) {
            child.destroy();
          }
        });
        gameRef.gameState.projectiles.forEach((p) => {
          const projectile = this.children.getByName(p.id);
          if (projectile instanceof Phaser.GameObjects.Sprite) {
            projectile.setPosition(p.x, p.y);
          } else if (projectile == null) {
            this.add
              .sprite(p.x, p.y, "projectile")
              .setName(p.id)
              .setScale(2)
              .setDepth(1);
          }
        });
        // remove projectiles that are no longer in the game
        const projectileIds = gameRef.gameState.projectiles.map((p) => p.id);
        this.children.each((child) => {
          if (
            child instanceof Phaser.GameObjects.Sprite &&
            child.texture.key === "projectile" &&
            !projectileIds.includes(child.name)
          ) {
            child.destroy();
          }
        });
      },
    };
    this.phaserInstance = new Phaser.Game({
      canvas: canvas,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      type: Phaser.WEBGL,
      roundPixels: false,
      pixelArt: true,
      scene: sceneConfig,
      backgroundColor: "#170332",
    });

    let inputInterval: NodeJS.Timeout | null = null;
    serverEventSystem.addEventListener("begin", (newGameState: GameState) => {
      this.gameState = newGameState;
      inputInterval = setInterval(() => {
        const inputState = this.getInputState();
        serverEventSystem.dispatchEvent("move", {
          ...inputState,
          id: this.gameState.id,
        });
      }, SERVER_UPDATE_RATE);
    });
    serverEventSystem.addEventListener("damage", ({ amount, damageType }) => {
      const player = this.gameState.players.find(
        (p) => p.id === this.gameState.id
      );
      const color = colorFromDamageType(damageType);
      this.showDamage(amount, player, color);
      this.flashWhite(player.id);
    });
    serverEventSystem.addEventListener("spell", (data) => {
      const color = colorFromDamageType(data.damageType);
      this.showDamageToTarget(data.targetId, data.damage, color);
      this.flashWhite(data.targetId);
    });

    serverEventSystem.addEventListener("level", (data) => {
      if (data.playerId !== this.gameState.id) return;
      globalEventSystem.dispatchEvent("level", data.player.level);
      this.updateLevel(data.player);
    });

    serverEventSystem.addEventListener("update", (newState: GameState) => {
      if (newState.id !== this.gameState.id) return;
      this.gameState.players = newState.players;
      this.gameState.enemies = newState.enemies;
      this.gameState.gems = newState.gems;
      this.gameState.projectiles = newState.projectiles;
    });
    serverEventSystem.addEventListener("disconnect", () => {
      if (inputInterval) {
        clearInterval(inputInterval);
      }
    });
  }

  private currentScene() {
    return this.phaserInstance.scene.scenes[0];
  }

  getInputState() {
    const up = pressedKeys[38] || pressedKeys[87];
    const down = pressedKeys[40] || pressedKeys[83];
    const left = pressedKeys[37] || pressedKeys[65];
    const right = pressedKeys[39] || pressedKeys[68];
    return { up, down, left, right };
  }

  getActivePlayer() {
    return this.currentScene().children.getByName(this.gameState.id);
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
      this.showDamage(amount, target, color);
    }
  }

  showDamage(amount: number, position: Position, color: string = "red") {
    const scene = this.currentScene();
    if (scene == null) {
      return;
    }
    const text = scene.add.text(position.x, position.y, `${amount}`, {
      color: color,
      font: "bold 24px Arial",
      stroke: "#000000",
      strokeThickness: 2,
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(2, 2, "#333333", 2, true, true);
    scene.tweens.add({
      targets: text,
      y: position.y - chooseRandom([20, 50, 75]),
      x: position.x + chooseRandom([-10, 0, 10]),
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
