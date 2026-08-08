import { FIREBASE_DB_URL, isCloudLeaderboardEnabled } from './leaderboard-config.js';

const CACHE_KEY = 'zs-cloud-leaderboard-cache';
const CACHE_MS = 45_000;

function normalizeRecord(raw) {
  return {
    name: String(raw.name || 'Unknown').slice(0, 12),
    score: raw.score | 0,
    level: raw.level | 0,
    kills: raw.kills | 0,
    bosses: raw.bosses | 0,
    mode: raw.mode || 'solo',
    character: raw.character || '',
    result: raw.result || 'gameover',
    date: raw.date | 0,
  };
}

function sortRecords(list) {
  return list.sort((a, b) => b.score - a.score || b.level - a.level || b.kills - a.kills || b.date - a.date);
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_MS) return null;
    return Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch (_) {
    return null;
  }
}

function writeCache(rows) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rows }));
  } catch (_) {}
}

export async function fetchCloudRecords() {
  if (!isCloudLeaderboardEnabled()) return null;

  const cached = readCache();
  if (cached) return cached;

  const res = await fetch(`${FIREBASE_DB_URL}/leaderboard.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`cloud fetch ${res.status}`);
  const data = await res.json();
  if (!data || typeof data !== 'object') return [];

  const rows = sortRecords(Object.values(data).map(normalizeRecord));
  writeCache(rows);
  return rows;
}

export async function submitCloudRecord(record) {
  if (!isCloudLeaderboardEnabled()) return false;

  const entry = normalizeRecord({ ...record, date: record.date || Date.now() });
  const res = await fetch(`${FIREBASE_DB_URL}/leaderboard.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`cloud submit ${res.status}`);

  try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  return true;
}
