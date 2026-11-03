export const VIEW = Object.freeze({ width: 360, height: 640, floorY: 548, topY: 88, wallX: 23, scale: 40 });
export const TUNING = {
  gravity: 10.8,
  lift: 8.7,
  spinCap: 7,
  horizontalCap: 4.5,
  cooldown: 0.30,
  bulletSpeed: 27,
  bulletLifetime: 0.65,
  spawnHits: [8, 22],
  spawnNotice: 1.1,
  safetyHeight: 130,
  saveHeight: 137,
  perfectOffset: 0.13,
};
export const DT = 1 / 60;
export function toWorld(x, y) { return { x: x / VIEW.scale, y: (VIEW.floorY - y) / VIEW.scale }; }
export function toScreen(point) { return { x: point.x * VIEW.scale, y: VIEW.floorY - point.y * VIEW.scale }; }
