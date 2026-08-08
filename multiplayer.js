/** Local 2P + PeerJS online co-op (host authoritative) */

function randomRoomCode() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

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
    this.guestConnected = false;
    this.localReady = false;
    this.remoteReady = false;
    this.remoteCharId = 'viktor';
    this.hostCharId = 'hayato';
  }

  setMode(mode) {
    this.mode = mode;
    if (mode !== 'online') this.disconnect();
  }

  resetLobby() {
    this.guestConnected = false;
    this.localReady = false;
    this.remoteReady = false;
    this.remoteCharId = 'viktor';
    this.hostCharId = 'hayato';
    this.remoteInput = { dx: 0, dy: 0, shooting: false };
  }

  disconnect() {
    if (this.conn) { this.conn.close(); this.conn = null; }
    if (this.peer) { this.peer.destroy(); this.peer = null; }
    this.roomId = '';
    this.isHost = false;
    this.resetLobby();
  }

  wireConnection(conn) {
    this.conn = conn;
    conn.on('data', (data) => this.handleMessage(data));
  }

  handleMessage(data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'input') {
      this.remoteInput = {
        dx: data.dx || 0,
        dy: data.dy || 0,
        shooting: !!data.shooting,
      };
      return;
    }

    if (data.type === 'ready') {
      this.remoteReady = true;
      if (data.charId) this.remoteCharId = data.charId;
      this.game.onRemoteReady();
      return;
    }

    if (data.type === 'start') {
      if (data.hostCharId) this.hostCharId = data.hostCharId;
      if (data.guestCharId) this.remoteCharId = data.guestCharId;
      this.game.startOnlineGame(data);
      return;
    }

    if (data.type === 'state') {
      this.game.applyNetworkState(data);
    }
  }

  tryHostWithCode(code) {
    return new Promise((resolve, reject) => {
      const peer = new Peer(code);
      const cleanup = () => {
        peer.removeAllListeners();
      };

      peer.on('open', (id) => {
        if (!/^\d{4}$/.test(id)) {
          cleanup();
          peer.destroy();
          reject(Object.assign(new Error('invalid peer id'), { type: 'unavailable-id' }));
          return;
        }
        this.peer = peer;
        this.roomId = id;
        peer.on('connection', (conn) => {
          this.wireConnection(conn);
          conn.on('open', () => {
            this.guestConnected = true;
            this.game.onGuestJoined();
          });
        });
        peer.on('error', (err) => {
          if (err.type === 'unavailable-id') return;
          this.game.showPickupMsg('連線中斷');
        });
        resolve(id);
      });

      peer.on('error', (err) => {
        cleanup();
        peer.destroy();
        reject(err);
      });
    });
  }

  async hostOnline() {
    if (typeof Peer === 'undefined') throw new Error('PeerJS 未載入');
    this.disconnect();
    this.isHost = true;
    this.mode = 'online';

    for (let i = 0; i < 10; i++) {
      const code = randomRoomCode();
      try {
        return await this.tryHostWithCode(code);
      } catch (err) {
        if (err?.type !== 'unavailable-id') throw err;
      }
    }
    throw new Error('無法建立房間，請稍後再試');
  }

  async joinOnline(roomId) {
    if (typeof Peer === 'undefined') throw new Error('PeerJS 未載入');
    const code = roomId.trim();
    if (!/^\d{4}$/.test(code)) throw new Error('房間碼必須是4位數字');

    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isHost = false;
      this.mode = 'online';
      this.roomId = code;
      this.peer = new Peer();
      this.peer.on('open', () => {
        this.conn = this.peer.connect(code);
        this.wireConnection(this.conn);
        this.conn.on('open', () => resolve());
        this.conn.on('error', reject);
      });
      this.peer.on('error', reject);
    });
  }

  setLocalReady(ready) {
    this.localReady = ready;
  }

  canStart() {
    return this.isHost && this.guestConnected && this.localReady && this.remoteReady;
  }

  sendReady(charId) {
    if (this.conn?.open) {
      this.conn.send({ type: 'ready', charId });
    }
  }

  sendStart(payload) {
    if (this.conn?.open && this.isHost) {
      this.conn.send({ type: 'start', ...payload });
    }
  }

  sendInput(input) {
    if (this.conn?.open && !this.isHost) {
      this.conn.send({ type: 'input', ...input });
    }
  }

  sendState(state) {
    if (this.conn?.open && this.isHost) {
      this.conn.send({ type: 'state', ...state });
    }
  }

  update() {
    if (this.mode !== 'online' || !this.isHost || this.game.state !== 'playing') return;
    this.syncTimer++;
    if (this.syncTimer % 3 !== 0) return;
    const g = this.game;
    this.sendState({
      asteroids: g.asteroids.filter((a) => a.active).slice(0, 40).map((a) => ({
        x: a.pos.x,
        y: a.pos.y,
        type: a.type,
        isBoss: a.isBoss,
        bossHp: a.bossHp,
        maxBossHp: a.maxBossHp,
      })),
      bullets: g.bullets.filter((b) => b.active).slice(0, 60).map((b) => ({
        x: b.pos.x,
        y: b.pos.y,
        vx: b.vel.x,
        vy: b.vel.y,
      })),
      score: g.score,
      level: g.level,
      lives: g.lives,
      lives2: g.lives2,
      p1: {
        x: g.ship.pos.x,
        y: g.ship.pos.y,
        hp: g.ship.hp,
        dead: g.ship.dead,
        eliminated: g.ship.eliminated,
      },
      p2: g.ship2 ? {
        x: g.ship2.pos.x,
        y: g.ship2.pos.y,
        hp: g.ship2.hp,
        dead: g.ship2.dead,
        eliminated: g.ship2.eliminated,
      } : null,
    });
  }
}
