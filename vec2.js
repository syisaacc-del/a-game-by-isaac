export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mul(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  setLength(n) {
    const len = this.length();
    if (len === 0) return this;
    this.mul(n / len);
    return this;
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  setAngle(a) {
    const len = this.length();
    this.x = Math.cos(a) * len;
    this.y = Math.sin(a) * len;
    return this;
  }

  static fromAngle(a, len = 1) {
    return new Vec2(Math.cos(a) * len, Math.sin(a) * len);
  }
}
