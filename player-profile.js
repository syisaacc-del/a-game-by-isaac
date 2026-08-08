const NAME_PREFIXES = [
  '倖存者', '獵手', '戰士', '幽靈', '閃電', '鐵壁', '幻影', '雷霆', '狂徒', '利刃', '夜鷹', '赤焰',
];
const STORAGE_P1 = 'zs-player-name-p1';
const STORAGE_P2 = 'zs-player-name-p2';
const RECORDS_KEY = 'zombie-survival-records';
const MAX_RECORDS = 60;

export function randomPlayerName() {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const num = 100 + Math.floor(Math.random() * 900);
  return `${prefix}${num}`;
}

export function sanitizeName(raw) {
  const s = String(raw || '').trim().slice(0, 12);
  if (!s) return '';
  return s.replace(/[<>"'`\\]/g, '');
}

export function resolvePlayerName(input, slot = 1) {
  const cleaned = sanitizeName(input);
  const key = slot === 2 ? STORAGE_P2 : STORAGE_P1;
  if (cleaned) {
    try { localStorage.setItem(key, cleaned); } catch (_) {}
    return cleaned;
  }
  try {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
  } catch (_) {}
  const generated = randomPlayerName();
  try { localStorage.setItem(key, generated); } catch (_) {}
  return generated;
}

export function formatBattleDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export class Leaderboard {
  static load() {
    try {
      const data = JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  static save(records) {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
    } catch (_) {}
  }

  static addRecord(record) {
    const entry = {
      name: sanitizeName(record.name) || randomPlayerName(),
      score: record.score | 0,
      level: record.level | 0,
      kills: record.kills | 0,
      bosses: record.bosses | 0,
      mode: record.mode || 'solo',
      character: record.character || '',
      result: record.result || 'gameover',
      date: Date.now(),
    };
    const records = this.load();
    records.unshift(entry);
    records.sort((a, b) => b.score - a.score || b.level - a.level || b.kills - a.kills);
    this.save(records);
    return entry;
  }

  static top(limit = 12) {
    return this.load().slice(0, limit);
  }

  static forPlayer(name, limit = 8) {
    const target = sanitizeName(name);
    return this.load().filter((r) => r.name === target).slice(0, limit);
  }
}
