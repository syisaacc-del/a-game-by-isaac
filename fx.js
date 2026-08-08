/** Lightweight luxury buff FX — no shadowBlur, capped draw calls */

export function drawEquipFx(ctx, ship) {
  const bob = ship.moving ? Math.abs(Math.sin(ship.walkFrame)) * 1.5 : 0;
  const cx = ship.pos.x;
  const cy = ship.pos.y + bob;
  const t = ship.fxPulse;

  if (ship.hasBuff('rapid')) {
    const r = 18 + Math.sin(t * 3) * 3;
    ctx.strokeStyle = `rgba(100,200,255,${0.35 + Math.sin(t * 4) * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(180,230,255,${0.25 + Math.sin(t * 5) * 0.1})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, t * 2, t * 2 + Math.PI * 1.2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = t * 3 + (Math.PI * 2 * i) / 4;
      ctx.strokeStyle = `rgba(120,210,255,${0.2})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12));
      ctx.stroke();
    }
  }

  if (ship.hasBuff('dual')) {
    ctx.fillStyle = 'rgba(255,220,0,0.3)';
    ctx.beginPath();
    ctx.arc(cx - 14, cy, 7 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
    ctx.arc(cx + 14, cy, 7 + Math.sin(t * 4 + 1) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,100,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (ship.hasBuff('spread')) {
    ctx.strokeStyle = 'rgba(255,140,0,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const a = ship.angle + i * 0.25;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42);
    }
    ctx.stroke();
  }

  if (ship.hasBuff('lightning')) {
    ctx.strokeStyle = `rgba(150,230,255,${0.5 + Math.sin(t * 6) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,240,255,0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  if (ship.hasBuff('wheel')) {
    ctx.strokeStyle = 'rgba(255,100,0,0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, ship.wheelOrbit, t * 0.5, t * 0.5 + Math.PI * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawTalentAura(ctx, ship) {
  if (!ship.characterDef) return;
  const id = ship.characterDef.id;
  const t = ship.fxPulse;
  const cx = ship.pos.x;
  const cy = ship.pos.y;

  if (id === 'hayato' && ship.moving) {
    ctx.strokeStyle = `rgba(255,70,70,${0.25 + Math.sin(t * 8) * 0.15})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(cx - Math.cos(ship.angle) * (8 + i * 5), cy - Math.sin(ship.angle) * (8 + i * 5), 3 - i * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (id === 'viktor') {
    ctx.strokeStyle = `rgba(180,200,220,${0.2 + Math.sin(t * 2) * 0.08})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (id === 'zara') {
    ctx.strokeStyle = `rgba(0,229,255,${0.2 + Math.sin(t * 4) * 0.12})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + (Math.PI * 2 * i) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
      ctx.lineTo(cx + Math.cos(a + 0.4) * 18, cy + Math.sin(a + 0.4) * 18);
      ctx.stroke();
    }
  }
}
