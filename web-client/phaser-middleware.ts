import Phaser from "phaser";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  INVULNERABILITY_SECONDS,
  NUMBER_SCALE,
} from "../common/constants";
import EventSystem from "../common/EventSystem";
import { chooseRandom } from "../common/random";
import { experienceRequiredForLevel } from "../common/shared";
import {
  Enemy,
  GameState,
  Gem,
  Player,
  Position,
  Projectile,
  StaticObject,
} from "../common/types";
import { LevelEvent, SpellDamageEvent } from "../server/game-logic";
import { assets } from "./assets";
import Bar from "./Bar";
import { globalEventSystem } from "./eventSystems";
import {
  instantiatePlayer,
  removeInvalidGameObjects,
  destroyPlayer,
  updateGameObject,
  instantiateEnemy,
  instantiateGem,
  instantiateProjectile,
  instantiateStaticObject,
  GameFrontend,
  Middleware,
  updatePlayer,
  updateMiddleWare,
} from "./middleware";

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

export class UiScene extends Phaser.Scene {
  experienceBar: Bar;
  eventSystem: EventSystem;
  gameStateFn: () => GameState;
  constructor(gameStateFn: () => GameState, eventSystem: EventSystem) {
    super({ key: "UI", active: false });
    this.gameStateFn = gameStateFn;
    this.eventSystem = eventSystem;
  }
  create() {
    this.experienceBar = new Bar(this, {
      position: { x: 10, y: 10 },
      width: SCREEN_WIDTH - 20,
      height: 20,
      colorHex: 0x0000ff,
      value: 0,
      maxValue: experienceRequiredForLevel(2),
    });
    this.eventSystem.addEventListener("level", ({ playerId, player }) => {
      const gameState = this.gameStateFn();
      if (playerId !== gameState.id) {
        return;
      }
      this.experienceBar.setUpperBound(
        experienceRequiredForLevel(player.level + 1) -
          experienceRequiredForLevel(player.level)
      );
    });
  }

  update() {
    const gameState = this.gameStateFn();
    gameState.players.forEach((p) => {
      if (p.id === gameState.id) {
        this.experienceBar.setValue(
          p.experience - experienceRequiredForLevel(p.level)
        );
      }
    });
  }
}

export class GameScene extends Phaser.Scene implements Middleware {
  gameStateFn: () => GameState;
  serverEventSystem: EventSystem;
  gameObjectCache: { [key: string]: Phaser.GameObjects.GameObject } = {};
  constructor(gameStateFn: () => GameState, serverEventSystem: EventSystem) {
    super({ key: "Game", active: true });
    this.gameStateFn = gameStateFn;
    this.serverEventSystem = serverEventSystem;
  }
  updateEnemy(enemy: Enemy): void {
    updateGameObject(this, enemy.id, enemy, instantiateEnemy);
  }
  updateGem(gem: Gem): void {
    updateGameObject(this, gem.id, gem, instantiateGem);
  }
  updateStaticObject(staticObject: StaticObject): void {
    updateGameObject(
      this,
      staticObject.id,
      staticObject,
      instantiateStaticObject
    );
  }
  updatePlayerLevel(player: Player): void {
    this.updateLevel(player);
  }
  instantiatePlayer(player: Player): void {
    instantiatePlayer(this, player);
  }
  updatePlayer(player: Player): void {
    updateGameObject(this, player.id, player, instantiatePlayer, updatePlayer);
  }
  destroyPlayer(playerId: string): void {
    const player = this.children.getByName(playerId);
    if (player instanceof Phaser.GameObjects.Sprite) {
      destroyPlayer(player);
    }
  }
  instantiateEnemy(enemy: Enemy): void {
    instantiateEnemy(this, enemy);
  }
  instantiateGem(gem: Gem): void {
    instantiateGem(this, gem);
  }
  instantiateProjectile(projectile: Projectile): void {
    instantiateProjectile(this, projectile);
  }
  updateProjectile(projectile: Projectile): void {
    updateGameObject(this, projectile.id, projectile, instantiateProjectile);
  }
  instantiateStaticObject(staticObject: StaticObject): void {
    updateGameObject(
      this,
      staticObject.id,
      staticObject,
      instantiateStaticObject
    );
  }
  removeInvalidGameObjects(type: string, validIds: string[]): void {
    if (type === "player") {
      removeInvalidGameObjects(this, type, validIds, destroyPlayer);
    }
    removeInvalidGameObjects(this, type, validIds);
  }

  preload() {
    assets.forEach(({ id, url }) => {
      this.load.image(id, url);
    });
  }
  launchUi() {
    if (!this.scene.isActive("UI")) {
      this.scene.launch("UI");
    }
  }

  create() {
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setZoom(2);
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const background = this.add
      .tileSprite(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        "background"
      )
      .setName("background");
    this.gameObjectCache["background"] = background;
    const gameState = this.gameStateFn();

    gameState.players.forEach((p) => {
      const instantiated = instantiatePlayer(this, p);
      if (p.id === gameState.id) {
        this.cameras.main.startFollow(instantiated);
        this.launchUi();
      }
    });
    this.serverEventSystem.addEventListener(
      "damage",
      ({ amount, damageType }) => {
        const gameState = this.gameStateFn();
        const player = gameState.players.find((p) => p.id === gameState.id);
        if (!player) return;
        const color = colorFromDamageType(damageType);
        this.showDamage(amount, player, color);
        this.flashWhite(player.id);
        this.cameras.main.flash(150, 255, 255, 255);
        this.cameras.main.shake(150, 0.01);
      }
    );
    this.serverEventSystem.addEventListener(
      "spell",
      (data: SpellDamageEvent) => {
        const color = colorFromDamageType(data.damageType);
        this.spellEffect(data.spellId);
        this.showDamageToTarget(data.targetId, data.damage, color);
        this.flashWhite(data.targetId);
      }
    );
    this.serverEventSystem.addEventListener("level", (data: LevelEvent) => {
      const gameState = this.gameStateFn();
      if (data.playerId !== gameState.id) return;
      globalEventSystem.dispatchEvent("level", data.player.level);
      this.updateLevel(data.player);
    });
    this.serverEventSystem.addEventListener(
      "joined",
      (newGameState: GameState) => {
        newGameState.players.forEach((p) => {
          if (p.id === newGameState.id) {
            const instantiated = instantiatePlayer(this, p);
            this.cameras.main.startFollow(instantiated, true);
            this.launchUi();
            this.gameObjectCache[p.id] = instantiated;
          }
        });
      }
    );
  }

  update() {
    const gameState = this.gameStateFn();
    updateMiddleWare(gameState, this);
    const background = this.gameObjectCache["background"];
    const player = this.gameObjectCache[gameState.id];
    if (
      background instanceof Phaser.GameObjects.TileSprite &&
      player instanceof Phaser.GameObjects.Container
    ) {
      background.setPosition(player.x, player.y);
      background.tilePositionX = player.x;
      background.tilePositionY = player.y;
    }
    const debugRect = this.gameObjectCache["cullingRect"];
    if (debugRect instanceof Phaser.GameObjects.Rectangle) {
      const { x, y, width, height } = gameState.debug.cullingRect;
      debugRect.setPosition(x, y);
      debugRect.setSize(width, height);
    }
  }
  spellEffect(spellId: string) {
    if (spellId === "damageAura") {
    }
  }
  showDamageToTarget(targetId: string, amount: number, color: string = "red") {
    const target = this.children.getByName(targetId);
    if (target instanceof Phaser.GameObjects.Sprite) {
      this.showDamage(amount, target, color);
      target.emit("takeDamage", amount);
    }
  }
  showDamage(amount: number, position: Position, color: string = "red") {
    const text = this.add.text(
      position.x,
      position.y,
      `${(amount * NUMBER_SCALE).toLocaleString()}`,
      {
        color: color,
        font: "bold 24px Arial",
        stroke: "#000000",
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5, 0.5);
    this.tweens.add({
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
    const target = this.children.getByName(id);
    if (target instanceof Phaser.GameObjects.Sprite) {
      target.setTintFill(0xffffff);
      this.tweens.add({
        targets: target,
        alpha: 0,
        duration: INVULNERABILITY_SECONDS * 1000,
        ease: "Linear",
        onComplete: () => {
          target.clearTint();
          target.setAlpha(1);
        },
      });
    }
  }

  private getActivePlayer(): Phaser.GameObjects.GameObject {
    return this.children.getByName(this.gameStateFn().id);
  }

  updateLevel(serverPlayer: Player) {
    const player = this.getActivePlayer();
    player.getData("bar").setUpperBound(serverPlayer.maxHp);
    player.getData("bar").setValue(serverPlayer.hp);
  }
}

export default class PhaserMiddleware implements GameFrontend {
  phaserInstance: Phaser.Game;
  canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }
  init(gameStateFn: () => GameState, serverEventSystem: EventSystem): void {
    this.phaserInstance = new Phaser.Game({
      canvas: this.canvas,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      type: Phaser.WEBGL,
      roundPixels: false,
      pixelArt: true,
      scene: [
        new GameScene(gameStateFn, serverEventSystem),
        new UiScene(gameStateFn, serverEventSystem),
      ],
      backgroundColor: "#170332",
    });
  }
}
