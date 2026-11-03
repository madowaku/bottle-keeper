import { World, Vec2, Box, Polygon } from 'planck';
import { VIEW, TUNING, DT, toWorld, toScreen } from './config.js';
import { clamp, shootOffset, computeHitReward, nextBottleCount } from './math.js';

const bottleParts = [
  [[-0.42, -0.85], [0.42, -0.85], [0.42, 0.24], [-0.42, 0.24]],
  [[-0.42, 0.23], [0.42, 0.23], [0.18, 0.57], [-0.18, 0.57]],
  [[-0.18, 0.55], [0.18, 0.55], [0.18, 1.02], [-0.18, 1.02]],
  [[-0.25, 0.96], [0.25, 0.96], [0.25, 1.1], [-0.25, 1.1]],
];

function addStaticBox(world, x, y, halfW, halfH, kind, restitution = 0.7) {
  const body = world.createBody({ position: Vec2(x, y), userData: { kind } });
  body.createFixture(Box(halfW, halfH), { friction: 0.1, restitution });
  return body;
}

export class BottleGame {
  constructor() {
    this.best = 0;
    try { this.best = Number(localStorage.getItem('bottle-keeper-best') || 0) || 0; } catch { /* private browsing */ }
    this.onHit = () => {};
    this.onShoot = () => {};
    this.onBreak = () => {};
    this.onNotice = () => {};
    this.mode = 'idle';
    this.reset();
  }

  reset() {
    this.world = new World(Vec2(0, -TUNING.gravity));
    this.world.on('begin-contact', contact => {
      const a = contact.getFixtureA().getBody().getUserData();
      const b = contact.getFixtureB().getBody().getUserData();
      if ((a?.kind === 'floor' && b?.kind === 'bottle') || (b?.kind === 'floor' && a?.kind === 'bottle')) {
        this.broken = a?.kind === 'bottle' ? a.id : b.id;
      }
    });
    const worldW = VIEW.width / VIEW.scale;
    const height = (VIEW.floorY - VIEW.topY) / VIEW.scale;
    addStaticBox(this.world, worldW / 2, -0.25, worldW / 2, 0.25, 'floor', 0);
    addStaticBox(this.world, VIEW.wallX / VIEW.scale - 0.18, height / 2, 0.18, height / 2 + 0.2, 'wall');
    addStaticBox(this.world, (VIEW.width - VIEW.wallX) / VIEW.scale + 0.18, height / 2, 0.18, height / 2 + 0.2, 'wall');
    addStaticBox(this.world, worldW / 2, height + 0.21, worldW / 2, 0.2, 'ceiling', 0.38);
    this.bottles = [];
    this.bullets = [];
    this.score = 0;
    this.hits = 0;
    this.maxBottles = 1;
    this.nextId = 0;
    this.cannonX = VIEW.width / 2;
    this.cannonTarget = this.cannonX;
    this.left = false;
    this.right = false;
    this.cooldown = 0;
    this.elapsed = 0;
    this.notice = 0;
    this.pendingSpawn = 0;
    this.broken = null;
    this.lastHit = null;
    this.feedback = [];
  }

  start() {
    this.reset();
    this.mode = 'playing';
    this.spawn(0);
  }

  spawn(index) {
    const patterns = [
      { x: 180, y: 160, vx: 0.24, vy: 0, angle: -0.08 },
      { x: 252, y: 180, vx: -0.85, vy: -0.2, angle: 0.34 },
      { x: 112, y: 162, vx: 0.70, vy: -0.6, angle: -0.27 },
    ];
    const p = patterns[index];
    const pos = toWorld(p.x, p.y);
    const id = ++this.nextId;
    const body = this.world.createDynamicBody({
      position: Vec2(pos.x, pos.y), angle: p.angle,
      linearDamping: 0.07, angularDamping: 0.15, bullet: true,
      userData: { kind: 'bottle', id },
    });
    for (const polygon of bottleParts) {
      const points = polygon.map(([x, y]) => Vec2(x, y));
      body.createFixture(Polygon(points), { density: 0.85, friction: 0.26, restitution: 0.41 });
    }
    body.setLinearVelocity(Vec2(p.vx, p.vy));
    this.bottles.push({ id, body, tint: ['#9af1cb', '#91d5fa', '#f0b7c1'][index] });
    this.maxBottles = Math.max(this.maxBottles, this.bottles.length);
    return body;
  }

  aimAt(x) { this.cannonTarget = clamp(x, 43, VIEW.width - 43); }
  setMove(left, right) { this.left = left; this.right = right; }

  shoot() {
    if (this.mode !== 'playing' || this.cooldown > 0) return false;
    this.cooldown = TUNING.cooldown;
    const start = toWorld(this.cannonX, VIEW.floorY - 12);
    this.bullets.push({ position: Vec2(start.x, start.y), age: 0 });
    this.onShoot();
    return true;
  }

  processBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      const from = bullet.position;
      const to = Vec2(from.x, from.y + TUNING.bulletSpeed * dt);
      let closest = null;
      this.world.rayCast(from, to, (fixture, point, normal, fraction) => {
        if (fixture.getBody().getUserData()?.kind !== 'bottle') return -1;
        if (!closest || fraction < closest.fraction) {
          closest = { fixture, point: Vec2(point.x, point.y), normal: Vec2(normal.x, normal.y), fraction };
        }
        return fraction;
      });
      bullet.age += dt;
      if (closest) {
        this.hitBottle(closest);
        this.bullets.splice(i, 1);
      } else if (bullet.age >= TUNING.bulletLifetime || toScreen(to).y < VIEW.topY) {
        this.bullets.splice(i, 1);
      } else {
        bullet.position = to;
      }
    }
  }

  hitBottle(hit) {
    const body = hit.fixture.getBody();
    const center = body.getWorldCenter();
    const before = body.getLinearVelocity();
    const offset = shootOffset(hit.point.x, center.x);
    // The point of impact is passed to Planck, so an off-center upward impulse
    // naturally creates angular momentum. A small lateral component makes the
    // bottle's tilt visible and gives the player something learnable to control.
    const rise = TUNING.lift;
    const verticalImpulse = body.getMass() * clamp(rise - before.y, 3.8, 20);
    const lateralImpulse = body.getMass() * clamp(offset * 0.62 - hit.normal.x * 0.26, -1.2, 1.2);
    body.applyLinearImpulse(Vec2(lateralImpulse, verticalImpulse), hit.point, true);
    body.setAngularVelocity(clamp(body.getAngularVelocity(), -TUNING.spinCap, TUNING.spinCap));
    const after = body.getLinearVelocity();
    body.setLinearVelocity(Vec2(clamp(after.x, -TUNING.horizontalCap, TUNING.horizontalCap), clamp(after.y, 4.8, 11.4)));
    const contact = toScreen(hit.point);
    const reward = computeHitReward({ offset, angularSpeed: body.getAngularVelocity(), screenY: contact.y, floorY: VIEW.floorY });
    this.hits += 1;
    this.score += reward.points;
    this.lastHit = { ...reward, offset, x: contact.x, y: contact.y, at: this.elapsed };
    this.feedback.push({ x: contact.x, y: contact.y, text: reward.save ? 'SAVE!' : reward.perfect ? 'PERFECT!' : '+1', age: 0, life: .72 });
    this.onHit(reward);
    if (!this.pendingSpawn && nextBottleCount(this.hits) > this.bottles.length) {
      this.pendingSpawn = this.bottles.length + 1;
      this.notice = TUNING.spawnNotice;
      this.onNotice(this.pendingSpawn);
    }
  }

  step(dt = DT) {
    if (this.mode !== 'playing') return;
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.left || this.right) {
      const direction = Number(this.right) - Number(this.left);
      this.cannonX = clamp(this.cannonX + direction * 325 * dt, 43, VIEW.width - 43);
      this.cannonTarget = this.cannonX;
    } else {
      this.cannonX += clamp(this.cannonTarget - this.cannonX, -780 * dt, 780 * dt);
    }
    this.processBullets(dt);
    this.world.step(dt);
    this.feedback = this.feedback.filter(f => { f.age += dt; return f.age < f.life; });
    if (this.broken != null) {
      this.mode = 'over';
      const record = this.score > this.best;
      if (record) {
        this.best = this.score;
        try { localStorage.setItem('bottle-keeper-best', String(this.best)); } catch { /* private browsing */ }
      }
      const bottle = this.bottles.find(b => b.id === this.broken);
      this.onBreak({ score: this.score, best: this.best, record, hits: this.hits, maxBottles: this.maxBottles, x: bottle ? toScreen(bottle.body.getPosition()).x : 180 });
      return;
    }
    if (this.pendingSpawn) {
      this.notice -= dt;
      if (this.notice <= 0) {
        const safe = this.bottles.every(b => toScreen(b.body.getPosition()).y < VIEW.floorY - TUNING.safetyHeight);
        if (safe) {
          this.spawn(this.pendingSpawn - 1);
          this.pendingSpawn = 0;
        } else {
          this.notice = 0.22;
        }
      }
    }
  }
}
