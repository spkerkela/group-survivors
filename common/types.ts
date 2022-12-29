export interface GameState {
  players: Player[];
  id: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Circle extends Position {
  radius: number;
}

export interface Rectangle extends Position {
  width: number;
  height: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Player extends Position {
  id: string;
  speed: number;
}

export interface MoveUpdate {
  id: string;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}
