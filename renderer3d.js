import * as THREE from 'three';
import { PICKUP_TYPES } from './pickup.js';

function hex(c) {
  return new THREE.Color(c);
}

function createPlayerMesh(colors) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: hex(colors?.body || '#2d2d44') });
  const skinMat = new THREE.MeshLambertMaterial({ color: hex(colors?.skin || '#f5d0b0') });
  const accentMat = new THREE.MeshLambertMaterial({
    color: hex(colors?.accent || '#e63946'),
    emissive: hex(colors?.accent || '#e63946'),
    emissiveIntensity: 0.25,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 7, 4, 8), bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 4;
  body.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 10), skinMat);
  head.position.set(0, 4, 7);
  head.castShadow = true;

  const gun = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 5), accentMat);
  gun.position.set(2.5, 3.5, 8);
  gun.castShadow = true;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(5, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;

  g.add(shadow, body, head, gun);
  g.userData.parts = { body, head, gun };
  return g;
}

function createZombieMesh(a) {
  const g = new THREE.Group();
  const scale = a.isBoss ? 2.8 : (a.scale || 1);
  const color = a.isBoss ? 0x8b0000 : (a.type === 'b' ? 0x3d6b3d : a.type === 'm' ? 0x5a8f5a : 0x7ecf8e);

  const mat = new THREE.MeshLambertMaterial({
    color,
    emissive: a.isBoss ? 0x440000 : 0x112211,
    emissiveIntensity: a.isBoss ? 0.35 : 0.1,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(6 * scale, 8 * scale, 5 * scale), mat);
  torso.position.y = 4 * scale;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(4 * scale, 4 * scale, 4 * scale), mat);
  head.position.y = 10 * scale;
  head.castShadow = true;

  if (a.isBoss) {
    const hornMat = new THREE.MeshLambertMaterial({ color: 0xff4444, emissive: 0x660000, emissiveIntensity: 0.4 });
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(1.5 * scale, 4 * scale, 4), hornMat);
      horn.position.set(side * 3 * scale, 13 * scale, 0);
      horn.rotation.z = side * 0.4;
      g.add(horn);
    }
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(5 * scale, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;

  g.add(shadow, torso, head);
  g.userData.scale = scale;
  return g;
}

export class Renderer3D {
  constructor(container, { mobile = false } = {}) {
    this.mobile = mobile;
    this.w = 800;
    this.h = 600;
    this.t = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121212);
    this.scene.fog = new THREE.Fog(0x121212, 350, 1400);

    this.camera = new THREE.PerspectiveCamera(48, 1, 2, 2500);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      powerPreference: mobile ? 'low-power' : 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 2));
    this.renderer.shadowMap.enabled = !mobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.id = 'game3d-canvas';
    container.insertBefore(this.renderer.domElement, container.firstChild);

    this.setupLights();
    this.floor = null;
    this.grid = null;
    this.arena = new THREE.Group();
    this.scene.add(this.arena);

    this.entityRoot = new THREE.Group();
    this.scene.add(this.entityRoot);

    this.shipMeshes = new Map();
    this.zombieMeshes = new Map();
    this.bulletMeshes = new Map();
    this.pickupMeshes = new Map();
    this.particleMeshes = new Map();
    this.lightningLines = [];

    this.activeZombies = new Set();
    this.activeBullets = new Set();
    this.activePickups = new Set();
    this.activeParticles = new Set();
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
    const amb = new THREE.AmbientLight(0x556677, 0.65);
    this.scene.add(amb);

    const sun = new THREE.DirectionalLight(0xfff0dd, 1.1);
    sun.position.set(120, 280, 80);
    sun.castShadow = !this.mobile;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 50;
      sun.shadow.camera.far = 800;
      sun.shadow.camera.left = -400;
      sun.shadow.camera.right = 400;
      sun.shadow.camera.top = 400;
      sun.shadow.camera.bottom = -400;
    }
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6688ff, 0.25);
    fill.position.set(-80, 100, -120);
    this.scene.add(fill);
  }

  rebuildFloor(w, h) {
    this.clearGroup(this.arena);

    const floorGeo = new THREE.PlaneGeometry(w, h);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x252525 });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.arena.add(this.floor);

    this.grid = new THREE.GridHelper(Math.max(w, h), this.mobile ? 12 : 20, 0x333344, 0x222233);
    this.grid.position.y = 0.1;
    this.arena.add(this.grid);

    const wallMat = new THREE.MeshLambertMaterial({ color: 0x1a1a22, transparent: true, opacity: 0.55 });
    const wallH = 12;
    const walls = [
      [w, wallH, 2, 0, wallH / 2, -h / 2],
      [w, wallH, 2, 0, wallH / 2, h / 2],
      [2, wallH, h, -w / 2, wallH / 2, 0],
      [2, wallH, h, w / 2, wallH / 2, 0],
    ];
    for (const [ww, wh, wd, x, y, z] of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), wallMat);
      wall.position.set(x, y, z);
      this.arena.add(wall);
    }
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.rebuildFloor(w, h);
    this.updateCamera();
  }

  updateCamera() {
    const dist = Math.max(this.w, this.h) * 0.72;
    this.camera.position.set(0, dist * 1.05, dist * 0.72);
    this.camera.lookAt(0, 0, 0);
  }

  setVisible(visible) {
    this.renderer.domElement.style.display = visible ? 'block' : 'none';
  }

  toWorld(x, y) {
    return { x: x - this.w / 2, z: y - this.h / 2 };
  }

  syncShip(ship) {
    if (!ship) return;
    let mesh = this.shipMeshes.get(ship);
    if (!mesh) {
      mesh = createPlayerMesh(ship.characterDef?.colors);
      this.entityRoot.add(mesh);
      this.shipMeshes.set(ship, mesh);
    }
    if (ship.eliminated || ship.dead) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const p = this.toWorld(ship.pos.x, ship.pos.y);
    mesh.position.set(p.x, 0, p.z);
    mesh.rotation.y = -ship.angle;
    const bob = Math.sin(this.t * 0.12 + ship.playerIndex) * 0.4;
    mesh.position.y = bob;
    if (ship.invincible > 0 && Math.floor(ship.invincible / 4) % 2 === 0) {
      mesh.visible = false;
    }
  }

  syncZombies(asteroids) {
    this.activeZombies.clear();
    for (const a of asteroids) {
      if (!a.active) continue;
      this.activeZombies.add(a);
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
      const bob = Math.sin(this.t * 0.08 + a.pos.x * 0.01) * 0.5;
      mesh.position.y = bob;
      if (a.lightningFlash > 0) {
        mesh.children.forEach((c) => {
          if (c.material?.emissive) c.material.emissiveIntensity = 0.8;
        });
      }
    }
    for (const [a, mesh] of this.zombieMeshes) {
      if (!a.active) mesh.visible = false;
    }
  }

  syncBullets(bullets) {
    this.activeBullets.clear();
    for (const b of bullets) {
      if (!b.active) continue;
      this.activeBullets.add(b);
      let mesh = this.bulletMeshes.get(b);
      if (!mesh) {
        const mat = new THREE.MeshLambertMaterial({
          color: b.lightning ? 0xaaeeff : 0xffdd66,
          emissive: b.lightning ? 0x44aaff : 0xff8800,
          emissiveIntensity: 0.6,
        });
        mesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), mat);
        this.entityRoot.add(mesh);
        this.bulletMeshes.set(b, mesh);
      }
      mesh.visible = true;
      const p = this.toWorld(b.pos.x, b.pos.y);
      mesh.position.set(p.x, 2.5, p.z);
    }
    for (const [b, mesh] of this.bulletMeshes) {
      if (!b.active) mesh.visible = false;
    }
  }

  syncPickups(pickups) {
    this.activePickups.clear();
    for (const pk of pickups) {
      if (!pk.active) continue;
      this.activePickups.add(pk);
      let mesh = this.pickupMeshes.get(pk);
      if (!mesh) {
        const def = PICKUP_TYPES[pk.type];
        const mat = new THREE.MeshLambertMaterial({
          color: hex(def?.color || '#ffcc00'),
          emissive: hex(def?.color || '#ffcc00'),
          emissiveIntensity: 0.45,
        });
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(3.5, 0), mat);
        this.entityRoot.add(mesh);
        this.pickupMeshes.set(pk, mesh);
      }
      mesh.visible = true;
      const p = this.toWorld(pk.pos.x, pk.pos.y);
      const float = 4 + Math.sin(this.t * 0.1 + pk.pulse) * 1.5;
      mesh.position.set(p.x, float, p.z);
      mesh.rotation.y = this.t * 0.03;
      mesh.rotation.x = this.t * 0.02;
    }
    for (const [pk, mesh] of this.pickupMeshes) {
      if (!pk.active) mesh.visible = false;
    }
  }

  syncParticles(particles) {
    this.activeParticles.clear();
    for (const p of particles) {
      if (!p.active) continue;
      this.activeParticles.add(p);
      let mesh = this.particleMeshes.get(p);
      if (!mesh) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.85,
        });
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 4, 4), mat);
        this.entityRoot.add(mesh);
        this.particleMeshes.set(p, mesh);
      }
      mesh.visible = true;
      const wp = this.toWorld(p.pos.x, p.pos.y);
      mesh.position.set(wp.x, 2, wp.z);
      if (mesh.material) mesh.material.opacity = Math.min(1, p.life / (p.maxLife || 20));
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
        new THREE.Vector3(arc.x1 - this.w / 2, 5, arc.y1 - this.h / 2),
        new THREE.Vector3(arc.mx - this.w / 2, 6, arc.my - this.h / 2),
        new THREE.Vector3(arc.x2 - this.w / 2, 5, arc.y2 - this.h / 2),
      ];
      let line = this.lightningLines[i];
      if (!line) {
        line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: 0xaaffff, transparent: true, opacity: 0.9 })
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
      const geo = new THREE.RingGeometry(1, 2, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ddff,
        transparent: true,
        opacity: 0.5,
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
    this.dragonflyMesh.position.set(p.x, 1, p.z);
    const s = wave.r;
    this.dragonflyMesh.scale.set(s, s, s);
    this.dragonflyMesh.material.opacity = (wave.life / 22) * 0.6;
  }

  sync(game) {
    this.t++;
    if (game.w !== this.w || game.h !== this.h) this.resize(game.w, game.h);

    this.syncShip(game.ship);
    if (game.ship2) this.syncShip(game.ship2);
    this.syncZombies(game.asteroids);
    this.syncBullets(game.bullets);
    this.syncPickups(game.pickups);
    this.syncParticles(game.particles);
    this.syncLightning(game.lightningArcs || []);
    this.syncDragonflyWave(game.dragonflyWave);

    this.renderer.render(this.scene, this.camera);
  }
}
