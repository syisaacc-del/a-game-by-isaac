import { Vec2 } from './vec2.js';

export const PICKUP_TYPES = {
  health: { radius: 14, color: '#ff4466', label: '+HP', heal: 35 },
  dual: { radius: 14, color: '#ffcc00', label: 'II', duration: 900, kind: 'dual' },
  spread: { radius: 14, color: '#ff8800', label: '⋮', duration: 900, kind: 'spread' },
  rapid: { radius: 14, color: '#44aaff', label: '»', duration: 900, kind: 'rapid' },
  wheel: { radius: 14, color: '#cc44ff', label: '火', duration: 1200, kind: 'wheel' },
  lightning: { radius: 14, color: '#88ddff', label: '雷', duration: 600, kind: 'lightning' },
  title: { radius: 16, color: '#ffd700', label: '★' },
};

export class Pickup {
  constructor() {
    this.active = false;
    this.titleName = '';
  }

  spawn(x, y, type, extra = {}) {
    const def = PICKUP_TYPES[type];
    this.active = true;
    this.type = type;
    this.pos = new Vec2(x, y);
    this.radius = def.radius;
    this.pulse = Math.random() * Math.PI * 2;
    this.titleName = extra.titleName || '';
  }

  reset() {
    this.active = false;
    this.titleName = '';
  }

  update() {
    this.pulse += 0.06;
  }

  draw(ctx) {
    const def = PICKUP_TYPES[this.type];
    const glow = 1 + Math.sin(this.pulse) * 0.15;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    ctx.strokeStyle = def.color;
    ctx.fillStyle = def.color + '33';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (this.type === 'health') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();
    } else if (this.type === 'title') {
      const glow = 1 + Math.sin(this.pulse) * 0.25;
      ctx.strokeStyle = '#ffd700';
      ctx.fillStyle = '#ffd70022';
      ctx.lineWidth = 3;
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.arc(0, 0, (this.radius + ring * 6) * glow, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${18 + Math.sin(this.pulse) * 2}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 1);
      if (this.titleName) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(this.titleName, 0, this.radius + 12);
      }
    } else if (this.type === 'wheel') {
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 + this.pulse;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.label, 0, 1);
    } else if (this.type === 'lightning') {
      ctx.strokeStyle = '#eeffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, 3);
      ctx.lineTo(0, -2);
      ctx.lineTo(2, 0);
      ctx.lineTo(-2, 5);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.label, 0, 1);
    }

    ctx.restore();
  }
}
