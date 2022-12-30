export interface GameState {
  players: Player[];
  enemies: Enemy[];
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
  level: number;
  experience: number;
  speed: number;
  hp: number;
  invulnerabilityFrames: number;
  alive: boolean;
}

export interface MoveUpdate {
  id: string;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Enemy extends Position {
  id: string;
  hp: number;
  speed: number;
  type: string;
  damageType: string;
  damageMin: number;
  damageMax: number;
}
