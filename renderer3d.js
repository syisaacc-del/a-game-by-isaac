import * as THREE from 'three';
import { PICKUP_TYPES } from './pickup.js';
import { createPlayerMesh, getNameTagHeight } from './character-models-3d.js';

const ENTITY_SCALE = 1.88;

function hex(c) {
  return new THREE.Color(c);
}

function createZombieMesh(a) {
  const g = new THREE.Group();
  const scale = a.isBoss ? 2.4 : (a.scale || 1);
  const color = a.isBoss ? 0x6a2040 : (a.type === 'b' ? 0x3d6b3d : a.type === 'm' ? 0x5a8f5a : 0x7ecf8e);

  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: a.isBoss ? 0x330011 : 0x112211,
    emissiveIntensity: a.isBoss ? 0.45 : 0.12,
    roughness: 0.7,
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(7 * scale, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(8 * scale, 9 * scale, 6 * scale), mat);
  torso.position.y = 5.5 * scale;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(5.5 * scale, 5.5 * scale, 5 * scale), mat);
  head.position.set(2.5 * scale, 5.5 * scale, 0);
  head.castShadow = true;

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xff0000,
    emissiveIntensity: 0.9,
  });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.9 * scale, 6, 6), eyeMat);
    eye.position.set(4.5 * scale, 6.5 * scale, side * 1.5 * scale);
    g.add(eye);
  }

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2 * scale, 2 * scale, 7 * scale), mat);
    arm.position.set(1 * scale, 5 * scale, side * 6 * scale);
    arm.rotation.x = side * 0.35;
    arm.castShadow = true;
    g.add(arm);
  }

  if (a.isBoss) {
    const hornMat = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0x880000,
      emissiveIntensity: 0.55,
      roughness: 0.4,
    });
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xaa8800,
      emissiveIntensity: 0.3,
      metalness: 0.6,
    });
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(2 * scale, 5 * scale, 6), hornMat);
      horn.position.set(2.5 * scale, 12 * scale, side * 2.5 * scale);
      horn.rotation.z = side * 0.35;
      g.add(horn);
    }
    const crown = new THREE.Mesh(new THREE.BoxGeometry(8 * scale, 2 * scale, 4 * scale), crownMat);
    crown.position.set(2.5 * scale, 11 * scale, 0);
    g.add(crown);

    const aura = new THREE.Mesh(
      new THREE.RingGeometry(10 * scale, 14 * scale, 32),
      new THREE.MeshBasicMaterial({ color: 0x660044, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.2;
    g.add(aura);
    g.userData.aura = aura;
  }

  g.add(shadow, torso, head);
  g.userData.scale = scale;
  g.userData.bodyMat = mat;
  return g;
}

function createPickupMesh(type) {
  const def = PICKUP_TYPES[type];
  const color = hex(def?.color || '#ffcc00');
  const g = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(5, 1),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.15,
    })
  );
  core.castShadow = true;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(7.5, 0.6, 8, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = Math.PI / 2;

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(9, 12, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12 })
  );

  g.add(glow, ring, core);
  g.userData.ring = ring;
  g.userData.glow = glow;
  return g;
}

function createNameSprite(text, colorHex) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = colorHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(32, 8, 1);
  sprite.userData.labelCanvas = canvas;
  sprite.userData.labelCtx = ctx;
  sprite.userData.labelColor = colorHex;
  sprite.userData.lastText = text;
  return sprite;
}

function updateNameSprite(sprite, text) {
  if (!sprite || sprite.userData.lastText === text) return;
  sprite.userData.lastText = text;
  const { labelCanvas, labelCtx, labelColor } = sprite.userData;
  labelCtx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  labelCtx.font = 'bold 28px monospace';
  labelCtx.fillStyle = labelColor;
  labelCtx.textAlign = 'center';
  labelCtx.textBaseline = 'middle';
  labelCtx.fillText(text, 128, 32);
  sprite.material.map.needsUpdate = true;
}

function createWheelMesh3D() {
  const g = new THREE.Group();
  const r = 10;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.5, 1.4, 6, 18),
    new THREE.MeshStandardMaterial({ color: 0xff7700, emissive: 0xff4400, emissiveIntensity: 0.55 })
  );
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.9, r),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0xff9900 : 0xffdd00,
        emissive: 0xff8800,
        emissiveIntensity: 0.35,
      })
    );
    blade.rotation.y = a;
    blade.position.set(Math.sin(a) * r * 0.45, 0, Math.cos(a) * r * 0.45);
    g.add(blade);
  }
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffaa00, emissiveIntensity: 0.6 })
  );
  g.add(core);
  return g;
}

function createShipFxGroup() {
  const g = new THREE.Group();
  g.position.set(0, 6, 0);

  const rapid = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.55, 8, 28),
    new THREE.MeshStandardMaterial({ color: 0x64c8ff, emissive: 0x2288ff, emissiveIntensity: 0.7, transparent: true, opacity: 0.75 })
  );
  rapid.rotation.x = Math.PI / 2;
  rapid.visible = false;
  g.add(rapid);

  const dualL = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.75 })
  );
  dualL.position.set(-10, 0, 0);
  dualL.visible = false;
  g.add(dualL);

  const dualR = dualL.clone();
  dualR.position.set(10, 0, 0);
  dualR.visible = false;
  g.add(dualR);

  const spread = new THREE.Group();
  spread.visible = false;
  for (let i = -2; i <= 2; i++) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 0.65 })
    );
    beam.position.set(0, 0, 8);
    beam.rotation.y = i * 0.25;
    spread.add(beam);
  }
  g.add(spread);

  const lightning = new THREE.Mesh(
    new THREE.TorusGeometry(11, 0.45, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x99eeff, emissive: 0x44ccff, emissiveIntensity: 0.85, transparent: true, opacity: 0.8 })
  );
  lightning.rotation.x = Math.PI / 2;
  lightning.visible = false;
  g.add(lightning);

  const wheelOrbit = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.35, 4, 32, Math.PI * 1.5),
    new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.5, transparent: true, opacity: 0.55 })
  );
  wheelOrbit.rotation.x = Math.PI / 2;
  wheelOrbit.visible = false;
  g.add(wheelOrbit);

  const talent = new THREE.Mesh(
    new THREE.TorusGeometry(10, 0.35, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, transparent: true, opacity: 0.5 })
  );
  talent.rotation.x = Math.PI / 2;
  talent.visible = false;
  g.add(talent);

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(14, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffcc00, emissiveIntensity: 0.45, transparent: true, opacity: 0.22, wireframe: true })
  );
  shield.visible = false;
  g.add(shield);

  g.userData.fx = { rapid, dualL, dualR, spread, lightning, wheelOrbit, talent, shield };
  return g;
}

export class Renderer3D {
  constructor(container, { mobile = false } = {}) {
    this.mobile = mobile;
    this.w = 800;
    this.h = 600;
    this.worldW = 800;
    this.worldH = 600;
    this.camFocusX = 400;
    this.camFocusY = 300;
    this.soloCameraReady = false;
    this._camYaw = 0;
    this.t = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x141418);
    this.scene.fog = new THREE.Fog(0x141418, 500, 4200);

    this.camera = new THREE.PerspectiveCamera(62, 1, 2, 3500);
    this.cameraRig = new THREE.Object3D();
    this.scene.add(this.cameraRig);
    this._targetCamPos = new THREE.Vector3();
    this._targetLookPos = new THREE.Vector3();
    this._smoothCamPos = new THREE.Vector3(0, 200, 200);
    this._smoothLookPos = new THREE.Vector3();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      powerPreference: mobile ? 'low-power' : 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = !mobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.id = 'game3d-canvas';
    container.insertBefore(this.renderer.domElement, container.firstChild);

    this.setupLights();
    this.arena = new THREE.Group();
    this.scene.add(this.arena);

    this.entityRoot = new THREE.Group();
    this.entityRoot.scale.setScalar(ENTITY_SCALE);
    this.scene.add(this.entityRoot);

    this.shipMeshes = new Map();
    this.zombieMeshes = new Map();
    this.bulletMeshes = new Map();
    this.pickupMeshes = new Map();
    this.particleMeshes = new Map();
    this.lightningLines = [];
    this.shipFx = new Map();
    this._projVec = new THREE.Vector3();
  }

  disposeObject3D(obj) {
    if (!obj) return;
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  }

  clearGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.traverse?.((o) => {
        if (o.geometry) this.disposeObject3D(o);
      });
      this.disposeObject3D(child);
    }
  }

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0x667788, 0.75));
    this.scene.add(new THREE.HemisphereLight(0x8899bb, 0x222211, 0.45));

    const sun = new THREE.DirectionalLight(0xfff2dd, 1.25);
    sun.position.set(140, 320, 100);
    sun.castShadow = !this.mobile;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 50;
      sun.shadow.camera.far = 900;
      sun.shadow.camera.left = -450;
      sun.shadow.camera.right = 450;
      sun.shadow.camera.top = 450;
      sun.shadow.camera.bottom = -450;
    }
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6688ff, 0.35);
    fill.position.set(-100, 120, -140);
    this.scene.add(fill);
  }

  rebuildFloor(w, h) {
    this.clearGroup(this.arena);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.arena.add(floor);

    const grid = new THREE.GridHelper(Math.max(w, h), this.mobile ? 22 : 34, 0x555577, 0x333348);
    grid.position.y = 0.12;
    this.arena.add(grid);

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.75 });
    const hw = w / 2;
    const hh = h / 2;
    const edgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-hw, 0.25, -hh),
      new THREE.Vector3(hw, 0.25, -hh),
      new THREE.Vector3(hw, 0.25, hh),
      new THREE.Vector3(-hw, 0.25, hh),
      new THREE.Vector3(-hw, 0.25, -hh),
    ]);
    this.arena.add(new THREE.Line(edgeGeo, edgeMat));

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a38,
      emissive: 0x111122,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.85,
      roughness: 0.8,
    });
    const wallH = 20;
    const walls = [
      [w, wallH, 3, 0, wallH / 2, -h / 2],
      [w, wallH, 3, 0, wallH / 2, h / 2],
      [3, wallH, h, -w / 2, wallH / 2, 0],
      [3, wallH, h, w / 2, wallH / 2, 0],
    ];
    for (const [ww, wh, wd, x, y, z] of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), wallMat);
      wall.position.set(x, y, z);
      wall.castShadow = true;
      this.arena.add(wall);
    }
  }

  resize(viewW, viewH, worldW, worldH) {
    this.w = viewW;
    this.h = viewH;
    this.worldW = worldW || viewW;
    this.worldH = worldH || viewH;
    this.renderer.setSize(viewW, viewH, false);
    this.camera.aspect = viewW / viewH;
    this.camera.updateProjectionMatrix();
    this.rebuildFloor(this.worldW, this.worldH);
  }

  resetFollowCamera(ship) {
    if (!ship) return;
    this.soloCameraReady = false;
    this._camYaw = Math.PI / 2 - ship.angle;
    this.updateThirdPersonCamera(ship, true);
  }

  /** 角色喺 3D 場景嘅朝向（模型正面係 +Z） */
  shipYaw(angle) {
    return Math.PI / 2 - angle;
  }

  thirdPersonDistance() {
    return Math.max(this.w, this.h) * 0.34;
  }

  /** 單人模式：鏡頭固定喺角色背面 */
  updateThirdPersonCamera(ship, instant = false) {
    const wx = ship.pos.x - this.worldW / 2;
    const wz = ship.pos.y - this.worldH / 2;
    const targetYaw = this.shipYaw(ship.angle);

    if (instant || !this.soloCameraReady) {
      this._camYaw = targetYaw;
    } else {
      let diff = targetYaw - this._camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this._camYaw += diff * (this.mobile ? 0.12 : 0.09);
    }

    this.cameraRig.position.set(wx, 0, wz);
    this.cameraRig.rotation.set(0, this._camYaw, 0);
    this.cameraRig.updateMatrixWorld(true);

    const dist = this.thirdPersonDistance();
    const height = dist * 0.48;
    const back = dist * 0.88;

    // 模型正面係 +Z；鏡頭放 -Z（背面），望向前方 +Z（槍口方向）
    this._targetCamPos.set(0, height, -back).applyMatrix4(this.cameraRig.matrixWorld);
    this._targetLookPos.set(0, 9, 20).applyMatrix4(this.cameraRig.matrixWorld);

    const alpha = instant || !this.soloCameraReady ? 1 : (this.mobile ? 0.2 : 0.16);
    this._smoothCamPos.lerp(this._targetCamPos, alpha);
    this._smoothLookPos.lerp(this._targetLookPos, alpha);

    this.camera.position.copy(this._smoothCamPos);
    this.camera.lookAt(this._smoothLookPos);
    this.soloCameraReady = true;
  }

  /** 雙人 / 線上：俯視跟隨 */
  updateTopDownCamera(focusGX, focusGY) {
    const vw = this.w;
    const vh = this.h;
    const maxDim = Math.max(vw, vh);
    const minDim = Math.min(vw, vh);

    const marginX = vw * 0.42;
    const marginY = vh * 0.42;
    this.camFocusX += (Math.max(marginX, Math.min(this.worldW - marginX, focusGX)) - this.camFocusX) * 0.14;
    this.camFocusY += (Math.max(marginY, Math.min(this.worldH - marginY, focusGY)) - this.camFocusY) * 0.14;

    const fx = this.camFocusX - this.worldW / 2;
    const fz = this.camFocusY - this.worldH / 2;
    const dist = maxDim * 0.54 + minDim * 0.11;

    this.camera.position.set(fx, dist * 0.94, fz + dist * 0.28);
    this.camera.lookAt(fx, 0, fz);
  }

  /** 鏡頭喺地面嘅朝向（弧度）— 只用於顯示，唔再控制移動 */
  getCameraForwardAngle(fallbackAngle = -Math.PI / 2) {
    if (!this._smoothLookPos || !this._smoothCamPos || !this.soloCameraReady) {
      return fallbackAngle;
    }
    const dx = this._smoothLookPos.x - this._smoothCamPos.x;
    const dz = this._smoothLookPos.z - this._smoothCamPos.z;
    if (Math.hypot(dx, dz) < 0.001) return fallbackAngle;
    return Math.atan2(dz, dx);
  }

  updateCamera(game) {
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();

    const solo = game.playMode === 'solo' && game.state === 'playing';
    if (solo && game.ship && !game.ship.eliminated) {
      this.camera.fov = 62;
      this.updateThirdPersonCamera(game.ship, !this.soloCameraReady);
      return;
    }

    this.soloCameraReady = false;
    this.camera.fov = 54;
    const focus = game.getCameraFocus?.() || { x: game.worldW / 2, y: game.worldH / 2 };
    this.updateTopDownCamera(focus.x, focus.y);
  }

  setVisible(visible) {
    this.renderer.domElement.style.display = visible ? 'block' : 'none';
  }

  toWorld(x, y) {
    return { x: x - this.worldW / 2, z: y - this.worldH / 2 };
  }

  projectToScreen(gameX, gameY, heightY = 0) {
    this._projVec.set(gameX - this.worldW / 2, heightY, gameY - this.worldH / 2);
    this._projVec.project(this.camera);
    return {
      x: (this._projVec.x * 0.5 + 0.5) * this.w,
      y: (-this._projVec.y * 0.5 + 0.5) * this.h,
    };
  }

  disposeShipMesh(ship, mesh) {
    if (mesh.userData.nameSprite) {
      mesh.userData.nameSprite.material.map?.dispose();
      mesh.userData.nameSprite.material.dispose();
    }
    mesh.traverse((o) => this.disposeObject3D(o));
    this.entityRoot.remove(mesh);
    this.shipMeshes.delete(ship);
    this.shipFx.delete(ship);
  }

  syncShip(ship) {
    if (!ship) return;
    const charId = ship.characterDef?.id || 'hayato';
    let mesh = this.shipMeshes.get(ship);
    if (mesh && mesh.userData.charId !== charId) {
      this.disposeShipMesh(ship, mesh);
      mesh = null;
    }
    if (!mesh) {
      mesh = createPlayerMesh(ship.characterDef);
      mesh.userData.charId = charId;
      this.entityRoot.add(mesh);
      this.shipMeshes.set(ship, mesh);
      const color = ship.playerIndex === 1 ? '#7ecf8e' : '#ffcc00';
      const tag = ship.displayName || (ship.playerIndex === 1 ? 'P2' : 'P1');
      mesh.userData.nameSprite = createNameSprite(tag, color);
      mesh.userData.nameSprite.position.set(0, getNameTagHeight(charId), 0);
      mesh.add(mesh.userData.nameSprite);
      mesh.userData.fxGroup = createShipFxGroup();
      mesh.add(mesh.userData.fxGroup);
    }
    if (ship.eliminated || ship.dead) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const p = this.toWorld(ship.pos.x, ship.pos.y);
    mesh.position.set(p.x, 0, p.z);
    mesh.rotation.y = this.shipYaw(ship.angle);
    const bob = Math.sin(this.t * 0.12 + ship.playerIndex) * 0.6;
    mesh.position.y = bob;
    if (ship.moving) {
      mesh.rotation.z = Math.sin(ship.walkFrame) * 0.08;
    } else {
      mesh.rotation.z = 0;
    }
    const blinkOff = ship.invincible > 0 && Math.floor(ship.invincible / 4) % 2 === 0;
    mesh.visible = !blinkOff;

    const tag = ship.displayName || (ship.playerIndex === 1 ? 'P2' : 'P1');
    updateNameSprite(mesh.userData.nameSprite, tag);
    mesh.userData.nameSprite.visible = !ship.dead && !ship.eliminated;

    this.syncShipEquipment(ship, mesh);
  }

  syncShipEquipment(ship, mesh) {
    const fxGroup = mesh.userData.fxGroup;
    if (!fxGroup) return;
    const fx = fxGroup.userData.fx;
    const t = ship.fxPulse;

    fx.rapid.visible = ship.hasBuff('rapid');
    if (fx.rapid.visible) {
      const s = 1 + Math.sin(t * 3) * 0.1;
      fx.rapid.scale.set(s, s, s);
      fx.rapid.rotation.z = t * 0.08;
    }

    fx.dualL.visible = fx.dualR.visible = ship.hasBuff('dual');
    if (fx.dualL.visible) {
      const s = 1 + Math.sin(t * 4) * 0.15;
      fx.dualL.scale.setScalar(s);
      fx.dualR.scale.setScalar(1 + Math.sin(t * 4 + 1) * 0.15);
    }

    fx.spread.visible = ship.hasBuff('spread');
    if (fx.spread.visible) fx.spread.rotation.y = Math.sin(t * 2) * 0.05;

    fx.lightning.visible = ship.hasBuff('lightning');
    if (fx.lightning.visible) {
      fx.lightning.rotation.z = t * 0.12;
      fx.lightning.material.emissiveIntensity = 0.65 + Math.sin(t * 6) * 0.25;
    }

    fx.wheelOrbit.visible = ship.hasBuff('wheel');
    if (fx.wheelOrbit.visible) {
      const orbitR = ship.wheelOrbit / ENTITY_SCALE;
      if (fx.wheelOrbit.userData.lastR !== orbitR) {
        fx.wheelOrbit.geometry.dispose();
        fx.wheelOrbit.geometry = new THREE.TorusGeometry(orbitR, 0.4, 4, 36, Math.PI * 1.5);
        fx.wheelOrbit.userData.lastR = orbitR;
      }
      fx.wheelOrbit.rotation.z = t * 0.5;
    }

    const charId = ship.characterDef?.id;
    fx.talent.visible = !!charId && (charId === 'viktor' || charId === 'zara' || (charId === 'hayato' && ship.moving));
    if (fx.talent.visible) {
      if (charId === 'hayato') {
        fx.talent.material.color.set(0xff4444);
        fx.talent.material.emissive.set(0xff2222);
      } else if (charId === 'viktor') {
        fx.talent.material.color.set(0xb4c8dc);
        fx.talent.material.emissive.set(0x8899aa);
      } else {
        fx.talent.material.color.set(0x00e5ff);
        fx.talent.material.emissive.set(0x00aacc);
      }
      fx.talent.rotation.z = t * 0.06;
    }

    fx.shield.visible = ship.invincible > 0;
    if (fx.shield.visible) {
      const blinkOff = Math.floor(ship.invincible / 4) % 2 === 0;
      fx.shield.rotation.y = t * 0.1;
      fx.shield.material.opacity = blinkOff ? 0.35 : 0.18;
    }

    let wheelFx = this.shipFx.get(ship);
    if (!wheelFx) {
      wheelFx = { wheels: [] };
      this.shipFx.set(ship, wheelFx);
    }
    const wheelCount = ship.hasBuff('wheel') ? ship.getWheelCount() : 0;
    while (wheelFx.wheels.length < wheelCount) {
      const w = createWheelMesh3D();
      this.entityRoot.add(w);
      wheelFx.wheels.push(w);
    }
    const positions = ship.hasBuff('wheel') ? ship.getWheelPositions() : [];
    for (let i = 0; i < wheelFx.wheels.length; i++) {
      const wm = wheelFx.wheels[i];
      if (i < wheelCount) {
        const wp = positions[i];
        const p = this.toWorld(wp.x, wp.y);
        wm.visible = true;
        wm.position.set(p.x, 3.5, p.z);
        wm.rotation.y = wp.spin;
      } else {
        wm.visible = false;
      }
    }
  }

  syncZombies(asteroids) {
    for (const a of asteroids) {
      if (!a.active) continue;
      let mesh = this.zombieMeshes.get(a);
      if (!mesh) {
        mesh = createZombieMesh(a);
        this.entityRoot.add(mesh);
        this.zombieMeshes.set(a, mesh);
      }
      mesh.visible = true;
      const p = this.toWorld(a.pos.x, a.pos.y);
      mesh.position.set(p.x, 0, p.z);
      mesh.rotation.y = a.angle || 0;
      const bob = Math.sin(this.t * 0.08 + a.pos.x * 0.01) * 0.7;
      mesh.position.y = bob;
      const flash = a.lightningFlash > 0;
      mesh.traverse((c) => {
        if (c.material?.emissive) {
          c.material.emissiveIntensity = flash ? 0.85 : (a.isBoss ? 0.45 : 0.12);
          if (flash) c.material.emissive.set(0x44aaff);
          else if (a.isBoss) c.material.emissive.set(0x330011);
          else c.material.emissive.set(0x112211);
        }
      });
      if (mesh.userData.aura) {
        mesh.userData.aura.material.opacity = 0.2 + Math.sin(this.t * 0.06) * 0.08;
      }
    }
    for (const [a, mesh] of this.zombieMeshes) {
      if (!a.active) mesh.visible = false;
    }
  }

  syncBullets(bullets) {
    for (const b of bullets) {
      if (!b.active) continue;
      let mesh = this.bulletMeshes.get(b);
      if (!mesh) {
        const mat = new THREE.MeshStandardMaterial({
          color: b.lightning ? 0xaaeeff : 0xffee88,
          emissive: b.lightning ? 0x44aaff : 0xff8800,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          metalness: 0.1,
        });
        const size = Math.max(2, (b.radius || 3) * 0.85);
        mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 10), mat);
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(size * 1.8, 8, 8),
          new THREE.MeshBasicMaterial({
            color: b.lightning ? 0x88ddff : 0xffcc44,
            transparent: true,
            opacity: 0.35,
          })
        );
        mesh.add(glow);
        mesh.userData.glow = glow;
        mesh.userData.isLightning = b.lightning;
        this.entityRoot.add(mesh);
        this.bulletMeshes.set(b, mesh);
      }
      mesh.visible = true;
      const p = this.toWorld(b.pos.x, b.pos.y);
      mesh.position.set(p.x, 3.5, p.z);
      if (mesh.userData.glow) {
        mesh.userData.glow.material.opacity = 0.25 + Math.sin(this.t * 0.2) * 0.12;
      }
    }
    for (const [b, mesh] of this.bulletMeshes) {
      if (!b.active) mesh.visible = false;
    }
  }

  syncPickups(pickups) {
    for (const pk of pickups) {
      if (!pk.active) continue;
      let mesh = this.pickupMeshes.get(pk);
      if (!mesh) {
        mesh = createPickupMesh(pk.type);
        this.entityRoot.add(mesh);
        this.pickupMeshes.set(pk, mesh);
      }
      mesh.visible = true;
      const p = this.toWorld(pk.pos.x, pk.pos.y);
      const pulse = 1 + Math.sin(this.t * 0.1 + pk.pulse) * 0.18;
      const float = 5 + Math.sin(this.t * 0.1 + pk.pulse) * 2;
      mesh.position.set(p.x, float, p.z);
      mesh.rotation.y = this.t * 0.04;
      mesh.scale.setScalar(pulse);
      if (mesh.userData.ring) mesh.userData.ring.rotation.z = this.t * 0.06;
      if (mesh.userData.glow) {
        mesh.userData.glow.material.opacity = 0.1 + Math.sin(this.t * 0.12 + pk.pulse) * 0.06;
      }
    }
    for (const [pk, mesh] of this.pickupMeshes) {
      if (!pk.active) mesh.visible = false;
    }
  }

  syncParticles(particles) {
    for (const p of particles) {
      if (!p.active) continue;
      let mesh = this.particleMeshes.get(p);
      if (!mesh) {
        const color = hex(p.color || '#ffffff');
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
        });
        const size = Math.max(1.2, p.radius * 0.9);
        mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 6), mat);
        this.entityRoot.add(mesh);
        this.particleMeshes.set(p, mesh);
      }
      mesh.visible = true;
      const wp = this.toWorld(p.pos.x, p.pos.y);
      mesh.position.set(wp.x, 3, wp.z);
      if (mesh.material) {
        mesh.material.opacity = Math.min(1, p.life / (p.maxLife || 20));
        if (p.color) mesh.material.color.set(p.color);
      }
    }
    for (const [part, mesh] of this.particleMeshes) {
      if (!part.active) mesh.visible = false;
    }
  }

  syncLightning(arcs) {
    while (this.lightningLines.length > arcs.length) {
      const line = this.lightningLines.pop();
      this.entityRoot.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const points = [
        new THREE.Vector3(arc.x1 - this.worldW / 2, 8, arc.y1 - this.worldH / 2),
        new THREE.Vector3(arc.mx - this.worldW / 2, 12, arc.my - this.worldH / 2),
        new THREE.Vector3(arc.x2 - this.worldW / 2, 8, arc.y2 - this.worldH / 2),
      ];
      let line = this.lightningLines[i];
      if (!line) {
        line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: 0xaaffff, transparent: true, opacity: 0.95, linewidth: 3 })
        );
        this.entityRoot.add(line);
        this.lightningLines[i] = line;
      }
      line.geometry.setFromPoints(points);
      line.material.opacity = arc.life / 20;
    }
  }

  syncDragonflyWave(wave) {
    if (!this.dragonflyMesh) {
      const geo = new THREE.RingGeometry(2, 4, 40);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ddff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      });
      this.dragonflyMesh = new THREE.Mesh(geo, mat);
      this.dragonflyMesh.rotation.x = -Math.PI / 2;
      this.entityRoot.add(this.dragonflyMesh);
    }
    if (!wave) {
      this.dragonflyMesh.visible = false;
      return;
    }
    this.dragonflyMesh.visible = true;
    const p = this.toWorld(wave.x, wave.y);
    this.dragonflyMesh.position.set(p.x, 1.5, p.z);
    const s = wave.r;
    this.dragonflyMesh.scale.set(s, s, s);
    this.dragonflyMesh.material.opacity = (wave.life / 22) * 0.65;
  }

  sync(game) {
    this.t++;
    const sizeChanged = game.w !== this.w || game.h !== this.h
      || game.worldW !== this.worldW || game.worldH !== this.worldH;
    if (sizeChanged) this.resize(game.w, game.h, game.worldW, game.worldH);

    this.syncShip(game.ship);
    if (game.ship2) this.syncShip(game.ship2);
    this.syncZombies(game.asteroids);
    this.syncBullets(game.bullets);
    this.syncPickups(game.pickups);
    this.syncParticles(game.particles);
    this.syncLightning(game.lightningArcs || []);
    this.syncDragonflyWave(game.dragonflyWave);

    this.updateCamera(game);

    this.renderer.render(this.scene, this.camera);
  }
}
