export interface GameState {
  wave: number;
  waveSecondsRemaining: number;
  enemies: Enemy[];
  pickUps: PickUp[];
  projectiles: Projectile[];
  staticObjects: StaticObject[];
}
export interface ClientGameState extends GameState {
  id: string;
  player: Player | null;
  players: Player[];
  debug?: DebugInformation;
}

export interface Position {
  x: number;
  y: number;
}

export type PowerUpType = "additionalCast" | "damage" | "range" | "cooldown";

export interface UpgradeChoice {
  id: string;
  spellId: string;
  powerUp: PowerUp;
}

export interface PowerUp {
  type: PowerUpType;
  value: number;
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

export interface PickUp extends GameObject {
  type: string;
  objectType: "pickup";
  lifetime: number;
  visual: string;
}

export interface Player extends GameObject {
  screenName: string;
  objectType: "player";
  level: number;
  experience: number;
  pendingLevels: number;
  speed: number;
  maxHp: number;
  hp: number;
  invulnerabilityFrames: number;
  alive: boolean;
  spells: { [key: string]: number };
  passives: { [key: string]: number };
  gold: number;
  powerUps: { [key: string]: PowerUp[] };
  globalPowerUps: PowerUp[];
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
  dropTable: string[];
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
  preMatch: () => void;
  beginMatch: (gameState: ClientGameState) => void;
  endMatch: () => void;
  gameOver: (data: GameOverData) => void;
  upgrade: (data: UpgradeEvent) => void;
};

export type ToServerEventMap = {
  upgradeSelection: (selected: UpgradeChoice[]) => void;
  upgradeReroll: () => void;
  connection: (arg0: unknown) => void;
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
export function isPickUp(object: GameObject): object is PickUp {
  return object.objectType === "pickup";
}

export function isProjectile(object: GameObject): object is Projectile {
  return object.objectType === "projectile";
}

export function isStaticObject(object: GameObject): object is StaticObject {
  return object.objectType === "staticObject";
}

export interface PlayerUpdate {
  x: number;
  y: number;
}

export type Updates = { moves: { [key: string]: PlayerUpdate } };

export interface SpellDamageEvent {
  fromId: string;
  targetId: string;
  damage: number;
  damageType: string;
  critical: boolean;
  spellId: string;
}

export interface SpellProjectileEvent {
  fromId: string;
  position: Position;
  targetDirection: Position;
  spellId: string;
  damage: number;
  damageType: string;
  critical: boolean;
  lifetime: number;
  maxPierceCount: number;
  speed: number;
}

export interface SpellCastEvent {
  damageEvents: SpellDamageEvent[];
  projectileEvents: SpellProjectileEvent[];
}

export interface DamageEvent {
  playerId: string;
  damageType: string;
  amount: number;
}

export interface PickUpEvent {
  playerId: string;
  pickUpId: string;
}

export interface LevelEvent {
  playerId: string;
  player: Player;
}

export interface UpgradeEvent {
  choices: UpgradeChoice[][];
  rerollCost: number;
}
