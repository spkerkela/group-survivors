import { SERVER_UPDATE_RATE } from "../common/constants";
import EventSystem from "../common/EventSystem";
import { randomBetweenExclusive } from "../common/random";
import {
  Enemy,
  GameState,
  Gem,
  Player,
  Position,
  Projectile,
  StaticObject,
} from "../common/types";
import Bar from "./Bar";

export function instantiatePlayer(
  scene: Phaser.Scene,
  player: Player
): Phaser.GameObjects.Sprite {
  const newPlayer = scene.add.sprite(player.x, player.y, "player");
  const playerText = scene.add
    .text(player.x, player.y - 32, player.screenName, {
      font: "12x Arial",
      stroke: "#000000",
      strokeThickness: 1,
    })
    .setOrigin(0.5, 0.5)
    .setShadow(2, 2, "#333333", 2, true, true);
  newPlayer.setData("text", playerText);
  newPlayer.setData("type", "player");
  newPlayer.setData(
    "bar",
    new Bar(scene, {
      value: player.hp,
      maxValue: player.hp,
      width: 32,
      height: 4,
      position: { x: player.x, y: player.y + 16 },
      offset: { x: -16, y: 0 },
      colorHex: 0xff0000,
    })
  );
  newPlayer.setName(player.id);
  newPlayer.setOrigin(0.5, 0.5);
  newPlayer.on(
    "changedata-health",
    (p: Phaser.GameObjects.Sprite, newHp: number, oldHp: number) => {
      p.getData("bar").setValue(newHp);
    }
  );
  // make player wobble
  scene.tweens.add({
    targets: newPlayer,
    angle: 5,
    duration: randomBetweenExclusive(250, 350),
    ease: "Power1",
    yoyo: true,
    repeat: -1,
  });
  return newPlayer;
}

export function updatePlayer(
  player: Phaser.GameObjects.Sprite,
  serverPlayer: Player
) {
  const scene = player.scene;
  scene.add.tween({
    targets: player,
    x: serverPlayer.x,
    y: serverPlayer.y,
    duration: SERVER_UPDATE_RATE,
    ease: "Power1",
  });
  scene.add.tween({
    targets: player.getData("text"),
    x: serverPlayer.x,
    y: serverPlayer.y - 32,
    duration: SERVER_UPDATE_RATE,
    ease: "Power1",
  });
  player.setData("health", serverPlayer.hp);
  const barContainer = player.getData("bar");

  scene.add.tween({
    targets: barContainer.bar,
    x: serverPlayer.x,
    y: serverPlayer.y + 16,
    duration: SERVER_UPDATE_RATE,
    ease: "Power1",
  });
}

export function destroyPlayer(player: Phaser.GameObjects.Sprite) {
  player.getData("bar")?.destroy();
  player.getData("text")?.destroy();
  player.destroy();
}

export function instantiateEnemy(scene: Phaser.Scene, enemy: Enemy) {
  const newEnemy = scene.add.sprite(enemy.x, enemy.y, enemy.type);
  newEnemy.setData("type", "enemy");
  newEnemy.setName(enemy.id);
  newEnemy.setOrigin(0.5, 0.5);

  scene.tweens.add({
    targets: newEnemy,
    angle: 10,
    duration: randomBetweenExclusive(250, 350),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });
  return newEnemy;
}

export function instantiateGem(scene: Phaser.Scene, gem: Gem) {
  const newGem = scene.add.sprite(gem.x, gem.y, "diamond");
  newGem.setData("type", "gem");
  newGem.setName(gem.id);
  newGem.setScale(0.5);
  newGem.setOrigin(0.5, 0.5);
  return newGem;
}

export function updateProjectile(
  projectile: Phaser.GameObjects.Sprite,
  serverProjectile: Projectile
) {
  projectile.setPosition(serverProjectile.x, serverProjectile.y);
}

const particleObjectName = "projectileParticles";
export function instantiateProjectile(
  scene: Phaser.Scene,
  projectile: Projectile
): Phaser.GameObjects.Container {
  const newProjectile = scene.add
    .sprite(0, 0, "projectile")
    .setOrigin(0.5, 0.5);
  let particles = scene.children.getByName(
    particleObjectName
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
  staticObject: StaticObject
) {
  const newStaticObject = scene.add.sprite(
    staticObject.x,
    staticObject.y,
    staticObject.type
  );
  newStaticObject.setName(staticObject.id);
  newStaticObject.setOrigin(0.5, 0.5);
  newStaticObject.setData("type", "staticObject");
  return newStaticObject;
}

export function simpleUpdate(
  gameObject: Phaser.GameObjects.GameObject,
  obj: Position
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
    obj: T
  ) => void = simpleUpdate
): Phaser.GameObjects.GameObject {
  const gameObject = scene.children.getByName(id);
  if (gameObject instanceof Phaser.GameObjects.GameObject) {
    updateFn(gameObject, obj);
    return gameObject;
  } else if (gameObject == null) {
    return instantiateFn(scene, obj);
  }
}

export function removeInvalidGameObjects(
  scene: Phaser.Scene,
  type: string,
  validIds: string[],
  destroyFn: (gameObject: Phaser.GameObjects.GameObject) => void = simpleDestroy
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

export function updateMiddleWare(gameState: GameState, mw: Middleware) {
  gameState.players.forEach((p) => {
    mw.updatePlayer(p);
  });

  const playerIds = gameState.players.map((p) => p.id);
  // remove players that are no longer in the game
  mw.removeInvalidGameObjects("player", playerIds);

  gameState.enemies.forEach((e) => mw.updateEnemy(e));
  const enemyIds = gameState.enemies.map((e) => e.id);
  mw.removeInvalidGameObjects("enemy", enemyIds);

  gameState.gems.forEach((g) => mw.updateGem(g));
  const gemIds = gameState.gems.map((g) => g.id);
  mw.removeInvalidGameObjects("gem", gemIds);
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

export interface GameFrontend {
  init(gameStateFn: () => GameState, serverEventSystem: EventSystem): void;
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
  instantiateGem(gem: Gem): void;
  updateGem(gem: Gem): void;
  instantiateProjectile(projectile: Projectile): void;
  updateProjectile(projectile: Projectile): void;
  instantiateStaticObject(staticObject: StaticObject): void;
  updateStaticObject(staticObject: StaticObject): void;
  removeInvalidGameObjects(type: string, validIds: string[]): void;
}

export class DummyFrontend implements GameFrontend {
  init(gameStateFn: () => GameState, serverEventSystem: EventSystem): void {}
}

export class DummyMiddleware implements Middleware {
  updateEnemy(enemy: Enemy): void {}
  updateGem(gem: Gem): void {}
  updateStaticObject(staticObject: StaticObject): void {}
  updateGameObject<T extends Position>(id: string, obj: T): void {}
  flashWhite(id: string): void {}
  showDamage(amount: number, position: Position, color: string): void {}
  showDamageToTarget(targetId: string, amount: number, color: string): void {}
  instantiatePlayer(player: Player): void {}
  updatePlayer(player: Player): void {}
  updatePlayerLevel(player: Player): void {}
  destroyPlayer(playerId: string): void {}
  instantiateEnemy(enemy: Enemy): void {}
  instantiateGem(gem: Gem): void {}
  instantiateProjectile(projectile: Projectile): void {}
  updateProjectile(projectile: Projectile): void {}
  instantiateStaticObject(staticObject: StaticObject): void {}
  removeInvalidGameObjects(type: string, validIds: string[]): void {}
}
