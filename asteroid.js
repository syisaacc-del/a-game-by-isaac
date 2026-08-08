import { Vec2 } from './vec2.js';

const TYPES = {
  b: { radius: 62, score: 20, next: 'm', speed: 0.85, scale: 1.75, damage: 35 },
  m: { radius: 36, score: 50, next: 's', speed: 1.2, scale: 1.25, damage: 22 },
  s: { radius: 20, score: 100, next: null, speed: 1.6, scale: 0.85, damage: 12 },
};

export class Asteroid {
  constructor() {
    this.active = false;
  }

  spawn(x, y, type, speedBoost = 0) {
    const def = TYPES[type];
    this.active = true;
    this.type = type;
    this.isBoss = false;
    this.radius = def.radius;
    this.score = def.score;
    this.damage = def.damage;
    this.next = def.next;
    this.scale = def.scale;
    this.pos = new Vec2(x, y);
    this.vel = Vec2.fromAngle(Math.random() * Math.PI * 2, def.speed + speedBoost);
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.025;
    this.lurch = Math.random() * Math.PI * 2;
    this.limp = Math.random() > 0.5 ? 1 : -1;
    this.wheelHitCd = 0;
    this.lightningFlash = 0;
    this.isBoss = false;
    this.bossHp = 0;
  }

  spawnBoss(x, y, level) {
    this.active = true;
    this.type = 'boss';
    this.isBoss = true;
    this.radius = 80;
    this.score = 500 + level * 100;
    this.damage = 50;
    this.next = null;
    this.scale = 2.5;
    this.bossHp = 20 + level * 5;
    this.maxBossHp = this.bossHp;
    this.pos = new Vec2(x, y);
    this.vel = Vec2.fromAngle(Math.random() * Math.PI * 2, 0.5);
    this.angle = 0;
    this.spin = 0.008;
    this.lurch = 0;
    this.limp = 1;
    this.wheelHitCd = 0;
    this.lightningFlash = 0;
    this.bossAttackCd = 1200;
    this.attackFlash = 0;
  }

  updateBoss(playerX, playerY) {
    const dx = playerX - this.pos.x;
    const dy = playerY - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const chaseSpeed = 1.5;

    if (dist > 5) {
      this.vel.set((dx / dist) * chaseSpeed, (dy / dist) * chaseSpeed);
    } else {
      this.vel.set(0, 0);
    }

    this.angle = Math.atan2(dy, dx);
    this.lurch += 0.05;

    if (this.attackFlash > 0) this.attackFlash--;

    if (this.bossAttackCd > 0) {
      this.bossAttackCd--;
    } else if (dist < 420) {
      this.bossAttackCd = 1200;
      this.attackFlash = 25;
      return true;
    }
    return false;
  }

  reset() {
    this.active = false;
  }

  update(playerX, playerY) {
    if (this.isBoss && playerX != null) {
      const attacked = this.updateBoss(playerX, playerY);
      this.pos.add(this.vel);
      return attacked;
    }
    this.pos.add(this.vel);
    this.angle += this.spin;
    this.lurch += 0.07;
    if (this.lightningFlash > 0) this.lightningFlash--;
    return false;
  }

  wrap(w, h) {
    const r = this.radius;
    if (this.pos.x > w + r) this.pos.x = -r;
    else if (this.pos.x < -r) this.pos.x = w + r;
    if (this.pos.y > h + r) this.pos.y = -r;
    else if (this.pos.y < -r) this.pos.y = h + r;
  }

  draw(ctx) {
    if (this.isBoss) {
      this.drawBoss(ctx);
      return;
    }

    const s = this.scale;
    const armReach = 12 * s;
    const legSwing = Math.sin(this.lurch) * 5 * s * this.limp;
    const headR = 6.5 * s;
    const bodyLen = 10 * s;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    if (this.lightningFlash > 0) {
      ctx.shadowColor = '#88eeff';
      ctx.shadowBlur = 30;
      ctx.strokeStyle = `rgba(170,230,255,${this.lightningFlash / 20})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.isBoss) {
      ctx.fillStyle = 'rgba(80,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 12 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5a8a5a';
    ctx.fillStyle = '#4a7a4a';
    ctx.lineWidth = Math.max(2, 2.5 * s);
    ctx.lineCap = 'round';

    // legs
    ctx.beginPath();
    ctx.moveTo(-2 * s, 1 * s);
    ctx.lineTo(-5 * s - legSwing * 0.4, 12 * s + legSwing * 0.3);
    ctx.moveTo(-2 * s, 1 * s);
    ctx.lineTo(-5 * s + legSwing * 0.4, 12 * s - legSwing * 0.3);
    ctx.stroke();

    // body (tattered shirt)
    ctx.fillRect(-bodyLen * 0.45, -3 * s, bodyLen * 0.9, 8 * s);
    ctx.strokeRect(-bodyLen * 0.45, -3 * s, bodyLen * 0.9, 8 * s);

    // torn bits
    ctx.strokeStyle = '#3a6a3a';
    ctx.beginPath();
    ctx.moveTo(-2 * s, 4 * s);
    ctx.lineTo(0, 6 * s);
    ctx.moveTo(2 * s, 3 * s);
    ctx.lineTo(4 * s, 5 * s);
    ctx.stroke();

    // arms out
    ctx.strokeStyle = '#5a8a5a';
    ctx.lineWidth = Math.max(2, 2.2 * s);
    ctx.beginPath();
    ctx.moveTo(0, -2 * s);
    ctx.lineTo(armReach, -5 * s);
    ctx.moveTo(0, 2 * s);
    ctx.lineTo(armReach, 5 * s);
    ctx.stroke();

    // claws
    ctx.strokeStyle = '#7a9a6a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(armReach, -5 * s);
    ctx.lineTo(armReach + 3 * s, -6 * s);
    ctx.moveTo(armReach, -5 * s);
    ctx.lineTo(armReach + 3 * s, -4 * s);
    ctx.moveTo(armReach, 5 * s);
    ctx.lineTo(armReach + 3 * s, 4 * s);
    ctx.moveTo(armReach, 5 * s);
    ctx.lineTo(armReach + 3 * s, 6 * s);
    ctx.stroke();

    // head
    ctx.fillStyle = '#6a9a6a';
    ctx.beginPath();
    ctx.arc(bodyLen * 0.4 + headR * 0.5, 0, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a7a4a';
    ctx.stroke();

    // mouth
    ctx.strokeStyle = '#2a3a2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bodyLen * 0.4 + headR * 0.7, 1.5 * s, 2 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // red eyes
    ctx.fillStyle = '#ff2222';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(bodyLen * 0.4 + headR * 0.85, -headR * 0.35, Math.max(1.5, 1.8 * s), 0, Math.PI * 2);
    ctx.arc(bodyLen * 0.4 + headR * 0.85, headR * 0.35, Math.max(1.5, 1.8 * s), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  drawBoss(ctx) {
    const pulse = Math.sin(this.lurch * 2) * 0.05 + 1;
    const r = this.radius;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.scale(pulse, pulse);

    if (this.lightningFlash > 0) {
      ctx.strokeStyle = `rgba(170,230,255,${this.lightningFlash / 20})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // dark aura
    ctx.fillStyle = 'rgba(60,0,80,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, r + 18, 0, Math.PI * 2);
    ctx.fill();

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.55, r * 0.7, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // torn cape
    ctx.fillStyle = '#3a0830';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.2);
    ctx.lineTo(-r * 0.7, r * 0.5);
    ctx.lineTo(-r * 0.5, r * 0.6);
    ctx.lineTo(-r * 0.1, r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.2);
    ctx.lineTo(r * 0.7, r * 0.5);
    ctx.lineTo(r * 0.5, r * 0.6);
    ctx.lineTo(r * 0.1, r * 0.1);
    ctx.closePath();
    ctx.fill();

    // legs
    const legSwing = Math.sin(this.lurch) * r * 0.08;
    ctx.strokeStyle = '#2a1a2a';
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, r * 0.1);
    ctx.lineTo(-r * 0.25 - legSwing, r * 0.55);
    ctx.moveTo(r * 0.15, r * 0.1);
    ctx.lineTo(r * 0.25 + legSwing, r * 0.55);
    ctx.stroke();

    // armored body
    ctx.fillStyle = '#4a2040';
    ctx.strokeStyle = '#8a3060';
    ctx.lineWidth = 3;
    ctx.fillRect(-r * 0.35, -r * 0.25, r * 0.7, r * 0.55);
    ctx.strokeRect(-r * 0.35, -r * 0.25, r * 0.7, r * 0.55);

    // chest plate highlight
    ctx.fillStyle = '#6a3050';
    ctx.fillRect(-r * 0.2, -r * 0.15, r * 0.4, r * 0.35);

    // spiked shoulders
    ctx.fillStyle = '#5a2545';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.35, -r * 0.2);
      ctx.lineTo(sx * r * 0.55, -r * 0.35);
      ctx.lineTo(sx * r * 0.4, -r * 0.05);
      ctx.closePath();
      ctx.fill();
    }

    // massive arms
    ctx.strokeStyle = '#3a1a30';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.65, -r * 0.15);
    ctx.moveTo(r * 0.3, 0);
    ctx.lineTo(r * 0.65, -r * 0.15);
    ctx.stroke();

    // claws
    ctx.lineWidth = r * 0.06;
    ctx.strokeStyle = '#aa4060';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.65, -r * 0.15);
      ctx.lineTo(sx * r * 0.8, -r * 0.25);
      ctx.moveTo(sx * r * 0.65, -r * 0.15);
      ctx.lineTo(sx * r * 0.82, -r * 0.1);
      ctx.stroke();
    }

    // head
    ctx.fillStyle = '#5a3050';
    ctx.beginPath();
    ctx.arc(r * 0.15, -r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a4060';
    ctx.lineWidth = 2;
    ctx.stroke();

    // crown
    ctx.fillStyle = '#ffcc00';
    ctx.strokeStyle = '#aa8800';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      const h = i === 0 ? r * 0.22 : r * 0.12;
      ctx.fillRect(r * 0.15 + i * r * 0.1 - r * 0.04, -r * 0.65 - h, r * 0.08, h);
    }

    // glowing red eyes
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(r * 0.22, -r * 0.38, r * 0.06, 0, Math.PI * 2);
    ctx.arc(r * 0.22, -r * 0.32, r * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // mouth
    ctx.strokeStyle = '#1a0810';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r * 0.28, -r * 0.28, r * 0.1, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // HP bar
    const bw = r * 1.8;
    ctx.fillStyle = '#220000';
    ctx.fillRect(-bw / 2, -r - 22, bw, 8);
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(-bw / 2, -r - 22, bw * (this.bossHp / this.maxBossHp), 8);
    ctx.fillStyle = '#ffcc00';
    ctx.font = `bold ${Math.max(11, r * 0.14)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('☠ BOSS ☠', 0, -r - 28);

    if (this.attackFlash > 0) {
      const alpha = this.attackFlash / 25;
      ctx.strokeStyle = `rgba(255,50,50,${alpha})`;
      ctx.lineWidth = 5 + (25 - this.attackFlash) * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 10 + (25 - this.attackFlash) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export { TYPES };
