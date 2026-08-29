import * as THREE from 'three';

const S = 1.18;

function hex(c) {
  return new THREE.Color(c);
}

function stdMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex(color),
    roughness: opts.roughness ?? 0.62,
    metalness: opts.metalness ?? 0.1,
    emissive: opts.emissive ? hex(opts.emissive) : undefined,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

function metalMat(color, opts = {}) {
  return stdMat(color, { roughness: 0.32, metalness: 0.86, ...opts });
}

function mesh(geo, mat, pos, rot, parent) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(pos[0] * S, pos[1] * S, pos[2] * S);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addShadow(g, r = 9) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(r * S, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  g.add(shadow);
}

function addDetailedGun(g, x = 3.6, y = 5.4, z = 10.5) {
  const body = mesh(new THREE.BoxGeometry(1.3, 1.5, 4.8), metalMat('#252525'), [x, y, z], null, g);
  mesh(new THREE.BoxGeometry(1.1, 2.1, 1.1), stdMat('#141414'), [x, y - 1.1, z - 0.6], [0.35, 0, 0], g);
  mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.4, 10), metalMat('#555555'), [x, y + 0.15, z + 3.4], [Math.PI / 2, 0, 0], g);
  mesh(new THREE.BoxGeometry(0.55, 0.35, 0.7), stdMat('#cc2222', { emissive: '#660000', emissiveIntensity: 0.55 }), [x, y + 0.95, z + 1.8], null, g);
  mesh(new THREE.BoxGeometry(0.25, 0.55, 0.45), metalMat('#333333'), [x, y - 0.55, z + 0.4], null, g);
  mesh(new THREE.BoxGeometry(0.18, 0.9, 0.55), metalMat('#666666'), [x + 0.75, y + 0.1, z + 0.5], null, g);
  return body;
}

function addKatana(g, x, y, z, rotX, rotY) {
  const blade = mesh(new THREE.BoxGeometry(0.28, 0.12, 10), metalMat('#c8ccd8', { roughness: 0.18 }), [x, y, z], [rotX, rotY, 0], g);
  mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 14), metalMat('#aa8822'), [x, y, z - 4.8], [Math.PI / 2, rotY, 0], g);
  mesh(new THREE.CylinderGeometry(0.38, 0.42, 2.2, 10), stdMat('#1a0808'), [x, y, z - 5.8], [Math.PI / 2, rotY, 0], g);
  mesh(new THREE.SphereGeometry(0.32, 8, 8), metalMat('#aa8822'), [x, y, z - 6.9], null, g);
  return blade;
}

function addLayeredPauldrons(g, side, yBase, colors, layers = 3) {
  for (let i = 0; i < layers; i++) {
    const w = 3.2 - i * 0.35;
    mesh(
      new THREE.BoxGeometry(w, 1.1 - i * 0.12, 2.8 - i * 0.2),
      colors[i % 2 ? 'dark' : 'main'],
      [side * (4.3 + i * 0.15), yBase - i * 1.05, -i * 0.08],
      [0, 0, side * (0.14 + i * 0.04)],
      g
    );
  }
}

/** 隼人 — 日本忍者 */
export function createHayatoMesh() {
  const g = new THREE.Group();
  addShadow(g);

  const body = stdMat('#1a1a2e');
  const dark = stdMat('#0a0a12', { metalness: 0.35 });
  const silver = stdMat('#dde0ee', { roughness: 0.42, metalness: 0.15 });
  const red = stdMat('#e63946', { emissive: '#991122', emissiveIntensity: 0.3 });

  mesh(new THREE.BoxGeometry(6.8, 9, 4.8), body, [0, 5.6, 0], null, g);
  mesh(new THREE.BoxGeometry(5.8, 6.5, 5.2), stdMat('#141428'), [-0.8, 5.8, 0.2], [0, 0.22, 0], g);
  mesh(new THREE.BoxGeometry(5.8, 6.5, 5.2), stdMat('#141428'), [0.8, 5.8, 0.2], [0, -0.22, 0], g);
  mesh(new THREE.BoxGeometry(7.2, 1.3, 5), stdMat('#0a0a0a'), [0, 4.7, 0], null, g);
  mesh(new THREE.BoxGeometry(7.4, 0.35, 5.1), red, [0, 4.15, 0], null, g);

  for (const side of [-1, 1]) {
    addLayeredPauldrons(g, side, 8.2, { main: dark, dark: stdMat('#151515', { metalness: 0.45 }) });
    mesh(new THREE.BoxGeometry(1.8, 4.2, 1.9), dark, [side * 4.8, 5.6, 1.6], null, g);
    mesh(new THREE.BoxGeometry(2, 0.35, 2.1), stdMat('#222222'), [side * 4.8, 6.8, 1.6], null, g);
    mesh(new THREE.BoxGeometry(2, 0.35, 2.1), stdMat('#222222'), [side * 4.8, 4.4, 1.6], null, g);
  }

  const head = mesh(new THREE.SphereGeometry(3.3, 18, 18), stdMat('#f5d0b0'), [0, 9.4, 1.6], null, g);
  mesh(new THREE.SphereGeometry(3.6, 16, 16), silver, [0, 10.1, 0.4], null, g).scale.set(1.08, 0.88, 1.12);

  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 - 0.4;
    mesh(new THREE.ConeGeometry(0.75, 2.6, 5), stdMat('#f0f2fa'), [
      Math.cos(a) * 3,
      11.2 + (i % 2) * 0.3,
      Math.sin(a) * 2.4,
    ], [0.45, a, 0], g);
  }

  mesh(new THREE.BoxGeometry(4.5, 2.4, 3.8), stdMat('#0a0a0a'), [0, 8.6, 3.4], null, g);
  mesh(new THREE.BoxGeometry(3.2, 0.55, 0.35), stdMat('#222222'), [0, 9.5, 5.35], null, g);
  mesh(new THREE.SphereGeometry(0.45, 8, 8), stdMat('#111111'), [-1.1, 9.8, 5.1], null, g);
  mesh(new THREE.SphereGeometry(0.45, 8, 8), stdMat('#111111'), [1.1, 9.8, 5.1], null, g);

  for (const side of [-1, 1]) {
    mesh(new THREE.CapsuleGeometry(1.55, 5, 6, 10), stdMat('#121228'), [side * 2.3, 2.5, 1], null, g);
    mesh(new THREE.BoxGeometry(2.4, 2.5, 3.4), stdMat('#080808'), [side * 2.3, 1.1, 2.3], null, g);
    mesh(new THREE.BoxGeometry(2.6, 0.45, 3.6), stdMat('#1a1a1a'), [side * 2.3, 2.2, 2.5], null, g);
  }

  addKatana(g, -3.6, 7.2, -1.5, 0.55, 0.15);
  addKatana(g, -2.7, 7.5, -2.2, 0.62, -0.1);
  addDetailedGun(g);

  g.userData.charId = 'hayato';
  return g;
}

/** Viktor — 俄羅斯重甲騎士 */
export function createViktorMesh() {
  const g = new THREE.Group();
  addShadow(g, 10.5);

  const steel = metalMat('#525860');
  const steelDark = metalMat('#343a40');
  const steelLight = metalMat('#6a7078', { roughness: 0.28 });
  const gold = metalMat('#ffcc44', { emissive: '#886600', emissiveIntensity: 0.22 });
  const leather = stdMat('#3a2818');

  mesh(new THREE.BoxGeometry(8.5, 3.2, 5.8), steel, [0, 7.5, 0], null, g);
  mesh(new THREE.BoxGeometry(8.2, 3.2, 5.9), steelLight, [0, 5.8, 0], null, g);
  mesh(new THREE.BoxGeometry(7.8, 3, 5.7), steelDark, [0, 4.1, 0], null, g);
  mesh(new THREE.BoxGeometry(1.4, 8.5, 6), steelDark, [0, 5.8, 0], null, g);

  for (let row = 0; row < 3; row++) {
    for (const side of [-1, 1]) {
      mesh(new THREE.SphereGeometry(0.28, 6, 6), metalMat('#888888'), [side * 3.2, 7.8 - row * 2.8, 3.05], null, g);
    }
  }

  mesh(new THREE.BoxGeometry(7, 1.8, 5.2), steelDark, [0, 3, 0], null, g);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      mesh(
        new THREE.BoxGeometry(4.8 - i * 0.4, 1.5 - i * 0.1, 3.8 - i * 0.25),
        i % 2 ? steel : steelDark,
        [side * (5.6 + i * 0.12), 8.8 - i * 1.15, -i * 0.1],
        [0, 0, side * 0.1],
        g
      );
    }
    mesh(new THREE.BoxGeometry(2.4, 4, 2.5), steelDark, [side * 5.2, 5.2, 2.8], null, g);
    mesh(new THREE.BoxGeometry(2.6, 1.8, 2.7), steel, [side * 5.2, 6.8, 2.8], null, g);
  }

  mesh(new THREE.CylinderGeometry(3.8, 4.2, 2.2, 16), steelDark, [0, 9.5, 0], null, g);
  mesh(new THREE.SphereGeometry(4, 18, 18), steel, [0, 10.8, 1.2], null, g);
  mesh(new THREE.BoxGeometry(4, 1, 0.55), stdMat('#080808'), [0, 10.4, 4.5], null, g);
  mesh(new THREE.BoxGeometry(0.9, 2.4, 0.45), gold, [0, 11.6, 4.55], null, g);
  mesh(new THREE.BoxGeometry(2.2, 0.9, 0.45), gold, [0, 11.6, 4.55], null, g);

  for (let i = 0; i < 5; i++) {
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 6), stdMat('#111111'), [-1.4 + i * 0.7, 9.8, 4.35], [Math.PI / 2, 0, 0], g);
  }

  for (const side of [-1, 1]) {
    mesh(new THREE.BoxGeometry(3, 5, 3), steel, [side * 2.8, 2.2, 0.6], null, g);
    mesh(new THREE.BoxGeometry(3.4, 2.2, 3.2), steelLight, [side * 2.8, 4.5, 0.6], null, g);
    mesh(new THREE.BoxGeometry(3.2, 1.4, 3.4), steelDark, [side * 2.8, 1.1, 1.2], null, g);
  }

  mesh(new THREE.BoxGeometry(1.5, 1.5, 8.5), leather, [-4.2, 4.8, -0.8], [0, 0, 0.28], g);
  mesh(new THREE.BoxGeometry(0.9, 2.4, 0.9), gold, [-4.8, 7, -0.8], null, g);
  mesh(new THREE.BoxGeometry(0.35, 1.8, 2.2), gold, [-4.8, 6.2, -0.8], null, g);
  mesh(new THREE.BoxGeometry(1.8, 0.35, 2.2), gold, [-4.8, 5.2, -0.8], null, g);
  addDetailedGun(g, 3.8, 5.5, 11.5);

  g.userData.charId = 'viktor';
  return g;
}

/** Zara — 埃及 Horus 戰士 */
export function createZaraMesh() {
  const g = new THREE.Group();
  addShadow(g);

  const blue = stdMat('#142040');
  const blueLight = stdMat('#243878');
  const gold = metalMat('#daa520', { emissive: '#886600', emissiveIntensity: 0.28 });
  const goldBright = metalMat('#ffd700', { emissive: '#aa8800', emissiveIntensity: 0.35 });
  const skin = stdMat('#c68642');

  mesh(new THREE.BoxGeometry(7.2, 9, 4.8), blue, [0, 5.8, 0], null, g);
  mesh(new THREE.BoxGeometry(5.5, 6, 5), blueLight, [0, 6.2, 0.2], null, g);
  const chestPlate = mesh(new THREE.BoxGeometry(4.5, 4.5, 5.1), goldBright, [0, 6.5, 0.35], null, g);
  chestPlate.material.transparent = true;
  chestPlate.material.opacity = 0.85;

  for (let i = 0; i < 6; i++) {
    mesh(
      new THREE.BoxGeometry(7 - i * 0.35, 0.45, 5 - i * 0.05),
      i % 2 ? blueLight : blue,
      [0, 3.2 + i * 0.52, 0],
      null,
      g
    );
  }

  for (let i = 0; i < 3; i++) {
    const collar = mesh(new THREE.TorusGeometry(4.8 - i * 0.35, 0.75 - i * 0.12, 10, 28), i === 0 ? goldBright : gold, [0, 8.5 - i * 0.55, 0], [Math.PI / 2, 0, 0], g);
    collar.material.transparent = true;
    collar.material.opacity = 0.92 - i * 0.08;
  }

  mesh(new THREE.SphereGeometry(3.8, 18, 18), goldBright, [0, 10.8, 2.2], null, g).scale.set(1.15, 1, 1.25);
  mesh(new THREE.ConeGeometry(1.4, 4.2, 8), gold, [0, 10.2, 6], [Math.PI / 2, 0, 0], g);
  mesh(new THREE.SphereGeometry(0.55, 10, 10), stdMat('#111111'), [-1.2, 11.2, 4.8], null, g);
  mesh(new THREE.SphereGeometry(0.55, 10, 10), stdMat('#111111'), [1.2, 11.2, 4.8], null, g);
  mesh(new THREE.SphereGeometry(0.22, 6, 6), stdMat('#00ffff', { emissive: '#0088aa', emissiveIntensity: 0.9 }), [-1.2, 11.2, 5.15], null, g);
  mesh(new THREE.SphereGeometry(0.22, 6, 6), stdMat('#00ffff', { emissive: '#0088aa', emissiveIntensity: 0.9 }), [1.2, 11.2, 5.15], null, g);

  for (let i = 0; i < 5; i++) {
    const c = i % 2 === 0 ? gold : blueLight;
    mesh(new THREE.BoxGeometry(1.3, 3.8, 4), c, [-2.4 + i * 1.2, 11.8, 0.8], null, g);
  }
  mesh(new THREE.BoxGeometry(5.5, 4.5, 1.4), blueLight, [0, 10.2, -1.8], null, g);
  const nemesGold = mesh(new THREE.BoxGeometry(5.5, 4.5, 1.4), gold, [0, 10.2, -1.8], null, g);
  nemesGold.material.transparent = true;
  nemesGold.material.opacity = 0.25;

  for (const side of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(1.6, 1.8, 4, 12), gold, [side * 5.2, 5.8, 1.6], [0, 0, Math.PI / 2], g);
    mesh(new THREE.TorusGeometry(1.7, 0.25, 6, 14), goldBright, [side * 5.2, 7.8, 1.6], [Math.PI / 2, 0, 0], g);
    mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), goldBright, [side * 5.2, 6.2, 2.5], null, g);
    mesh(new THREE.CapsuleGeometry(1.4, 3.8, 6, 10), skin, [side * 2.4, 2.3, 0.6], null, g);
  }

  mesh(new THREE.CylinderGeometry(3.8, 5.5, 3.2, 12, 1, true), blueLight, [0, 3.3, 0], null, g);
  mesh(new THREE.TorusGeometry(4, 0.65, 8, 20), gold, [0, 4.6, 0], [Math.PI / 2, 0, 0], g);
  for (let i = 0; i < 4; i++) {
    mesh(new THREE.BoxGeometry(0.9, 1.1, 0.35), goldBright, [-1.5 + i * 1, 4.6, 2.5], null, g);
  }

  const khopesh = mesh(new THREE.TorusGeometry(2.8, 0.5, 8, 20, Math.PI * 0.85), goldBright, [-4.2, 5.2, -0.5], [Math.PI / 2, 0, -Math.PI / 2], g);
  mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.5, 8), stdMat('#3a2818'), [-4.2, 5.2, -2.8], [0.4, 0, 0], g);
  mesh(new THREE.SphereGeometry(0.55, 8, 8), gold, [-4.2, 5.2, -3.9], null, g);

  addDetailedGun(g, 3.6, 5.5, 10.8);
  g.userData.charId = 'zara';
  return g;
}

export function createPlayerMesh(characterDef) {
  const id = characterDef?.id || 'hayato';
  if (id === 'viktor') return createViktorMesh();
  if (id === 'zara') return createZaraMesh();
  return createHayatoMesh();
}

export function getNameTagHeight(charId) {
  if (charId === 'viktor') return 22;
  if (charId === 'zara') return 21;
  return 20;
}
