import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, shootOffset, computeHitReward, nextBottleCount } from '../src/math.js';
import { toWorld, toScreen } from '../src/config.js';

test('coordinates round trip', () => {
  for (const p of [[0, 0], [180, 300], [360, 548]]) {
    const w = toWorld(...p); const screen = toScreen(w);
    assert.ok(Math.abs(screen.x - p[0]) < 1e-8);
    assert.ok(Math.abs(screen.y - p[1]) < 1e-8);
  }
});
test('left and right strike have opposite signed offset', () => {
  assert.ok(shootOffset(1.8, 2) < 0);
  assert.ok(shootOffset(2.2, 2) > 0);
  assert.equal(shootOffset(2, 2), 0);
});
test('score rewards are independent from hit milestones', () => {
  assert.equal(computeHitReward({ offset: 0, angularSpeed: 0, screenY: 500, floorY: 548 }).points, 5);
  assert.equal(computeHitReward({ offset: 1, angularSpeed: 6, screenY: 200, floorY: 548 }).points, 1);
  assert.equal(nextBottleCount(7), 1);
  assert.equal(nextBottleCount(8), 2);
  assert.equal(nextBottleCount(21), 2);
  assert.equal(nextBottleCount(22), 3);
});
test('clamp handles velocity limits', () => { assert.equal(clamp(-9, -4, 4), -4); assert.equal(clamp(9, -4, 4), 4); });
