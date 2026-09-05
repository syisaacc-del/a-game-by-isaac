import { Pool } from './pool.js';
import { Ship, WHEEL_HIT_CD } from './ship.js';
import { Asteroid } from './asteroid.js';
import { Bullet } from './bullet.js';
import { Particle, burst } from './particle.js';
import { Pickup, PICKUP_TYPES } from './pickup.js';
import { CHARACTERS, getCharacter } from './characters.js';
import { drawCharacterPreview } from './character-draw.js';
import { MultiplayerManager } from './multiplayer.js';
import {
  Leaderboard,
  formatBattleDate,
  randomPlayerName,
  resolvePlayerName,
} from './player-profile.js';
import { Renderer3D } from './renderer3d.js';

const EQUIP_NAMES = {
  dual: '雙發', spread: '散射', rapid: '速射', wheel: '風火輪', lightning: '雷電',
};
const EQUIP_KEYS = ['dual', 'spread', 'rapid', 'wheel', 'lightning'];
const DRAGONFLY_CD = 3000;
const MAP_SCALE = 2.2;
const CHAIN_RANGE = 120;
const CHAIN_MAX = 3;
const MAX_ARCS = 12;
const TITLES = ['倖存者', '獵屍者', '雷霆戰士', '火焰使者', '不死傳說', '末日英雄'];

function titleForLevel(level) {
  if (level < 2) return '';
  return TITLES[Math.min(level - 2, TITLES.length - 1)] || '傳奇';
}

function pickRandomEquip() {
  const roll = Math.random();
  if (roll < 0.28) return 'wheel';
  if (roll < 0.42) return 'lightning';
  if (roll < 0.57) return 'dual';
  if (roll < 0.72) return 'spread';
  if (roll < 0.86) return 'rapid';
  return 'wheel';
}

class Game {
  constructor(options = {}) {
    this.mobile = !!options.mobile;
    this.touch = options.touchControls || null;

    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.gameView = document.getElementById('game-view');
    this.renderer3d = new Renderer3D(this.gameView || document.body, { mobile: this.mobile });
    this.scoreEl = document.getElementById('score');
    this.livesEl = document.getElementById('lives');
    this.levelEl = document.getElementById('level');
    this.equipEl = document.getElementById('equip');
    this.titleBanner = document.getElementById('title-banner');
    this.titleTextEl = document.getElementById('title-text');
    this.overlay = document.getElementById('overlay');
    this.overlayText = document.getElementById('overlay-text');
    this.overlayStatsEl = document.getElementById('overlay-stats');
    this.liveScoreboardEl = document.getElementById('live-scoreboard');
    this.sbP1El = document.getElementById('sb-p1');
    this.sbP2El = document.getElementById('sb-p2');
    this.p1NameInput = document.getElementById('p1-name');
    this.p2NameInput = document.getElementById('p2-name');
    this.p2NameRow = document.getElementById('p2-name-row');
    this.leaderboardModal = document.getElementById('leaderboard-modal');
    this.leaderboardListEl = document.getElementById('leaderboard-list');
    this.levelModal = document.getElementById('level-modal');
    this.charModal = document.getElementById('char-modal');
    this.mpModal = document.getElementById('mp-modal');
    this.roomCodeEl = document.getElementById('room-code');
    this.roomInputEl = document.getElementById('room-input');
    this.mpStatusEl = document.getElementById('mp-status');
    this.mpReadyHintEl = document.getElementById('mp-ready-hint');
    this.btnMpReadyEl = document.getElementById('btn-mp-ready');

    this.keys = {};
    this.w = 0;
    this.h = 0;
    this.worldW = 0;
    this.worldH = 0;
    this.scanLines = 0;
    this.charPreviewT = 0;

    this.ship = new Ship();
    this.ship2 = null;
    this.selectedCharId = 'hayato';
    this.selectedChar2Id = 'viktor';
    this.playerName = '';
    this.player2Name = '';
    this.killCount = 0;
    this.bossKills = 0;
    this.playMode = 'solo';
    this.onlineStarted = false;
    this.multiplayer = new MultiplayerManager(this);
    this.lives2 = 3;
    const particleCount = this.mobile ? 180 : 300;
    this.bulletPool = new Pool(() => new Bullet(), 120);
    this.asteroidPool = new Pool(() => new Asteroid(), 80);
    this.particlePool = new Pool(() => new Particle(), particleCount);
    this.pickupPool = new Pool(() => new Pickup(), 25);

    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.pickups = [];
    this.lightningArcs = [];

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.speedBoost = 0;
    this.state = 'charSelect';
    this.pendingRespawn = false;
    this.pickupMsg = '';
    this.pickupMsgTimer = 0;
    this.bossActive = false;
    this.bossFight = false;
    this.dragonflyCd = 0;
    this.setDragonflyUnlocked(false);
    this.playerTitle = '';
    this.titleFlash = 0;
    this.titleSparklePhase = 0;
    this.screenFlash = 0;
    this.dragonflyWave = null;
    this.levelsSinceBoss = 0;
    this.fullscreenRequested = false;

    this.bindEvents();
    this.resize();
    if (this.mobile) {
      document.body.addEventListener('touchstart', () => this.requestMobileFullscreen(), { once: true });
    }
    this.showCharSelect();
    requestAnimationFrame(this.loop.bind(this));
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    if (this.mobile) {
      this.bindMobileEvents();
      return;
    }

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === 'gameover') this.showCharSelect();
      }

      if (this.state === 'charSelect') {
        if (e.code === 'Digit1') this.selectCharacter('hayato');
        if (e.code === 'Digit2') this.selectCharacter('viktor');
        if (e.code === 'Digit3') this.selectCharacter('zara');
        if (e.code === 'Enter') this.beginSolo();
        if (e.code === 'KeyL') this.beginLocal();
      }

      if (this.state === 'onlineLobby') {
        if ((e.code === 'Enter' || e.code === 'KeyR') && !this.multiplayer.localReady) {
          e.preventDefault();
          this.setLobbyReady(true);
        }
      }

      if (this.state === 'levelPrompt') {
        if (e.code === 'KeyY') this.answerLevelPrompt(true);
        if (e.code === 'KeyN') this.answerLevelPrompt(false);
      }

      if (this.state === 'playing' && this.dragonflyUnlocked) {
        if (e.code === 'KeyY') this.useDragonfly();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    document.querySelectorAll('[data-char]').forEach((btn) => {
      btn.addEventListener('click', () => this.selectCharacter(btn.dataset.char));
    });
    document.getElementById('btn-solo')?.addEventListener('click', () => this.beginSolo());
    document.getElementById('btn-local')?.addEventListener('click', () => this.beginLocal());
    document.getElementById('btn-online-host')?.addEventListener('click', () => this.beginOnlineHost());
    document.getElementById('btn-online-join')?.addEventListener('click', () => this.beginOnlineJoin());
    this.btnMpReadyEl?.addEventListener('click', () => this.setLobbyReady(true));
    document.getElementById('btn-leaderboard')?.addEventListener('click', () => this.showLeaderboard());
    document.getElementById('btn-leaderboard-close')?.addEventListener('click', () => this.hideLeaderboard());
    document.getElementById('btn-random-p1')?.addEventListener('click', () => {
      if (this.p1NameInput) this.p1NameInput.value = randomPlayerName();
    });
    document.getElementById('btn-random-p2')?.addEventListener('click', () => {
      if (this.p2NameInput) this.p2NameInput.value = randomPlayerName();
    });
  }

  bindMobileEvents() {
    const overlayTap = () => {
      if (this.state === 'gameover') this.showCharSelect();
    };
    this.overlay.addEventListener('click', overlayTap);
    this.overlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
      overlayTap();
    }, { passive: false });

    document.querySelectorAll('[data-char]').forEach((btn) => {
      btn.addEventListener('click', () => this.selectCharacter(btn.dataset.char));
    });
    document.getElementById('btn-solo')?.addEventListener('click', () => this.beginSolo());
    document.getElementById('btn-local')?.addEventListener('click', () => this.beginLocal());
    document.getElementById('btn-online-host')?.addEventListener('click', () => this.beginOnlineHost());
    document.getElementById('btn-online-join')?.addEventListener('click', () => this.beginOnlineJoin());
    this.btnMpReadyEl?.addEventListener('click', () => this.setLobbyReady(true));
    document.getElementById('btn-leaderboard')?.addEventListener('click', () => this.showLeaderboard());
    document.getElementById('btn-leaderboard-close')?.addEventListener('click', () => this.hideLeaderboard());
    document.getElementById('btn-random-p1')?.addEventListener('click', () => {
      if (this.p1NameInput) this.p1NameInput.value = randomPlayerName();
    });
    document.getElementById('btn-random-p2')?.addEventListener('click', () => {
      if (this.p2NameInput) this.p2NameInput.value = randomPlayerName();
    });

    const btnY = document.getElementById('btn-boss-y');
    const btnN = document.getElementById('btn-boss-n');
    if (btnY) btnY.addEventListener('click', () => this.answerLevelPrompt(true));
    if (btnN) btnN.addEventListener('click', () => this.answerLevelPrompt(false));
  }

  setDragonflyUnlocked(unlocked) {
    this.dragonflyUnlocked = unlocked;
    if (this.touch) this.touch.setDragonflyVisible(unlocked);
  }

  resize() {
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.worldW = Math.round(this.w * MAP_SCALE);
    this.worldH = Math.round(this.h * MAP_SCALE);
    this.scanLines = this.mobile ? (this.h / 8) | 0 : (this.h / 4) | 0;
    this.ship.setScreenSize(this.worldW, this.worldH);
    if (this.ship2) this.ship2.setScreenSize(this.worldW, this.worldH);
    this.renderer3d?.resize(this.w, this.h, this.worldW, this.worldH);
  }

  /** 雙人 / 線上俯視鏡頭用；單人第三人稱鏡頭在 renderer3d.js */
  getCameraFocus() {
    const players = this.getPlayers().filter((p) => !p.dead && !p.eliminated);
    if (players.length === 0) {
      return { x: this.worldW / 2, y: this.worldH / 2 };
    }
    if (players.length === 1) {
      return { x: players[0].pos.x, y: players[0].pos.y };
    }
    return {
      x: (players[0].pos.x + players[1].pos.x) / 2,
      y: (players[0].pos.y + players[1].pos.y) / 2,
    };
  }

  showOverlay(text, statsHtml = '') {
    this.overlayText.textContent = text;
    if (this.overlayStatsEl) this.overlayStatsEl.innerHTML = statsHtml || '';
    this.overlay.classList.remove('hidden');
    this.liveScoreboardEl?.classList.add('hidden');
    if (this.mobile && this.touch) this.touch.setVisible(false);
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
    if (this.mobile && this.touch) this.touch.setVisible(true);
  }

  showLevelModal() {
    const h2 = this.levelModal.querySelector('h2');
    if (h2) h2.textContent = `LEVEL ${this.level} CLEAR!`;
    this.levelModal.classList.remove('hidden');
    if (this.mobile && this.touch) this.touch.setVisible(false);
  }

  hideLevelModal() {
    this.levelModal.classList.add('hidden');
    if (this.mobile && this.touch) this.touch.setVisible(true);
  }

  showCharSelect() {
    this.state = 'charSelect';
    this.onlineStarted = false;
    this.multiplayer.disconnect();
    this.multiplayer.setMode('solo');
    this.hideOverlay();
    this.hideLevelModal();
    this.hideMpModal();
    this.hideLeaderboard();
    this.setP2NameVisible(false);
    this.loadNameInputs();
    this.charModal?.classList.remove('hidden');
    this.highlightCharCard();
    if (this.mobile && this.touch) this.touch.setVisible(false);
  }

  loadNameInputs() {
    try {
      if (this.p1NameInput) this.p1NameInput.value = localStorage.getItem('zs-player-name-p1') || '';
      if (this.p2NameInput) this.p2NameInput.value = localStorage.getItem('zs-player-name-p2') || '';
    } catch (_) {}
  }

  setP2NameVisible(visible) {
    this.p2NameRow?.classList.toggle('hidden', !visible);
  }

  resolveNames() {
    if (this.playMode === 'online' && !this.multiplayer.isHost) {
      this.player2Name = resolvePlayerName(this.p1NameInput?.value, 1);
      if (this.p1NameInput) this.p1NameInput.value = this.player2Name;
      this.playerName = this.multiplayer.hostPlayerName || '房主';
      return;
    }

    this.playerName = resolvePlayerName(this.p1NameInput?.value, 1);
    if (this.p1NameInput) this.p1NameInput.value = this.playerName;
    if (this.playMode === 'local') {
      this.player2Name = resolvePlayerName(this.p2NameInput?.value, 2);
      if (this.p2NameInput) this.p2NameInput.value = this.player2Name;
    } else if (this.playMode === 'online' && this.multiplayer.isHost) {
      this.player2Name = this.multiplayer.remotePlayerName || randomPlayerName();
    } else {
      this.player2Name = '';
    }
  }

  showLeaderboard() {
    this.leaderboardModal?.classList.remove('hidden');
    this.renderLeaderboard();
  }

  hideLeaderboard() {
    this.leaderboardModal?.classList.add('hidden');
  }

  escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async renderLeaderboard() {
    if (!this.leaderboardListEl) return;
    this.leaderboardListEl.innerHTML = '<p class="lb-meta" style="text-align:center;padding:16px">載入全服排行榜…</p>';

    const rows = await Leaderboard.top(15);
    const status = await Leaderboard.getStatusMessage();

    if (rows.length === 0) {
      this.leaderboardListEl.innerHTML = `<p class="lb-meta" style="text-align:center;padding:20px">暫無紀錄，打一局先！</p><p class="lb-meta lb-cloud-status">${status}</p>`;
      return;
    }

    const head = '<div class="lb-row head"><span>#</span><span>玩家</span><span>得分</span></div>';
    const body = rows.map((r, i) => {
      const modeLabel = { solo: '單人', local: '本地', online: '線上' }[r.mode] || r.mode;
      const name = this.escHtml(r.name);
      return `<div class="lb-row">
        <span class="lb-rank">${i + 1}</span>
        <span><span class="lb-name">${name}</span>
          <div class="lb-meta">L${r.level} · 擊殺${r.kills} · Boss${r.bosses} · ${modeLabel} · ${formatBattleDate(r.date)}</div>
        </span>
        <span class="lb-score">${r.score}</span>
      </div>`;
    }).join('');
    this.leaderboardListEl.innerHTML = `${head}${body}<p class="lb-meta lb-cloud-status">${status}</p>`;
  }

  buildBattleRecord(name, result) {
    return {
      name,
      score: this.score,
      level: this.level,
      kills: this.killCount,
      bosses: this.bossKills,
      mode: this.playMode,
      character: name === this.player2Name ? this.selectedChar2Id : this.selectedCharId,
      result,
    };
  }

  saveBattleRecord(name, result = 'gameover') {
    if (!name) return;
    Leaderboard.addRecord(this.buildBattleRecord(name, result));
  }

  formatStatsHtml(name, result) {
    const resultText = result === 'out' ? '已出局' : 'GAME OVER';
    return `${name}<br>得分 ${this.score} · Lv.${this.level}<br>擊殺 ${this.killCount} · Boss ${this.bossKills}<br><span style="color:#888">${resultText}</span>`;
  }

  endPlayerSession(ship, result = 'out') {
    const name = ship.playerIndex === 1 ? this.player2Name : this.playerName;
    this.saveBattleRecord(name, result);
    return this.formatStatsHtml(name, result);
  }

  updateLiveScoreboard() {
    if (!this.liveScoreboardEl || this.state !== 'playing') {
      this.liveScoreboardEl?.classList.add('hidden');
      return;
    }
    this.liveScoreboardEl.classList.remove('hidden');
    if (this.sbP1El) {
      const out = this.ship.eliminated ? ' (出局)' : '';
      this.sbP1El.innerHTML = `<span class="sb-name">${this.playerName}${out}</span><br>★${this.score} · 殺${this.killCount}`;
    }
    if (this.sbP2El && this.ship2 && this.player2Name) {
      this.sbP2El.classList.remove('hidden');
      const out = this.ship2.eliminated ? ' (出局)' : '';
      this.sbP2El.innerHTML = `<span class="sb-name">${this.player2Name}${out}</span><br>★${this.score} · 殺${this.killCount}`;
    } else {
      this.sbP2El?.classList.add('hidden');
    }
  }

  hideMpModal() {
    this.mpModal?.classList.add('hidden');
    if (this.roomCodeEl) this.roomCodeEl.textContent = '';
    this.btnMpReadyEl?.classList.remove('ready');
  }

  showMpModal() {
    this.mpModal?.classList.remove('hidden');
    if (this.mobile && this.touch) this.touch.setVisible(false);
  }

  hideCharSelect() {
    this.charModal?.classList.add('hidden');
    if (this.mobile && this.touch) this.touch.setVisible(true);
  }

  selectCharacter(id) {
    this.selectedCharId = id;
    this.highlightCharCard();
  }

  highlightCharCard() {
    document.querySelectorAll('[data-char]').forEach((el) => {
      el.classList.toggle('selected', el.dataset.char === this.selectedCharId);
    });
  }

  setupShips() {
    const def = getCharacter(this.selectedCharId);
    this.ship.applyCharacter(def);
    this.ship.playerIndex = 0;
    this.ship.displayName = this.playerName;

    if (this.playMode === 'local' || this.playMode === 'online') {
      if (!this.ship2) this.ship2 = new Ship();
      const p2Id = this.playMode === 'online' && !this.multiplayer.isHost
        ? this.selectedCharId
        : this.selectedChar2Id;
      const def2 = getCharacter(p2Id);
      this.ship2.applyCharacter(def2);
      this.ship2.playerIndex = 1;
      this.ship2.displayName = this.player2Name || 'P2';
      this.ship2.setScreenSize(this.worldW, this.worldH);

      if (this.playMode === 'online' && !this.multiplayer.isHost) {
        const hostDef = getCharacter(this.multiplayer.hostCharId);
        this.ship.applyCharacter(hostDef);
        this.ship.playerIndex = 0;
        this.ship.displayName = this.multiplayer.hostPlayerName || 'P1';
      }
    } else {
      this.ship2 = null;
    }
  }

  beginSolo() {
    this.playMode = 'solo';
    this.multiplayer.setMode('solo');
    this.setP2NameVisible(false);
    this.resolveNames();
    this.hideCharSelect();
    this.startGame();
  }

  beginLocal() {
    this.playMode = 'local';
    this.multiplayer.setMode('local');
    this.setP2NameVisible(true);
    this.resolveNames();
    const ids = CHARACTERS.map((c) => c.id).filter((id) => id !== this.selectedCharId);
    this.selectedChar2Id = ids[Math.floor(Math.random() * ids.length)] || 'viktor';
    this.hideCharSelect();
    this.startGame();
  }

  async beginOnlineHost() {
    try {
      this.playMode = 'online';
      this.setP2NameVisible(false);
      this.resolveNames();
      this.multiplayer.setMode('online');
      const code = await this.multiplayer.hostOnline();
      if (this.roomCodeEl) this.roomCodeEl.textContent = code;
      this.state = 'onlineLobby';
      this.hideCharSelect();
      this.showMpModal();
      this.updateLobbyUI();
    } catch (e) {
      this.showPickupMsg('線上開房失敗，請稍後再試');
    }
  }

  async beginOnlineJoin() {
    const code = this.roomInputEl?.value?.trim();
    if (!/^\d{4}$/.test(code || '')) {
      this.showPickupMsg('請輸入4位數字房間碼');
      return;
    }
    try {
      this.playMode = 'online';
      this.setP2NameVisible(false);
      this.resolveNames();
      this.multiplayer.setMode('online');
      await this.multiplayer.joinOnline(code);
      this.state = 'onlineLobby';
      if (this.roomCodeEl) this.roomCodeEl.textContent = code;
      this.hideCharSelect();
      this.showMpModal();
      this.updateLobbyUI();
    } catch (e) {
      this.showPickupMsg('加入失敗，檢查房間碼');
    }
  }

  updateLobbyUI() {
    const mp = this.multiplayer;
    const host = mp.isHost;
    const joined = mp.guestConnected || !host;
    const localReady = mp.localReady;
    const remoteReady = mp.remoteReady;

    if (this.mpStatusEl) {
      if (!joined) {
        this.mpStatusEl.textContent = host ? '等待隊友加入…' : '已連線，等待房主…';
      } else if (!localReady && !remoteReady) {
        this.mpStatusEl.textContent = '隊友已加入，請按準備';
      } else if (localReady && !remoteReady) {
        this.mpStatusEl.textContent = '已準備，等待對方…';
      } else if (!localReady && remoteReady) {
        this.mpStatusEl.textContent = '對方已準備，請按準備';
      } else {
        this.mpStatusEl.textContent = '雙方已準備，即將開始…';
      }
    }

    if (this.mpReadyHintEl) {
      const role = host ? `房主 ${this.playerName}` : `隊友 ${this.player2Name || this.playerName}`;
      const need = !localReady
        ? '請按下方「準備」'
        : (!remoteReady ? '已準備，等對方按準備…' : '即將開始…');
      this.mpReadyHintEl.textContent = `${role} · ${need}`;
    }

    this.btnMpReadyEl?.classList.toggle('ready', localReady);
    if (this.btnMpReadyEl) {
      this.btnMpReadyEl.textContent = localReady ? '已準備 ✓' : '準備';
      this.btnMpReadyEl.disabled = localReady;
    }
  }

  onGuestJoined() {
    this.updateLobbyUI();
    this.showPickupMsg('隊友已加入！');
  }

  onRemoteReady() {
    this.updateLobbyUI();
    this.tryStartMatch();
  }

  tryStartMatch() {
    if (!this.multiplayer.canStart() || this.onlineStarted) return;
    this.player2Name = this.multiplayer.remotePlayerName || randomPlayerName();
    this.multiplayer.sendStart({
      hostCharId: this.selectedCharId,
      guestCharId: this.multiplayer.remoteCharId,
      hostName: this.playerName,
      guestName: this.player2Name,
    });
    this.startOnlineGame({
      hostCharId: this.selectedCharId,
      guestCharId: this.multiplayer.remoteCharId,
      hostName: this.playerName,
      guestName: this.player2Name,
    });
  }

  setLobbyReady(ready) {
    if (this.state !== 'onlineLobby' || this.multiplayer.localReady) return;
    this.resolveNames();
    this.multiplayer.setLocalReady(ready);
    this.multiplayer.sendReady(this.selectedCharId, this.playerName);
    this.updateLobbyUI();
    if (this.multiplayer.isHost) this.tryStartMatch();
  }

  startOnlineGame(data = {}) {
    if (this.onlineStarted || this.state === 'playing') return;
    this.onlineStarted = true;
    if (data.hostCharId) this.multiplayer.hostCharId = data.hostCharId;
    if (data.guestCharId) {
      this.multiplayer.remoteCharId = data.guestCharId;
      this.selectedChar2Id = data.guestCharId;
    }
    if (data.hostName) this.multiplayer.hostPlayerName = data.hostName;
    if (data.guestName) this.multiplayer.remotePlayerName = data.guestName;
    this.resolveNames();
    this.hideMpModal();
    if (this.mobile && this.touch) this.touch.setVisible(true);
    this.startGame();
    const role = this.multiplayer.isHost ? this.playerName : this.player2Name;
    this.showPickupMsg(`對戰開始 · ${role}`);
  }

  applyNetworkState(data) {
    if (this.multiplayer.isHost || data.type !== 'state') return;

    this.score = data.score ?? this.score;
    this.level = data.level ?? this.level;
    this.lives = data.lives ?? this.lives;
    this.lives2 = data.lives2 ?? this.lives2;
    this.killCount = data.kills ?? this.killCount;
    if (data.hostName) {
      this.multiplayer.hostPlayerName = data.hostName;
      this.ship.displayName = data.hostName;
    }
    if (data.guestName) {
      this.player2Name = data.guestName;
      if (this.ship2) this.ship2.displayName = data.guestName;
    }

    if (data.p1) {
      this.ship.pos.x = data.p1.x;
      this.ship.pos.y = data.p1.y;
      this.ship.hp = data.p1.hp;
      this.ship.dead = !!data.p1.dead;
      this.ship.eliminated = !!data.p1.eliminated;
    }
    if (data.p2 && this.ship2) {
      this.ship2.pos.x = data.p2.x;
      this.ship2.pos.y = data.p2.y;
      this.ship2.hp = data.p2.hp;
      this.ship2.dead = !!data.p2.dead;
      this.ship2.eliminated = !!data.p2.eliminated;
    }

    if (!this.multiplayer.isHost && this.ship2?.eliminated) {
      if (!this.guestRecordSaved) {
        this.guestRecordSaved = true;
        this.saveBattleRecord(this.player2Name, 'out');
      }
      this.state = 'gameover';
      this.showOverlay('GAME OVER', this.formatStatsHtml(this.player2Name, 'out'));
      if (this.mobile && this.touch) this.touch.setVisible(false);
    }

    if (data.asteroids) this.syncAsteroidsFromNetwork(data.asteroids);
    if (data.bullets) this.syncBulletsFromNetwork(data.bullets);
    this.updateHud();
    this.updateLiveScoreboard();
  }

  syncAsteroidsFromNetwork(list) {
    while (this.asteroids.length > list.length) {
      const a = this.asteroids.pop();
      a.reset();
      this.asteroidPool.release(a);
    }

    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      let a = this.asteroids[i];
      if (!a) {
        a = this.asteroidPool.acquire();
        if (!a) continue;
        if (d.isBoss) a.spawnBoss(d.x, d.y, this.level);
        else a.spawn(d.x, d.y, d.type, this.speedBoost);
        this.asteroids.push(a);
      }
      a.pos.x = d.x;
      a.pos.y = d.y;
      if (d.isBoss) {
        a.bossHp = d.bossHp;
        a.maxBossHp = d.maxBossHp;
      }
    }
  }

  syncBulletsFromNetwork(list) {
    for (const b of this.bullets) {
      b.reset();
      this.bulletPool.release(b);
    }
    this.bullets = [];

    for (const d of list) {
      const b = this.bulletPool.acquire();
      if (!b) break;
      b.spawn({
        pos: { x: d.x, y: d.y },
        vel: { x: d.vx, y: d.vy },
        radius: 4,
        life: 60,
      });
      this.bullets.push(b);
    }
  }

  getPlayers() {
    const list = [this.ship];
    if (this.ship2) list.push(this.ship2);
    return list;
  }

  getActivePlayers() {
    return this.getPlayers().filter((p) => !p.eliminated && !p.dead);
  }

  allPlayersEliminated() {
    const p1Out = this.lives <= 0 || this.ship.eliminated;
    if (!this.ship2) return p1Out;
    return p1Out && (this.lives2 <= 0 || this.ship2.eliminated);
  }

  requestMobileFullscreen() {
    if (!this.mobile || this.fullscreenRequested) return;
    this.fullscreenRequested = true;
    const el = document.documentElement;
    const fn = el.requestFullscreen
      || el.webkitRequestFullscreen
      || el.webkitEnterFullscreen;
    if (fn) {
      Promise.resolve(fn.call(el)).catch(() => {});
    }
  }

  nearestPlayer(x, y) {
    const players = this.getActivePlayers();
    if (players.length === 0) return this.ship;
    let best = players[0];
    let bestD = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.pos.x - x, p.pos.y - y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  startGame() {
    this.score = 0;
    this.lives = 3;
    this.lives2 = 3;
    this.killCount = 0;
    this.bossKills = 0;
    this.guestRecordSaved = false;
    this.level = 1;
    this.speedBoost = 0;
    this.state = 'playing';
    this.pendingRespawn = false;
    this.pickupMsg = '';
    this.pickupMsgTimer = 0;
    this.bossActive = false;
    this.bossFight = false;
    this.dragonflyCd = 0;
    this.setDragonflyUnlocked(false);
    this.playerTitle = '';
    this.titleFlash = 0;
    this.titleSparklePhase = 0;
    this.screenFlash = 0;
    this.dragonflyWave = null;
    this.lightningArcs = [];
    this.levelsSinceBoss = 0;
    this.hideLevelModal();
    this.clearEntities();
    this.setupShips();
    this.ship.reset(this.worldW / 2 - (this.ship2 ? 50 : 0), this.worldH / 2);
    this.ship.hp = this.ship.maxHp;
    this.ship.invincible = 120;
    if (this.ship2) {
      this.ship2.reset(this.worldW / 2 + 50, this.worldH / 2);
      this.ship2.hp = this.ship2.maxHp;
      this.ship2.invincible = 120;
    }
    if (this.playMode === 'solo') {
      this.renderer3d?.resetFollowCamera(this.ship);
    }
    this.spawnLevel();
    this.updateHud();
    this.hideOverlay();
    this.requestMobileFullscreen();
    this.updateLiveScoreboard();
    const c = getCharacter(this.selectedCharId);
    this.showPickupMsg(`${this.playerName} · ${c.flag} ${c.name}`);
  }

  clearEntities() {
    for (const b of this.bullets) { b.reset(); this.bulletPool.release(b); }
    for (const a of this.asteroids) { a.reset(); this.asteroidPool.release(a); }
    for (const p of this.particles) { p.reset(); this.particlePool.release(p); }
    for (const pk of this.pickups) { pk.reset(); this.pickupPool.release(pk); }
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.pickups = [];
  }

  zombieCountForLevel() {
    const base = 3 + Math.floor(this.level * 1.6);
    return Math.min(30, Math.round(base * 1.5));
  }

  randomPos(minDist = 100) {
    let x, y, tries = 0;
    do {
      x = 80 + Math.random() * (this.worldW - 160);
      y = 80 + Math.random() * (this.worldH - 160);
      tries++;
    } while (Math.hypot(x - this.ship.pos.x, y - this.ship.pos.y) < minDist && tries < 30);
    return { x, y };
  }

  spawnPickup(x, y, type, extra = {}) {
    const pk = this.pickupPool.acquire();
    if (!pk) return;
    pk.spawn(x, y, type, extra);
    this.pickups.push(pk);
  }

  spawnSpecialReward() {
    if (this.level < 2) return;
    const titleName = titleForLevel(this.level);
    const pos = this.randomPos(160);
    this.spawnPickup(pos.x, pos.y, 'title', { titleName });
    const bonus = this.randomPos(160);
    this.spawnPickup(bonus.x, bonus.y, Math.random() < 0.4 ? 'health' : pickRandomEquip());
  }

  spawnLevelPickups() {
    for (let i = 0; i < 2; i++) {
      const { x, y } = this.randomPos(140);
      this.spawnPickup(x, y, 'health');
    }
    const pos1 = this.randomPos(140);
    this.spawnPickup(pos1.x, pos1.y, pickRandomEquip());
    const pos2 = this.randomPos(140);
    this.spawnPickup(pos2.x, pos2.y, Math.random() < 0.5 ? 'wheel' : pickRandomEquip());
    if (Math.random() < 0.45) {
      const pos3 = this.randomPos(140);
      this.spawnPickup(pos3.x, pos3.y, 'lightning');
    }
  }

  spawnLevel() {
    const count = this.zombieCountForLevel();
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomPos(120);
      this.spawnAsteroid(x, y, 'b');
    }
    this.spawnLevelPickups();
    this.bossActive = false;
  }

  spawnAsteroid(x, y, type) {
    const a = this.asteroidPool.acquire();
    if (!a) return;
    a.spawn(x, y, type, this.speedBoost);
    this.asteroids.push(a);
  }

  startBossFight() {
    this.levelsSinceBoss = 0;
    for (const a of [...this.asteroids]) {
      if (!a.isBoss) { a.active = false; }
    }
    for (const pk of [...this.pickups]) { pk.active = false; }
    this.cleanup(this.asteroids, this.asteroidPool);
    this.cleanup(this.pickups, this.pickupPool);

    const a = this.asteroidPool.acquire();
    if (!a) return;
    a.spawnBoss(this.worldW / 2, this.worldH / 2 - 50, this.level);
    this.asteroids.push(a);
    this.bossActive = true;
    this.bossFight = true;
    this.state = 'playing';
    this.ship.invincible = Math.max(this.ship.invincible, 90);
    this.showPickupMsg('BOSS 戰！無小怪');
  }

  showPickupMsg(text) {
    this.pickupMsg = text;
    this.pickupMsgTimer = 150;
  }

  triggerTitleReveal(name) {
    this.playerTitle = name;
    this.titleTextEl.textContent = name;
    this.titleBanner.classList.remove('hidden');
    this.titleBanner.classList.remove('reveal');
    void this.titleBanner.offsetWidth;
    this.titleBanner.classList.add('reveal');
    this.titleFlash = 55;
    this.showPickupMsg(`★ 稱號覺醒：${name} ★`);
    this.pickupMsgTimer = 200;
    burst(this.particlePool, this.particles, this.ship.pos.x, this.ship.pos.y, 22, '#ffd700', 3, 14, 2, 10);
    burst(this.particlePool, this.particles, this.ship.pos.x, this.ship.pos.y, 14, '#ff8800', 2, 10, 1, 8);
    burst(this.particlePool, this.particles, this.ship.pos.x, this.ship.pos.y, 16, '#ffee88', 2, 8, 1, 6);
    this.updateHud();
  }

  updateHud() {
    if (this.mobile) {
      this.scoreEl.textContent = `${this.score}`;
      const livesTxt = this.ship2 ? `♥${this.lives}+${this.lives2}` : `♥${this.lives}`;
      this.livesEl.textContent = livesTxt;
      this.levelEl.textContent = `L${this.level}`;
    } else {
      this.scoreEl.textContent = `SCORE: ${this.score}`;
      this.livesEl.textContent = this.ship2 ? `P1:${this.lives} P2:${this.lives2}` : `LIVES: ${this.lives}`;
      this.levelEl.textContent = `LEVEL: ${this.level}`;
    }

    if (this.playerTitle) {
      this.titleTextEl.textContent = this.playerTitle;
      this.titleBanner.classList.remove('hidden');
    } else {
      this.titleBanner.classList.add('hidden');
    }

    if (this.bossFight) {
      this.equipEl.classList.add('hidden');
      return;
    }

    if (this.ship.activeBuffs().length > 0) {
      const parts = this.ship.activeBuffs().map((k) => {
        const sec = Math.ceil(this.ship.buffs[k] / 60);
        const label = this.ship.buffLabel(k) || EQUIP_NAMES[k];
        return `${label} ${sec}s`;
      });
      this.equipEl.textContent = parts.join(' | ');
      this.equipEl.classList.remove('hidden');
    } else {
      this.equipEl.classList.add('hidden');
    }

    this.updateLiveScoreboard();
  }

  onWaveClear() {
    this.level++;
    this.levelsSinceBoss++;
    this.speedBoost += 0.12;
    if (!this.ship.eliminated) {
      this.ship.invincible = Math.max(this.ship.invincible, 90);
    }
    if (this.ship2 && !this.ship2.eliminated) {
      this.ship2.invincible = Math.max(this.ship2.invincible, 90);
    }

    const canOfferBoss = this.level >= 3 && this.levelsSinceBoss >= 2;
    if (canOfferBoss) {
      this.state = 'levelPrompt';
      this.showLevelModal();
      this.showPickupMsg(`LEVEL ${this.level} 清關！`);
    } else {
      this.state = 'playing';
      this.spawnLevel();
      if (this.level >= 2) this.spawnSpecialReward();
      this.showPickupMsg(`LEVEL ${this.level} 開始`);
    }
    this.updateHud();
  }

  answerLevelPrompt(fightBoss) {
    this.hideLevelModal();

    if (fightBoss) {
      this.startBossFight();
    } else {
      this.state = 'playing';
      this.spawnLevel();
      this.spawnSpecialReward();
      this.showPickupMsg(`LEVEL ${this.level} 開始`);
    }
  }

  useDragonfly() {
    if (!this.dragonflyUnlocked) return;
    if (this.dragonflyCd > 0 || this.ship.dead) {
      if (this.dragonflyCd > 0) {
        this.showPickupMsg(`蜻蜓冷卻 ${Math.ceil(this.dragonflyCd / 60)}s`);
      }
      return;
    }

    const maxR = Math.max(this.worldW, this.worldH) * 0.85;
    this.dragonflyWave = { r: 0, maxR, life: 22, x: this.ship.pos.x, y: this.ship.pos.y };
    this.screenFlash = 28;

    let kills = 0;
    for (const a of [...this.asteroids]) {
      if (a.isBoss) {
        a.bossHp -= 15;
        a.lightningFlash = 25;
        if (a.bossHp <= 0) {
          this.killZombie(a, false);
          kills++;
        }
      } else {
        this.score += a.score;
        a.active = false;
        kills++;
      }
    }
    this.cleanup(this.asteroids, this.asteroidPool);

    this.score += kills * 50 + 300;
    this.ship.heal(40);
    this.ship.invincible = Math.max(this.ship.invincible, 90);
    burst(this.particlePool, this.particles, this.ship.pos.x, this.ship.pos.y, 12, '#aaffff', 4, 12, 2, 6);
    this.dragonflyCd = DRAGONFLY_CD;
    this.showPickupMsg(`蜻蜓清場！+${kills} 消滅`);
    this.updateHud();
  }

  input() {
    if (this.state !== 'playing') return;

    if (this.playMode === 'online' && !this.multiplayer.isHost) {
      const touch = this.mobile && this.touch ? this.touch.getInput() : null;
      this.multiplayer.sendInput(this.readPlayerInput(touch, {
        left: ['ArrowLeft', 'KeyA'],
        right: ['ArrowRight', 'KeyD'],
        up: ['ArrowUp', 'KeyW'],
        down: ['ArrowDown', 'KeyS'],
        shoot: ['Space', 'KeyK'],
      }));
      return;
    }

    const p1Keys = this.playMode === 'local'
      ? { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], shoot: ['Space', 'KeyK'] }
      : { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], shoot: ['Space', 'KeyK'] };

    this.inputShip(this.ship, this.mobile && this.touch ? this.touch.getInput() : null, p1Keys);

    if (this.ship2 && this.playMode === 'local') {
      this.inputShip(this.ship2, null, {
        left: ['ArrowLeft'], right: ['ArrowRight'],
        up: ['ArrowUp'], down: ['ArrowDown'],
        shoot: ['Enter', 'NumpadEnter'],
      });
    } else if (this.ship2 && this.playMode === 'online' && this.multiplayer.isHost) {
      this.inputShip(this.ship2, this.multiplayer.remoteInput, {
        left: [], right: [], up: [], down: [], shoot: [],
      });
    }
  }

  readPlayerInput(touch, keys) {
    let dx = 0;
    let dy = 0;
    let shooting = false;

    if (touch) {
      dx = touch.dx;
      dy = touch.dy;
      shooting = touch.shooting;
    } else {
      if (keys.left.some((k) => this.keys[k])) dx -= 1;
      if (keys.right.some((k) => this.keys[k])) dx += 1;
      if (keys.up.some((k) => this.keys[k])) dy -= 1;
      if (keys.down.some((k) => this.keys[k])) dy += 1;
      shooting = keys.shoot.some((k) => this.keys[k]);
    }

    return { dx, dy, shooting };
  }

  inputShip(ship, touch, keys) {
    if (ship.dead || ship.eliminated) return;
    let dx = 0;
    let dy = 0;
    let shooting = false;

    if (touch) {
      dx = touch.dx;
      dy = touch.dy;
      shooting = touch.shooting;
    } else if (keys.left.length) {
      if (keys.left.some((k) => this.keys[k])) dx -= 1;
      if (keys.right.some((k) => this.keys[k])) dx += 1;
      if (keys.up.some((k) => this.keys[k])) dy -= 1;
      if (keys.down.some((k) => this.keys[k])) dy += 1;
      shooting = keys.shoot.some((k) => this.keys[k]);
    } else {
      dx = touch?.dx || 0;
      dy = touch?.dy || 0;
      shooting = touch?.shooting || false;
    }

    const solo = this.playMode === 'solo' && ship === this.ship;
    if (solo) {
      ship.moveThirdPerson(dx, dy);
    } else {
      ship.move(dx, dy);
    }
    if (dx !== 0 || dy !== 0) this.emitFootsteps(ship);

    if (shooting && ship.canShoot()) {
      for (const shot of ship.shoot()) {
        const b = this.bulletPool.acquire();
        if (b) {
          b.spawn(shot);
          this.bullets.push(b);
        }
      }
    }
  }

  emitFootsteps(ship = this.ship) {
    if (Math.random() > 0.6) return;
    const p = this.particlePool.acquire();
    if (!p) return;
    p.spawn(
      ship.pos.x - Math.cos(ship.angle) * 8,
      ship.pos.y - Math.sin(ship.angle) * 8,
      ship.angle + Math.PI,
      0.5 + Math.random(), 1 + Math.random(), '#888', 20
    );
    this.particles.push(p);
  }

  update() {
    if (this.state === 'charSelect') {
      this.charPreviewT += 0.04;
      return;
    }
    if (this.state === 'onlineLobby') return;
    if (this.state === 'levelPrompt') return;
    if (this.state !== 'playing') return;

    if (this.playMode === 'online' && !this.multiplayer.isHost) {
      this.input();
      this.ship.update();
      if (this.ship2) this.ship2.update();
      if (this.pickupMsgTimer > 0 && --this.pickupMsgTimer <= 0) this.pickupMsg = '';
      return;
    }

    this.input();
    this.ship.update();
    if (!this.ship.dead) this.ship.clampToArena(this.worldW, this.worldH);
    if (this.ship2) {
      this.ship2.update();
      if (!this.ship2.dead) this.ship2.clampToArena(this.worldW, this.worldH);
    }
    this.multiplayer.update();

    for (const b of this.bullets) b.update();
    for (const a of this.asteroids) {
      const target = this.nearestPlayer(a.pos.x, a.pos.y);
      const attacked = a.update(target.pos.x, target.pos.y);
      if (attacked && a.isBoss) {
        for (const p of this.getPlayers()) {
          if (p.dead || p.invincible > 0) continue;
          if (Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y) < a.radius + 80) {
            if (p.damage(50)) this.handlePlayerDeath(p);
            burst(this.particlePool, this.particles, p.pos.x, p.pos.y, 12, '#ff0000', 3, 8, 2, 5);
          }
        }
      }
      if (a.wheelHitCd > 0) a.wheelHitCd--;
      if (!a.isBoss) a.wrap(this.worldW, this.worldH);
    }
    for (const p of this.particles) p.update();
    for (const pk of this.pickups) pk.update();

    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      this.lightningArcs[i].life--;
      if (this.lightningArcs[i].life <= 0) this.lightningArcs.splice(i, 1);
    }

    if (this.pickupMsgTimer > 0 && --this.pickupMsgTimer <= 0) this.pickupMsg = '';
    if (this.dragonflyCd > 0) this.dragonflyCd--;
    if (this.touch) this.touch.updateCooldown(this.dragonflyCd);
    if (this.screenFlash > 0) this.screenFlash--;
    if (this.titleFlash > 0) this.titleFlash--;
    if (this.playerTitle) this.titleSparklePhase += 0.08;

    if (this.dragonflyWave) {
      this.dragonflyWave.r += this.dragonflyWave.maxR / 18;
      this.dragonflyWave.life--;
      if (this.dragonflyWave.life <= 0) this.dragonflyWave = null;
    }

    this.cleanup(this.bullets, this.bulletPool);
    this.cleanup(this.asteroids, this.asteroidPool);
    this.cleanup(this.particles, this.particlePool);
    this.cleanup(this.pickups, this.pickupPool);

    this.checkBulletHits();
    this.checkWheelHits();
    this.checkShipHit();
    this.checkPickupHits();
    this.checkLevelClear();

    if (this.ship.activeBuffs().length > 0 || (this.ship2 && this.ship2.activeBuffs().length > 0)) this.updateHud();
  }

  cleanup(list, pool) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].active) {
        list[i].reset();
        pool.release(list[i]);
        list.splice(i, 1);
      }
    }
  }

  hit(a, b) {
    return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) < a.radius + b.radius;
  }

  addLightningArc(x1, y1, x2, y2) {
    if (this.lightningArcs.length >= MAX_ARCS) this.lightningArcs.shift();
    this.lightningArcs.push({
      x1, y1, x2, y2,
      mx: (x1 + x2) / 2 + (Math.random() - 0.5) * 24,
      my: (y1 + y2) / 2 + (Math.random() - 0.5) * 24,
      life: 8,
    });
  }

  drawLightningArc(ctx, arc) {
    const a = arc.life / 8;
    ctx.strokeStyle = `rgba(180,230,255,${a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1);
    ctx.lineTo(arc.mx, arc.my);
    ctx.lineTo(arc.x2, arc.y2);
    ctx.stroke();
  }

  chainLightning(source, hitSet, depth, maxDepth = CHAIN_MAX) {
    if (depth >= maxDepth) return;
    for (const other of this.asteroids) {
      if (!other.active || other === source || hitSet.has(other)) continue;
      const d = Math.hypot(other.pos.x - source.pos.x, other.pos.y - source.pos.y);
      if (d > CHAIN_RANGE) continue;

      hitSet.add(other);
      other.lightningFlash = 15;
      this.addLightningArc(source.pos.x, source.pos.y, other.pos.x, other.pos.y);
      burst(this.particlePool, this.particles, other.pos.x, other.pos.y, 4, '#88ddff', 2, 4, 1, 3);

      if (other.isBoss) {
        other.bossHp--;
        if (other.bossHp <= 0) this.killZombie(other, true);
      } else {
        this.killZombie(other, true);
      }
      this.chainLightning(other, hitSet, depth + 1, maxDepth);
      break;
    }
  }

  damageZombie(a, lightning, extraChain = 0) {
    const chainMax = CHAIN_MAX + extraChain;
    if (a.isBoss) {
      a.bossHp--;
      if (lightning) {
        a.lightningFlash = 20;
        this.chainLightning(a, new Set([a]), 0, chainMax);
      }
      if (a.bossHp <= 0) this.killZombie(a, true);
      return;
    }

    if (lightning) {
      a.lightningFlash = 20;
      this.chainLightning(a, new Set([a]), 0, chainMax);
    }
    this.killZombie(a, true);
  }

  handlePlayerDeath(ship = this.ship) {
    if (ship.eliminated) return;
    burst(this.particlePool, this.particles, ship.pos.x, ship.pos.y, 20, '#fff', 2, 8, 1, 5);
    const isP2 = ship.playerIndex === 1;
    if (isP2) this.lives2--;
    else this.lives--;
    this.updateHud();

    const livesLeft = isP2 ? this.lives2 : this.lives;
    const label = isP2 ? this.player2Name : this.playerName;

    if (livesLeft <= 0) {
      ship.eliminated = true;
      ship.kill();
      const statsHtml = this.endPlayerSession(ship, 'out');
      this.showPickupMsg(`${label} 已出局`);

      if (this.allPlayersEliminated()) {
        this.state = 'gameover';
        this.showOverlay('GAME OVER', this.buildFinalStatsHtml());
        if (this.mobile && this.touch) this.touch.setVisible(false);
      } else if (this.playMode === 'online' && !this.multiplayer.isHost && isP2) {
        this.state = 'gameover';
        this.showOverlay('GAME OVER', statsHtml);
        if (this.mobile && this.touch) this.touch.setVisible(false);
      } else {
        this.showPickupMsg(`${label} 已退場 · 另一玩家繼續`);
      }
    } else {
      ship.kill();
    }

    this.updateLiveScoreboard();
  }

  buildFinalStatsHtml() {
    const parts = [];
    if (this.playerName) parts.push(this.formatStatsHtml(this.playerName, 'gameover'));
    if (this.player2Name && this.ship2) {
      parts.push(this.formatStatsHtml(this.player2Name, this.ship2.eliminated ? 'out' : 'gameover'));
    }
    return parts.join('<hr style="border-color:#333;margin:8px 0">');
  }

  killZombie(a, allowSplit) {
    this.score += a.score;
    this.killCount++;
    if (a.isBoss) this.bossKills++;
    burst(this.particlePool, this.particles, a.pos.x, a.pos.y, 16, a.isBoss ? '#ff4444' : '#7ecf8e', 1, 6, 1, a.radius / 4);

    if (a.isBoss) {
      this.bossActive = false;
      this.bossFight = false;
      this.levelsSinceBoss = 0;
      this.setDragonflyUnlocked(true);
      this.showPickupMsg('Boss 擊敗！蜻蜓必殺已解鎖 [Y]');
      this.spawnLevel();
      this.spawnSpecialReward();
    }

    if (allowSplit && a.next && !a.isBoss) {
      this.spawnAsteroid(a.pos.x, a.pos.y, a.next);
      this.spawnAsteroid(a.pos.x, a.pos.y, a.next);
    }

    if (allowSplit && !a.isBoss) this.maybeDropPickup(a.pos.x, a.pos.y);
    a.active = false;
    this.updateHud();
  }

  checkBulletHits() {
    for (const b of this.bullets) {
      if (!b.active) continue;
      if (b.pos.x < 0 || b.pos.x > this.worldW || b.pos.y < 0 || b.pos.y > this.worldH) {
        b.active = false;
        continue;
      }
      for (const a of this.asteroids) {
        if (this.hit(b, a)) {
          b.active = false;
          this.damageZombie(a, b.lightning, b.ownerChain || 0);
          break;
        }
      }
    }
  }

  checkWheelHits() {
    for (const ship of this.getPlayers()) {
      if (!ship.hasBuff('wheel') || ship.dead) continue;
      for (const wheel of ship.getWheelPositions()) {
        for (const a of this.asteroids) {
          if (a.wheelHitCd > 0) continue;
          if (Math.hypot(a.pos.x - wheel.x, a.pos.y - wheel.y) < a.radius + wheel.radius) {
            a.wheelHitCd = WHEEL_HIT_CD;
            this.damageZombie(a, false, ship.extraChain);
            burst(this.particlePool, this.particles, wheel.x, wheel.y, 10, '#ff6600', 2, 6, 2, 6);
          }
        }
      }
    }
  }

  checkShipHit() {
    if (this.bossFight) return;
    for (const ship of this.getPlayers()) {
      if (ship.eliminated || ship.dead || ship.invincible > 0) continue;
      for (const a of this.asteroids) {
        if (this.hit(ship, a)) {
          if (ship.damage(a.damage)) this.handlePlayerDeath(ship);
          burst(this.particlePool, this.particles, ship.pos.x, ship.pos.y, 8, '#ff4444', 2, 5, 1, 3);
          break;
        }
      }
    }
  }

  applyPickupToShip(ship, pk, def) {
    if (pk.type === 'health') {
      ship.heal(def.heal);
      this.showPickupMsg(`+${def.heal} HP`);
      burst(this.particlePool, this.particles, pk.pos.x, pk.pos.y, 12, '#ff4466', 1, 5, 1, 4);
    } else if (pk.type === 'title') {
      this.triggerTitleReveal(pk.titleName);
    } else {
      ship.addBuff(def.kind, def.duration);
      const extra = def.kind === 'wheel' && ship.wheelStacks > 1 ? ` (×${ship.wheelStacks})` : '';
      this.showPickupMsg(`獲得：${EQUIP_NAMES[def.kind]}${extra}`);
      burst(this.particlePool, this.particles, pk.pos.x, pk.pos.y, 14, def.color, 2, 7, 1, 5);
      this.updateHud();
    }
  }

  checkPickupHits() {
    for (const pk of this.pickups) {
      if (!pk.active) continue;
      const def = PICKUP_TYPES[pk.type];
      for (const ship of this.getPlayers()) {
        if (ship.eliminated || ship.dead) continue;
        if (!this.hit(ship, pk)) continue;
        this.applyPickupToShip(ship, pk, def);
        pk.active = false;
        break;
      }
    }
  }

  checkLevelClear() {
    const anyoneAlive = this.getActivePlayers().length > 0
      || this.getPlayers().some((p) => !p.eliminated && p.dead);
    if (this.asteroids.length === 0 && anyoneAlive && this.state === 'playing' && !this.bossFight) {
      this.onWaveClear();
    }
  }

  maybeDropPickup(x, y) {
    const roll = Math.random();
    if (roll < 0.12) this.spawnPickup(x, y, 'health');
    else if (roll < 0.30) this.spawnPickup(x, y, Math.random() < 0.4 ? 'wheel' : pickRandomEquip());
  }

  renderHealthBar(ctx) {
    const barW = this.mobile ? Math.min(180, this.w * 0.42) : 200;
    const barH = 12;
    const y = this.h - (this.mobile ? 108 : 30);

    const drawBar = (ship, x, label) => {
      const ratio = ship.hp / ship.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 3, y - 3, barW + 6, barH + 6);
      ctx.fillStyle = '#331111';
      ctx.fillRect(x, y, barW, barH);
      ctx.fillStyle = ratio > 0.3 ? '#ff4444' : '#ff2222';
      ctx.fillRect(x, y, barW * ratio, barH);
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${label} ${ship.hp}/${ship.maxHp}`, x + barW / 2, y + barH + 12);
    };

    if (this.ship2) {
    if (!this.ship.eliminated) drawBar(this.ship, 16, this.playerName || 'P1');
      if (!this.ship2.eliminated) drawBar(this.ship2, this.w - barW - 16, this.player2Name || 'P2');
    } else if (!this.ship.eliminated) {
      drawBar(this.ship, (this.w - barW) / 2, 'HP');
    }

    if (this.dragonflyUnlocked) {
      if (this.dragonflyCd > 0) {
        ctx.fillStyle = '#aaffff';
        ctx.font = '10px monospace';
        ctx.fillText(`必殺 ${Math.ceil(this.dragonflyCd / 60)}s`, this.w / 2, y - 8);
      } else {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('[Y] 蜻蜓必殺', this.w / 2, y - 8);
      }
    }
  }

  renderTitleFx(ctx) {
    if (!this.playerTitle && this.titleFlash <= 0) return;

    const cx = this.w / 2;
    const topY = 52;

    if (this.titleFlash > 0) {
      const a = this.titleFlash / 55;
      ctx.fillStyle = `rgba(255, 200, 50, ${a * 0.35})`;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.strokeStyle = `rgba(255, 240, 150, ${a})`;
      ctx.lineWidth = 4 + a * 6;
      ctx.beginPath();
      ctx.arc(cx, topY, 80 + (1 - a) * 120, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.playerTitle) {
      const t = this.titleSparklePhase;
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI * 2 * i) / 10 + t;
        const len = this.w * 0.42;
        const alpha = 0.06 + Math.sin(t * 2 + i) * 0.03;
        ctx.strokeStyle = `rgba(255, 210, 60, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx + Math.cos(ang) * len, Math.sin(ang) * len * 0.55 + 20);
        ctx.stroke();
      }

      for (let i = 0; i < 6; i++) {
        const sx = cx + Math.sin(t * 1.7 + i * 1.3) * (120 + i * 18);
        const sy = 18 + Math.cos(t * 2.1 + i) * 12;
        const sa = 0.4 + Math.sin(t * 3 + i) * 0.3;
        ctx.fillStyle = `rgba(255, 240, 120, ${sa})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  renderPickupMsg(ctx) {
    if (!this.pickupMsg) return;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, this.pickupMsgTimer / 30);
    ctx.fillText(this.pickupMsg, this.w / 2, this.h - (this.mobile ? 130 : 60));
    ctx.globalAlpha = 1;
  }

  renderCharSelect(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('選擇角色', this.w / 2, 50);

    const cardW = Math.min(160, this.w / 3.5);
    const gap = 20;
    const totalW = CHARACTERS.length * cardW + (CHARACTERS.length - 1) * gap;
    let x = (this.w - totalW) / 2 + cardW / 2;

    for (const c of CHARACTERS) {
      const sel = c.id === this.selectedCharId;
      ctx.fillStyle = sel ? 'rgba(255,204,0,0.15)' : 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = sel ? '#ffcc00' : '#555';
      ctx.lineWidth = sel ? 3 : 1;
      ctx.fillRect(x - cardW / 2, 70, cardW, 200);
      ctx.strokeRect(x - cardW / 2, 70, cardW, 200);

      drawCharacterPreview(ctx, x, 130, c, 1.3, this.charPreviewT);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${c.flag} ${c.name}`, x, 175);
      ctx.fillStyle = '#aaa';
      ctx.font = '11px monospace';
      ctx.fillText(c.nation, x, 192);
      ctx.fillStyle = '#7ecf8e';
      ctx.fillText(`【${c.talent}】`, x, 210);
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText(c.talentDesc, x, 228);

      x += cardW + gap;
    }

    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText('1/2/3 選角 · Enter 單人開始', this.w / 2, this.h - 24);
  }

  render() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);

    const use3d = this.state !== 'charSelect' && this.state !== 'onlineLobby';
    this.renderer3d?.setVisible(use3d);

    if (this.state === 'charSelect' || this.state === 'onlineLobby') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, this.w, this.h);
      this.renderScanlines();
      return;
    }

    if (use3d) {
      this.renderer3d.sync(this);
      this.render3dFxOverlay(ctx);
    } else {
      const focus = this.getCameraFocus();
      ctx.save();
      ctx.translate(this.w / 2 - focus.x, this.h / 2 - focus.y);
      for (const pk of this.pickups) pk.draw(ctx);
      for (const a of this.asteroids) a.draw(ctx);
      for (const b of this.bullets) b.draw(ctx);
      for (const arc of this.lightningArcs) this.drawLightningArc(ctx, arc);
      for (const p of this.particles) p.draw(ctx);
      if (!this.ship.eliminated) this.ship.draw(ctx);
      if (this.ship2 && !this.ship2.eliminated) this.ship2.draw(ctx);
      ctx.restore();
    }

    if (this.screenFlash > 0) {
      ctx.fillStyle = `rgba(80,240,255,${this.screenFlash / 28})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    this.renderTitleFx(ctx);

    if (!use3d && this.dragonflyWave) {
      const w = this.dragonflyWave;
      const alpha = w.life / 22;
      const r = w.r;
      ctx.strokeStyle = `rgba(0,220,255,${alpha * 0.85})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.state === 'playing' || this.state === 'levelPrompt') {
      this.renderHealthBar(ctx);
      this.renderPickupMsg(ctx);
    }

    this.renderScanlines();
  }

  render3dFxOverlay(ctx) {
    const project = (x, y, h = 0) => this.renderer3d.projectToScreen(x, y, h);

    for (const a of this.asteroids) {
      if (!a.active) continue;
      if (a.lightningFlash > 0) {
        const p = project(a.pos.x, a.pos.y, 5);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = `rgba(170,230,255,${a.lightningFlash / 20})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (a.isBoss) {
        const p = project(a.pos.x, a.pos.y, 14);
        const r = a.radius;
        const bw = r * 1.8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = '#220000';
        ctx.fillRect(-bw / 2, -r - 22, bw, 8);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(-bw / 2, -r - 22, bw * (a.bossHp / a.maxBossHp), 8);
        ctx.fillStyle = '#ffcc00';
        ctx.font = `bold ${Math.max(11, r * 0.14)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('☠ BOSS ☠', 0, -r - 28);
        if (a.attackFlash > 0) {
          const alpha = a.attackFlash / 25;
          ctx.strokeStyle = `rgba(255,50,50,${alpha})`;
          ctx.lineWidth = 5 + (25 - a.attackFlash) * 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, r + 10 + (25 - a.attackFlash) * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (this.dragonflyWave) {
      const w = this.dragonflyWave;
      const alpha = w.life / 22;
      const r = w.r;
      const p = project(w.x, w.y, 1);
      ctx.strokeStyle = `rgba(0,220,255,${alpha * 0.85})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(180,255,255,${alpha * 0.35})`;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.92, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  renderScanlines() {
    const { ctx } = this;
    ctx.globalAlpha = 0.05;
    ctx.lineWidth = 1;
    for (let i = this.scanLines; i >= 0; i--) {
      ctx.beginPath();
      ctx.moveTo(0, i * 4);
      ctx.lineTo(this.w, i * 4);
      ctx.strokeStyle = Math.random() > 0.001 ? '#fff' : '#222';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  loop() {
    this.update();
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
}

export { Game };
