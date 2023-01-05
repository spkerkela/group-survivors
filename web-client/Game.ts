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
  destroyPlayer,
  instantiateEnemy,
  instantiateGem,
  instantiatePlayer,
  instantiateProjectile,
  instantiateStaticObject,
  removeInvalidGameObjects,
  updateEnemy,
  updateGameObject,
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
      staticObjects: [],
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
          if (p.id === gameRef.gameState.id) {
            gameRef.experienceBar.setValue(
              p.experience - experienceRequiredForLevel(p.level)
            );
          }
          updateGameObject(this, p.id, p, instantiatePlayer, updatePlayer);
        });
        const playerIds = gameRef.gameState.players.map((p) => p.id);
        // remove players that are no longer in the game
        removeInvalidGameObjects(this, "player", playerIds, destroyPlayer);

        gameRef.gameState.enemies.forEach((e) =>
          updateGameObject(this, e.id, e, instantiateEnemy)
        );
        const enemyIds = gameRef.gameState.enemies.map((e) => e.id);
        removeInvalidGameObjects(this, "enemy", enemyIds);

        gameRef.gameState.gems.forEach((g) =>
          updateGameObject(this, g.id, g, instantiateGem)
        );
        const gemIds = gameRef.gameState.gems.map((g) => g.id);
        removeInvalidGameObjects(this, "gem", gemIds);
        gameRef.gameState.projectiles.forEach((p) => {
          updateGameObject(this, p.id, p, instantiateProjectile);
        });

        const projectileIds = gameRef.gameState.projectiles.map((p) => p.id);
        removeInvalidGameObjects(this, "projectile", projectileIds);

        gameRef.gameState.staticObjects.forEach((s) => {
          updateGameObject(this, s.id, s, instantiateStaticObject);
        });

        const staticObjectIds = gameRef.gameState.staticObjects.map(
          (s) => s.id
        );
        removeInvalidGameObjects(this, "staticObject", staticObjectIds);
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
      if (!player) return;
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
      this.gameState.staticObjects = newState.staticObjects;
      const player = newState.players.find((p) => p.id === this.gameState.id);
      if (player == null || !player.alive) {
        globalEventSystem.dispatchEvent("enableJoinUI");
      }
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
