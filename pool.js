export class Pool {
  constructor(factory, size) {
    this.factory = factory;
    this.items = Array.from({ length: size }, () => factory());
    this.free = [...this.items];
  }

  acquire() {
    return this.free.pop() ?? null;
  }

  release(item) {
    this.free.push(item);
  }
}
