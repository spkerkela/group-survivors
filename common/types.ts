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
}
export interface ClientGameState extends GameState {
  id: string;
  debug?: DebugInformation;
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
  objectType: "staticObject";
}

export interface GameObject extends Position {
  id: string;
  objectType: string;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface Gem extends GameObject {
  type: string;
  objectType: "gem";
  lifetime: number;
}

export interface Player extends GameObject {
  screenName: string;
  objectType: "player";
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

export interface Enemy extends GameObject {
  objectType: "enemy";
  hp: number;
  alive: boolean;
  speed: number;
  type: string;
  damageType: string;
  damageMin: number;
  damageMax: number;
  gemType: string;
}

export interface Projectile extends GameObject {
  objectType: "projectile";
  spellId: string;
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

export interface GameOverData {
  monstersKilled: number;
}

export type FromServerEventMap = {
  disconnect: () => void;
  spell: (data: SpellDamageEvent) => void;
  update: (gameState: ClientGameState) => void;
  damage: (data: DamageEvent) => void;
  level: (data: LevelEvent) => void;
  move: (moveMessage: MoveUpdate) => void;
  projectile: (projectile: SpellProjectileEvent) => void;
  joined: (gameState: ClientGameState) => void;
  beginMatch: (gameState: ClientGameState) => void;
  endMatch: () => void;
  gameOver: (data: GameOverData) => void;
};

export type ToServerEventMap = {
  connection: (any) => void;
  join: (name: string) => void;
  move: (moveUpdate: MoveUpdate) => void;
};

export interface DebugInformation {
  cullingRect: Rectangle;
}

export function isPlayer(object: GameObject): object is Player {
  return object.objectType === "player";
}

export function isEnemy(object: GameObject): object is Enemy {
  return object.objectType === "enemy";
}
export function isGem(object: GameObject): object is Gem {
  return object.objectType === "gem";
}

export function isProjectile(object: GameObject): object is Projectile {
  return object.objectType === "projectile";
}

export function isStaticObject(object: GameObject): object is StaticObject {
  return object.objectType === "staticObject";
}
