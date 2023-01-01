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
    speed: 0.5,
    damageType: "cold",
    damageMin: 20,
    damageMax: 40,
    gemType: "exp",
  },
  bat: {
    hp: 20,
    speed: 2,
    damageType: "poison",
    damageMin: 1,
    damageMax: 5,
    gemType: "exp",
  },
  skeleton: {
    hp: 200,
    speed: 1,
    damageType: "melee",
    damageMin: 10,
    damageMax: 20,
    gemType: "exp",
  },
};

export interface SpellData {
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
}
export type SpellDB = { [key: string]: SpellData };

export const spellDB: SpellDB = {
  damageAura: {
    name: "Damage Aura",
    description: "Deals damage to enemies in a radius around you",
    damageType: "fire",
    baseDamage: 10,
    critMultiplier: 1.5,
    critChance: 0.5,
    range: 50,
    rangeMultiplier: 1,
    cooldown: 500,
    cooldownMultiplier: 1,
    type: "aura",
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
