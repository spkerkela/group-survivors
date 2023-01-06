import {
  Enemy,
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
  return newPlayer;
}

export function updatePlayer(
  player: Phaser.GameObjects.Sprite,
  serverPlayer: Player
) {
  player.setPosition(serverPlayer.x, serverPlayer.y);
  player.getData("text").setPosition(serverPlayer.x, serverPlayer.y - 32);
  player.setData("health", serverPlayer.hp);
  player
    .getData("bar")
    .setPosition({ x: serverPlayer.x, y: serverPlayer.y + 26 });
}

export function destroyPlayer(player: Phaser.GameObjects.Sprite) {
  player.getData("bar")?.destroy();
  player.getData("text")?.destroy();
  player.destroy();
}

export function updateEnemy(
  enemy: Phaser.GameObjects.Sprite,
  serverEnemy: Enemy
) {
  enemy.setPosition(serverEnemy.x, serverEnemy.y);
}

export function instantiateEnemy(scene: Phaser.Scene, enemy: Enemy) {
  const newEnemy = scene.add.sprite(enemy.x, enemy.y, enemy.type);
  newEnemy.setData("type", "enemy");
  newEnemy.setName(enemy.id);
  newEnemy.setOrigin(0.5, 0.5);
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

export function instantiateProjectile(
  scene: Phaser.Scene,
  projectile: Projectile
) {
  const newProjectile = scene.add.sprite(
    projectile.x,
    projectile.y,
    "projectile"
  );
  newProjectile.setData("type", "projectile");
  newProjectile.setName(projectile.id);
  newProjectile.setOrigin(0.5, 0.5);
  return newProjectile;
}

export function simpleDestroy(gameObject: Phaser.GameObjects.Sprite) {
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
  gameObject: Phaser.GameObjects.Sprite,
  obj: Position
) {
  gameObject.setPosition(obj.x, obj.y);
}

export function updateGameObject<T extends Position>(
  scene: Phaser.Scene,
  id: string,
  obj: T,
  instantiateFn: (scene: Phaser.Scene, obj: T) => Phaser.GameObjects.Sprite,
  updateFn: (
    gameObject: Phaser.GameObjects.Sprite,
    obj: T
  ) => void = simpleUpdate
): Phaser.GameObjects.Sprite {
  const gameObject = scene.children.getByName(id);
  if (gameObject instanceof Phaser.GameObjects.Sprite) {
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
  destroyFn: (gameObject: Phaser.GameObjects.Sprite) => void = simpleDestroy
) {
  scene.children.each((child) => {
    if (
      child instanceof Phaser.GameObjects.Sprite &&
      child.getData("type") === type &&
      !validIds.includes(child.name)
    ) {
      destroyFn(child);
    }
  });
}
