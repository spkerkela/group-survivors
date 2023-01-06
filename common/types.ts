import {
  DamageEvent,
  LevelEvent,
  SpellDamageEvent,
  SpellProjectileEvent,
} from "../server/game-logic";

export interface GameState {
  players: Player[];
  enemies: Enemy[];
  gems: Gem[];
  projectiles: Projectile[];
  staticObjects: StaticObject[];
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

export interface StaticObject extends Position {
  id: string;
  type: string;
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
  screenName: string;
  id: string;
  level: number;
  experience: number;
  speed: number;
  maxHp: number;
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

export interface Projectile extends Position {
  id: string;
  type: string;
  speed: number;
  damage: number;
  critical: boolean;
  damageType: string;
  lifetime: number;
  fromId: string;
  direction: Position;
  maxPierceCount: number;
  hitEnemies: string[];
}

export type FromServerEventMap = {
  begin: (gameState: GameState) => void;
  disconnect: () => void;
  spell: (data: SpellDamageEvent) => void;
  update: (gameState: GameState) => void;
  damage: (data: DamageEvent) => void;
  level: (data: LevelEvent) => void;
  move: (moveMessage: MoveUpdate) => void;
  projectile: (projectile: SpellProjectileEvent) => void;
};

export type ToServerEventMap = {
  connection: (any) => void;
  join: (name: string) => void;
  move: (moveUpdate: MoveUpdate) => void;
};
