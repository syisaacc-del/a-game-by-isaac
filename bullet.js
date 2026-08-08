export class Bullet {
  constructor() {
    this.active = false;
    this.lightning = false;
  }

  spawn({ pos, vel, radius, life, lightning = false, ownerChain = 0 }) {
    this.active = true;
    this.pos = { x: pos.x, y: pos.y };
    this.vel = { x: vel.x, y: vel.y };
    this.radius = radius;
    this.life = life;
    this.lightning = lightning;
    this.ownerChain = ownerChain;
  }

  reset() {
    this.active = false;
    this.ownerChain = 0;
  }

  update() {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx) {
    if (this.lightning) {
      ctx.fillStyle = '#aaeeff';
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.pos.x - 4, this.pos.y);
      ctx.lineTo(this.pos.x + 4, this.pos.y);
      ctx.moveTo(this.pos.x, this.pos.y - 4);
      ctx.lineTo(this.pos.x, this.pos.y + 4);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffee88';
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
