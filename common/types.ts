export interface GameState {
  players: Player[];
  enemies: Enemy[];
  gems: Gem[];
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

export interface Gem extends Position {
  id: string;
  type: string;
}

export interface Player extends Position {
  id: string;
  level: number;
  experience: number;
  speed: number;
  hp: number;
  invulnerabilityFrames: number;
  alive: boolean;
  spells: { [key: string]: { cooldown: number; level: number } };
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
  alive: boolean;
  speed: number;
  type: string;
  damageType: string;
  damageMin: number;
  damageMax: number;
  gemType: string;
}
