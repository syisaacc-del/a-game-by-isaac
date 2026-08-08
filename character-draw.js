function drawShadow(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLegs(ctx, legSwing, bootColor) {
  ctx.strokeStyle = bootColor;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1, 2);
  ctx.lineTo(-5 - legSwing * 0.35, 11 + legSwing * 0.25);
  ctx.moveTo(-1, 2);
  ctx.lineTo(-5 + legSwing * 0.35, 11 - legSwing * 0.25);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.fillRect(-7 - legSwing * 0.35, 10 + legSwing * 0.25, 5, 3);
  ctx.fillRect(-7 + legSwing * 0.35, 10 - legSwing * 0.25, 5, 3);
}

function drawGun(ctx, c, long = false) {
  ctx.fillStyle = c.gun;
  ctx.fillRect(9, 2, long ? 14 : 10, 3.5);
  ctx.fillStyle = c.trim;
  ctx.fillRect(long ? 21 : 17, 2.5, 4, 2);
  ctx.fillStyle = '#222';
  ctx.fillRect(7, 1, 4, 5);
}

export function drawCharacter(ctx, ship) {
  const c = ship.characterDef?.colors || {
    skin: '#f0c8a0', body: '#3d7cbf', bodyLight: '#5a9ad4',
    accent: '#ffcc00', hair: '#3a2518', gun: '#444', trim: '#666',
  };
  const id = ship.characterDef?.id || 'default';
  const legSwing = ship.moving ? Math.sin(ship.walkFrame) * 6 : 0;
  const bob = ship.moving ? Math.abs(Math.sin(ship.walkFrame)) * 1.5 : 0;

  ctx.save();
  ctx.translate(ship.pos.x, ship.pos.y + bob);
  ctx.rotate(ship.angle);
  drawShadow(ctx);

  if (id === 'hayato') {
    drawLegs(ctx, legSwing, '#111');
    ctx.fillStyle = c.body;
    ctx.fillRect(-6, -5, 12, 10);
    ctx.fillStyle = c.accent;
    ctx.fillRect(-6, -5, 3, 10);
    ctx.fillRect(3, -5, 3, 10);
    ctx.fillStyle = c.bodyLight;
    ctx.fillRect(-3, -3, 6, 6);
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(7, -1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.arc(7, -3, 5.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.fillRect(4, -6, 8, 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(9, -1.5, 1.5, 1.5);
    ctx.fillRect(9, 0.5, 1.5, 1.5);
    drawGun(ctx, c, true);
    ctx.strokeStyle = c.skin;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(7, 3);
    ctx.stroke();
  } else if (id === 'viktor') {
    drawLegs(ctx, legSwing, '#2a2a2a');
    ctx.fillStyle = c.body;
    ctx.fillRect(-8, -6, 16, 12);
    ctx.fillStyle = c.bodyLight;
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = c.accent;
    ctx.fillRect(-8, -2, 16, 3);
    ctx.fillRect(-8, 3, 16, 2);
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-8, -6, 16, 12);
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(8, -1, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.hair;
    ctx.fillRect(3, -7, 10, 4);
    ctx.fillStyle = '#222';
    ctx.fillRect(10, -2, 1.8, 1.8);
    ctx.fillRect(10, 0.8, 1.8, 1.8);
    drawGun(ctx, c, true);
    ctx.fillStyle = c.accent;
    ctx.fillRect(-9, -1, 2, 6);
    ctx.fillRect(7, -1, 2, 6);
    ctx.strokeStyle = c.skin;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 4);
    ctx.stroke();
  } else if (id === 'zara') {
    drawLegs(ctx, legSwing, '#3d2b1f');
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(-7, 5);
    ctx.lineTo(-5, -5);
    ctx.lineTo(5, -5);
    ctx.lineTo(7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.trim;
    ctx.fillRect(-5, -2, 10, 2);
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-3, -2);
    ctx.lineTo(3, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(7, -1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.arc(7, -2, 5.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(9, -2, 2, 2);
    ctx.fillRect(9, 0.5, 2, 2);
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(7, 3, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
    drawGun(ctx, c);
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, 1);
    ctx.lineTo(8, 4);
    ctx.stroke();
  } else {
    drawLegs(ctx, legSwing, '#1a1a1a');
    ctx.fillStyle = c.body;
    ctx.fillRect(-5, -4, 10, 9);
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(6, -1, 5, 0, Math.PI * 2);
    ctx.fill();
    drawGun(ctx, c);
  }

  ctx.restore();
}

export function drawCharacterPreview(ctx, x, y, charDef, scale = 1.2, t = 0) {
  const fake = {
    pos: { x, y },
    angle: -Math.PI / 2 + Math.sin(t) * 0.15,
    moving: true,
    walkFrame: t * 2,
    characterDef: charDef,
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);
  drawCharacter(ctx, fake);
  ctx.restore();
}
