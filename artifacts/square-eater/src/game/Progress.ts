/**
 * Progress – tiny save-state helper.
 *
 * Stores the level the player should continue from next time.
 * A saved level of 1 is treated as "no real progress" (default start).
 */

const KEY = "squareEaterProgress";

export function saveProgress(level: number) {
  try { localStorage.setItem(KEY, String(level)); } catch { /* ignore */ }
}

/** Returns the saved level (1 if nothing saved or save is corrupted). */
export function loadProgress(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return 1;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 && n <= 11 ? n : 1;
  } catch { return 1; }
}

export function clearProgress() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
