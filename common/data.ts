export interface EnemyData {
  hp: number;
  speed: number;
  damageType: string;
  damageMin: number;
  damageMax: number;
  gemType: string;
}

export type EnemyDB = { [key: string]: EnemyData };
export const enemyDB: EnemyDB = {
  zombie: {
    hp: 200,
    speed: 40,
    damageType: "cold",
    damageMin: 20,
    damageMax: 40,
    gemType: "exp",
  },
  bat: {
    hp: 20,
    speed: 60,
    damageType: "poison",
    damageMin: 1,
    damageMax: 5,
    gemType: "exp",
  },
  skeleton: {
    hp: 200,
    speed: 50,
    damageType: "melee",
    damageMin: 10,
    damageMax: 20,
    gemType: "exp",
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
}

export type SpellDB = { [key: string]: SpellData };

export const spellDB: SpellDB = {
  damageAura: {
    id: "damageAura",
    name: "Damage Aura",
    description: "Deals damage to enemies in a radius around you",
    damageType: "fire",
    baseDamage: 10,
    critMultiplier: 1.5,
    critChance: 0.5,
    range: 40,
    rangeMultiplier: 1,
    cooldown: 1,
    cooldownMultiplier: 1,
    type: "aura",
    lifetime: 0,
    speed: 0,
    maxPierceCount: 0,
  },
  missile: {
    id: "missile",
    name: "Missile",
    description: "Deals damage to a single target",
    damageType: "cold",
    baseDamage: 20,
    critMultiplier: 2.0,
    critChance: 0.1,
    range: 100,
    rangeMultiplier: 1,
    cooldown: 1,
    cooldownMultiplier: 1,
    type: "projectile-target",
    lifetime: 3,
    speed: 150,
    maxPierceCount: 1,
  },
};

export interface GemData {
  name: string;
  type: string;
  value: number;
}

export type GemDB = { [key: string]: GemData };
export const gemDB: GemDB = {
  exp: {
    name: "Experience",
    type: "exp",
    value: 25,
  },
};
