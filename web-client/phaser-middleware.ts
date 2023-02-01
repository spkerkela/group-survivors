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
import { chooseRandom, randomBetweenExclusive } from "../common/random";
import { experienceRequiredForLevel } from "../common/shared";
import {
  Enemy,
  ClientGameState,
  PickUp,
  Player,
  Position,
  Projectile,
  StaticObject,
} from "../common/types";
import {
  DamageEvent,
  LevelEvent,
  SpellDamageEvent,
} from "../server/game-logic";
import { assets, sounds, spriteSheets } from "./assets";
import Bar from "./Bar";
import { globalEventSystem } from "./eventSystems";
import {
  instantiatePlayer,
  removeInvalidGameObjects,
  destroyPlayer,
  updateGameObject,
  instantiateEnemy,
  instantiatePickUp,
  instantiateProjectile,
  instantiateStaticObject,
  GameFrontend,
  Middleware,
  updatePlayer,
  updateMiddleWare,
  FrontendGameScene,
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

class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "Lobby", active: false });
  }
  create() {
    this.add.text(10, 10, "Lobby");
  }
  update() {}
}

class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOver", active: false });
  }
  create() {
    this.add.text(10, 10, "Game Over");
  }
  update() {}
}

export class UiScene extends Phaser.Scene {
  experienceBar: Bar;
  eventSystem: EventSystem;
  constructor(eventSystem: EventSystem) {
    super({ key: "UI", active: false });
    this.eventSystem = eventSystem;
  }
  init(data: { gameState: ClientGameState }) {
    this.data.set("gameState", data.gameState);
  }
  create(data: { gameState: ClientGameState }) {
    this.data.set("gameState", data.gameState);
    this.experienceBar = new Bar(this, {
      position: { x: 10, y: 10 },
      width: SCREEN_WIDTH - 20,
      height: 20,
      colorHex: 0x0000ff,
      value: 0,
      maxValue: experienceRequiredForLevel(2),
    });
    const levelCallback: (data: LevelEvent) => void = ({
      playerId,
      player,
    }) => {
      const gameState = this.data.get("gameState");
      if (playerId !== gameState.id) {
        return;
      }
      this.experienceBar.setUpperBound(
        experienceRequiredForLevel(player.level + 1) -
          experienceRequiredForLevel(player.level)
      );
    };
    this.eventSystem.addEventListener("level", levelCallback);
    this.events.on("destroy", () => {
      this.eventSystem.removeEventListener("level", levelCallback);
    });
    this.events.on("shutdown", () => {
      this.eventSystem.removeEventListener("level", levelCallback);
    });

    this.add
      .text(10, SCREEN_HEIGHT - 20, "Gold: 0", {
        fontSize: "20px",
        color: "yellow",
        fontStyle: "bold",
      })
      .setName("gold");
  }

  update() {
    const gameState = this.data.get("gameState");
    gameState.players.forEach((p) => {
      if (p.id === gameState.id) {
        const text = this.children.getByName("gold") as Phaser.GameObjects.Text;
        text.setText(`Gold: ${(p.gold * NUMBER_SCALE).toLocaleString()}`);
        this.experienceBar.setValue(
          p.experience - experienceRequiredForLevel(p.level)
        );
      }
    });
  }
}

export class GameScene extends Phaser.Scene implements Middleware {
  serverEventSystem: EventSystem;
  inputKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  constructor(serverEventSystem: EventSystem) {
    super({ key: "Game", active: false });
    this.serverEventSystem = serverEventSystem;
  }
  restartGame(data: { gameState: ClientGameState }) {
    this.scene.restart(data);
  }
  updateEnemy(enemy: Enemy): void {
    updateGameObject(this, enemy.id, enemy, instantiateEnemy);
  }
  updatePickUp(gem: PickUp): void {
    updateGameObject(this, gem.id, gem, instantiatePickUp);
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
  instantiatePickUp(gem: PickUp): void {
    instantiatePickUp(this, gem);
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
    spriteSheets.forEach(({ id, url, frameWidth = 16, frameHeight = 16 }) => {
      this.load.spritesheet(id, url, { frameWidth, frameHeight });
    });
    sounds.forEach(({ id, url }) => {
      this.load.audio(id, url);
    });
  }
  launchUi() {
    if (!this.scene.isActive("UI")) {
      this.scene.launch("UI", {
        gameState: this.data.get("gameState") as ClientGameState,
      });
    }
  }

  setupCamera() {
    if (this.data.get("cameraSet")) {
      return;
    }
    try {
      this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
      this.cameras.main.setZoom(3);
      this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      this.data.set("cameraSet", true);
    } catch (e) {
      console.error(e);
    }
  }

  create(data: { gameState: ClientGameState }) {
    this.data.set("gameState", data.gameState);
    this.data.set("cameraSet", false);
    if (this.cameras.main != null) {
      this.setupCamera();
      this.cameras.main.fadeFrom(900, 0, 0, 0);
    }
    spriteSheets.forEach(({ id }) => {
      this.anims.create({
        key: id,
        frames: this.anims.generateFrameNumbers(id, {
          start: 0,
          end: 1,
        }),
        frameRate: 4,
      });
    });
    this.inputKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as { [key: string]: Phaser.Input.Keyboard.Key };

    const background = this.add
      .tileSprite(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        "background"
      )
      .setName("background");
    background.setDepth(-2);

    data.gameState.players.forEach((p) => {
      const instantiated = instantiatePlayer(this, p);
      if (p.id === data.gameState.id) {
        this.cameras.main.startFollow(instantiated);
      }
    });
    const damageCallback: (data: DamageEvent) => void = ({
      amount,
      damageType,
    }) => {
      const gameState = this.data.get("gameState") as ClientGameState;
      const player = gameState.players.find((p) => p.id === gameState.id);
      if (!player) return;
      const color = colorFromDamageType(damageType);
      this.showDamage(amount, player, color);
      this.flashWhite(player.id);
      this.cameras.main.flash(150, 255, 255, 255);
      this.cameras.main.shake(150, 0.01);
      this.sound.play("hit", {
        volume: 0.8,
        detune: randomBetweenExclusive(0, 1000),
      });
    };
    this.serverEventSystem.addEventListener("damage", damageCallback);

    const spellCallBack: (s: SpellDamageEvent) => void = (data) => {
      const color = colorFromDamageType(data.damageType);
      this.spellEffect(data.spellId);
      this.showDamageToTarget(data.targetId, data.damage, color);
      this.flashWhite(data.targetId);
      this.sound.play("hit", {
        volume: 0.5,
        detune: randomBetweenExclusive(0, 1000),
      });
    };
    this.serverEventSystem.addEventListener("spell", spellCallBack);
    const levelCallback: (e: LevelEvent) => void = (data) => {
      const gameState = this.data.get("gameState") as ClientGameState;
      if (data.playerId !== gameState.id) return;
      globalEventSystem.dispatchEvent("level", data.player.level);
      this.updateLevel(data.player);
    };
    const cleanup = () => {
      this.serverEventSystem.removeEventListener("level", levelCallback);
      this.serverEventSystem.removeEventListener("spell", spellCallBack);
      this.serverEventSystem.removeEventListener("damage", damageCallback);
      this.scene.stop("UI");
    };
    this.serverEventSystem.addEventListener("level", levelCallback);
    this.events.on("destroy", cleanup);
    this.events.on("shutdown", cleanup);
    this.sound.add("hit");
    this.launchUi();
  }

  update() {
    const gameState = this.data.get("gameState") as ClientGameState;
    const inputState = this.getInputState();
    this.serverEventSystem.dispatchEvent("move", {
      ...inputState,
      id: gameState.id,
    });
    updateMiddleWare(gameState, this);
    const background = this.children.getByName("background");
    const player = this.getActivePlayer();
    if (
      background instanceof Phaser.GameObjects.TileSprite &&
      player instanceof Phaser.GameObjects.Container
    ) {
      background.setPosition(player.x, player.y);
      background.tilePositionX = player.x;
      background.tilePositionY = player.y;
      this.setupCamera();
      this.cameras.main.startFollow(player);
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
    const amountWithScale = Math.round(amount * NUMBER_SCALE);
    const text = this.add.text(
      position.x,
      position.y,
      `${amountWithScale.toLocaleString()}`,
      {
        color: color,
        fontFamily: "Arial",
        fontStyle: "bold",
        fontSize: `${amountWithScale > 1_000_000 ? 12 : 16}px`,
        stroke: "#000000",
        strokeThickness: amountWithScale > 1_000_000 ? 2 : 3,
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
  getInputState() {
    const up = this.inputKeys.up.isDown;
    const down = this.inputKeys.down.isDown;
    const left = this.inputKeys.left.isDown;
    const right = this.inputKeys.right.isDown;
    return { up, down, left, right };
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
    return this.children.getByName(this.data.get("gameState").id);
  }

  updateLevel(serverPlayer: Player) {
    const player = this.getActivePlayer();
    player.getData("bar").setUpperBound(serverPlayer.maxHp);
    player.getData("bar").setValue(serverPlayer.hp);
  }
}

export default class PhaserMiddleware implements GameFrontend {
  phaserInstance: Phaser.Game;
  currentScene: Phaser.Scene;
  private gameState: ClientGameState;
  canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement, serverEventSystem: EventSystem) {
    this.canvas = canvas;
    this.phaserInstance = new Phaser.Game({
      canvas: this.canvas,
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      type: Phaser.WEBGL,
      roundPixels: false,
      pixelArt: true,
      scene: [
        new LobbyScene(),
        new GameScene(serverEventSystem),
        new UiScene(serverEventSystem),
        new GameOverScene(),
      ],
      backgroundColor: "#170332",
    });

    this.phaserInstance.scene.start("Lobby");
  }

  update(gameState: ClientGameState) {
    this.gameState = gameState;
    if (this.currentScene instanceof GameScene) {
      this.currentScene.data.set("gameState", gameState);
    }
    this.phaserInstance.scene.getScene("UI").data.set("gameState", gameState);
  }

  init(gameState: ClientGameState): void {
    this.gameState = gameState;
    this.currentScene = this.phaserInstance.scene.getScene("Lobby");
  }

  setScene(scene: FrontendGameScene, data?: ClientGameState): void {
    switch (scene) {
      case "lobby":
        this.currentScene.scene.start("Lobby");
        this.currentScene = this.phaserInstance.scene.getScene("Lobby");
        break;
      case "game":
        this.currentScene.scene.start("Game", { gameState: this.gameState });
        this.currentScene = this.phaserInstance.scene.getScene("Game");
        break;
      case "gameOver":
        this.currentScene.scene.start("GameOver");
        this.currentScene = this.phaserInstance.scene.getScene("GameOver");
        break;
      default:
        break;
    }
  }
}
