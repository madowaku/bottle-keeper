export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function shootOffset(contactX, bodyCenterX, halfWidth = 0.44) { return clamp((contactX - bodyCenterX) / halfWidth, -1.5, 1.5); }
export function computeHitReward({ offset, angularSpeed, screenY, floorY }) {
  const perfect = Math.abs(offset) < 0.30 && Math.abs(angularSpeed) < 2.2;
  const save = (floorY - screenY) < 137;
  return { perfect, save, points: 1 + (perfect ? 2 : 0) + (save ? 2 : 0) };
}
export function nextBottleCount(hits) { return hits >= 22 ? 3 : hits >= 8 ? 2 : 1; }
