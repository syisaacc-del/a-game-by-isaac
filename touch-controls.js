export class TouchControls {
  constructor(root, callbacks = {}) {
    this.root = root;
    this.onDragonfly = callbacks.onDragonfly || (() => {});
    this.dx = 0;
    this.dy = 0;
    this.shooting = false;
    this.activePointer = null;
    this.baseX = 0;
    this.baseY = 0;
    this.stickX = 0;
    this.stickY = 0;
    this.maxRadius = 56;
    this.dragonflyVisible = false;
    this.dragonflyCd = 0;

    this.joystick = root.querySelector('#joystick');
    this.joystickBase = root.querySelector('#joystick-base');
    this.joystickStick = root.querySelector('#joystick-stick');
    this.btnShoot = root.querySelector('#btn-shoot');
    this.btnDragonfly = root.querySelector('#btn-dragonfly');

    this.bindJoystick();
    this.bindButtons();
  }

  bindJoystick() {
    const zone = this.joystick;
    if (!zone) return;

    const onStart = (e) => {
      const p = e.changedTouches ? e.changedTouches[0] : e;
      if (this.activePointer !== null) return;
      e.preventDefault();
      this.activePointer = p.identifier ?? 'mouse';
      const rect = zone.getBoundingClientRect();
      this.baseX = rect.left + rect.width / 2;
      this.baseY = rect.top + rect.height / 2;
      this.joystickBase.style.left = `${this.baseX - 60}px`;
      this.joystickBase.style.top = `${this.baseY - 60}px`;
      this.joystickBase.classList.remove('hidden');
      this.moveStick(p.clientX, p.clientY);
    };

    const onMove = (e) => {
      if (this.activePointer === null) return;
      const list = e.changedTouches || [e];
      for (const p of list) {
        const id = p.identifier ?? 'mouse';
        if (id === this.activePointer) {
          e.preventDefault();
          this.moveStick(p.clientX, p.clientY);
          break;
        }
      }
    };

    const onEnd = (e) => {
      const list = e.changedTouches || [e];
      for (const p of list) {
        const id = p.identifier ?? 'mouse';
        if (id === this.activePointer) {
          e.preventDefault();
          this.resetJoystick();
          break;
        }
      }
    };

    zone.addEventListener('touchstart', onStart, { passive: false });
    zone.addEventListener('touchmove', onMove, { passive: false });
    zone.addEventListener('touchend', onEnd, { passive: false });
    zone.addEventListener('touchcancel', onEnd, { passive: false });
    zone.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }

  moveStick(clientX, clientY) {
    let ox = clientX - this.baseX;
    let oy = clientY - this.baseY;
    const dist = Math.hypot(ox, oy);
    if (dist > this.maxRadius) {
      ox = (ox / dist) * this.maxRadius;
      oy = (oy / dist) * this.maxRadius;
    }
    this.stickX = ox;
    this.stickY = oy;
    this.dx = ox / this.maxRadius;
    this.dy = oy / this.maxRadius;
    this.joystickStick.style.transform = `translate(${ox}px, ${oy}px)`;
  }

  resetJoystick() {
    this.activePointer = null;
    this.dx = 0;
    this.dy = 0;
    this.stickX = 0;
    this.stickY = 0;
    this.joystickStick.style.transform = 'translate(0, 0)';
    this.joystickBase.classList.add('hidden');
  }

  bindButtons() {
    const hold = (btn, key) => {
      if (!btn) return;
      const down = (e) => {
        e.preventDefault();
        this[key] = true;
        btn.classList.add('pressed');
      };
      const up = (e) => {
        e.preventDefault();
        this[key] = false;
        btn.classList.remove('pressed');
      };
      btn.addEventListener('touchstart', down, { passive: false });
      btn.addEventListener('touchend', up, { passive: false });
      btn.addEventListener('touchcancel', up, { passive: false });
      btn.addEventListener('mousedown', down);
      btn.addEventListener('mouseup', up);
      btn.addEventListener('mouseleave', up);
    };

    hold(this.btnShoot, 'shooting');

    if (this.btnDragonfly) {
      const tap = (e) => {
        e.preventDefault();
        if (this.dragonflyCd > 0 || !this.dragonflyVisible) return;
        this.onDragonfly();
      };
      this.btnDragonfly.addEventListener('touchstart', tap, { passive: false });
      this.btnDragonfly.addEventListener('click', tap);
    }
  }

  getInput() {
    return { dx: this.dx, dy: this.dy, shooting: this.shooting };
  }

  setDragonflyVisible(visible) {
    this.dragonflyVisible = visible;
    if (this.btnDragonfly) {
      this.btnDragonfly.classList.toggle('hidden', !visible);
    }
  }

  updateCooldown(cd) {
    this.dragonflyCd = cd;
    if (!this.btnDragonfly || !this.dragonflyVisible) return;
    if (cd > 0) {
      this.btnDragonfly.textContent = `${Math.ceil(cd / 60)}s`;
      this.btnDragonfly.classList.add('cooldown');
    } else {
      this.btnDragonfly.textContent = '必殺';
      this.btnDragonfly.classList.remove('cooldown');
    }
  }

  setVisible(visible) {
    this.root.classList.toggle('controls-hidden', !visible);
  }
}
