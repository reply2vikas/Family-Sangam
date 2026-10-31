// Saves the plan in this browser only. Every read is re-validated, and any storage
// problem (private window, full disk) just means the app starts fresh.

import { normalizeSeason } from '../engine/schema.js';
import { cleanProgress } from '../engine/progress.js';

const KEY = 'family-sangam:v1';

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    const checked = normalizeSeason(saved?.season);
    return checked.ok ? { season: checked.season, progress: cleanProgress(saved.progress) } : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: keep working in memory */ }
}

export function clearState() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
