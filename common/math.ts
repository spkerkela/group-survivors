import { Rectangle, Position, Circle } from "./types";

export function normalize(x: number, y: number) {
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const length = Math.sqrt(x * x + y * y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: x / length, y: y / length };
}

export function rectangleContains(rect: Rectangle, point: Position): boolean {
  return (
    rect.x <= point.x &&
    rect.x + rect.width >= point.x &&
    rect.y <= point.y &&
    rect.y + rect.height >= point.y
  );
}

export function rectangleIntersects(
  rect1: Rectangle,
  rect2: Rectangle
): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

export function circleIntersects(circle1: Circle, circle2: Circle) {
  return (
    Math.pow(circle1.x - circle2.x, 2) + Math.pow(circle1.y - circle2.y, 2) <
    Math.pow(circle1.radius + circle2.radius, 2)
  );
}
