/** 全服公開排行榜 — Firebase Realtime Database（REST，免 SDK） */
export const FIREBASE_DB_URL = 'https://a-game-by-isaac-default-rtdb.asia-southeast1.firebasedatabase.app';

export function isCloudLeaderboardEnabled() {
  return typeof FIREBASE_DB_URL === 'string' && FIREBASE_DB_URL.startsWith('https://');
}
