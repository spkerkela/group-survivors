import { Position } from "../common/types";

interface BarOptions {
  value: number;
  maxValue: number;
  width: number;
  height: number;
  position: Position;
  offset?: Position;
  colorHex: number;
}

export default class Bar {
  value: number;
  maxValue: number;
  width: number;
  height: number;
  position: Position;
  offset: Position;
  colorHex: number;
  bar: Phaser.GameObjects.Graphics;
  constructor(
    scene: Phaser.Scene,
    {
      value,
      maxValue,
      width,
      height,
      position,
      colorHex,
      offset = { x: 0, y: 0 },
    }: BarOptions
  ) {
    this.value = value;
    this.maxValue = maxValue;
    this.width = width;
    this.height = height;
    this.position = position;
    this.colorHex = colorHex;
    this.offset = offset;

    this.bar = scene.add.graphics();
    this.bar.x = position.x;
    this.bar.y = position.y;

    this.draw();
  }

  private updateToBounds() {
    if (this.value < 0) {
      this.value = 0;
    } else if (this.value > this.maxValue) {
      this.value = this.maxValue;
    }
  }
  setPosition(position: Position) {
    this.position = position;
    this.bar.x = position.x;
    this.bar.y = position.y;
  }
  setUpperBound(maxValue: number) {
    this.maxValue = maxValue;
    this.updateToBounds();
    this.draw();
  }
  setValue(value: number) {
    this.value = value;
    this.updateToBounds();
    this.draw();
  }
  draw() {
    this.bar.clear();
    this.bar.fillStyle(0x000000);
    this.bar.fillRect(this.offset.x, this.offset.y, this.width, this.height);
    this.bar.fillStyle(this.colorHex);
    const valuePercent = this.value / this.maxValue;
    this.bar.fillRect(
      this.offset.x,
      this.offset.y,
      this.width * valuePercent,
      this.height
    );
  }

  destroy() {
    this.bar.destroy();
  }
}
