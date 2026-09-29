import { SERVER_UPDATE_RATE } from "../common/constants";
import { auraRadius, spellDB } from "../common/data";
import type EventSystem from "../common/EventSystem";
import type {
  ClientGameState,
  Enemy,
  PickUp,
  Player,
  Position,
  Projectile,
  StaticObject,
} from "../common/types";

function updateSpellEmitters(
  p: Player,
  instantiated: Phaser.GameObjects.GameObject,
) {
  const emitter = instantiated.getData(
    "auraEmitter",
  ) as Phaser.GameObjects.Particles.ParticleEmitter;

  if (!emitter) return;

  const aura = instantiated.getData("aura") as Phaser.GameObjects.Graphics;
  const radius = p.spells.damageAura
    ? auraRadius(spellDB.damageAura, p.level, p.powerUps.damageAura)
    : 0;
  if (instantiated.getData("auraRadius") === radius) return;

  aura.clear().setVisible(radius > 0);
  emitter.stop().killAll();
  if (radius > 0) {
    // The permanent disk, not individual decorative flames, marks damage range.
    aura.fillStyle(0xff5a12, 0.16).fillCircle(0, 0, radius);
    aura.lineStyle(4, 0xff4a0a, 0.5).strokeCircle(0, 0, radius - 2);
    aura.lineStyle(1, 0xffcc55, 0.95).strokeCircle(0, 0, radius - 0.5);
    const area = new Phaser.Geom.Circle(0, 0, radius);
    emitter.setEmitZone({
      source: {
        getRandomPoint: (point) => Object.assign(point, area.getRandomPoint()),
      },
      type: "random",
    });
    emitter.setDeathZone({ source: area, type: "onLeave" });
    emitter.start();
    emitter.emitParticle(32);
  }
  instantiated.setData("auraRadius", radius);
}

export function instantiatePlayer(
  scene: Phaser.Scene,
  player: Player,
): Phaser.GameObjects.GameObject {
  const playerContainer = scene.add
    .container(player.x, player.y)
    .setName(player.id);
  const playerSprite = scene.add.sprite(0, 0, "player").setOrigin(0.5, 0.5);
  playerContainer.add(playerSprite);
  const playerText = scene.add
    .text(0, -20, player.screenName, {
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      color: "#f5efdf",
      stroke: "#13101e",
      strokeThickness: 2,
    })
    .setOrigin(0.5, 0.5)
    .setShadow(0, 1, "#13101e", 1, true, true);
  playerContainer.add(playerText);
  playerContainer.setData("text", playerText);
  playerContainer.setData("type", "player");
  const aura = scene.add.graphics();
  if (!scene.textures.exists("aura-flame")) {
    const flame = scene.add.graphics();
    flame.fillStyle(0xff5511).fillTriangle(0, 12, 3, 0, 8, 12);
    flame.fillStyle(0xffbb33).fillTriangle(2, 12, 5, 4, 7, 12);
    flame.fillStyle(0xffee99).fillTriangle(3, 12, 4, 7, 5, 12);
    flame.generateTexture("aura-flame", 8, 12);
    flame.destroy();
  }
  const flames = scene.add.particles("aura-flame");
  // Local-space particles move with the damage area, never leaving a false trail.
  playerContainer.add([aura, flames]);
  const emitter = flames.createEmitter({
    on: false,
    blendMode: "ADD",
    lifespan: { min: 250, max: 550 },
    frequency: 30,
    quantity: 4,
    speedX: { min: -4, max: 4 },
    speedY: { min: -18, max: -8 },
    alpha: { start: 0.85, end: 0 },
    scale: { start: 0.65, end: 0 },
    reserve: 100,
  });
  playerContainer.setData("aura", aura);
  playerContainer.setData("auraEmitter", emitter);
  updateSpellEmitters(player, playerContainer);
  return playerContainer;
}

export function updatePlayer(
  player: Phaser.GameObjects.GameObject,
  serverPlayer: Player,
) {
  const scene = player.scene;
  const container = player as Phaser.GameObjects.Container;
  const sprite = container.getAt(0) as Phaser.GameObjects.Sprite;
  // Ignore sub-pixel tween settling so idle players don't keep walking.
  if (
    Math.hypot(serverPlayer.x - container.x, serverPlayer.y - container.y) > 0.1
  ) {
    sprite.play({ key: "player", repeat: -1, frameRate: 8 }, true);
  } else {
    sprite.stop().setFrame(0);
  }
  scene.add.tween({
    targets: player,
    x: serverPlayer.x,
    y: serverPlayer.y,
    duration: SERVER_UPDATE_RATE,
    ease: "Power1",
  });
  updateSpellEmitters(serverPlayer, player);
}

export function destroyPlayer(player: Phaser.GameObjects.GameObject) {
  player.getData("bar")?.destroy();
  player.destroy();
}

function getPixelParticle(scene: Phaser.Scene) {
  let pixelParticle = scene.children.getByName(
    whitePixelObjectName,
  ) as Phaser.GameObjects.Particles.ParticleEmitterManager;
  if (!pixelParticle) {
    pixelParticle = scene.add
      .particles("white-pixel")
      .setName(whitePixelObjectName);
  }
  return pixelParticle;
}

export function instantiateEnemy(
  scene: Phaser.Scene,
  enemy: Enemy,
): Phaser.GameObjects.GameObject {
  const pixelParticle = getPixelParticle(scene);
  const emitter = pixelParticle.createEmitter({
    blendMode: "ADD",
    lifespan: 2000,
    speed: { min: 100, max: 200 },
    alpha: { start: 1, end: 0 },
    scale: { min: 1, max: 3 },
    tint: 0xff0000,
    gravityY: 1,
    reserve: 100,
  });
  emitter.stop();

  const newEnemy = scene.add.sprite(enemy.x, enemy.y, enemy.type);
  newEnemy.play({ key: enemy.type, repeat: -1 });
  newEnemy.setData("type", "enemy");
  newEnemy.setName(enemy.id);
  newEnemy.setOrigin(0.5, 0.5);

  newEnemy.addListener("takeDamage", (amount: number) => {
    emitter.explode(Math.min(amount, 100), newEnemy.x, newEnemy.y);
  });
  return newEnemy;
}

export function instantiatePickUp(
  scene: Phaser.Scene,
  pickUp: PickUp,
): Phaser.GameObjects.GameObject {
  const pixelParticle = getPixelParticle(scene);
  const emitter = pixelParticle.createEmitter({
    blendMode: "ADD",
    lifespan: 200,
    speed: { min: 100, max: 200 },
    alpha: { start: 1, end: 0 },
    scale: { start: 3, end: 0 },
    tint: 0x00ccff,
    reserve: 20,
  });
  emitter.stop();
  const newPickUp = scene.add.sprite(pickUp.x, pickUp.y, pickUp.visual);
  newPickUp.setData("type", "pickup");
  newPickUp.setName(pickUp.id);
  newPickUp.setScale(0.5);
  newPickUp.setOrigin(0.5, 0.5);
  newPickUp.on("destroy", () => {
    emitter.explode(20, pickUp.x, pickUp.y);
    emitter.stop();
  });
  return newPickUp;
}

export function updateProjectile(
  projectile: Phaser.GameObjects.Sprite,
  serverProjectile: Projectile,
) {
  projectile.setPosition(serverProjectile.x, serverProjectile.y);
}

const particleObjectName = "projectileParticles";
const whitePixelObjectName = "whitePixel";

const colorMap: { [key: string]: number } = {
  fire: 0xff0000,
  cold: 0x0000ff,
  poison: 0x00ff00,
  physical: 0xffffff,
};

export function instantiateProjectile(
  scene: Phaser.Scene,
  projectile: Projectile,
): Phaser.GameObjects.Container {
  const tint = colorMap[projectile.damageType] || 0xffffff;
  const newProjectile = scene.add
    .sprite(0, 0, "projectile")
    .setOrigin(0.5, 0.5)
    .setTint(tint);
  let particles = scene.children.getByName(
    particleObjectName,
  ) as Phaser.GameObjects.Particles.ParticleEmitterManager;
  if (particles == null) {
    particles = scene.add.particles("projectile").setName(particleObjectName);
  }
  const projectileContainer = scene.add
    .container(projectile.x, projectile.y)
    .setName(projectile.id);
  const emitter = particles.createEmitter({
    speed: [10, 20],
    scale: { start: 1, end: 0 },
    blendMode: "ADD",
    follow: projectileContainer,
    tint: tint,
    reserve: 100,
  });
  projectileContainer.add(newProjectile);
  projectileContainer.setData("type", "projectile");
  projectileContainer.on("destroy", () => {
    emitter.setSpeed({ min: 50, max: 150 });
    emitter.explode(50, projectileContainer.x, projectileContainer.y);
  });

  return projectileContainer;
}

export function simpleDestroy(gameObject: Phaser.GameObjects.GameObject) {
  gameObject.destroy();
}

export function instantiateStaticObject(
  scene: Phaser.Scene,
  staticObject: StaticObject,
) {
  const newStaticObject = scene.add.sprite(
    staticObject.x,
    staticObject.y,
    staticObject.type,
  );
  newStaticObject.setDepth(-1);
  newStaticObject.setName(staticObject.id);
  newStaticObject.setOrigin(0.5, 0.5);
  newStaticObject.setData("type", "staticObject");
  return newStaticObject;
}

export function simpleUpdate(
  gameObject: Phaser.GameObjects.GameObject,
  obj: Position,
) {
  const scene = gameObject.scene;
  scene.add.tween({
    targets: gameObject,
    x: obj.x,
    y: obj.y,
    duration: SERVER_UPDATE_RATE,
    ease: "Power1",
  });
}

export function updateGameObject<T extends Position>(
  scene: Phaser.Scene,
  id: string,
  obj: T,
  instantiateFn: (scene: Phaser.Scene, obj: T) => Phaser.GameObjects.GameObject,
  updateFn: (
    gameObject: Phaser.GameObjects.GameObject,
    obj: T,
  ) => void = simpleUpdate,
): Phaser.GameObjects.GameObject | null {
  const gameObject = scene.children.getByName(id);
  if (gameObject instanceof Phaser.GameObjects.GameObject) {
    updateFn(gameObject, obj);
    return gameObject;
  }
  if (gameObject == null) {
    return instantiateFn(scene, obj);
  }
  return null;
}

export function removeInvalidGameObjects(
  scene: Phaser.Scene,
  type: string,
  validIds: string[],
  destroyFn: (
    gameObject: Phaser.GameObjects.GameObject,
  ) => void = simpleDestroy,
) {
  scene.children.each((child) => {
    if (
      child instanceof Phaser.GameObjects.GameObject &&
      child.getData("type") === type &&
      !validIds.includes(child.name)
    ) {
      destroyFn(child);
    }
  });
}

export function updateMiddleWare(gameState: ClientGameState, mw: Middleware) {
  gameState.players.forEach((p) => {
    mw.updatePlayer(p);
  });

  const playerIds = gameState.players.map((p) => p.id);
  // remove players that are no longer in the game
  mw.removeInvalidGameObjects("player", playerIds);

  gameState.enemies.forEach((e) => mw.updateEnemy(e));
  const enemyIds = gameState.enemies.map((e) => e.id);
  mw.removeInvalidGameObjects("enemy", enemyIds);

  gameState.pickUps.forEach((g) => mw.updatePickUp(g));
  const pickUpIds = gameState.pickUps.map((g) => g.id);
  mw.removeInvalidGameObjects("pickup", pickUpIds);
  gameState.projectiles.forEach((p) => {
    mw.updateProjectile(p);
  });

  const projectileIds = gameState.projectiles.map((p) => p.id);
  mw.removeInvalidGameObjects("projectile", projectileIds);

  gameState.staticObjects.forEach((s) => {
    mw.updateStaticObject(s);
  });

  const staticObjectIds = gameState.staticObjects.map((s) => s.id);
  mw.removeInvalidGameObjects("staticObject", staticObjectIds);
}

export type FrontendGameScene = "lobby" | "match" | "upgrade" | "gameOver";

export interface GameFrontend {
  init(initialGameState: ClientGameState, serverEventSystem: EventSystem): void;

  update(gameState: ClientGameState): void;

  setScene(scene: FrontendGameScene): void;
}

export interface Middleware {
  flashWhite(id: string): void;

  showDamage(amount: number, position: Position, color: string): void;

  showDamageToTarget(targetId: string, amount: number, color: string): void;

  instantiatePlayer(player: Player): void;

  updatePlayer(player: Player): void;

  updatePlayerLevel(player: Player): void;

  destroyPlayer(playerId: string): void;

  instantiateEnemy(enemy: Enemy): void;

  updateEnemy(enemy: Enemy): void;

  instantiatePickUp(pickUp: PickUp): void;

  updatePickUp(pickUp: PickUp): void;

  instantiateProjectile(projectile: Projectile): void;

  updateProjectile(projectile: Projectile): void;

  instantiateStaticObject(staticObject: StaticObject): void;

  updateStaticObject(staticObject: StaticObject): void;

  removeInvalidGameObjects(type: string, validIds: string[]): void;
}
