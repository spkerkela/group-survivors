const playerAsset = new URL("assets/jyrki.png", import.meta.url);
const batAsset = new URL("assets/bat.png", import.meta.url);
const zombieAsset = new URL("assets/zombie.png", import.meta.url);
const skeletonAsset = new URL("assets/skull.png", import.meta.url);
const tombstoneAsset = new URL("assets/tombstone.png", import.meta.url);
const diamondAsset = new URL("assets/diamond.png", import.meta.url);
const backgroundAsset = new URL("assets/bg.png", import.meta.url);
const projectileAsset = new URL("assets/projectile.png", import.meta.url);

export const assets = [
  {
    id: "player",
    url: playerAsset.href,
  },
  {
    id: "bat",
    url: batAsset.href,
  },
  { id: "zombie", url: zombieAsset.href },
  { id: "skeleton", url: skeletonAsset.href },
  { id: "grave", url: tombstoneAsset.href },
  { id: "diamond", url: diamondAsset.href },
  { id: "background", url: backgroundAsset.href },
  { id: "projectile", url: projectileAsset.href },
];
