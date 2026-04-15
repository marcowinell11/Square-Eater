/**
 * AudioManager
 *
 * Uses the native HTMLAudioElement API instead of Phaser's audio loader
 * so missing or placeholder files fail silently and never crash the game.
 *
 * Drop your real files into  public/audio/  (filenames must match exactly):
 *   public/audio/Menu Music.mp3
 *   public/audio/Game Music.wav
 *   public/audio/Eat Sound.wav
 *   public/audio/Lose Sound.wav
 *   public/audio/Victory Sound.wav
 *
 * The game works fine without them — audio just stays silent.
 */

// ─── File Map ────────────────────────────────────────────────────────────────

// Import BASE_PATH so paths work in both dev and production (subpath deploy)
const BASE = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL ?? "/";

export const AUDIO_KEYS = {
  menuMusic:    "menuMusic",
  gameMusic:    "gameMusic",
  eatSound:     "eatSound",
  loseSound:    "loseSound",
  victorySound: "victorySound",
} as const;

export type AudioKey = typeof AUDIO_KEYS[keyof typeof AUDIO_KEYS];

const FILE_MAP: Record<AudioKey, string> = {
  menuMusic:    `${BASE}audio/Menu Music.mp3`,
  gameMusic:    `${BASE}audio/Game Music.wav`,
  eatSound:     `${BASE}audio/Eat Sound.wav`,
  loseSound:    `${BASE}audio/Lose Sound.wav`,
  victorySound: `${BASE}audio/Victory Sound.wav`,
};

// ─── Background Music ─────────────────────────────────────────────────────────

let bgEl: HTMLAudioElement | null = null;
let bgKey: AudioKey | null = null;

export function playMusic(key: AudioKey, volume = 0.5) {
  if (bgEl && bgKey === key && !bgEl.paused) return;  // already playing
  stopMusic();

  const el = new Audio(FILE_MAP[key]);
  el.loop = true;
  el.volume = volume;
  el.play().catch(() => { /* file missing or decode error — stay silent */ });
  bgEl = el;
  bgKey = key;
}

export function stopMusic() {
  if (bgEl) {
    bgEl.pause();
    bgEl.src = "";
    bgEl = null;
    bgKey = null;
  }
}

// ─── Sound Effects ────────────────────────────────────────────────────────────

export function playSfx(key: AudioKey, volume = 1) {
  try {
    const el = new Audio(FILE_MAP[key]);
    el.volume = volume;
    el.play().catch(() => { /* stay silent if file missing */ });
  } catch { /* ignore */ }
}
