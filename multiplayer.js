/** Local 2P + optional PeerJS online co-op */

export class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.mode = 'solo';
    this.peer = null;
    this.conn = null;
    this.roomId = '';
    this.isHost = false;
    this.remoteInput = { dx: 0, dy: 0, shooting: false };
    this.syncTimer = 0;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode !== 'online') this.disconnect();
  }

  disconnect() {
    if (this.conn) { this.conn.close(); this.conn = null; }
    if (this.peer) { this.peer.destroy(); this.peer = null; }
    this.roomId = '';
    this.isHost = false;
  }

  async hostOnline() {
    if (typeof Peer === 'undefined') throw new Error('PeerJS 未載入');
    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isHost = true;
      this.roomId = `zs-${Math.random().toString(36).slice(2, 8)}`;
      this.peer = new Peer(this.roomId);
      this.peer.on('open', (id) => {
        this.roomId = id;
        resolve(id);
      });
      this.peer.on('connection', (conn) => {
        this.conn = conn;
        conn.on('open', () => this.game.showPickupMsg('隊友已加入！'));
        conn.on('data', (data) => { this.remoteInput = data; });
      });
      this.peer.on('error', reject);
    });
  }

  async joinOnline(roomId) {
    if (typeof Peer === 'undefined') throw new Error('PeerJS 未載入');
    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isHost = false;
      this.peer = new Peer();
      this.peer.on('open', () => {
        this.conn = this.peer.connect(roomId.trim());
        this.conn.on('open', () => resolve());
        this.conn.on('data', (data) => this.game.applyNetworkState(data));
        this.conn.on('error', reject);
      });
      this.peer.on('error', reject);
    });
  }

  sendInput(input) {
    if (this.conn?.open) this.conn.send(input);
  }

  sendState(state) {
    if (this.conn?.open && this.isHost) this.conn.send(state);
  }

  update() {
    if (this.mode !== 'online' || !this.isHost) return;
    this.syncTimer++;
    if (this.syncTimer % 3 !== 0) return;
    const g = this.game;
    this.sendState({
      asteroids: g.asteroids.filter((a) => a.active).slice(0, 40).map((a) => ({
        x: a.pos.x, y: a.pos.y, type: a.type, isBoss: a.isBoss,
        bossHp: a.bossHp, maxBossHp: a.maxBossHp,
      })),
      score: g.score,
      level: g.level,
      p1: { x: g.ship.pos.x, y: g.ship.pos.y, hp: g.ship.hp },
      p2: g.ship2 ? { x: g.ship2.pos.x, y: g.ship2.pos.y, hp: g.ship2.hp } : null,
    });
  }
}
