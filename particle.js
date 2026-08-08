import { Vec2 } from './vec2.js';

export class Particle {
  constructor() {
    this.active = false;
  }

  spawn(x, y, angle, speed, radius, color, life) {
    this.active = true;
    this.pos = new Vec2(x, y);
    this.vel = Vec2.fromAngle(angle, speed);
    this.radius = radius;
    this.color = color;
    this.life = life;
    this.maxLife = life;
  }

  reset() {
    this.active = false;
  }

  update() {
    this.pos.add(this.vel);
    this.vel.mul(0.96);
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    if (Math.random() > 0.35) ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function burst(pool, list, x, y, count, color, speedMin, speedMax, radiusMin, radiusMax) {
  for (let i = 0; i < count; i++) {
    const p = pool.acquire();
    if (!p) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
    p.spawn(x, y, angle, speed, radius, color, 50 + (Math.random() * 30 | 0));
    list.push(p);
  }
}
