import { Vec2 } from './vec2.js';
import { drawCharacter } from './character-draw.js';
import { drawEquipFx, drawTalentAura } from './fx.js';

const BASE_COOLDOWN = 10;
const WHEEL_PER_STACK = 3;
const WHEEL_HIT_CD = 18;
const BASE_SPEED = 4.5;

export { WHEEL_HIT_CD, WHEEL_PER_STACK };

export class Ship {
  constructor() {
    this.wheelOrbit = 200;
    this.wheelRadius = 42;
    this.playerIndex = 0;
    this.displayName = '';
    this.characterDef = null;
    this.damageReduction = 0;
    this.extraChain = 0;
    this.shootCdMul = 1;
    this.reset();
  }

  setScreenSize(w, h) {
    this.wheelOrbit = Math.min(w, h) * 0.22;
    this.wheelRadius = this.radius * 3;
  }

  applyCharacter(def) {
    this.characterDef = def;
    this.speed = BASE_SPEED * (def.speedMul || 1);
    this.maxHp = def.maxHp || 100;
    this.damageReduction = def.damageReduction || 0;
    this.extraChain = def.extraChain || 0;
    this.shootCdMul = def.shootCdMul || 1;
    this.hp = this.maxHp;
  }

  reset(x = 0, y = 0) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2();
    this.angle = -Math.PI / 2;
    this.radius = 14;
    this.speed = this.characterDef ? BASE_SPEED * this.characterDef.speedMul : BASE_SPEED;
    this.maxHp = this.characterDef?.maxHp || 100;
    this.hp = this.maxHp;
    this.dead = false;
    this.eliminated = false;
    this.respawnTimer = 0;
    this.shootCooldown = 0;
    this.invincible = 0;
    this.moving = false;
    this.walkFrame = 0;
    this.wheelAngle = 0;
    this.wheelStacks = 0;
    this.fxPulse = 0;
    this.buffs = { dual: 0, spread: 0, rapid: 0, wheel: 0, lightning: 0 };
    if (this.characterDef) {
      this.damageReduction = this.characterDef.damageReduction || 0;
      this.extraChain = this.characterDef.extraChain || 0;
      this.shootCdMul = this.characterDef.shootCdMul || 1;
    }
  }

  update() {
    if (this.eliminated) return;

    if (this.dead) {
      if (++this.respawnTimer > 120) {
        this.dead = false;
        this.respawnTimer = 0;
        this.invincible = 120;
        this.vel.set(0, 0);
        this.hp = this.maxHp;
      }
      return;
    }

    this.pos.add(this.vel);
    if (this.moving) this.walkFrame += 0.28;
    if (this.shootCooldown > 0) this.shootCooldown--;
    this.fxPulse += 0.15;

    for (const k in this.buffs) {
      if (this.buffs[k] > 0) this.buffs[k]--;
    }

    if (this.buffs.wheel <= 0) this.wheelStacks = 0;
    if (this.hasBuff('wheel')) this.wheelAngle += 0.14;
    if (this.invincible > 0) this.invincible--;
  }

  hasBuff(kind) {
    return kind === 'wheel' ? this.wheelStacks > 0 && this.buffs.wheel > 0 : this.buffs[kind] > 0;
  }

  activeBuffs() {
    const list = Object.keys(this.buffs).filter((k) => k !== 'wheel' && this.buffs[k] > 0);
    if (this.hasBuff('wheel')) list.push('wheel');
    return list;
  }

  buffLabel(kind) {
    if (kind === 'wheel' && this.wheelStacks > 1) return `風火輪×${this.wheelStacks}`;
    return null;
  }

  addBuff(kind, duration) {
    if (kind === 'wheel') {
      this.wheelStacks = Math.min(this.wheelStacks + 1, 3);
      this.buffs.wheel = Math.max(this.buffs.wheel, duration);
    } else {
      this.buffs[kind] = Math.max(this.buffs[kind], duration);
    }
  }

  getWheelCount() {
    return this.wheelStacks * WHEEL_PER_STACK;
  }

  getWheelPositions() {
    const total = this.getWheelCount();
    const list = [];
    for (let i = 0; i < total; i++) {
      const a = this.wheelAngle + (Math.PI * 2 * i) / total;
      list.push({
        x: this.pos.x + Math.cos(a) * this.wheelOrbit,
        y: this.pos.y + Math.sin(a) * this.wheelOrbit,
        radius: this.wheelRadius,
        spin: this.wheelAngle * 4 + i * 0.7,
        index: i,
      });
    }
    return list;
  }

  move(dx, dy) {
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.vel.set((dx / len) * this.speed, (dy / len) * this.speed);
      this.angle = Math.atan2(dy, dx);
      this.moving = true;
    } else {
      this.vel.set(0, 0);
      this.moving = false;
    }
  }

  /** 單人第三人稱：W/S 前後、A/D 平移；鏡頭唔受按鍵控制 */
  moveThirdPerson(ix, iy) {
    if (ix === 0 && iy === 0) {
      this.vel.set(0, 0);
      this.moving = false;
      return;
    }

    const a = this.angle;
    const fwdX = Math.cos(a);
    const fwdY = Math.sin(a);
    const rightX = -Math.sin(a);
    const rightY = Math.cos(a);

    const wx = ix * rightX + (-iy) * fwdX;
    const wy = ix * rightY + (-iy) * fwdY;
    const len = Math.hypot(wx, wy);
    this.vel.set((wx / len) * this.speed, (wy / len) * this.speed);
    this.moving = true;

    // 向前行先慢慢轉身；後退 / 左右平移唔轉身
    if (iy < 0) {
      const target = Math.atan2(wy, wx);
      let diff = target - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += diff * 0.28;
      if (Math.abs(diff) < 0.03) this.angle = target;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  damage(amount) {
    if (this.invincible > 0 || this.dead) return false;
    const dmg = Math.max(1, Math.floor(amount * (1 - this.damageReduction)));
    this.hp -= dmg;
    this.invincible = 60;
    if (this.hp <= 0) {
      this.hp = 0;
      this.kill();
      return true;
    }
    return false;
  }

  canShoot() {
    return !this.dead && this.shootCooldown <= 0;
  }

  shoot() {
    let cooldown = this.hasBuff('rapid') ? BASE_COOLDOWN / 2.5 : BASE_COOLDOWN;
    cooldown *= this.shootCdMul;
    this.shootCooldown = Math.max(3, cooldown | 0);

    const muzzle = 22;
    const speed = this.hasBuff('lightning') ? 12 : 10;
    const angles = this.hasBuff('spread') ? [-0.35, -0.15, 0, 0.15, 0.35] : [0];
    const perpOffsets = this.hasBuff('dual') ? [-10, 0, 10] : [0];
    const perpX = -Math.sin(this.angle);
    const perpY = Math.cos(this.angle);
    const lightning = this.hasBuff('lightning') || this.extraChain > 0;
    const shots = [];

    for (const da of angles) {
      for (const po of perpOffsets) {
        const a = this.angle + da;
        shots.push({
          pos: new Vec2(
            this.pos.x + Math.cos(a) * muzzle + perpX * po,
            this.pos.y + Math.sin(a) * muzzle + perpY * po
          ),
          vel: Vec2.fromAngle(a, speed),
          radius: lightning ? 5 : this.hasBuff('rapid') ? 4 : 3,
          life: 60,
          lightning,
          ownerChain: this.extraChain,
        });
      }
    }
    return shots;
  }

  kill() {
    this.dead = true;
    this.respawnTimer = 0;
    this.vel.set(0, 0);
    this.wheelStacks = 0;
    this.buffs = { dual: 0, spread: 0, rapid: 0, wheel: 0, lightning: 0 };
  }

  wrap(w, h) {
    if (this.pos.x > w) this.pos.x = 0;
    else if (this.pos.x < 0) this.pos.x = w;
    if (this.pos.y > h) this.pos.y = 0;
    else if (this.pos.y < 0) this.pos.y = h;
  }

  clampToArena(w, h) {
    const r = this.radius;
    if (this.pos.x < r) {
      this.pos.x = r;
      if (this.vel.x < 0) this.vel.x = 0;
    } else if (this.pos.x > w - r) {
      this.pos.x = w - r;
      if (this.vel.x > 0) this.vel.x = 0;
    }
    if (this.pos.y < r) {
      this.pos.y = r;
      if (this.vel.y < 0) this.vel.y = 0;
    } else if (this.pos.y > h - r) {
      this.pos.y = h - r;
      if (this.vel.y > 0) this.vel.y = 0;
    }
  }

  drawSingleWheel(ctx, x, y, spin) {
    const r = this.wheelRadius * 0.85;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.strokeStyle = '#ff7700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12);
      ctx.lineTo(Math.cos(a + 0.07) * r, Math.sin(a + 0.07) * r);
      ctx.lineTo(Math.cos(a - 0.07) * r, Math.sin(a - 0.07) * r);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#ff9900' : '#ffdd00';
      ctx.fill();
    }
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawWheel(ctx) {
    if (!this.hasBuff('wheel')) return;
    for (const w of this.getWheelPositions()) {
      this.drawSingleWheel(ctx, w.x, w.y, w.spin);
    }
  }

  draw(ctx) {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return;

    drawTalentAura(ctx, this);
    this.drawWheel(ctx);
    drawEquipFx(ctx, this);
    drawCharacter(ctx, this);

    const tag = this.displayName || (this.playerIndex === 1 ? 'P2' : '');
    if (tag) {
      ctx.fillStyle = this.playerIndex === 1 ? '#7ecf8e' : '#ffcc00';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tag, this.pos.x, this.pos.y - 22);
    }
  }
}
