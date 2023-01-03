import { Enemy, Gem, Player } from "../common/types";
import Bar from "./Bar";

export function instantiatePlayer(scene: Phaser.Scene, player: Player) {
  const newPlayer = scene.add.sprite(player.x, player.y, "player");
  const playerText = scene.add
    .text(player.x, player.y - 32, player.screenName, {
      font: "20px Arial",
      stroke: "#000000",
      strokeThickness: 1,
    })
    .setOrigin(0.5, 0.5)
    .setShadow(2, 2, "#333333", 2, true, true);
  newPlayer.setData("text", playerText);
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
  if (serverPlayer.alive) {
    player.setPosition(serverPlayer.x, serverPlayer.y);
    player.getData("text").setPosition(serverPlayer.x, serverPlayer.y - 32);
    player.setData("health", serverPlayer.hp);
    player
      .getData("bar")
      .setPosition({ x: serverPlayer.x, y: serverPlayer.y + 26 });
  } else {
    const scene = player.scene;
    scene.add
      .sprite(serverPlayer.x, serverPlayer.y, "tombstone")
      .setOrigin(0.5, 0.5)
      .setName(`grave-${serverPlayer.screenName}`);
    player.getData("bar").destroy();
    player.getData("text").destroy();
    player.destroy();
  }
}

export function updateEnemy(
  enemy: Phaser.GameObjects.Sprite,
  serverEnemy: Enemy
) {
  enemy.setPosition(serverEnemy.x, serverEnemy.y);
}

export function instantiateEnemy(scene: Phaser.Scene, enemy: Enemy) {
  const newEnemy = scene.add.sprite(enemy.x, enemy.y, enemy.type);
  newEnemy.setName(enemy.id);
  newEnemy.setOrigin(0.5, 0.5);
  return newEnemy;
}

export function instantiateGem(scene: Phaser.Scene, gem: Gem) {
  const newGem = scene.add.sprite(gem.x, gem.y, "diamond");
  newGem.setName(gem.id);
  newGem.setScale(0.5);
  newGem.setOrigin(0.5, 0.5);
  return newGem;
}

export function updateGem(gem: Phaser.GameObjects.Sprite, serverGem: Gem) {
  gem.setPosition(serverGem.x, serverGem.y);
}
