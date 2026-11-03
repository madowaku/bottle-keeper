import test from 'node:test';
import assert from 'node:assert/strict';
import { Vec2 } from 'planck';
import { BottleGame } from '../src/physics.js';
import { DT, TUNING } from '../src/config.js';

test('planck world creates compound glass bottle and fixed-step simulation progresses', () => {
  const game = new BottleGame(); game.start();
  assert.equal(game.bottles.length, 1);
  assert.equal([...fixtures(game.bottles[0].body)].length, 4);
  const y = game.bottles[0].body.getPosition().y;
  for (let i=0;i<12;i++) game.step(DT);
  assert.ok(game.bottles[0].body.getPosition().y < y);
});
function* fixtures(body) {for(let f=body.getFixtureList();f;f=f.getNext())yield f;}
test('off-center impulse rotates a bottle, unlike center impulse', () => {
  function rotation(dx) {
    const game = new BottleGame();game.start();
    const body = game.bottles[0].body;
    const point = Vec2(body.getWorldCenter().x + dx, body.getWorldCenter().y - 0.5);
    game.hitBottle({ fixture: body.getFixtureList(), point, normal: Vec2(0,-1) });
    return body.getAngularVelocity();
  }
  assert.ok(Math.abs(rotation(0.3)) > Math.abs(rotation(0.0)) + 0.1);
});
test('two games with identical inputs have deterministic trajectories', () => {
  const a = new BottleGame();const b = new BottleGame();a.start();b.start();
  a.aimAt(183);b.aimAt(183);a.shoot();b.shoot();
  for(let i=0;i<75;i++){a.step();b.step();}
  const pa=a.bottles[0].body.getPosition(), pb=b.bottles[0].body.getPosition();
  assert.ok(Math.abs(pa.x-pb.x)<1e-8);
  assert.ok(Math.abs(pa.y-pb.y)<1e-8);
});
test('changing lift tuning is configurable', () => {
  assert.ok(TUNING.lift > 0);
});
