export const assets = [
  { id: "grave", url: new URL("assets/tombstone.png", import.meta.url).href },
  { id: "diamond", url: new URL("assets/diamond.png", import.meta.url).href },
  { id: "heart", url: new URL("assets/heart.png", import.meta.url).href },
  { id: "gold", url: new URL("assets/gold.png", import.meta.url).href },
  { id: "background", url: new URL("assets/bg.png", import.meta.url).href },
  {
    id: "projectile",
    url: new URL("assets/projectile.png", import.meta.url).href,
  },
  {
    id: "white-pixel",
    url: new URL("assets/white_pixel.png", import.meta.url).href,
  },
  {
    id: "rock",
    url: new URL("assets/rock.png", import.meta.url).href,
  },
];

export interface SpriteSheet {
  id: string;
  url: string;
  frameWidth?: number;
  frameHeight?: number;
}

export const spriteSheets: SpriteSheet[] = [
  {
    id: "player",
    url: new URL("assets/player_anim.png", import.meta.url).href,
  },
  {
    id: "zombie",
    url: new URL("assets/zombie_anim.png", import.meta.url).href,
  },
  {
    id: "skeleton",
    url: new URL("assets/golem_anim.png", import.meta.url).href,
  },
  { id: "bat", url: new URL("assets/bee_anim.png", import.meta.url).href },
];

export const sounds = [
  { id: "hit", url: new URL("assets/hitHurt.wav", import.meta.url).href },
  {
    id: "explosion",
    url: new URL("assets/explosion.wav", import.meta.url).href,
  },
  { id: "pickup", url: new URL("assets/pickupCoin.wav", import.meta.url).href },
  { id: "shoot", url: new URL("assets/laserShoot.wav", import.meta.url).href },
];
