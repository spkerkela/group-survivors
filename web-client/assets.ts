const playerAnim = new URL("assets/player_anim.png", import.meta.url);
const beeAnim = new URL("assets/bee_anim.png", import.meta.url);
const zombieAnim = new URL("assets/zombie_anim.png", import.meta.url);
const skeletonAnim = new URL("assets/golem_anim.png", import.meta.url);
const tombstoneAsset = new URL("assets/tombstone.png", import.meta.url);
const diamondAsset = new URL("assets/diamond.png", import.meta.url);
const backgroundAsset = new URL("assets/bg.png", import.meta.url);
const projectileAsset = new URL("assets/projectile.png", import.meta.url);
const whitePixel = new URL("assets/white_pixel.png", import.meta.url);

export const assets = [
  { id: "grave", url: tombstoneAsset.href },
  { id: "diamond", url: diamondAsset.href },
  { id: "background", url: backgroundAsset.href },
  { id: "projectile", url: projectileAsset.href },
  { id: "white-pixel", url: whitePixel.href }
];

export interface SpriteSheet {
  id: string;
  url: string;
  frameWidth?: number;
  frameHeight?: number;
}

export const spriteSheets: SpriteSheet[] = [
  { id: "player", url: playerAnim.href },
  { id: "zombie", url: zombieAnim.href },
  { id: "skeleton", url: skeletonAnim.href },
  { id: "bat", url: beeAnim.href }
];

export const sounds = [
  { id: "hit", url: new URL("assets/hitHurt.wav", import.meta.url).href },
  { id: "explosion", url: new URL("assets/explosion.wav", import.meta.url).href },
  { id: "pickup", url: new URL("assets/pickupCoin.wav", import.meta.url).href },
  { id: "shoot", url: new URL("assets/laserShoot.wav", import.meta.url).href }
];