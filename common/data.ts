export interface EnemyData {
  hp: number;
  speed: number;
  damageType: string;
  damageMin: number;
  damageMax: number;
  dropTable: string[];
}

export type EnemyDB = { [key: string]: EnemyData };
export const enemyDB: EnemyDB = {
  zombie: {
    hp: 200,
    speed: 40,
    damageType: "cold",
    damageMin: 20,
    damageMax: 40,
    dropTable: ["exp", "gold", "hp"],
  },
  bat: {
    hp: 20,
    speed: 60,
    damageType: "poison",
    damageMin: 1,
    damageMax: 5,
    dropTable: ["exp"],
  },
  skeleton: {
    hp: 200,
    speed: 50,
    damageType: "melee",
    damageMin: 10,
    damageMax: 20,
    dropTable: ["exp", "hp"],
  },
};

export interface SpellData {
  id: string;
  name: string;
  description: string;
  damageType: string;
  baseDamage: number;
  critMultiplier: number;
  critChance: number;
  range: number;
  rangeMultiplier: number;
  cooldown: number;
  cooldownMultiplier: number;
  type: string;
  lifetime: number;
  speed: number;
  maxPierceCount: number;
  multiCastCooldown: number;
}

export type SpellDB = { [key: string]: SpellData };

export const spellDB: SpellDB = {
  damageAura: {
    id: "damageAura",
    name: "Fiery Aura",
    description: "Deals damage to enemies in a radius around you",
    damageType: "fire",
    baseDamage: 3,
    critMultiplier: 1.5,
    critChance: 0.5,
    range: 40,
    rangeMultiplier: 1,
    cooldown: 0.3,
    cooldownMultiplier: 1,
    type: "aura",
    lifetime: 0,
    speed: 0,
    maxPierceCount: 0,
    multiCastCooldown: 0.1,
  },
  missile: {
    id: "missile",
    name: "Seeking Missile",
    description: "Deals damage to a single target, aims at nearest enemy",
    damageType: "cold",
    baseDamage: 20,
    critMultiplier: 2.0,
    critChance: 0.1,
    range: 100,
    rangeMultiplier: 1,
    cooldown: 2,
    cooldownMultiplier: 1,
    type: "projectile-target",
    lifetime: 3,
    speed: 150,
    maxPierceCount: 1,
    multiCastCooldown: 0.1,
  },
};

export interface PickUpData {
  name: string;
  type: string;
  value: number;
  visual: string;
}

export type PickUpDB = { [key: string]: PickUpData };
export const pickUpDB: PickUpDB = {
  exp: {
    name: "Experience",
    type: "exp",
    value: 100,
    visual: "diamond",
  },
  hp: {
    name: "Health Potion",
    type: "hp",
    value: 25,
    visual: "heart",
  },
  gold: {
    name: "Gold",
    type: "gold",
    value: 25,
    visual: "gold",
  },
};
